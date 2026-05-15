// ─── pdf-styles/shared ───────────────────────────────────────────────────
//
// PR 29.0: Shared helpers used by all PDF styles (classic, modern, editorial).
// Extracted from the original src/lib/pdf-export.js so the per-style
// renderers can focus on their visual identity, not low-level mechanics.
//
// Contents:
//   - Page geometry constants (A4 dimensions, default margins)
//   - LABELS i18n (en/es/ko) for short strings used in PDFs
//   - sanitizeFilename, deterministicShuffle, formatAnswerForKey
//   - drawWrappedText: text wrap helper (returns new Y)
//   - fetchImageAsDataURL: async helper to embed q.image_url in jsPDF
//
// Why separate file: the 3 styles share a lot of mechanical logic
// (formatting answers, hashing for shuffle, fetching images). Duplicating
// across files would mean fixing the same bug three times.

// ─── A4 page geometry (mm) ───────────────────────────────────────────────
// Each style can override marginX/marginY for its own visual identity
// but page dimensions are constant.
export const PAGE_A4 = {
  width: 210,
  height: 297,
};

// Default margins used by classic + answer-key. Other styles override.
export const DEFAULT_MARGINS = {
  marginX: 18,
  marginY: 20,
};

// ─── Localized labels ────────────────────────────────────────────────────
// Used by both exam + answer-key for short strings (Name/Date/Answer key).
// Kept here so all 3 styles can share without prop-drilling.
export const LABELS = {
  en: {
    name: "Name",
    date: "Date",
    score: "Score",
    true: "True",
    false: "False",
    answerKey: "Answer key",
    useWord: "use the word",
    openAnswer: "open response",
    pageOfTotal: (n, total) => `Page ${n} of ${total}`,
    poweredBy: "Generated with Clasloop · clasloop.com",
    questions: "questions",
    minutes: "minutes",
    warmup: "Warmup",
    exitTicket: "Exit ticket",
    review: "Review",
    practice: "Practice",
    // PR 29.0.1: section headers for organized exam layout
    sectionSelection: "Selection",
    sectionSelectionSub: "Choose the correct answer",
    sectionWritten: "Written response",
    sectionWrittenSub: "Write your answer in the space provided",
    partLabel: "Part",
  },
  es: {
    name: "Nombre",
    date: "Fecha",
    score: "Nota",
    true: "Verdadero",
    false: "Falso",
    answerKey: "Clave de respuestas",
    useWord: "usar la palabra",
    openAnswer: "respuesta abierta",
    pageOfTotal: (n, total) => `Página ${n} de ${total}`,
    poweredBy: "Generado con Clasloop · clasloop.com",
    questions: "preguntas",
    minutes: "minutos",
    warmup: "Warmup",
    exitTicket: "Exit ticket",
    review: "Repaso",
    practice: "Práctica",
    sectionSelection: "Selección",
    sectionSelectionSub: "Elegí la respuesta correcta",
    sectionWritten: "Respuesta escrita",
    sectionWrittenSub: "Escribí tu respuesta en el espacio dado",
    partLabel: "Parte",
  },
  ko: {
    name: "이름",
    date: "날짜",
    score: "점수",
    true: "참",
    false: "거짓",
    answerKey: "정답",
    useWord: "다음 단어 사용",
    openAnswer: "자유 응답",
    pageOfTotal: (n, total) => `${n} / ${total} 페이지`,
    poweredBy: "Clasloop으로 생성 · clasloop.com",
    questions: "문항",
    minutes: "분",
    warmup: "워밍업",
    exitTicket: "마무리 퀴즈",
    review: "복습",
    practice: "연습",
    sectionSelection: "선택",
    sectionSelectionSub: "정답을 고르세요",
    sectionWritten: "서술형",
    sectionWrittenSub: "주어진 공간에 답을 작성하세요",
    partLabel: "파트",
  },
};

// ─── Filename sanitizer ──────────────────────────────────────────────────
// Strip OS-invalid chars from the deck title and collapse whitespace.
// Caps at 80 chars to avoid filename-length issues on some platforms.
export function sanitizeFilename(name) {
  return String(name)
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 80) || "deck";
}

// ─── Wrapped text drawer ─────────────────────────────────────────────────
// Wraps text to fit within maxWidth, draws each line, returns the new Y
// position after the last line. lineHeight is in mm.
//
// Important: jsPDF's splitTextToSize works in current font + size, so
// callers must set those BEFORE calling. We don't set them here to
// avoid clobbering caller state.
export function drawWrappedText(doc, text, x, y, maxWidth, lineHeight) {
  if (!text) return y;
  const lines = doc.splitTextToSize(String(text), maxWidth);
  for (const line of lines) {
    doc.text(line, x, y);
    y += lineHeight + 2;
  }
  return y;
}

// ─── Deterministic shuffle for match rights ──────────────────────────────
// Match questions store pairs as already-matched. For the exam we shuffle
// the right column so the answer isn't trivially "1↔A, 2↔B, 3↔C".
// Using a deterministic shuffle (string-hash → LCG) means reprinting the
// same exam produces the same shuffled order — a student who lost their
// copy gets one that matches the teacher's answer key.
//
// Not crypto-secure on purpose. Just stable and reasonably random-looking.
export function deterministicShuffle(arr, seed) {
  let state = 0;
  for (let i = 0; i < seed.length; i++) {
    state = (state * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const result = arr.slice();
  for (let i = result.length - 1; i > 0; i--) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const j = state % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ─── Answer formatter for answer-key ─────────────────────────────────────
// Turns one question into a short string for the teacher's answer key.
// Match questions get special block rendering (see drawMatchAnswerBlock
// in the per-style files) — this function is NOT called for match.
//
// Schema reference (matches src/lib/scoring.js):
//   mcq:    q.options = [...], q.correct = index | [indices]
//   tf:     q.correct = true | false
//   fill:   q.answer = "word", q.alternatives = ["alt", ...]
//   order:  q.items in correct order (presented shuffled, stored canonical)
//   slider: q.correct = number, q.tolerance optional
//   sentence/free/open: free-form
export function formatAnswerForKey(q, labels) {
  switch (q.type) {
    case "mcq": {
      const opts = Array.isArray(q.options) ? q.options : [];
      const letters = "abcdef";
      if (Array.isArray(q.correct)) {
        return q.correct
          .map(i => `${letters[i] || "?"}) ${opts[i] ?? "?"}`)
          .join(" + ");
      }
      const i = q.correct;
      if (typeof i === "number" && opts[i] != null) {
        return `${letters[i] || "?"}) ${opts[i]}`;
      }
      return String(q.correct ?? "—");
    }
    case "tf":
      return q.correct === true ? labels.true : (q.correct === false ? labels.false : "—");
    case "fill": {
      const alts = Array.isArray(q.alternatives) ? q.alternatives : [];
      return [q.answer, ...alts].filter(Boolean).join(" / ") || "—";
    }
    case "order": {
      const items = Array.isArray(q.items) ? q.items : [];
      return items.join(" → ");
    }
    case "match": {
      const pairs = Array.isArray(q.pairs) ? q.pairs : [];
      return pairs.map(p => `${p.left} → ${p.right}`).join(",  ");
    }
    case "slider": {
      const target = q.correct;
      const tol = Number(q.tolerance) || 0;
      if (target == null) return "—";
      return tol > 0 ? `${target} (±${tol})` : String(target);
    }
    case "sentence":
      return q.required_word
        ? `(${labels.useWord}: "${q.required_word}")`
        : `(${labels.openAnswer})`;
    case "free":
    case "open":
      return q.sample_answer || `(${labels.openAnswer})`;
    default:
      return q.answer != null ? String(q.answer) : "—";
  }
}

// ─── Image embedding ─────────────────────────────────────────────────────
// jsPDF's doc.addImage() needs base64 data, not a URL. This helper fetches
// the URL, converts to base64, and resolves with the dataURL + intrinsic
// dimensions in pixels (so the caller can scale to fit a slot in mm).
//
// Network failures resolve to null (not throw) — the caller renders the
// question without the image rather than crashing the whole PDF.
//
// Supabase Storage URLs are public by default; signed URLs also work as
// long as the signature hasn't expired by the time of the fetch.
export async function fetchImageAsDataURL(url) {
  if (!url || typeof url !== "string") return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    // Get intrinsic dimensions by loading into an Image. Needed so we can
    // preserve aspect ratio when placing into the PDF.
    const dims = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 1, h: 1 }); // safe fallback
      img.src = dataUrl;
    });
    // Determine format from blob.type (jsPDF needs "JPEG" or "PNG" etc.)
    let format = "JPEG";
    if (blob.type.includes("png")) format = "PNG";
    else if (blob.type.includes("webp")) format = "WEBP";
    else if (blob.type.includes("gif")) format = "GIF";
    return { dataUrl, format, naturalW: dims.w, naturalH: dims.h };
  } catch (err) {
    console.warn("[pdf] image fetch failed:", url, err);
    return null;
  }
}

// ─── Image scaling helper ────────────────────────────────────────────────
// Given an image's intrinsic dimensions (px) and a target box (mm), return
// the actual width/height (mm) to use with doc.addImage so the image fits
// inside the box while preserving aspect ratio. Caller centers it.
export function scaleImageToFit(naturalW, naturalH, maxWmm, maxHmm) {
  if (!naturalW || !naturalH) return { w: maxWmm, h: maxHmm };
  const aspect = naturalW / naturalH;
  let w = maxWmm;
  let h = w / aspect;
  if (h > maxHmm) {
    h = maxHmm;
    w = h * aspect;
  }
  return { w, h };
}

// ─── PR 29.0.1: Section grouping ─────────────────────────────────────────
//
// Organize questions into logical exam sections instead of dumping them in
// the order the teacher created them. Per Jota's call (PR 29 planning):
//
//   Section 1: Selection — student MARKS the answer (multiple choice
//              mechanic). MCQ, TF, match, order, slider, AND fill (because
//              fill writing is shorter than free-form and reads like
//              "mark the missing word" in context).
//
//   Section 2: Written response — student WRITES a full answer.
//              sentence, free, open.
//
// Why fill goes with selection (and not with sentence/free/open):
//   - Fill has a stored q.answer / q.alternatives — it's auto-gradable.
//   - The mechanic is "fill in the blank in this sentence" — closer to
//     MCQ in spirit than to "write 3 sentences about X".
//
// Returns { selection: [...], written: [...] } where each list preserves
// the original ordering of its category. Empty sections are still present
// (as empty arrays) — callers decide whether to render section headers
// for empty groups (no, they shouldn't).
//
// Each question in the returned arrays gets an extra _originalNum field
// (1-based) so the renderer can preserve the global numbering across the
// exam, even though display order is regrouped.
//
// PR 29.1.2: questions within a section are also re-ordered BY TYPE.
// Jota's request: "todas las ABCD una detras de otra, luego match uno
// detras de otra, luego cualquier otro que venga". This makes the exam
// feel structured (the student sees blocks of same-mechanic questions)
// AND makes pagination math more predictable — runs of identical-height
// questions are easier to pack onto pages than chaotic mixes.
//
// Order within selection: mcq → tf → match → order → slider → fill
// Order within written:   sentence → free → open
// Original q._originalNum is preserved so the answer key still lists
// answers in creation order (matching how the teacher built the deck).
export const SELECTION_TYPES = new Set([
  "mcq", "tf", "match", "order", "slider", "fill",
]);

export const WRITTEN_TYPES = new Set([
  "sentence", "free", "open",
]);

// Within-section ordering (PR 29.1.2). Lower index = appears first.
const SELECTION_TYPE_ORDER = ["mcq", "tf", "match", "order", "slider", "fill"];
const WRITTEN_TYPE_ORDER = ["sentence", "free", "open"];

function typeOrderIndex(type, list) {
  const idx = list.indexOf(type);
  return idx === -1 ? 999 : idx;
}

export function groupQuestionsBySection(questions) {
  const selection = [];
  const written = [];
  // First pass: split by section, tag with creation order for stable sort
  (questions || []).forEach((q, idx) => {
    const tagged = { ...q, _creationIdx: idx };
    if (SELECTION_TYPES.has(q.type)) {
      selection.push(tagged);
    } else if (WRITTEN_TYPES.has(q.type)) {
      written.push(tagged);
    } else {
      // Unknown type → put it in written (safer; gives the student a
      // blank-line response area instead of dropping the question).
      written.push(tagged);
    }
  });
  // PR 29.1.2: sort within each section by type, preserving original
  // order among questions of the same type (stable sort).
  selection.sort((a, b) => {
    const ai = typeOrderIndex(a.type, SELECTION_TYPE_ORDER);
    const bi = typeOrderIndex(b.type, SELECTION_TYPE_ORDER);
    if (ai !== bi) return ai - bi;
    return a._creationIdx - b._creationIdx;
  });
  written.sort((a, b) => {
    const ai = typeOrderIndex(a.type, WRITTEN_TYPE_ORDER);
    const bi = typeOrderIndex(b.type, WRITTEN_TYPE_ORDER);
    if (ai !== bi) return ai - bi;
    return a._creationIdx - b._creationIdx;
  });
  // PR 29.1.3: AFTER reordering, assign sequential display numbers.
  // Jota's feedback: "cuando se reorganizan tienen numeros a lo loco,
  // hay que ponerle los numeros en orden". So numbering is now driven
  // by RENDER order, not creation order. Selection numbers come first
  // (1, 2, 3...), then written continues (N+1, N+2...).
  let n = 1;
  for (const q of selection) q._originalNum = n++;
  for (const q of written) q._originalNum = n++;
  return { selection, written };
}
