// ─── pdf-export ──────────────────────────────────────────────────────────
//
// PDF generation for decks. Two public functions:
//   exportExamPDF(deck, classObj)       — student-facing exam, printable
//   exportAnswerKeyPDF(deck, classObj)  — teacher's answer key, ultra-simple
//
// Uses jsPDF programmatically — no html2canvas, no DOM rasterization.
// PDFs are text-searchable, lightweight (~30-100KB typical), and consistent
// across browsers. Trade-off: we draw layouts manually instead of using
// HTML/CSS, which means more code but full control over typography.
//
// Korean support
// ─────────────────
// jsPDF ships with Helvetica which doesn't support CJK characters. When
// deck.language === 'ko' we lazy-load NotoSansKR via the registerKorean
// helper before generating. For en/es we use the default font and accept
// that any rare special chars (œ, ©) render as ?. The base latin set
// (acentos, ñ, ü, etc.) works fine because Helvetica is full latin-1.
//
// Types supported (matches src/lib/scoring.js):
//   mcq, tf, fill, order, match, free, open, sentence, slider
// Anything else falls through to a "short answer" treatment with blank
// lines — so even if a new type is added later, the PDF doesn't crash.

import jsPDF from "jspdf";
import { ensureKoreanFont } from "./pdf-fonts";

// ─── Layout constants ────────────────────────────────────────────────────
// All measurements in mm (jsPDF's default unit). A4 is 210 × 297mm.
// We keep margins generous (18mm) so printed sheets aren't cramped.
const PAGE = {
  width: 210,
  height: 297,
  marginX: 18,
  marginY: 20,
  contentWidth: 210 - 18 * 2,    // 174mm
  contentHeight: 297 - 20 * 2,    // 257mm
};

// Typography sizes in points (jsPDF default is 12pt — we override).
// Chosen for printed readability: titles bold and ~16pt, body 11pt, hints 9pt.
const FONT = {
  title: 16,
  subtitle: 11,
  questionNum: 11,
  questionText: 11,
  option: 10.5,
  meta: 9,
  hint: 8.5,
};

// Spacing between blocks (mm). The exam has generous whitespace so students
// can write answers without the next question crowding in.
const SPACING = {
  afterHeader: 8,
  afterQuestionNum: 4,
  betweenOptions: 6,
  blankLine: 7,         // height of one writing line
  betweenQuestions: 12, // gap between questions
  beforeQuestion: 2,
};

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Generate the student-facing exam PDF and trigger download.
 * Layout: title + class name + Name/Date fields + numbered questions
 * with appropriate response space.
 */
export async function exportExamPDF(deck, classObj, lang = "en") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  // Korean decks need a CJK-capable font registered before any text
  // draw call. For other languages, Helvetica is fine.
  const useKorean = (deck.language || "").toLowerCase() === "ko";
  if (useKorean) {
    await ensureKoreanFont(doc);
  }
  const fontFamily = useKorean ? "NotoSansKR" : "helvetica";

  let y = PAGE.marginY;

  // ─── Header — deck title + class name + name/date fields ───────────
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.title);
  doc.setTextColor(20, 20, 20);
  y = drawWrappedText(doc, deck.title || "Deck", PAGE.marginX, y, PAGE.contentWidth, FONT.title * 0.45);
  y += 1;

  if (classObj?.name) {
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(FONT.subtitle);
    doc.setTextColor(100, 100, 100);
    doc.text(classObj.name, PAGE.marginX, y);
    y += 5;
  }

  // Horizontal divider
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(PAGE.marginX, y, PAGE.marginX + PAGE.contentWidth, y);
  y += 6;

  // Name and Date fields — two columns side by side
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.subtitle);
  doc.setTextColor(60, 60, 60);
  const labels = LABELS[lang] || LABELS.en;
  const nameLabelW = doc.getTextWidth(labels.name + ":");
  const dateLabelW = doc.getTextWidth(labels.date + ":");
  doc.text(labels.name + ":", PAGE.marginX, y);
  doc.text(labels.date + ":", PAGE.marginX + PAGE.contentWidth * 0.6, y);
  // Underlines for the fields
  doc.setDrawColor(120, 120, 120);
  doc.line(
    PAGE.marginX + nameLabelW + 2, y + 0.5,
    PAGE.marginX + PAGE.contentWidth * 0.55, y + 0.5
  );
  doc.line(
    PAGE.marginX + PAGE.contentWidth * 0.6 + dateLabelW + 2, y + 0.5,
    PAGE.marginX + PAGE.contentWidth, y + 0.5
  );
  y += 4;
  doc.setDrawColor(220, 220, 220);
  doc.line(PAGE.marginX, y, PAGE.marginX + PAGE.contentWidth, y);
  y += SPACING.afterHeader;

  // ─── Questions ───────────────────────────────────────────────────────
  const questions = deck.questions || [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    // Estimate space needed; if it doesn't fit, page-break.
    const estimatedHeight = estimateQuestionHeight(q);
    if (y + estimatedHeight > PAGE.height - PAGE.marginY) {
      doc.addPage();
      y = PAGE.marginY;
    }
    y = drawQuestionForExam(doc, q, i + 1, y, fontFamily, lang);
    y += SPACING.betweenQuestions;
  }

  // ─── Save ────────────────────────────────────────────────────────────
  const fname = sanitizeFilename(deck.title || "deck") + "_exam.pdf";
  doc.save(fname);
}

/**
 * Generate the teacher-facing answer key PDF and trigger download.
 * Layout: minimal — deck title at top, then "1. answer\n2. answer\n..."
 * That's it. No formatting beyond a small header. The teacher just
 * needs a quick reference to grade by.
 */
export async function exportAnswerKeyPDF(deck, classObj, lang = "en") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const useKorean = (deck.language || "").toLowerCase() === "ko";
  if (useKorean) {
    await ensureKoreanFont(doc);
  }
  const fontFamily = useKorean ? "NotoSansKR" : "helvetica";

  let y = PAGE.marginY;

  // Header — just the deck title and "Answer key" label
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.title);
  doc.setTextColor(20, 20, 20);
  y = drawWrappedText(doc, deck.title || "Deck", PAGE.marginX, y, PAGE.contentWidth, FONT.title * 0.45);
  y += 1;

  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.subtitle);
  doc.setTextColor(120, 120, 120);
  const labels = LABELS[lang] || LABELS.en;
  doc.text(labels.answerKey, PAGE.marginX, y);
  y += 8;

  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(PAGE.marginX, y, PAGE.marginX + PAGE.contentWidth, y);
  y += 6;

  // Answers — one per line, mono-style spacing for quick scanning.
  // For most types the answer is a single string; for match/order it's
  // a sequence; we format both as one logical line with clear separators.
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.questionText);
  doc.setTextColor(40, 40, 40);

  const questions = deck.questions || [];
  const lineHeight = 7;
  for (let i = 0; i < questions.length; i++) {
    if (y + lineHeight > PAGE.height - PAGE.marginY) {
      doc.addPage();
      y = PAGE.marginY;
    }
    const answerText = formatAnswerForKey(questions[i], labels);
    // Wrap in case the answer is long (e.g. sentence answer)
    const wrapped = doc.splitTextToSize(`${i + 1}. ${answerText}`, PAGE.contentWidth);
    for (const line of wrapped) {
      if (y + lineHeight > PAGE.height - PAGE.marginY) {
        doc.addPage();
        y = PAGE.marginY;
      }
      doc.text(line, PAGE.marginX, y);
      y += lineHeight;
    }
  }

  const fname = sanitizeFilename(deck.title || "deck") + "_answers.pdf";
  doc.save(fname);
}

// ─── Question rendering for exam PDF ─────────────────────────────────────
function drawQuestionForExam(doc, q, num, startY, fontFamily, lang) {
  let y = startY;
  const labels = LABELS[lang] || LABELS.en;

  // Question number + text. We render the number in bold to anchor the
  // student's eye, then the question text in regular weight.
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.questionNum);
  doc.setTextColor(20, 20, 20);
  const numText = `${num}.`;
  const numWidth = doc.getTextWidth(numText) + 2;
  doc.text(numText, PAGE.marginX, y);

  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.questionText);
  // The question prompt itself — wrap to fit content width minus the
  // number column width.
  const questionText = q.q || q.prompt || q.question || "";
  y = drawWrappedText(
    doc,
    questionText,
    PAGE.marginX + numWidth,
    y,
    PAGE.contentWidth - numWidth,
    FONT.questionText * 0.45,
  );
  y += SPACING.afterQuestionNum;

  // Type-specific response area
  switch (q.type) {
    case "mcq":
      y = drawMCQOptions(doc, q, y, fontFamily);
      break;
    case "tf":
      y = drawTFOptions(doc, y, fontFamily, labels);
      break;
    case "fill":
      y = drawFillBlanks(doc, q, y, fontFamily);
      break;
    case "match":
      y = drawMatchPairs(doc, q, y, fontFamily);
      break;
    case "order":
      y = drawOrderItems(doc, q, y, fontFamily);
      break;
    case "slider":
      y = drawSliderTrack(doc, q, y, fontFamily);
      break;
    case "sentence":
    case "free":
    case "open":
    default:
      // Default = blank lines for short/free response. For sentence type
      // we may have a "required_word" hint to render.
      if (q.type === "sentence" && q.required_word) {
        doc.setFont(fontFamily, "italic");
        doc.setFontSize(FONT.hint);
        doc.setTextColor(120, 120, 120);
        doc.text(`(${labels.useWord}: "${q.required_word}")`, PAGE.marginX + 4, y);
        y += 5;
      }
      y = drawBlankLines(doc, y, 3);
      break;
  }
  return y;
}

function drawMCQOptions(doc, q, startY, fontFamily) {
  let y = startY;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.option);
  doc.setTextColor(40, 40, 40);
  const options = q.options || [];
  const letters = ["a", "b", "c", "d", "e", "f"];
  for (let i = 0; i < options.length; i++) {
    // Checkbox square
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.3);
    doc.rect(PAGE.marginX + 4, y - 3.2, 3.2, 3.2);
    // Letter + option text
    const optionText = `${letters[i]}) ${options[i]}`;
    const wrapped = doc.splitTextToSize(optionText, PAGE.contentWidth - 14);
    for (let j = 0; j < wrapped.length; j++) {
      doc.text(wrapped[j], PAGE.marginX + 10, y);
      if (j < wrapped.length - 1) y += 4.5;
    }
    y += SPACING.betweenOptions;
  }
  return y;
}

function drawTFOptions(doc, startY, fontFamily, labels) {
  let y = startY;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.option);
  doc.setTextColor(40, 40, 40);
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.3);
  // True
  doc.rect(PAGE.marginX + 4, y - 3.2, 3.2, 3.2);
  doc.text(labels.true, PAGE.marginX + 10, y);
  // False
  const trueWidth = doc.getTextWidth(labels.true);
  doc.rect(PAGE.marginX + 14 + trueWidth, y - 3.2, 3.2, 3.2);
  doc.text(labels.false, PAGE.marginX + 20 + trueWidth, y);
  y += SPACING.betweenOptions;
  return y;
}

function drawFillBlanks(doc, q, startY, fontFamily) {
  // Fill-the-blank questions already contain ___ markers in the prompt
  // text where the student writes their answer. Earlier versions added
  // extra blank lines below — but that's redundant: students write the
  // word(s) directly on the underscores, they don't rewrite the whole
  // sentence. Per teacher feedback in PR 8.1: just give a small
  // breathing space below the question and move on.
  return startY + 4;
}

function drawMatchPairs(doc, q, startY, fontFamily) {
  let y = startY;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.option);
  doc.setTextColor(40, 40, 40);
  // Match question: q.pairs is an array of { left, right } ALREADY matched
  // by index — pair[0].right is the correct match for pair[0].left, etc.
  // For the exam, we have to shuffle the right column so the answer isn't
  // trivially "1↔A, 2↔B, 3↔C". We use a deterministic shuffle based on
  // the question's prompt as seed — that way the same question always
  // produces the same shuffled order (so reprinting after a kid loses
  // their copy doesn't change which letter pairs with which item).
  const pairs = q.pairs || q.items || [];
  const lefts = pairs.map((p, i) => p.left || p.l || `Item ${i + 1}`);
  // Pair right values with their original index, then shuffle.
  const rightsWithOriginalIdx = pairs.map((p, i) => ({
    text: p.right || p.r || `Match ${i + 1}`,
    originalIdx: i,
  }));
  const shuffled = deterministicShuffle(
    rightsWithOriginalIdx,
    String(q.q || q.prompt || pairs.length)
  );
  // Build a label map: shuffled[k] gets letter at position k. The PDF
  // shows "A, B, C..." in column order which means the original-idx
  // tracking lets the answer key know "left #1 maps to letter at the
  // position where its original right ended up after shuffling".
  // We don't actually need this map for the exam (we just print the
  // shuffled rights labeled A/B/C/D in display order). The answer key
  // doesn't reference letters — it just lists "left → right" pairs.
  const colWidth = (PAGE.contentWidth - 8) / 2;
  const xLeft = PAGE.marginX + 4;
  const xRight = PAGE.marginX + 4 + colWidth + 8;
  const lineHeight = 6;
  for (let i = 0; i < pairs.length; i++) {
    if (y + lineHeight > PAGE.height - PAGE.marginY) break;
    // Left: number + text
    doc.setFont(fontFamily, "bold");
    doc.text(`${i + 1}.`, xLeft, y);
    doc.setFont(fontFamily, "normal");
    const leftWrapped = doc.splitTextToSize(lefts[i], colWidth - 8);
    doc.text(leftWrapped, xLeft + 6, y);
    // Right: letter + text (in shuffled order)
    const letter = String.fromCharCode(65 + i);
    doc.setFont(fontFamily, "bold");
    doc.text(`${letter}.`, xRight, y);
    doc.setFont(fontFamily, "normal");
    const rightWrapped = doc.splitTextToSize(shuffled[i].text, colWidth - 8);
    doc.text(rightWrapped, xRight + 6, y);
    y += lineHeight + (Math.max(leftWrapped.length, rightWrapped.length) - 1) * 4;
  }
  return y + 2;
}

// Deterministic shuffle — same input always produces same output.
// Uses a tiny string-hash to seed an LCG-based shuffle. Not crypto-
// secure (doesn't need to be), just stable across exports of the same
// question. This way reprinting the exam after a student loses theirs
// doesn't change the shuffle.
function deterministicShuffle(arr, seed) {
  // Simple hash of seed → starting state
  let state = 0;
  for (let i = 0; i < seed.length; i++) {
    state = (state * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const result = arr.slice();
  // Fisher-Yates with LCG random
  for (let i = result.length - 1; i > 0; i--) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const j = state % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function drawOrderItems(doc, q, startY, fontFamily) {
  let y = startY;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.option);
  doc.setTextColor(40, 40, 40);
  // Order question gives shuffled items; student writes the correct
  // sequence. We render with a small "___" before each item for the
  // student to write the correct position number.
  const items = q.items || q.options || [];
  for (let i = 0; i < items.length; i++) {
    if (y + 6 > PAGE.height - PAGE.marginY) break;
    // Position blank
    doc.setDrawColor(120, 120, 120);
    doc.line(PAGE.marginX + 4, y + 0.5, PAGE.marginX + 12, y + 0.5);
    // Item text
    const itemText = String(items[i]);
    const wrapped = doc.splitTextToSize(itemText, PAGE.contentWidth - 18);
    doc.text(wrapped, PAGE.marginX + 14, y);
    y += 6 + (wrapped.length - 1) * 4;
  }
  return y;
}

function drawSliderTrack(doc, q, startY, fontFamily) {
  let y = startY + 2;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.hint);
  doc.setTextColor(100, 100, 100);
  // Slider has a min, max, and the answer is a number in that range.
  // We draw a horizontal scale with min/max labels.
  const min = q.min ?? 0;
  const max = q.max ?? 100;
  const trackY = y + 4;
  const trackX1 = PAGE.marginX + 8;
  const trackX2 = PAGE.marginX + PAGE.contentWidth - 8;
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.5);
  doc.line(trackX1, trackY, trackX2, trackY);
  // Tick marks at start and end
  doc.line(trackX1, trackY - 1.5, trackX1, trackY + 1.5);
  doc.line(trackX2, trackY - 1.5, trackX2, trackY + 1.5);
  // Labels
  doc.text(String(min), trackX1, trackY + 5, { align: "center" });
  doc.text(String(max), trackX2, trackY + 5, { align: "center" });
  // Below: blank for the student to write their numeric answer
  y = trackY + 9;
  doc.setFontSize(FONT.option);
  doc.setTextColor(40, 40, 40);
  doc.text("Answer: ____________", PAGE.marginX + 4, y);
  y += 4;
  return y;
}

function drawBlankLines(doc, startY, count) {
  let y = startY;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  for (let i = 0; i < count; i++) {
    if (y + SPACING.blankLine > PAGE.height - PAGE.marginY) break;
    doc.line(PAGE.marginX + 4, y, PAGE.marginX + PAGE.contentWidth - 4, y);
    y += SPACING.blankLine;
  }
  return y;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

// Wrap text to fit within maxWidth, return new Y position.
function drawWrappedText(doc, text, x, y, maxWidth, lineHeight) {
  if (!text) return y;
  const lines = doc.splitTextToSize(String(text), maxWidth);
  for (const line of lines) {
    doc.text(line, x, y);
    y += lineHeight + 2;
  }
  return y;
}

// Estimate vertical space needed for a question, used for page-break decision.
// Doesn't have to be exact — slight overestimation is safer (causes a
// premature break which is fine; underestimation causes overflow).
function estimateQuestionHeight(q) {
  const base = 12; // question number + prompt baseline
  const promptLines = Math.ceil(((q.q || "").length || 30) / 80);
  let response = 20;
  switch (q.type) {
    case "mcq":
      response = (q.options?.length || 4) * SPACING.betweenOptions + 4;
      break;
    case "tf":
      response = 10;
      break;
    case "match":
    case "order":
      response = (q.pairs?.length || q.items?.length || 4) * 7 + 4;
      break;
    case "slider":
      response = 18;
      break;
    case "fill":
      // Fill writes the answer in the prompt's ___ — only need a small
      // breathing space below.
      response = 6;
      break;
    case "sentence":
    case "free":
    case "open":
    default:
      response = 3 * SPACING.blankLine;
  }
  return base + promptLines * 5 + response + SPACING.betweenQuestions;
}

// Format a single question's answer for the answer-key PDF.
// The output is one short string regardless of question type.
//
// Schema reference (matches src/lib/scoring.js):
//   mcq:    q.options = [...], q.correct = index | [indices]
//   tf:     q.correct = true | false
//   fill:   q.answer = "word", q.alternatives = ["alt", ...]
//   order:  q.items in correct order (the question presents them shuffled
//           but stores the canonical order)
//   match:  q.pairs = [{ left, right }] — pairs are stored matched.
//           The exam shuffles them visually but the answer key just
//           lists them as left → right.
//   slider: q.correct = number, q.tolerance optional
//   sentence/free/open: free-form, no canonical answer
//
// Earlier versions of this function used q.answer for everything, which
// is wrong — most types use q.correct. MCQs ended up showing the index
// number, match showed nothing useful. Fixed in PR 8.1.
function formatAnswerForKey(q, labels) {
  switch (q.type) {
    case "mcq": {
      const opts = Array.isArray(q.options) ? q.options : [];
      const letters = "abcdef";
      // Multi-select: q.correct is an array of indices
      if (Array.isArray(q.correct)) {
        return q.correct
          .map(i => `${letters[i] || "?"}) ${opts[i] ?? "?"}`)
          .join(" + ");
      }
      // Single-select: q.correct is one index
      const i = q.correct;
      if (typeof i === "number" && opts[i] != null) {
        return `${letters[i] || "?"}) ${opts[i]}`;
      }
      return String(q.correct ?? "—");
    }
    case "tf":
      return q.correct === true ? labels.true : (q.correct === false ? labels.false : "—");
    case "fill": {
      // q.answer is the primary; q.alternatives are accepted variants
      const alts = Array.isArray(q.alternatives) ? q.alternatives : [];
      return [q.answer, ...alts].filter(Boolean).join(" / ") || "—";
    }
    case "order": {
      // q.items already stored in correct order
      const items = Array.isArray(q.items) ? q.items : [];
      return items.join(" → ");
    }
    case "match": {
      // q.pairs is an array of { left, right } already matched
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
      // Sentences are open-ended. If there's a required_word, mention it.
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

// Sanitize a deck title for use as a filename. Keeps it readable but safe.
function sanitizeFilename(name) {
  return String(name)
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 80) || "deck";
}

// ─── Localized labels ────────────────────────────────────────────────────
// Used by both PDFs. Kept here (not in the main i18n) because they're
// only used by this module — bundling them locally keeps the module
// self-contained and lets it be lifted into a shared library later.
const LABELS = {
  en: {
    name: "Name",
    date: "Date",
    true: "True",
    false: "False",
    answerKey: "Answer key",
    useWord: "use the word",
    openAnswer: "open response",
  },
  es: {
    name: "Nombre",
    date: "Fecha",
    true: "Verdadero",
    false: "Falso",
    answerKey: "Clave de respuestas",
    useWord: "usar la palabra",
    openAnswer: "respuesta abierta",
  },
  ko: {
    name: "이름",
    date: "날짜",
    true: "참",
    false: "거짓",
    answerKey: "정답",
    useWord: "다음 단어 사용",
    openAnswer: "자유 응답",
  },
};
