// ─── AI Question Generation Service ─────────────────
// Supports: text input, file uploads (PDF, DOCX, PPTX, images)
// Uses Claude API with multimodal support for images/PDFs

import { supabase } from "./supabase";
import { buildPromptParts } from "./ai-prompt";

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

// ─── Extract text from file ─────────────────────────
async function extractTextFromFile(file) {
  const type = file.type;
  const name = file.name.toLowerCase();

  // Plain text / markdown
  if (type.startsWith("text/") || name.endsWith(".md") || name.endsWith(".txt")) {
    return await file.text();
  }

  // For PDF, DOCX, PPTX — we read as base64 and let Claude analyze it
  // Claude can read PDFs and images directly via multimodal
  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return { type: "pdf", base64: await fileToBase64(file) };
  }

  // Images — Claude can read directly
  if (type.startsWith("image/")) {
    return { type: "image", base64: await fileToBase64(file), mediaType: type };
  }

  // DOCX/PPTX — read as text extraction (basic)
  // For a more robust solution, we'd use a library, but for MVP
  // we'll send as document to Claude
  if (name.endsWith(".docx") || name.endsWith(".pptx")) {
    return { type: "document", base64: await fileToBase64(file), mediaType: "application/octet-stream" };
  }

  // Fallback — try to read as text
  try {
    return await file.text();
  } catch {
    throw new Error("Unsupported file type. Please use PDF, images, or text files.");
  }
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

  // ── Procesar archivo (si hay) y armar messageContent ───
  if (file) {
    const extracted = await extractTextFromFile(file);

    if (typeof extracted === "string") {
      // Texto plano: el contenido va dentro del system/user text, no como block aparte.
      fileContent = extracted;
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
      // DOCX/PPTX: hoy llegan acá como octet-stream. Bloque 5 los reemplaza con
      // extracción real (mammoth, pptx parser). Por ahora, fallback a topic.
      fileContent = `[Archivo: ${file.name}] El contenido no pudo extraerse completamente. Genera preguntas a partir del tema.`;
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
        model: "primary",                       // Sonnet 4.5 — calidad pedagógica
        system: promptParts.system,             // Identidad + reglas + negativos
        messages: [{ role: "user", content: messageContent }],
        max_tokens: dynamicMaxTokens,
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
    return parsed;
  } catch (err) {
    console.error("AI generation failed:", err);
    throw err;
  }
}

// ─── Get supported file types ───────────────────────
export const SUPPORTED_FILES = {
  accept: ".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.md,.doc,.docx,.pptx",
  maxSizeMB: 10,
  types: [
    { ext: "PDF", icon: "📄", desc: "Lesson plans, worksheets" },
    { ext: "Images", icon: "🖼️", desc: "Slides, photos of whiteboard" },
    { ext: "Text", icon: "📝", desc: "Notes, outlines" },
    { ext: "DOCX", icon: "📃", desc: "Word documents" },
    { ext: "PPTX", icon: "📊", desc: "PowerPoint slides" },
  ],
};
