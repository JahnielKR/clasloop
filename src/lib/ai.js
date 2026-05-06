// ─── AI Question Generation Service ─────────────────
// Supports: text input, file uploads (PDF, DOCX, PPTX, images)
// Uses Claude API with multimodal support for images/PDFs

import { supabase } from "./supabase";

// Custom error class so el frontend puede distinguir rate limit de otros errores.
export class AIError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.name = "AIError";
    this.status = status;
    this.code = code; // e.g. "rate_limited", "unauthorized"
  }
}

const ACTIVITY_PROMPTS = {
  mcq: `Generate multiple choice questions with exactly 4 options each. Mark the correct answer index (0-3).
Return format: { "q": "question text", "options": ["A", "B", "C", "D"], "correct": 0 }`,

  tf: `Generate true/false statements. Mix true and false roughly equally.
Return format: { "q": "statement text", "correct": true }`,

  fill: `Generate fill-in-the-blank questions. Use _____ to mark the blank.
Return format: { "q": "The _____ is the powerhouse of the cell.", "answer": "mitochondria" }`,

  order: `Generate ordering/sequence questions with 4-6 items in correct order.
Return format: { "q": "Put these in order:", "items": ["First", "Second", "Third", "Fourth"] }`,

  match: `Generate matching pairs (4-5 pairs).
Return format: { "q": "Match the items:", "pairs": [{"left": "Term", "right": "Definition"}, ...] }`,

  poll: `Generate opinion/discussion questions with 3-4 options. No correct answer.
Return format: { "q": "question text", "options": ["Option A", "Option B", "Option C"] }`,
};

const LANG_MAP = { en: "English", es: "Spanish", ko: "Korean" };

function buildPrompt({ topic, keyPoints, grade, subject, activityType, numQuestions, language, fileContent }) {
  const sourceInfo = fileContent
    ? `The teacher uploaded their class material. Here is the extracted content:\n\n---\n${fileContent}\n---\n\nGenerate questions based on THIS specific content.`
    : `Topic: ${topic}\n${keyPoints ? `Key points:\n${keyPoints}` : ""}`;

  return `You are Clasloop, an AI assistant that generates review questions for spaced repetition in classrooms.

Generate ${numQuestions} questions for a ${grade} grade ${subject} class.

${sourceInfo}

${ACTIVITY_PROMPTS[activityType]}

RULES:
- Write ALL questions in ${LANG_MAP[language || "en"]}
- Appropriate for ${grade} grade level
- Test recall and understanding, not just recognition
- Vary difficulty: include easy, medium, and challenging questions
- Be specific to the content provided
- Questions should help students remember key concepts long-term

Respond with ONLY a valid JSON array. No markdown, no backticks, no explanation.`;
}

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
}) {
  let fileContent = null;
  let messageContent = [];

  // Process file if provided
  if (file) {
    const extracted = await extractTextFromFile(file);

    if (typeof extracted === "string") {
      // Plain text content
      fileContent = extracted;
      const prompt = buildPrompt({ topic: topic || file.name, keyPoints, grade, subject, activityType, numQuestions, language, fileContent });
      messageContent = [{ type: "text", text: prompt }];
    } else if (extracted.type === "pdf") {
      // PDF — send as document to Claude
      const prompt = buildPrompt({ topic: topic || file.name, keyPoints, grade, subject, activityType, numQuestions, language, fileContent: null });
      messageContent = [
        {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: extracted.base64 },
        },
        { type: "text", text: prompt + "\n\nAnalyze the PDF document above and generate questions based on its content." },
      ];
    } else if (extracted.type === "image") {
      // Image — send as image to Claude
      const prompt = buildPrompt({ topic: topic || file.name, keyPoints, grade, subject, activityType, numQuestions, language, fileContent: null });
      messageContent = [
        {
          type: "image",
          source: { type: "base64", media_type: extracted.mediaType, data: extracted.base64 },
        },
        { type: "text", text: prompt + "\n\nAnalyze the image above (it may be a slide, worksheet, or class material) and generate questions based on its content." },
      ];
    } else {
      // Other document types — try as text
      fileContent = `[File: ${file.name}] Content could not be fully extracted. Please generate questions based on the topic.`;
      const prompt = buildPrompt({ topic: topic || file.name, keyPoints, grade, subject, activityType, numQuestions, language, fileContent });
      messageContent = [{ type: "text", text: prompt }];
    }
  } else {
    // No file — text only
    const prompt = buildPrompt({ topic, keyPoints, grade, subject, activityType, numQuestions, language, fileContent: null });
    messageContent = [{ type: "text", text: prompt }];
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

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: messageContent }],
        max_tokens: 2000,
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

    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
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
