// ─── pdf-styles/classic ─────────────────────────────────────────────────
//
// PR 29.0.1: "Classic" style redesigned with personality — "El cuaderno"
// (the notebook). Sober and printable, but distinctive:
//
//   - Double-rule header (1.2mm black bar + hairline gray below it)
//   - Section banners with paired thin lines flanking a centered title:
//     ────────── PARTE I · SELECCIÓN ──────────
//   - Circled question numbers (solid stroke for selection, dotted for
//     written-response — subtle but distinctive)
//   - Dotted writing lines for the written-response section
//     (bullet-journal flavor, doesn't bleed photocopier ink)
//   - Dot-leader between field labels and their underline fields
//   - Subtle monospace touches on numbers (meta row, question numbers)
//
// All while staying 100% legible at first glance — no decorative
// elements that compete with the text.
//
// Both exam + answer key live here so the visual identity stays consistent.

import {
  PAGE_A4, DEFAULT_MARGINS, LABELS,
  drawWrappedText, deterministicShuffle, formatAnswerForKey,
  fetchImageAsDataURL, scaleImageToFit,
  groupQuestionsBySection,
} from "./shared";

const PAGE = {
  ...PAGE_A4,
  ...DEFAULT_MARGINS,
  contentWidth: PAGE_A4.width - DEFAULT_MARGINS.marginX * 2,
  contentHeight: PAGE_A4.height - DEFAULT_MARGINS.marginY * 2,
};

const FONT = {
  eyebrow: 9,      // small-caps class label above title
  title: 18,       // deck title (bumped from 16 — more presence)
  meta: 9.5,       // "N preguntas · M minutos"
  fieldLabel: 10,  // "Nombre", "Fecha", "Nota"
  sectionLabel: 8.5,  // "PARTE I"
  sectionTitle: 14,   // "Selección"
  sectionSub: 9.5,    // "Elegí la respuesta correcta"
  questionNum: 10.5,  // number inside the circle
  questionText: 11,
  option: 10.5,
  hint: 8.5,
  footer: 8,
};

const SPACING = {
  afterDoubleRule: 5,
  afterFieldsRow: 9,
  beforeSection: 10,        // was 12
  afterSectionHeader: 8,    // was 9
  afterQuestionNum: 4,
  betweenOptions: 6,
  dottedLineGap: 7,
  betweenQuestions: 9,      // PR 29.0.5: was 11. Tighter inter-question
                            // gap helps fit more questions per page
                            // without crowding (still 2× option spacing).
  afterImage: 5,            // was 6
};

// Visual palette (RGB) — kept narrow on purpose. Classic is grayscale
// with a single optional accent for the section divider.
const COLOR = {
  textBlack: [20, 20, 20],
  textDark: [40, 40, 40],
  textMid: [90, 90, 90],
  textMute: [140, 140, 140],
  textFaint: [180, 180, 180],
  ruleHeavy: [25, 25, 25],
  ruleLight: [200, 200, 200],
  ruleFaint: [225, 225, 225],
};

// ═══════════════════════════════════════════════════════════════════════
// EXAM
// ═══════════════════════════════════════════════════════════════════════
export async function renderExam(doc, deck, classObj, opts = {}) {
  const { lang = "en", fontFamily = "helvetica" } = opts;
  const labels = LABELS[lang] || LABELS.en;
  let y = PAGE.marginY;

  const imageCache = await preloadImages(deck.questions || []);
  const { selection, written } = groupQuestionsBySection(deck.questions || []);
  const totalQ = (deck.questions || []).length;

  // ── Header (page 1) ────────────────────────────────────────────────
  y = drawExamHeader(doc, deck, classObj, y, fontFamily, labels, totalQ);

  // ── Section 1: Selection ──────────────────────────────────────────
  if (selection.length > 0) {
    y = ensureSpace(doc, y, 30);
    y = drawSectionHeader(
      doc, y, fontFamily,
      labels.partLabel.toUpperCase() + " I",
      labels.sectionSelection,
      labels.sectionSelectionSub,
    );
    for (let i = 0; i < selection.length; i++) {
      const q = selection[i];
      const estH = estimateQuestionHeight(q, imageCache);
      // PR 29.1.4: widow check removed — was breaking pages early and
      // leaving big empty space on page 1. Natural flow wins.
      y = ensureSpace(doc, y, estH);
      y = drawQuestion(doc, q, y, fontFamily, lang, imageCache, /* dotted */ false);
      y += (q.type === "fill") ? Math.round(SPACING.betweenQuestions * 0.55) : SPACING.betweenQuestions;
    }
  }

  // ── Section 2: Written response ───────────────────────────────────
  if (written.length > 0) {
    y += SPACING.beforeSection;
    y = ensureSpace(doc, y, 30);
    y = drawSectionHeader(
      doc, y, fontFamily,
      labels.partLabel.toUpperCase() + " II",
      labels.sectionWritten,
      labels.sectionWrittenSub,
    );
    for (let i = 0; i < written.length; i++) {
      const q = written[i];
      const estH = estimateQuestionHeight(q, imageCache);
      y = ensureSpace(doc, y, estH);
      y = drawQuestion(doc, q, y, fontFamily, lang, imageCache, /* dotted */ true);
      y += SPACING.betweenQuestions;
    }
  }

  // ── Footer on every page ───────────────────────────────────────────
  drawFooterAllPages(doc, fontFamily, labels);
}

// ═══════════════════════════════════════════════════════════════════════
// ANSWER KEY
// ═══════════════════════════════════════════════════════════════════════
export async function renderAnswerKey(doc, deck, classObj, opts = {}) {
  const { lang = "en", fontFamily = "helvetica" } = opts;
  const labels = LABELS[lang] || LABELS.en;
  let y = PAGE.marginY;

  // ── Header — same identity as exam (eyebrow + title + double rule) ─
  y = drawAnswerKeyHeader(doc, deck, classObj, y, fontFamily, labels);

  // ── Answers, in ORIGINAL question order ──
  //   Reason: the teacher's mental model is question N, not section.
  //   Mixing section ordering with original numbering would mean the
  //   key reads "1, 3, 4, 6, 2, 5" which is confusing during grading.
  //   We keep the answer key sequential.
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.questionText);
  setColor(doc, COLOR.textDark);

  // PR 29.1.3: answer key MUST use the same ordering as the exam,
  // otherwise the numbers won't match. Re-group via the same helper.
  const { selection, written } = groupQuestionsBySection(deck.questions || []);
  const orderedQuestions = [...selection, ...written];
  const lineHeight = 7;
  for (let i = 0; i < orderedQuestions.length; i++) {
    const q = orderedQuestions[i];
    const displayNum = q._originalNum;  // already assigned by grouper
    if (y + lineHeight > PAGE.height - PAGE.marginY - 8) {
      doc.addPage();
      y = PAGE.marginY;
    }
    if (q.type === "match") {
      y = drawMatchAnswerBlock(doc, q, displayNum, y, fontFamily);
      continue;
    }
    const answerText = formatAnswerForKey(q, labels);
    const wrapped = doc.splitTextToSize(`${displayNum}. ${answerText}`, PAGE.contentWidth);
    for (const line of wrapped) {
      if (y + lineHeight > PAGE.height - PAGE.marginY - 8) {
        doc.addPage();
        y = PAGE.marginY;
      }
      doc.text(line, PAGE.marginX, y);
      y += lineHeight;
    }
  }

  drawFooterAllPages(doc, fontFamily, labels);
}

// ═══════════════════════════════════════════════════════════════════════
// HEADERS — exam and answer key
// ═══════════════════════════════════════════════════════════════════════

// Exam header: eyebrow + title + meta + double-rule + name/date/score row.
// The double rule is the signature element — 1.2mm thick black bar
// followed by a hairline gray below, with 1mm air between. Looks like a
// printer's stripe.
function drawExamHeader(doc, deck, classObj, y, fontFamily, labels, totalQ) {
  // Eyebrow — class name + grade in small-caps style
  if (classObj?.name) {
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(FONT.eyebrow);
    setColor(doc, COLOR.textMute);
    doc.text(classObj.name.toUpperCase(), PAGE.marginX, y, { charSpace: 0.4 });
    // PR 30.2: gap proportional to title cap height. Title=18pt needs ~6.5mm.
    y += FONT.title * 0.25 + 2;
  }

  // Title
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.title);
  setColor(doc, COLOR.textBlack);
  y = drawWrappedText(doc, deck.title || "Deck", PAGE.marginX, y, PAGE.contentWidth, FONT.title * 0.42);
  // Small extra breath after the title before the meta line
  y += 1.5;

  // Meta line: N preguntas · M minutes (estimated)
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.meta);
  setColor(doc, COLOR.textMid);
  const estMinutes = Math.max(5, Math.round(totalQ * 1.5));
  const metaText = `${totalQ} ${labels.questions}  ·  ~${estMinutes} ${labels.minutes}`;
  doc.text(metaText, PAGE.marginX, y);
  y += 6;

  // Double rule — the signature element
  y = drawDoubleRule(doc, y);
  y += SPACING.afterDoubleRule;

  // Fields row: Nombre · Fecha · Nota
  y = drawFieldsRow(doc, y, fontFamily, labels);
  y += SPACING.afterFieldsRow;

  return y;
}

function drawAnswerKeyHeader(doc, deck, classObj, y, fontFamily, labels) {
  // Eyebrow says "ANSWER KEY" instead of class name (so the teacher can
  // tell at a glance which PDF they grabbed).
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.eyebrow);
  setColor(doc, COLOR.textMute);
  doc.text(labels.answerKey.toUpperCase(), PAGE.marginX, y, { charSpace: 0.4 });
  // PR 30.2: gap proportional to title cap height. Title=18pt needs ~6.5mm.
  y += FONT.title * 0.25 + 2;

  // Title
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.title);
  setColor(doc, COLOR.textBlack);
  y = drawWrappedText(doc, deck.title || "Deck", PAGE.marginX, y, PAGE.contentWidth, FONT.title * 0.42);
  y += 2;

  // Class name in meta position (smaller)
  if (classObj?.name) {
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(FONT.meta);
    setColor(doc, COLOR.textMid);
    doc.text(classObj.name, PAGE.marginX, y);
    y += 6;
  } else {
    y += 4;
  }

  y = drawDoubleRule(doc, y);
  y += SPACING.afterDoubleRule + 3;

  return y;
}

// Double-rule signature element: thick black bar + hairline below.
function drawDoubleRule(doc, y) {
  // Thick top bar (1.2mm tall)
  setFillColor(doc, COLOR.ruleHeavy);
  doc.rect(PAGE.marginX, y, PAGE.contentWidth, 1.2, "F");
  y += 1.2 + 1.4; // 1.4mm air

  // Hairline below
  setDrawColor(doc, COLOR.ruleLight);
  doc.setLineWidth(0.2);
  doc.line(PAGE.marginX, y, PAGE.marginX + PAGE.contentWidth, y);
  return y;
}

// Fields row: Name ⋯⋯⋯⋯⋯⋯ Date ⋯⋯⋯⋯ Score ⋯⋯⋯⋯
//
// PR 29.0.3 fix 5: was 3 separate dotted-leader-then-line segments.
// Replaced by ONE continuous dotted underline running from the start
// of the first field label to the right margin, with labels sitting
// above the line. The dots touch from edge to edge — feels like one
// long ledger line, more cohesive than three orphaned underlines.
//
// Layout:
//
//   Nombre              Fecha            Nota
//   · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·
//
function drawFieldsRow(doc, y, fontFamily, labels) {
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.fieldLabel);
  setColor(doc, COLOR.textDark);

  // Place each label at its column start
  const totalW = PAGE.contentWidth;
  const fields = [
    { label: labels.name, frac: 0.46 },
    { label: labels.date, frac: 0.30 },
    { label: labels.score, frac: 0.24 },
  ];

  let x = PAGE.marginX;
  for (const f of fields) {
    doc.text(f.label, x, y);
    x += totalW * f.frac;
  }

  // ONE continuous dotted underline spanning the full content width
  // below the labels. The dots are small filled circles spaced ~1.8mm
  // apart — same density as the dot leader in fields used before, but
  // unbroken now.
  const lineY = y + 3.5;
  drawDotLeader(doc, PAGE.marginX, lineY, PAGE.marginX + PAGE.contentWidth, COLOR.textMute);

  return lineY;
}

// Tiny dot leader — small dots at low opacity feel-equivalent. We use
// gray small text repeats spaced evenly. Looks like "· · · · ·".
function drawDotLeader(doc, x1, y, x2, color) {
  const len = x2 - x1;
  if (len <= 2) return;
  setFillColor(doc, color);
  const step = 1.8;
  for (let cx = x1 + 0.6; cx < x2 - 0.6; cx += step) {
    doc.circle(cx, y, 0.2, "F");
  }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION HEADER
// ═══════════════════════════════════════════════════════════════════════
//
// Layout:
//
//     ──────────────  PARTE I  ──────────────
//                   Selección
//        Elegí la respuesta correcta
//
// Two thin lines flank the part label, centered. Below them, a bold
// section title (medium-weight serif feel via charSpace), and below
// that an italicized subtitle in muted gray. Distinctive but quiet.
function drawSectionHeader(doc, y, fontFamily, partLabel, title, subtitle) {
  const cx = PAGE.marginX + PAGE.contentWidth / 2;

  // Top — part label flanked by horizontal rules
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.sectionLabel);
  setColor(doc, COLOR.textMid);
  const partW = doc.getTextWidth(partLabel);
  const ruleHalf = (PAGE.contentWidth - partW - 12) / 2;

  setDrawColor(doc, COLOR.textMid);
  doc.setLineWidth(0.4);
  doc.line(PAGE.marginX, y - 1.4, PAGE.marginX + ruleHalf, y - 1.4);
  doc.line(PAGE.marginX + PAGE.contentWidth - ruleHalf, y - 1.4, PAGE.marginX + PAGE.contentWidth, y - 1.4);

  doc.text(partLabel, cx, y, { align: "center", charSpace: 0.6 });

  y += 6;

  // Title
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.sectionTitle);
  setColor(doc, COLOR.textBlack);
  doc.text(title, cx, y, { align: "center" });
  y += 5;

  // Subtitle
  doc.setFont(fontFamily, "italic");
  doc.setFontSize(FONT.sectionSub);
  setColor(doc, COLOR.textMute);
  doc.text(subtitle, cx, y, { align: "center" });

  return y + SPACING.afterSectionHeader;
}

// ═══════════════════════════════════════════════════════════════════════
// QUESTION RENDERING
// ═══════════════════════════════════════════════════════════════════════

async function preloadImages(questions) {
  const cache = new Map();
  for (const q of questions) {
    if (q.image_url && !cache.has(q.image_url)) {
      cache.set(q.image_url, await fetchImageAsDataURL(q.image_url));
    }
  }
  return cache;
}

// Single-question renderer. The `dotted` flag tells us whether this
// question is in the written-response section (uses dotted writing
// lines + dashed circle around the number) or selection (solid).
function drawQuestion(doc, q, startY, fontFamily, lang, imageCache, dotted) {
  let y = startY;
  const labels = LABELS[lang] || LABELS.en;
  const num = q._originalNum;

  // Number circle (left margin, bullet-like)
  const circleX = PAGE.marginX + 3;
  const circleY = y - 1.4;
  const circleR = 3.5;
  if (dotted) {
    // Dashed circle — render as 16 short arcs via 16 dots around the
    // perimeter (cheaper than computing real arc paths; reads as dashed)
    setFillColor(doc, COLOR.textMid);
    const steps = 16;
    for (let i = 0; i < steps; i += 2) {
      const ang = (i / steps) * Math.PI * 2;
      const dx = circleX + Math.cos(ang) * circleR;
      const dy = circleY + Math.sin(ang) * circleR;
      doc.circle(dx, dy, 0.35, "F");
    }
  } else {
    setDrawColor(doc, COLOR.textMid);
    doc.setLineWidth(0.5);
    // PR 29.0.4: jsPDF's doc.circle() WITHOUT a style arg ("S"|"F"|"FD"|"D")
    // does NOT draw anything visible. Adding "S" explicitly to stroke.
    doc.circle(circleX, circleY, circleR, "S");
  }

  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.questionNum);
  setColor(doc, COLOR.textBlack);
  doc.text(String(num), circleX, circleY + 1.4, { align: "center" });

  // Question prompt (offset right of the circle)
  const textX = PAGE.marginX + circleR * 2 + 5;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.questionText);
  setColor(doc, COLOR.textDark);
  const questionText = q.q || q.prompt || q.question || "";
  const promptMaxW = PAGE.contentWidth - (textX - PAGE.marginX);
  y = drawWrappedText(doc, questionText, textX, y, promptMaxW, FONT.questionText * 0.45);
  y += SPACING.afterQuestionNum;

  // Image (if present)
  if (q.image_url && imageCache.has(q.image_url)) {
    const img = imageCache.get(q.image_url);
    if (img) {
      const maxW = PAGE.contentWidth * 0.6;
      const maxH = 55;
      const { w, h } = scaleImageToFit(img.naturalW, img.naturalH, maxW, maxH);
      const ix = PAGE.marginX + (PAGE.contentWidth - w) / 2;
      try {
        doc.addImage(img.dataUrl, img.format, ix, y, w, h);
        y += h + SPACING.afterImage;
      } catch (err) {
        console.warn("[pdf classic] addImage failed:", err);
      }
    }
  }

  // Type-specific response area
  switch (q.type) {
    case "mcq": y = drawMCQOptions(doc, q, y, fontFamily, textX); break;
    case "tf": y = drawTFOptions(doc, y, fontFamily, labels, textX); break;
    case "fill": y = drawFillBlankHint(y); break;
    case "match": y = drawMatchPairs(doc, q, y, fontFamily); break;
    case "order": y = drawOrderItems(doc, q, y, fontFamily, textX); break;
    case "slider": y = drawSliderTrack(doc, q, y, fontFamily, labels); break;
    case "sentence":
    case "free":
    case "open":
    default:
      if (q.type === "sentence" && q.required_word) {
        doc.setFont(fontFamily, "italic");
        doc.setFontSize(FONT.hint);
        setColor(doc, COLOR.textMute);
        doc.text(`(${labels.useWord}: "${q.required_word}")`, textX, y);
        y += 4.5;
      }
      y = drawDottedLines(doc, y, q.type === "open" || q.type === "free" ? 5 : 3);
      break;
  }
  return y;
}

function drawMCQOptions(doc, q, startY, fontFamily, textX) {
  let y = startY;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.option);
  setColor(doc, COLOR.textDark);
  const options = q.options || [];
  const letters = ["a", "b", "c", "d", "e", "f"];
  for (let i = 0; i < options.length; i++) {
    // PR 29.0.3 fix 1: bullets bigger (2.6mm radius) so the student
    // can mark them clearly with a pen. The old 1.7mm circles were
    // hard to see against the option text.
    // PR 29.0.4: add "S" so jsPDF actually strokes the circle.
    setDrawColor(doc, COLOR.textMute);
    doc.setLineWidth(0.5);
    doc.circle(textX + 2.6, y - 1.2, 2.6, "S");
    // Letter inside paren
    doc.setFont(fontFamily, "bold");
    doc.text(`${letters[i]})`, textX + 8, y);
    doc.setFont(fontFamily, "normal");
    const optionText = String(options[i] ?? "");
    const wrapped = doc.splitTextToSize(optionText, PAGE.contentWidth - (textX - PAGE.marginX) - 15);
    for (let j = 0; j < wrapped.length; j++) {
      doc.text(wrapped[j], textX + 14, y);
      if (j < wrapped.length - 1) y += 4.5;
    }
    y += SPACING.betweenOptions;
  }
  return y;
}

function drawTFOptions(doc, startY, fontFamily, labels, textX) {
  let y = startY;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.option);
  setColor(doc, COLOR.textDark);
  setDrawColor(doc, COLOR.textMute);
  doc.setLineWidth(0.5);
  // PR 29.0.3 fix 1: True/False bullets bumped from 1.7mm to 3mm.
  // Originally too small to comfortably mark with a pen.
  // PR 29.0.4: add "S" so jsPDF actually strokes the circles.
  const r = 3;
  doc.circle(textX + r, y - 1.2, r, "S");
  doc.text(labels.true, textX + r * 2 + 4, y);
  const trueWidth = doc.getTextWidth(labels.true);
  const falseX = textX + r * 2 + 4 + trueWidth + 14;
  doc.circle(falseX - 4, y - 1.2, r, "S");
  doc.text(labels.false, falseX + r, y);
  y += SPACING.betweenOptions;
  return y;
}

// Fill blanks: the prompt already has ___ markers. Just breathing space.
function drawFillBlankHint(startY) {
  return startY + 3;
}

function drawMatchPairs(doc, q, startY, fontFamily) {
  let y = startY;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.option);
  setColor(doc, COLOR.textDark);
  const pairs = q.pairs || q.items || [];
  const lefts = pairs.map((p, i) => p.left || p.l || `Item ${i + 1}`);
  const rightsWithOriginalIdx = pairs.map((p, i) => ({
    text: p.right || p.r || `Match ${i + 1}`,
    originalIdx: i,
  }));
  const shuffled = deterministicShuffle(
    rightsWithOriginalIdx,
    String(q.q || q.prompt || pairs.length)
  );
  const colWidth = (PAGE.contentWidth - 8) / 2;
  const xLeft = PAGE.marginX + 4;
  const xRight = PAGE.marginX + 4 + colWidth + 8;
  const lineHeight = 6;
  for (let i = 0; i < pairs.length; i++) {
    if (y + lineHeight > PAGE.height - PAGE.marginY - 8) break;
    doc.setFont(fontFamily, "bold");
    doc.text(`${i + 1}.`, xLeft, y);
    doc.setFont(fontFamily, "normal");
    const leftWrapped = doc.splitTextToSize(lefts[i], colWidth - 8);
    doc.text(leftWrapped, xLeft + 6, y);
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

function drawOrderItems(doc, q, startY, fontFamily, textX) {
  let y = startY;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.option);
  setColor(doc, COLOR.textDark);
  const items = q.items || q.options || [];
  for (let i = 0; i < items.length; i++) {
    if (y + 6 > PAGE.height - PAGE.marginY - 8) break;
    // Position number underline (gray)
    setDrawColor(doc, COLOR.textMute);
    doc.setLineWidth(0.35);
    doc.line(textX, y + 0.5, textX + 8, y + 0.5);
    const itemText = String(items[i]);
    const wrapped = doc.splitTextToSize(itemText, PAGE.contentWidth - (textX - PAGE.marginX) - 12);
    doc.text(wrapped, textX + 10, y);
    y += 6 + (wrapped.length - 1) * 4;
  }
  return y;
}

function drawSliderTrack(doc, q, startY, fontFamily, labels) {
  let y = startY + 2;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.hint);
  setColor(doc, COLOR.textMid);
  const min = q.min ?? 0;
  const max = q.max ?? 100;
  const trackY = y + 4;
  const trackX1 = PAGE.marginX + 8;
  const trackX2 = PAGE.marginX + PAGE.contentWidth - 8;
  setDrawColor(doc, COLOR.textMute);
  doc.setLineWidth(0.5);
  doc.line(trackX1, trackY, trackX2, trackY);
  doc.line(trackX1, trackY - 1.5, trackX1, trackY + 1.5);
  doc.line(trackX2, trackY - 1.5, trackX2, trackY + 1.5);
  doc.text(String(min), trackX1, trackY + 5, { align: "center" });
  doc.text(String(max), trackX2, trackY + 5, { align: "center" });
  y = trackY + 9;
  doc.setFontSize(FONT.option);
  setColor(doc, COLOR.textDark);
  doc.text("____________", PAGE.marginX + 8, y);
  y += 4;
  return y;
}

// Dotted writing lines — bullet-journal style. Distinguished from a
// plain underline by: short dots, slightly looser spacing.
function drawDottedLines(doc, startY, count) {
  let y = startY;
  setFillColor(doc, COLOR.textFaint);
  for (let i = 0; i < count; i++) {
    if (y + SPACING.dottedLineGap > PAGE.height - PAGE.marginY - 8) break;
    // Draw a row of dots from marginX+4 to right edge
    const x1 = PAGE.marginX + 4;
    const x2 = PAGE.marginX + PAGE.contentWidth - 4;
    const step = 1.6;
    for (let cx = x1; cx <= x2; cx += step) {
      doc.circle(cx, y, 0.18, "F");
    }
    y += SPACING.dottedLineGap;
  }
  return y;
}

function estimateQuestionHeight(q, imageCache) {
  // PR 29.0.6: still over-estimating. Tightening further based on
  // Jota's second test (Ser vs Estar). Real per-question footprint
  // measured manually:
  //   - 1-line prompt + TF:  ~13mm
  //   - 1-line prompt + MCQ 4opts: ~35mm
  //   - 1-line prompt + fill: ~7mm
  //   - 2-line prompt + MCQ: ~42mm
  //
  // Coefficients reduced. SafetyPad removed (was over-paying for safety
  // and shoving questions to next page even with plenty of room).
  const promptLen = (q.q || q.prompt || q.question || "").length || 30;
  // chars/line is generous — content width 174mm at 11pt Helvetica
  // fits ~95 chars typical
  const promptLines = Math.max(1, Math.ceil(promptLen / 95));
  // base = circle (7mm tall) + prompt baseline alignment ~5mm = 5mm net
  const base = 5;
  let imageH = 0;
  if (q.image_url && imageCache?.get(q.image_url)) {
    const img = imageCache.get(q.image_url);
    const { h } = scaleImageToFit(img.naturalW, img.naturalH, PAGE.contentWidth * 0.6, 55);
    imageH = h + SPACING.afterImage;
  }
  // Per option/row coefficients reduced slightly to match real render.
  const typeH =
    q.type === "mcq" ? (q.options?.length || 4) * SPACING.betweenOptions :
    q.type === "tf" ? SPACING.betweenOptions :
    q.type === "fill" ? 0 :
    q.type === "match" ? (q.pairs?.length || 4) * 6 :
    q.type === "order" ? (q.items?.length || 4) * 6 :
    q.type === "slider" ? 12 :
    (q.type === "free" || q.type === "open") ? 5 * SPACING.dottedLineGap :
    3 * SPACING.dottedLineGap;
  // First prompt line ~ 7mm absorbed into base; extra lines ~ 6mm each
  return base + promptLines * 6 + imageH + typeH;
}

function drawMatchAnswerBlock(doc, q, num, startY, fontFamily) {
  const pairs = Array.isArray(q.pairs) ? q.pairs : [];
  if (pairs.length === 0) {
    doc.text(`${num}. —`, PAGE.marginX, startY);
    return startY + 7;
  }

  const padTop = 4;
  const headerHeight = 8;
  const rowHeight = 5.5;
  const padBottom = 4;
  const padX = 5;
  const arrowGap = 6;

  const blockHeight = padTop + headerHeight + (pairs.length * rowHeight) + padBottom;

  if (startY + blockHeight > PAGE.height - PAGE.marginY - 8) {
    doc.addPage();
    startY = PAGE.marginY;
  }

  let y = startY;

  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.questionText);
  let maxLeftWidth = 0;
  for (const p of pairs) {
    const w = doc.getTextWidth(String(p.left || ""));
    if (w > maxLeftWidth) maxLeftWidth = w;
  }
  const maxLeftAllowed = PAGE.contentWidth * 0.45;
  if (maxLeftWidth > maxLeftAllowed) maxLeftWidth = maxLeftAllowed;

  setDrawColor(doc, COLOR.ruleLight);
  setFillColor(doc, [250, 250, 248]);
  doc.setLineWidth(0.3);
  doc.roundedRect(PAGE.marginX, y, PAGE.contentWidth, blockHeight, 1.5, 1.5, "FD");

  y += padTop + 4;
  doc.setFont(fontFamily, "bold");
  setColor(doc, COLOR.textDark);
  doc.text(`${num}.`, PAGE.marginX + padX, y);
  doc.setFont(fontFamily, "normal");
  setColor(doc, COLOR.textMid);
  doc.setFontSize(FONT.hint);
  doc.text("(match)", PAGE.marginX + padX + 8, y);
  y += (headerHeight - 4);

  doc.setFontSize(FONT.questionText);
  setColor(doc, COLOR.textDark);
  for (const p of pairs) {
    setFillColor(doc, COLOR.textMute);
    doc.circle(PAGE.marginX + padX + 2, y - 1.4, 0.7, "F");
    const leftText = doc.splitTextToSize(String(p.left || ""), maxLeftAllowed)[0];
    doc.text(leftText, PAGE.marginX + padX + 6, y);
    const arrowX = PAGE.marginX + padX + 6 + maxLeftWidth + arrowGap;
    setColor(doc, COLOR.textMute);
    doc.text("→", arrowX, y);
    setColor(doc, COLOR.textDark);
    const rightStartX = arrowX + 5;
    const rightMaxWidth = PAGE.marginX + PAGE.contentWidth - rightStartX - padX;
    const rightText = doc.splitTextToSize(String(p.right || ""), rightMaxWidth)[0];
    doc.text(rightText, rightStartX, y);
    y += rowHeight;
  }
  return startY + blockHeight + 2;
}

// ─── Footer ──────────────────────────────────────────────────────────────
// Drawn on every page after content. Hairline above for separation, then
// "Page X of Y" left + Clasloop branding right. Both in faint gray.
function drawFooterAllPages(doc, fontFamily, labels) {
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);

    // Faint hairline above the footer
    setDrawColor(doc, COLOR.ruleFaint);
    doc.setLineWidth(0.2);
    const ruleY = PAGE.height - 12;
    doc.line(PAGE.marginX, ruleY, PAGE.marginX + PAGE.contentWidth, ruleY);

    doc.setFont(fontFamily, "normal");
    doc.setFontSize(FONT.footer);
    setColor(doc, COLOR.textMute);
    const yFooter = PAGE.height - 7;
    doc.text(labels.pageOfTotal(p, total), PAGE.marginX, yFooter);
    const branding = labels.poweredBy;
    const w = doc.getTextWidth(branding);
    doc.text(branding, PAGE.marginX + PAGE.contentWidth - w, yFooter);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

// Page-break helper: if `neededH` doesn't fit on current page, add a
// new page and reset y. Returns the y to use.
// The -12 reserves room for the footer.
function ensureSpace(doc, y, neededH) {
  if (y + neededH > PAGE.height - PAGE.marginY - 8) {
    doc.addPage();
    return PAGE.marginY;
  }
  return y;
}

function setColor(doc, rgb) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}
function setDrawColor(doc, rgb) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}
function setFillColor(doc, rgb) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}
