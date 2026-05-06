// ─── File text extraction ─────────────────────────────────────
// Bloque 5 del handoff: extracción correcta de DOCX y PPTX en el cliente.
//
// Diseño:
//   - DOCX: mammoth.extractRawText() → string. Funciona nativo en browser.
//   - PPTX: JSZip + parseo de XML por slide → string concatenado.
//   - PDF/imagen: NO se extraen aquí, viajan multimodal (las maneja ai.js).
//   - Texto: ya lo manejaba ai.js, no toca aquí.
//
// Por qué cliente y no servidor:
//   1) Vercel functions tienen 4.5 MB de body limit → un DOCX con imágenes
//      pega ese límite rápido. Extrayendo en cliente, mandamos solo texto (KB).
//   2) Si la extracción falla, lo sabemos antes de gastar tokens del modelo.
//   3) Mantiene el endpoint enfocado en su trabajo (auth + LLM).
//
// Output común: { text: string, ok: boolean, reason?: string }
// - ok: true cuando hay suficiente texto útil para mandarle al modelo.
// - ok: false con reason cuando el archivo está vacío/protegido/es solo
//   imágenes. El frontend muestra ese reason al profe.
//
// IMPORTANTE — import path de mammoth:
// Importamos `mammoth/mammoth.browser` directamente porque el entrypoint
// principal de mammoth referencia `fs` (Node), y eso explota en Vite si
// no usamos un polyfill. El build "browser" no lo necesita.

import mammoth from "mammoth/mammoth.browser";
import JSZip from "jszip";

// Si el texto extraído tiene menos de este umbral, asumimos que el archivo
// es principalmente imágenes/no-texto y devolvemos error claro al profe.
const MIN_USEFUL_CHARS = 50;

// Tope arriba del cual truncamos. ~40k chars ≈ 10k tokens. El modelo Sonnet
// 4.5 acepta 200k tokens de contexto, pero la calidad de las preguntas baja
// cuando el material es muy largo (atención diluida). Además dejamos espacio
// para el system prompt + few-shots + output. Si el archivo se trunca, el
// frontend avisa al profe ("se cortó por largo, revisa que cubra todo").
const MAX_CHARS = 40000;

// ─── DOCX ──────────────────────────────────────────────────
// mammoth.extractRawText() trae solo el texto plano, sin estilos. Es lo que
// queremos: el modelo no necesita HTML, solo el contenido.
export async function extractDocx(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const raw = (result.value || "").trim();
    return finalize(raw);
  } catch (err) {
    return { ok: false, text: "", reason: err?.message || "DOCX read failed" };
  }
}

// ─── PPTX ──────────────────────────────────────────────────
// Un .pptx es un archivo ZIP. Adentro, cada slide es un XML en
// `ppt/slides/slideN.xml`. El texto vive en elementos <a:t>...</a:t>.
// JSZip nos lee el ZIP, recorremos los slides en orden numérico, y por cada
// uno extraemos el texto de los <a:t>. Concatenamos con saltos de línea
// entre slides para que el modelo entienda el corte de slide.
export async function extractPptx(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Recolectar paths de slides (ppt/slides/slide1.xml, slide2.xml, ...).
    // Filtramos rels/notes etc. Ordenamos por número de slide para preservar
    // el orden lógico del deck.
    const slidePaths = Object.keys(zip.files)
      .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
      .sort((a, b) => {
        const na = parseInt(a.match(/slide(\d+)\.xml$/)[1], 10);
        const nb = parseInt(b.match(/slide(\d+)\.xml$/)[1], 10);
        return na - nb;
      });

    if (slidePaths.length === 0) {
      return { ok: false, text: "", reason: "PPTX has no slides" };
    }

    const slideTexts = [];
    for (let i = 0; i < slidePaths.length; i++) {
      const xml = await zip.file(slidePaths[i]).async("string");
      const text = extractAtTextFromXml(xml).trim();
      if (text) {
        slideTexts.push(`[Slide ${i + 1}]\n${text}`);
      }
    }

    // Notas del speaker — vale la pena incluirlas si están, ahí está la chicha
    // pedagógica que muchos profes ponen.
    const notesPaths = Object.keys(zip.files)
      .filter((p) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(p))
      .sort();
    if (notesPaths.length > 0) {
      const notesParts = [];
      for (let i = 0; i < notesPaths.length; i++) {
        const xml = await zip.file(notesPaths[i]).async("string");
        const text = extractAtTextFromXml(xml).trim();
        if (text) notesParts.push(`[Notes ${i + 1}]\n${text}`);
      }
      if (notesParts.length > 0) {
        slideTexts.push("\n--- Speaker notes ---\n" + notesParts.join("\n\n"));
      }
    }

    const raw = slideTexts.join("\n\n").trim();
    return finalize(raw);
  } catch (err) {
    return { ok: false, text: "", reason: err?.message || "PPTX read failed" };
  }
}

// Extrae el texto de los nodos <a:t>...</a:t> de un XML de slide.
// Hacemos parseo regex simple (no necesitamos un XML parser completo para
// solo extraer text-runs). Decodifica las entidades HTML básicas.
function extractAtTextFromXml(xml) {
  const re = /<a:t(?:\s[^>]*)?>([^<]*)<\/a:t>/g;
  const parts = [];
  let m;
  while ((m = re.exec(xml)) !== null) {
    parts.push(decodeXmlEntities(m[1]));
  }
  // Heurística simple: separar text-runs con espacio. PowerPoint suele
  // partir un párrafo en varios <a:t> por estilos de fuente; pegarlos sin
  // espacio chocaría palabras. Espacio ligero da resultados decentes.
  return parts.join(" ").replace(/\s+/g, " ");
}

function decodeXmlEntities(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&"); // amp último para no doble-decodear
}

// ─── Cierre común: validar mínimo y truncar máximo ─────────
function finalize(raw) {
  if (!raw || raw.length < MIN_USEFUL_CHARS) {
    return {
      ok: false,
      text: raw || "",
      reason: "not_enough_text", // el frontend mapea este código a un mensaje localizado
    };
  }
  if (raw.length > MAX_CHARS) {
    return {
      ok: true,
      text: raw.slice(0, MAX_CHARS),
      truncated: true,
      originalLength: raw.length,
    };
  }
  return { ok: true, text: raw };
}
