// ─── chatTourIntent ──────────────────────────────────────────────────────────
// Deterministic, client-side detection of "give me a tour of X" in the Cleo
// chat. Runs BEFORE the message hits the AI: if it matches a launch verb AND a
// known topic, the chat launches that tour instead of answering in text.
//
// Kept dead simple (substring match on a lowercased, accent-stripped string) so
// it behaves predictably across en/es/ko — no NLP, no surprise "I launched a
// tour" when the teacher just asked a question. Anything it doesn't clearly
// recognize returns null and falls through to the normal AI reply.

const norm = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // strip accents: guía→guia, cómo→como

// "Walk me through it" signals. Cross-language on purpose — a Spanish-UI teacher
// might still type "tour" or "show me". Kept specific enough to avoid firing on
// ordinary questions (e.g. bare "cómo" isn't here; "cómo funciona" is).
const LAUNCH_VERBS = [
  // en
  "tour", "show me", "walk me", "guide me", "how do i", "how does", "tutorial", "teach me",
  // es
  "guia", "guiame", "muestrame", "ensename", "como funciona", "como se usa", "como uso", "recorrido",
  // ko
  "투어", "가이드", "보여줘", "보여주세요", "어떻게", "튜토리얼", "안내",
].map(norm);

// Topic → tourId. Order is priority (first hit wins) so specific topics beat the
// generic "class". Trigger substrings span en/es/ko.
const TOPICS = [
  { tourId: "library",     keys: ["library", "biblioteca", "libreria", "라이브러리", "print", "imprimir", "pdf", "descargar", "download", "출력", "인쇄"] },
  { tourId: "scanner",     keys: ["scan", "escanear", "escaner", "camera", "camara", "corregir", "스캔", "카메라", "채점"] },
  { tourId: "insights",    keys: ["insight", "results", "resultado", "retention", "retencion", "missed", "fallaron", "결과", "인사이트"] },
  { tourId: "deckEditor",  keys: ["deck", "editor", "warmup", "exit ticket", "question", "pregunta", "mazo", "덱", "편집기", "워밍업"] },
  { tourId: "classDetail", keys: ["unit", "unidad", "launch", "lanzar", "en vivo", "live", "session", "sesion", "단원", "라이브", "세션"] },
  { tourId: "home",        keys: ["class", "clase", "수업"] },
  { tourId: "student",     keys: ["student", "alumno", "practicar", "practice", "avatar", "logro", "achievement", "학생", "연습", "업적"] },
].map((t) => ({ tourId: t.tourId, keys: t.keys.map(norm) }));

// → tourId | null
export function detectTourIntent(text) {
  const s = norm(text);
  if (!s) return null;
  if (!LAUNCH_VERBS.some((v) => s.includes(v))) return null;
  for (const topic of TOPICS) {
    if (topic.keys.some((k) => s.includes(k))) return topic.tourId;
  }
  return null;
}
