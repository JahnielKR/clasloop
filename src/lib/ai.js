// ─── AI Question Generation Service ─────────────────
// Supports: text input, file uploads (PDF, DOCX, PPTX, images)
// Uses Claude API with multimodal support for images/PDFs

import { supabase } from "./supabase";
import { buildPromptParts } from "./ai-prompt";
import { extractDocx, extractPptx } from "./file-extract";

// Custom error class so el frontend puede distinguir rate limit de otros errores.
export class AIError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.name = "AIError";
    this.status = status;
    this.code = code; // e.g. "rate_limited", "unauthorized"
  }
}

// NOTA: el prompt engineering vive ahora en `./ai-prompt.js`.
// Aquí solo orquestamos: extracción de archivo, construcción del message, fetch.

// ─── Size caps por tipo ─────────────────────────────
// Vercel functions tienen 4.5 MB de body limit. PDF/imagen viajan base64 al
// endpoint (infla ~33%), así que los capeamos en 3 MB de archivo nativo. DOCX/
// PPTX no viajan — extraemos el texto en cliente, así que el archivo grande
// no es problema (el cap real es el de chars del texto extraído, en
// file-extract.js). Texto plano cabe sin problema.
const MAX_PDF_IMAGE_BYTES = 3 * 1024 * 1024;     // 3 MB
const MAX_DOCX_PPTX_BYTES = 25 * 1024 * 1024;    // 25 MB
const MAX_TEXT_BYTES = 5 * 1024 * 1024;          // 5 MB

function checkSize(file, maxBytes, kindLabel) {
  if (file.size && file.size > maxBytes) {
    const mb = (maxBytes / (1024 * 1024)).toFixed(0);
    throw new AIError(
      `This ${kindLabel} is too big. Max ${mb} MB.`,
      { code: "file_too_big" }
    );
  }
}

// ─── Extract text from file ─────────────────────────
async function extractTextFromFile(file) {
  const type = file.type;
  const name = file.name.toLowerCase();

  // Plain text / markdown
  if (type.startsWith("text/") || name.endsWith(".md") || name.endsWith(".txt")) {
    checkSize(file, MAX_TEXT_BYTES, "text file");
    return await file.text();
  }

  // PDF — Claude lee nativo via multimodal.
  if (type === "application/pdf" || name.endsWith(".pdf")) {
    checkSize(file, MAX_PDF_IMAGE_BYTES, "PDF");
    return { type: "pdf", base64: await fileToBase64(file) };
  }

  // Images — Claude las lee directo via multimodal.
  // IMPORTANTE: el navegador a veces miente sobre file.type. Es común que un
  // archivo guardado como .png en realidad sea JPEG por dentro (cámaras,
  // apps de mensajería que recomprimen, screenshots de iOS, etc.). Anthropic
  // valida el contenido real y rechaza si no coincide con el media_type
  // declarado, devolviendo un error críptico al profe. Por eso detectamos el
  // formato real leyendo los primeros bytes (magic bytes) en vez de confiar
  // en file.type.
  if (type.startsWith("image/")) {
    checkSize(file, MAX_PDF_IMAGE_BYTES, "image");
    const realType = await detectImageType(file);
    if (!realType) {
      throw new AIError(
        "We couldn't recognize this image format. Use PNG, JPEG, GIF, or WEBP.",
        { code: "unsupported_file" }
      );
    }
    return { type: "image", base64: await fileToBase64(file), mediaType: realType };
  }

  // .doc legacy (Word 97-2003) — NO es ZIP, mammoth no puede abrirlo.
  // Antes caía al fallback de file.text() que devuelve bytes binarios y
  // explotaba el endpoint. Lo bloqueamos explícitamente con un mensaje
  // claro al profe.
  if (name.endsWith(".doc")) {
    throw new AIError(
      "Old .doc files (Word 97-2003) aren't supported. Open it in Word and save as .docx, then try again.",
      { code: "doc_legacy" }
    );
  }

  // DOCX — extracción en cliente con mammoth.
  if (name.endsWith(".docx")) {
    checkSize(file, MAX_DOCX_PPTX_BYTES, "DOCX");
    const result = await extractDocx(file);
    if (!result.ok) {
      throw new AIError(
        result.reason === "not_enough_text"
          ? "We couldn't read enough text from this DOCX. If it's mostly images, save it as PDF and try again."
          : `Couldn't read DOCX: ${result.reason}`,
        { code: result.reason === "not_enough_text" ? "extraction_empty" : "extraction_failed" }
      );
    }
    // Si se truncó por cap de chars, lo marcamos en el error para que el
    // panel le avise al profe ANTES de generar (no es bloqueante, es info).
    // Aquí no es error, es solo metadata; el panel la lee desde el `file`
    // adaptando con un campo extra que ai.js exporta.
    if (result.truncated) {
      // Adjuntamos info al string mediante una propiedad — el caller la lee.
      // (un string no puede tener propiedades, así que devolvemos object).
      return { type: "text-truncated", text: result.text, originalLength: result.originalLength };
    }
    return result.text;
  }

  // PPTX — extracción con JSZip + XML.
  if (name.endsWith(".pptx")) {
    checkSize(file, MAX_DOCX_PPTX_BYTES, "PPTX");
    const result = await extractPptx(file);
    if (!result.ok) {
      throw new AIError(
        result.reason === "not_enough_text"
          ? "We couldn't read enough text from this PPTX. If slides are mostly images, save as PDF and try again."
          : `Couldn't read PPTX: ${result.reason}`,
        { code: result.reason === "not_enough_text" ? "extraction_empty" : "extraction_failed" }
      );
    }
    if (result.truncated) {
      return { type: "text-truncated", text: result.text, originalLength: result.originalLength };
    }
    return result.text;
  }

  // Si llegamos acá, el archivo no es de un tipo que sabemos manejar.
  // ANTES había un fallback a file.text() que era peligroso (devolvía bytes
  // binarios en archivos viejos). Ahora rechazamos explícito.
  throw new AIError(
    "Unsupported file type. Use PDF, image, DOCX, PPTX, or a plain text file.",
    { code: "unsupported_file" }
  );
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// ─── Detección de formato de imagen por magic bytes ──────
// El navegador a veces miente sobre file.type (ej. archivo guardado como .png
// pero contenido JPEG). Anthropic detecta el formato real y rechaza si no
// coincide con el media_type que mandamos. Para evitar esto, leemos los
// primeros 12 bytes y matcheamos contra las firmas conocidas.
//
// Devuelve "image/png" | "image/jpeg" | "image/gif" | "image/webp" | null.
// null = no es ningún formato soportado por Claude.
async function detectImageType(file) {
  // Leemos solo los primeros 12 bytes — más que suficiente para todas las
  // firmas que nos importan.
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (head.length < 4) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) {
    return "image/png";
  }
  // JPEG: FF D8 FF
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    return "image/jpeg";
  }
  // GIF: 47 49 46 38 ("GIF8")
  if (head[0] === 0x47 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x38) {
    return "image/gif";
  }
  // WEBP: bytes 0-3 "RIFF" (52 49 46 46), bytes 8-11 "WEBP" (57 45 42 50)
  if (
    head.length >= 12 &&
    head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 &&
    head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50
  ) {
    return "image/webp";
  }
  // Otras firmas posibles que Claude NO soporta (BMP, TIFF, HEIC) — devolvemos
  // null para que el caller le diga al profe "formato no soportado".
  return null;
}

// ─── JSON parser robusto ──────────────────────────────
// El modelo está instruído a devolver SOLO el array. Pero si por algún motivo
// se desvía (mete code fence, comentario, etc.), intentamos rescatar el primer
// array bien formado.
function parseQuestionsArray(text) {
  if (!text || typeof text !== "string") return null;
  // 1) Intento directo limpiando code fences.
  const stripped = text.replace(/```json|```/g, "").trim();
  try { return JSON.parse(stripped); } catch { /* sigue */ }
  // 2) Buscamos el primer "[" y el último "]" balanceados.
  const start = stripped.indexOf("[");
  const end = stripped.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return null;
  const slice = stripped.slice(start, end + 1);
  try { return JSON.parse(slice); } catch { /* sigue */ }
  // 3) Último recurso: nada parseó.
  return null;
}

// Most common string in an array. Used to pick the dominant reason from
// Haiku's drop list — when all 15 questions are dropped for the same
// reason ("Spanish content, not history"), we want to surface that one
// instead of any of the others or just the first.
function mostCommon(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const counts = new Map();
  for (const s of arr) {
    if (typeof s !== "string" || !s.trim()) continue;
    counts.set(s, (counts.get(s) || 0) + 1);
  }
  let top = null;
  let topCount = 0;
  for (const [k, v] of counts.entries()) {
    if (v > topCount) { top = k; topCount = v; }
  }
  return top;
}

// ─── Generate questions ─────────────────────────────
export async function generateQuestions({
  topic,
  keyPoints = "",
  grade,
  subject,
  activityType = "mcq",
  numQuestions = 5,
  language = "en",
  file = null,
  lessonContext = "general", // "warmup" | "exitTicket" | "general" — Bloque 3 lo conectará desde la UI
}) {
  let fileContent = null;
  let messageContent = [];
  let promptParts = null;
  // Warnings no-bloqueantes que queremos comunicar al caller (panel UI).
  // Por ejemplo: el texto fue truncado por tamaño, o se aplicó algún
  // ajuste defensivo. El panel los muestra como aviso amarillo.
  const warnings = [];

  // ── Procesar archivo (si hay) y armar messageContent ───
  if (file) {
    const extracted = await extractTextFromFile(file);

    if (typeof extracted === "string") {
      // Texto plano completo.
      fileContent = extracted;
      promptParts = buildPromptParts({
        topic: topic || file.name,
        keyPoints, grade, subject, activityType, numQuestions, language,
        fileContent, hasMultimodal: false, fileName: file.name, lessonContext,
      });
      messageContent = [{ type: "text", text: promptParts.userText }];
    } else if (extracted.type === "text-truncated") {
      // Texto extraído pero excedió el cap. Usamos los primeros N chars y
      // avisamos al caller para que muestre el warning al profe.
      fileContent = extracted.text;
      warnings.push({
        code: "truncated",
        originalLength: extracted.originalLength,
        usedLength: extracted.text.length,
      });
      promptParts = buildPromptParts({
        topic: topic || file.name,
        keyPoints, grade, subject, activityType, numQuestions, language,
        fileContent, hasMultimodal: false, fileName: file.name, lessonContext,
      });
      messageContent = [{ type: "text", text: promptParts.userText }];
    } else if (extracted.type === "pdf") {
      // PDF nativo: va como document block ANTES del texto, multimodal real.
      promptParts = buildPromptParts({
        topic: topic || file.name,
        keyPoints, grade, subject, activityType, numQuestions, language,
        fileContent: null, hasMultimodal: true, fileName: file.name, lessonContext,
      });
      messageContent = [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: extracted.base64 } },
        { type: "text", text: promptParts.userText },
      ];
    } else if (extracted.type === "image") {
      promptParts = buildPromptParts({
        topic: topic || file.name,
        keyPoints, grade, subject, activityType, numQuestions, language,
        fileContent: null, hasMultimodal: true, fileName: file.name, lessonContext,
      });
      messageContent = [
        { type: "image", source: { type: "base64", media_type: extracted.mediaType, data: extracted.base64 } },
        { type: "text", text: promptParts.userText },
      ];
    } else {
      // Fallback de seguridad: tipo de archivo no esperado. DOCX/PPTX nunca
      // caen acá ahora — extractTextFromFile los procesa o tira AIError. Si
      // llegamos acá es porque algún formato nuevo apareció; mejor degradar
      // al topic que romper.
      fileContent = `[File: ${file.name}] Could not extract content. Falling back to topic.`;
      promptParts = buildPromptParts({
        topic: topic || file.name,
        keyPoints, grade, subject, activityType, numQuestions, language,
        fileContent, hasMultimodal: false, fileName: file.name, lessonContext,
      });
      messageContent = [{ type: "text", text: promptParts.userText }];
    }
  } else {
    // Sin archivo, solo topic + keyPoints.
    promptParts = buildPromptParts({
      topic, keyPoints, grade, subject, activityType, numQuestions, language,
      fileContent: null, hasMultimodal: false, fileName: null, lessonContext,
    });
    messageContent = [{ type: "text", text: promptParts.userText }];
  }

  // ── Calcular metadata para logging server-side ──────
  const inputType = file
    ? (file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf"
        ? "pdf"
        : file.type?.startsWith("image/")
        ? "image"
        : file.name.toLowerCase().endsWith(".docx")
        ? "docx"
        : file.name.toLowerCase().endsWith(".pptx")
        ? "pptx"
        : "text")
    : "text";
  // Aproximación rápida del tamaño del input para métricas.
  const inputSizeChars = (() => {
    if (fileContent && typeof fileContent === "string") return fileContent.length;
    if (!file) return (topic?.length || 0) + (keyPoints?.length || 0);
    if (file.size) return file.size; // bytes para binarios; sirve como proxy
    return 0;
  })();

  // ── Obtener JWT de la sesión actual ─────────────────
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new AIError("You need to be signed in as a teacher to generate questions.", {
      status: 401,
      code: "unauthorized",
    });
  }

  // max_tokens dinámico: una pregunta MCQ promedio cabe en ~150-300 tokens, una
  // ORDER/MATCH puede llegar a 500+. Subimos margen con N para que generaciones
  // largas (15-20 preguntas) no se trunquen.
  //   - hasta 5 preguntas: 4000 (default cómodo)
  //   - 6-10:              6000
  //   - 11-15:             8000
  //   - 16+:               10000
  const dynamicMaxTokens =
    numQuestions <= 5 ? 4000 :
    numQuestions <= 10 ? 6000 :
    numQuestions <= 15 ? 8000 :
    10000;

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        model: "primary",                       // Sonnet 4.6 — calidad pedagógica
        system: promptParts.system,             // Identidad + reglas + negativos
        messages: [{ role: "user", content: messageContent }],
        max_tokens: dynamicMaxTokens,
        // Bloque 4: pedimos validación semántica con Haiku tras la generación.
        // El endpoint corre el segundo pase y devuelve solo las aprobadas.
        // Si Haiku falla, el endpoint devuelve sin filtrar (no bloqueante).
        // Cuando Haiku descarta TODAS las preguntas (subject mismatch), el
        // frontend lanza un AIError "all_rejected" con el reason más común
        // — eso le dice al profe exactamente qué pasó (ej. "Tu deck es
        // History pero pediste contenido de Spanish").
        validate: true,
        // Contexto que el judge usa para evaluar.
        grade,
        subject,
        lesson_context: lessonContext,
        activity_type: activityType,
        num_questions: numQuestions,
        input_type: inputType,
        input_size_chars: inputSizeChars,
      }),
    });

    if (!response.ok) {
      // Intentamos extraer el mensaje del backend para mostrarlo al profe.
      let payload = null;
      try { payload = await response.json(); } catch { /* puede no ser JSON */ }
      if (response.status === 429) {
        throw new AIError(
          payload?.message || "You've reached your daily generation limit. Try again tomorrow.",
          { status: 429, code: "rate_limited" }
        );
      }
      if (response.status === 401) {
        throw new AIError("Your session expired. Please sign in again.", {
          status: 401, code: "unauthorized",
        });
      }
      if (response.status === 403) {
        throw new AIError("Only teachers can generate questions.", {
          status: 403, code: "forbidden",
        });
      }
      if (response.status === 413) {
        // Vercel function rechazó el body por tamaño. No deberíamos llegar
        // acá si los caps de cliente funcionan, pero por las dudas damos
        // un mensaje útil.
        throw new AIError(
          "The file is too large to process. Try a smaller file or extract just the relevant pages.",
          { status: 413, code: "file_too_big" }
        );
      }
      // Detectar error de prompt-too-long de Anthropic. Llega como string
      // dentro del JSON de error; matcheamos por substring porque la
      // estructura puede variar entre versiones de la API.
      const errStr = JSON.stringify(payload || "");
      if (errStr.includes("prompt is too long") || errStr.includes("prompt_too_long")) {
        throw new AIError(
          "The source material is too long for the AI to process. Try a shorter document, or split it in parts.",
          { code: "prompt_too_long" }
        );
      }
      throw new AIError(payload?.error || `API error: ${response.status}`, {
        status: response.status,
      });
    }

    const data = await response.json();
    const text = data.content
      .filter((item) => item.type === "text")
      .map((item) => item.text)
      .join("");

    // Parser robusto: aunque el modelo se desvía y mete texto/code-fence
    // alrededor del JSON, intentamos extraer el primer array bien formado.
    const parsed = parseQuestionsArray(text);
    if (!Array.isArray(parsed)) {
      throw new AIError("The model didn't return a valid question array. Try again.", { code: "bad_output" });
    }

    // Bloque 4: el endpoint puede haber filtrado preguntas con Haiku.
    //
    // Three cases to handle:
    //   1) parsed.length > 0, dropped === 0 → all good, no warning needed
    //   2) parsed.length > 0, dropped > 0  → warning "X dropped, Y kept"
    //      with the most common reason so the teacher learns from it
    //   3) parsed.length === 0, dropped > 0 → ALL questions rejected.
    //      This means the deck's subject and the requested content
    //      don't match (most common: deck is "History" but topic was
    //      Spanish vocabulary). Throw a specific AIError with the top
    //      reason so the panel can surface it instead of the generic
    //      "AI didn't return any questions".
    const v = data.validation;
    const droppedCount = (v && typeof v.dropped === "number") ? v.dropped : 0;
    const reasons = (v && Array.isArray(v.reasons)) ? v.reasons : [];

    if (parsed.length === 0 && droppedCount > 0) {
      // Pick the most common reason — Haiku tends to repeat itself when
      // the issue is the same root cause (e.g. all 15 say
      // "Spanish lesson content, not history").
      const topReason = mostCommon(reasons) || "quality check rejected all questions";
      throw new AIError(
        `All ${droppedCount} questions were rejected by the quality check. Reason: "${topReason}". This usually means your deck's subject doesn't match what you asked the AI to generate. Adjust the deck's subject or your topic and try again.`,
        {
          code: "all_rejected",
          dropped: droppedCount,
          reason: topReason,
        }
      );
    }

    if (droppedCount > 0) {
      warnings.push({
        code: "validation_dropped",
        kept: v.kept,
        dropped: droppedCount,
        topReason: mostCommon(reasons) || null,
      });
    }

    // Devolvemos questions y los warnings que se acumularon durante la
    // preparación del input (truncado por tamaño, validación, etc.). El
    // panel UI los lee — si nadie los lee, no rompe nada.
    return { questions: parsed, warnings };
  } catch (err) {
    console.error("AI generation failed:", err);
    throw err;
  }
}

// ─── Get supported file types ───────────────────────
// `accept` se usa en el <input type="file"> para filtrar el picker.
// `maxSizeMB` es el tope GLOBAL del client check (chequeo previo a cualquier
// procesamiento). Es 25 (el cap más alto entre tipos: DOCX/PPTX). Cada tipo
// tiene su cap real adentro de extractTextFromFile (PDF/imagen 3 MB,
// DOCX/PPTX 25 MB, texto 5 MB).
// .doc legacy está EXPLÍCITAMENTE fuera del accept porque mammoth no lo lee
// y el formato es de 1997 — no vale la pena soportarlo.
export const SUPPORTED_FILES = {
  accept: ".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.md,.docx,.pptx",
  maxSizeMB: 25,
  types: [
    { ext: "PDF", icon: "📄", desc: "Lesson plans, worksheets" },
    { ext: "Images", icon: "🖼️", desc: "Slides, photos of whiteboard" },
    { ext: "Text", icon: "📝", desc: "Notes, outlines" },
    { ext: "DOCX", icon: "📃", desc: "Word documents (.docx, not .doc)" },
    { ext: "PPTX", icon: "📊", desc: "PowerPoint slides (.pptx)" },
  ],
};
