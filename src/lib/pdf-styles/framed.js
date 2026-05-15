// ─── pdf-styles/framed ──────────────────────────────────────────────────
//
// PR 30: "Framed" style — "El marco". Formal exam look with a decorative
// border around each page. Centered header. Serif typography. Reads like
// an academic exam paper or a certificate.
//
// Signature elements:
//
//   1. DECORATIVE BORDER on every page — double-line frame with corner
//      ornaments. Inner frame ~6mm from page edges, outer frame at the
//      page edge. Corner ornaments are simple ▲-style triangles or
//      "L" brackets, not floral garlands.
//
//   2. CENTERED HEADER. Title large + centered, eyebrow below it. Most
//      other styles have left-aligned headers; centering instantly reads
//      "formal".
//
//   3. SERIF TYPOGRAPHY throughout. jsPDF's "times" font is Times Roman.
//      Combined with the frame, gives a "real exam paper" feel that the
//      sans-serif styles can't match.
//
//   4. CENTERED SECTION HEADERS. "I · Selection" with a horizontal rule
//      above and below. Like chapter dividers in a book.
//
//   5. QUESTION NUMBER as a SQUARE BADGE with border — not circle, not
//      mono number in gutter. Squared brackets feel academic.
//
//   6. MCQ as "[A]" "[B]" letters in square brackets — formal list style.
//
//   7. TF as Y / N boxes (4×4mm squares with letter inside). Big enough
//      to mark with a pen, formal aesthetic.
//
//   8. Written-response lines: solid hairlines, like the editorial style
//      but with slightly more spacing (more formal feel).
//
//   9. Footer: page indicator centered, branding centered below.
//      Matches the symmetric layout of the rest of the page.
//
// All grayscale + black by default. PR 32 will add color customization.

import {
  PAGE_A4, DEFAULT_MARGINS, LABELS,
  drawWrappedText, deterministicShuffle, formatAnswerForKey,
  fetchImageAsDataURL, scaleImageToFit,
  groupQuestionsBySection,
} from "./shared";

const PAGE = {
  ...PAGE_A4,
  marginX: 24,             // PR 30.1: was 28
  marginY: 22,             // PR 30.1: was 26
  contentWidth: PAGE_A4.width - 24 * 2,
  contentHeight: PAGE_A4.height - 22 * 2,
};

// Frame coordinates: outer at 6mm from page edges, inner at 9mm.
const FRAME = {
  outer: 6,
  inner: 9,
};

const FONT = {
  eyebrow: 9,
  title: 26,
  meta: 10,
  fieldLabel: 10,
  sectionLabel: 10,
  sectionTitle: 14,
  sectionSub: 10,
  questionNum: 10,
  questionText: 11,
  option: 10.5,
  hint: 8.5,
  footer: 8,
};

const SPACING = {
  afterEyebrow: 3,           // PR 30.1: was 4
  afterTitle: 3,             // PR 30.1: was 5
  afterMeta: 2,              // PR 30.1: was 3
  afterHeaderRule: 6,        // PR 30.1: was 8
  afterFieldsRow: 7,         // PR 30.1: was 9
  beforeSection: 6,          // PR 30.1: was 8
  afterSectionHeader: 5,     // PR 30.1: was 7
  afterQuestionNum: 2,       // PR 30.1: was 3
  betweenOptions: 4,         // PR 30.1: was 5
  writingLineGap: 6,         // PR 30.1: was 7
  betweenQuestions: 4,       // PR 30.1: was 6
  afterImage: 4,
};

const COLOR = {
  textBlack: [25, 25, 25],
  textDark: [50, 50, 50],
  textMid: [100, 100, 100],
  textMute: [150, 150, 150],
  textFaint: [200, 200, 200],
  frame: [60, 60, 60],          // dark gray for the frame lines
  ornament: [60, 60, 60],
  // PR 32 will replace these defaults with user palette
  accent: [60, 60, 60],
};

// Gutter for the square question-number badge
const NUMBER_BADGE_SIZE = 7;
const QUESTION_INDENT = NUMBER_BADGE_SIZE + 4;

// ═══════════════════════════════════════════════════════════════════════
// EXAM
// ═══════════════════════════════════════════════════════════════════════
export async function renderExam(doc, deck, classObj, opts = {}) {
  const { lang = "en", fontFamily = "times" } = opts;
  const labels = LABELS[lang] || LABELS.en;
  let y = PAGE.marginY;

  const imageCache = await preloadImages(deck.questions || []);
  const { selection, written } = groupQuestionsBySection(deck.questions || []);
  const totalQ = (deck.questions || []).length;

  y = drawExamHeader(doc, deck, classObj, y, fontFamily, labels, totalQ);

  // ── Section 1: Selection ──────────────────────────────────────────
  if (selection.length > 0) {
    y = ensureSpace(doc, y, 22);
    y = drawSectionHeader(
      doc, y, fontFamily,
      "I",
      labels.sectionSelection,
      labels.sectionSelectionSub,
    );
    for (const q of selection) {
      const estH = estimateQuestionHeight(q, imageCache);
      y = ensureSpace(doc, y, estH);
      y = drawQuestion(doc, q, y, fontFamily, lang, imageCache);
      y += (q.type === "fill") ? Math.round(SPACING.betweenQuestions * 0.55) : SPACING.betweenQuestions;
    }
  }

  // ── Section 2: Written response ───────────────────────────────────
  if (written.length > 0) {
    y += SPACING.beforeSection;
    y = ensureSpace(doc, y, 22);
    y = drawSectionHeader(
      doc, y, fontFamily,
      "II",
      labels.sectionWritten,
      labels.sectionWrittenSub,
    );
    for (const q of written) {
      const estH = estimateQuestionHeight(q, imageCache);
      y = ensureSpace(doc, y, estH);
      y = drawQuestion(doc, q, y, fontFamily, lang, imageCache);
      y += SPACING.betweenQuestions;
    }
  }

  // Draw frames + footers on ALL pages at the end (so frame matches
  // total page count, and footer can show "Page 2 of 4")
  drawFramesAllPages(doc);
  drawFooterAllPages(doc, fontFamily, labels);
}

// ═══════════════════════════════════════════════════════════════════════
// ANSWER KEY
// ═══════════════════════════════════════════════════════════════════════
export async function renderAnswerKey(doc, deck, classObj, opts = {}) {
  const { lang = "en", fontFamily = "times" } = opts;
  const labels = LABELS[lang] || LABELS.en;
  let y = PAGE.marginY;

  // Centered eyebrow
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.eyebrow);
  setColor(doc, COLOR.textMute);
  doc.text(labels.answerKey.toUpperCase(), PAGE.width / 2, y, { align: "center", charSpace: 0.8 });
  // PR 30.2: gap proportional to title fontSize so the title's cap height
  // doesn't overlap the eyebrow.
  y += FONT.title * 0.25 + SPACING.afterEyebrow;

  // Centered title
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.title);
  setColor(doc, COLOR.textBlack);
  const titleLines = doc.splitTextToSize(deck.title || "Deck", PAGE.contentWidth);
  for (const line of titleLines) {
    doc.text(line, PAGE.width / 2, y, { align: "center" });
    y += FONT.title * 0.42;
  }
  y += SPACING.afterTitle;

  // Header horizontal rule
  drawHeaderRule(doc, y);
  y += SPACING.afterHeaderRule;

  // Answers — same ordering as exam
  const { selection, written } = groupQuestionsBySection(deck.questions || []);
  const orderedQuestions = [...selection, ...written];
  const lineHeight = 7;
  for (let i = 0; i < orderedQuestions.length; i++) {
    const q = orderedQuestions[i];
    const displayNum = q._originalNum;
    if (y + lineHeight > PAGE.height - PAGE.marginY - 14) {
      doc.addPage();
      y = PAGE.marginY;
    }
    if (q.type === "match") {
      y = drawMatchAnswerBlock(doc, q, displayNum, y, fontFamily);
      continue;
    }
    // Square badge with number
    drawNumberBadge(doc, PAGE.marginX, y - NUMBER_BADGE_SIZE + 1, displayNum, fontFamily);
    // Answer text
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(FONT.questionText);
    setColor(doc, COLOR.textDark);
    const answerText = formatAnswerForKey(q, labels);
    const wrapped = doc.splitTextToSize(answerText, PAGE.contentWidth - QUESTION_INDENT);
    for (let j = 0; j < wrapped.length; j++) {
      if (y + lineHeight > PAGE.height - PAGE.marginY - 14) {
        doc.addPage();
        y = PAGE.marginY;
      }
      doc.text(wrapped[j], PAGE.marginX + QUESTION_INDENT, y);
      y += lineHeight;
    }
  }

  drawFramesAllPages(doc);
  drawFooterAllPages(doc, fontFamily, labels);
}

// ═══════════════════════════════════════════════════════════════════════
// FRAME — drawn on every page after all content is done
// ═══════════════════════════════════════════════════════════════════════
//
// Each page gets:
//
//   ┌────────────────────────┐  outer frame
//   │                        │
//   │  ┌──────────────────┐  │  inner frame
//   │  │                  │  │
//   │  │   page content   │  │
//   │  │                  │  │
//   │  └──────────────────┘  │
//   │                        │
//   └────────────────────────┘
//
// Corner ornaments: small diagonal lines connecting outer to inner at
// each corner. Adds visual weight without being floral.
function drawFramesAllPages(doc) {
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    drawFrame(doc);
  }
}

function drawFrame(doc) {
  const oX = FRAME.outer;
  const oY = FRAME.outer;
  const oW = PAGE.width - 2 * FRAME.outer;
  const oH = PAGE.height - 2 * FRAME.outer;

  const iX = FRAME.inner;
  const iY = FRAME.inner;
  const iW = PAGE.width - 2 * FRAME.inner;
  const iH = PAGE.height - 2 * FRAME.inner;

  // Outer frame — thin
  setDrawColor(doc, COLOR.frame);
  doc.setLineWidth(0.35);
  doc.rect(oX, oY, oW, oH, "S");

  // Inner frame — slightly thicker
  doc.setLineWidth(0.6);
  doc.rect(iX, iY, iW, iH, "S");

  // Corner ornaments — small diagonal cuts from outer to inner at each corner
  doc.setLineWidth(0.35);
  const corners = [
    [oX, oY, iX, iY],                           // top-left
    [oX + oW, oY, iX + iW, iY],                 // top-right
    [oX, oY + oH, iX, iY + iH],                 // bottom-left
    [oX + oW, oY + oH, iX + iW, iY + iH],       // bottom-right
  ];
  for (const [x1, y1, x2, y2] of corners) {
    doc.line(x1, y1, x2, y2);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// HEADER — eyebrow + title + meta + horizontal rule + fields row
// ═══════════════════════════════════════════════════════════════════════
function drawExamHeader(doc, deck, classObj, y, fontFamily, labels, totalQ) {
  // Eyebrow (centered, small caps)
  if (classObj?.name) {
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(FONT.eyebrow);
    setColor(doc, COLOR.textMute);
    doc.text(classObj.name.toUpperCase(), PAGE.width / 2, y, { align: "center", charSpace: 0.8 });
    // PR 30.2: gap must clear the title's cap height. With title at
    // FONT.title pt, cap height ≈ 0.7 * fontSize pt ≈ FONT.title * 0.25 mm.
    // Add 2mm air. Was hardcoded to 5mm which was too small for large
    // serif titles and caused "Spanish 1A" to overlap with "Ser vs Estar".
    y += FONT.title * 0.25 + SPACING.afterEyebrow;
  }

  // Title (centered, large serif)
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.title);
  setColor(doc, COLOR.textBlack);
  const titleLines = doc.splitTextToSize(deck.title || "Deck", PAGE.contentWidth);
  for (const line of titleLines) {
    doc.text(line, PAGE.width / 2, y, { align: "center" });
    y += FONT.title * 0.42;
  }
  y += SPACING.afterTitle;

  // Meta line (centered)
  doc.setFont(fontFamily, "italic");
  doc.setFontSize(FONT.meta);
  setColor(doc, COLOR.textMid);
  const estMinutes = Math.max(5, Math.round(totalQ * 1.5));
  const metaText = `${totalQ} ${labels.questions} · ~${estMinutes} ${labels.minutes}`;
  doc.text(metaText, PAGE.width / 2, y, { align: "center" });
  y += SPACING.afterMeta + 4;

  // Header horizontal rule
  drawHeaderRule(doc, y);
  y += SPACING.afterHeaderRule;

  // Field row
  y = drawFieldsRow(doc, y, fontFamily, labels);
  y += SPACING.afterFieldsRow;

  return y;
}

// Header horizontal rule — full width with a small diamond accent in the middle
function drawHeaderRule(doc, y) {
  setDrawColor(doc, COLOR.accent);
  doc.setLineWidth(0.5);
  const midX = PAGE.width / 2;
  const ruleHalf = (PAGE.contentWidth - 6) / 2;
  // Left rule
  doc.line(PAGE.marginX, y, midX - 3, y);
  // Right rule
  doc.line(midX + 3, y, PAGE.marginX + PAGE.contentWidth, y);
  // Diamond accent in the middle
  setFillColor(doc, COLOR.accent);
  // Diamond = 4 lines forming a tiny rhombus
  const dx = 2;
  const dy = 1.5;
  doc.line(midX - dx, y, midX, y - dy);
  doc.line(midX, y - dy, midX + dx, y);
  doc.line(midX + dx, y, midX, y + dy);
  doc.line(midX, y + dy, midX - dx, y);
}

// Fields row: Name / Date / Score with a single hairline underline.
// Same as editorial pattern.
function drawFieldsRow(doc, y, fontFamily, labels) {
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.fieldLabel);
  setColor(doc, COLOR.textDark);

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

  const lineY = y + 3.5;
  setDrawColor(doc, COLOR.textMid);
  doc.setLineWidth(0.4);
  doc.line(PAGE.marginX, lineY, PAGE.marginX + PAGE.contentWidth, lineY);

  return lineY;
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION HEADER — centered "I · Selection" with rules above and below
// ═══════════════════════════════════════════════════════════════════════
//
// Layout:
//
//   ───────────────  I  ───────────────
//                Selection
//          Choose the correct answer
//
function drawSectionHeader(doc, y, fontFamily, partLabel, title, subtitle) {
  const cx = PAGE.width / 2;

  // Roman numeral (large, centered, flanked by horizontal rules)
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.sectionTitle);
  setColor(doc, COLOR.textBlack);
  const numW = doc.getTextWidth(partLabel);
  const ruleHalf = (PAGE.contentWidth - numW - 12) / 2;

  setDrawColor(doc, COLOR.accent);
  doc.setLineWidth(0.4);
  doc.line(PAGE.marginX, y - 1.4, PAGE.marginX + ruleHalf, y - 1.4);
  doc.line(PAGE.marginX + PAGE.contentWidth - ruleHalf, y - 1.4, PAGE.marginX + PAGE.contentWidth, y - 1.4);

  doc.text(partLabel, cx, y, { align: "center" });
  y += 6;

  // Section title (centered, bold)
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.sectionLabel);
  setColor(doc, COLOR.textBlack);
  doc.text(title, cx, y, { align: "center" });
  y += 5;

  // Subtitle (centered, italic, gray)
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

function drawQuestion(doc, q, startY, fontFamily, lang, imageCache) {
  let y = startY;
  const labels = LABELS[lang] || LABELS.en;
  const num = q._originalNum;

  // Square number badge in the left gutter
  drawNumberBadge(doc, PAGE.marginX, y - NUMBER_BADGE_SIZE + 1, num, fontFamily);

  // Question prompt at hanging indent
  const textX = PAGE.marginX + QUESTION_INDENT;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.questionText);
  setColor(doc, COLOR.textDark);
  const questionText = q.q || q.prompt || q.question || "";
  const promptMaxW = PAGE.contentWidth - QUESTION_INDENT;
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
        console.warn("[pdf framed] addImage failed:", err);
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
    case "slider": y = drawSliderTrack(doc, q, y, fontFamily); break;
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
      y = drawWritingLines(doc, y, q.type === "open" || q.type === "free" ? 5 : 3);
      break;
  }
  return y;
}

// Square number badge — rect with border + bold number inside
function drawNumberBadge(doc, x, y, num, fontFamily) {
  setDrawColor(doc, COLOR.accent);
  doc.setLineWidth(0.5);
  doc.rect(x, y, NUMBER_BADGE_SIZE, NUMBER_BADGE_SIZE, "S");

  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.questionNum);
  setColor(doc, COLOR.textBlack);
  doc.text(String(num), x + NUMBER_BADGE_SIZE / 2, y + NUMBER_BADGE_SIZE / 2 + 1.5, { align: "center" });
}

// MCQ — "[A]" "[B]" letters in square brackets, formal list style
function drawMCQOptions(doc, q, startY, fontFamily, textX) {
  let y = startY;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.option);
  const options = q.options || [];
  const letters = ["A", "B", "C", "D", "E", "F"];
  for (let i = 0; i < options.length; i++) {
    // "[A]" letter bracket
    setColor(doc, COLOR.accent);
    doc.setFont(fontFamily, "bold");
    doc.text(`[${letters[i]}]`, textX, y);
    // Option text
    doc.setFont(fontFamily, "normal");
    setColor(doc, COLOR.textDark);
    const optionText = String(options[i] ?? "");
    const wrapped = doc.splitTextToSize(optionText, PAGE.contentWidth - (textX - PAGE.marginX) - 12);
    for (let j = 0; j < wrapped.length; j++) {
      doc.text(wrapped[j], textX + 9, y);
      if (j < wrapped.length - 1) y += 4.5;
    }
    y += SPACING.betweenOptions;
  }
  return y;
}

// TF — Y / N letters in 5×5mm squares (clearly markable)
function drawTFOptions(doc, startY, fontFamily, labels, textX) {
  let y = startY;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.option);
  setColor(doc, COLOR.textDark);
  setDrawColor(doc, COLOR.accent);
  doc.setLineWidth(0.5);
  // True square
  doc.rect(textX, y - 4, 5, 5, "S");
  doc.text(labels.true, textX + 7, y);
  const trueWidth = doc.getTextWidth(labels.true);
  const falseX = textX + 7 + trueWidth + 14;
  // False square
  doc.rect(falseX - 7, y - 4, 5, 5, "S");
  doc.text(labels.false, falseX, y);
  y += SPACING.betweenOptions + 1;
  return y;
}

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
  const colWidth = (PAGE.contentWidth - QUESTION_INDENT - 8) / 2;
  const xLeft = PAGE.marginX + QUESTION_INDENT;
  const xRight = xLeft + colWidth + 8;
  const lineHeight = 6;
  for (let i = 0; i < pairs.length; i++) {
    if (y + lineHeight > PAGE.height - PAGE.marginY - 14) break;
    doc.setFont(fontFamily, "bold");
    setColor(doc, COLOR.accent);
    doc.text(`${i + 1}.`, xLeft, y);
    doc.setFont(fontFamily, "normal");
    setColor(doc, COLOR.textDark);
    const leftWrapped = doc.splitTextToSize(lefts[i], colWidth - 8);
    doc.text(leftWrapped, xLeft + 7, y);
    const letter = String.fromCharCode(65 + i);
    doc.setFont(fontFamily, "bold");
    setColor(doc, COLOR.accent);
    doc.text(`${letter}.`, xRight, y);
    doc.setFont(fontFamily, "normal");
    setColor(doc, COLOR.textDark);
    const rightWrapped = doc.splitTextToSize(shuffled[i].text, colWidth - 8);
    doc.text(rightWrapped, xRight + 7, y);
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
    if (y + 6 > PAGE.height - PAGE.marginY - 14) break;
    // Small numbered slot — bracket-style
    setColor(doc, COLOR.accent);
    doc.setFont(fontFamily, "bold");
    doc.text("(   )", textX, y);
    doc.setFont(fontFamily, "normal");
    setColor(doc, COLOR.textDark);
    const itemText = String(items[i]);
    const wrapped = doc.splitTextToSize(itemText, PAGE.contentWidth - (textX - PAGE.marginX) - 14);
    doc.text(wrapped, textX + 12, y);
    y += 6 + (wrapped.length - 1) * 4;
  }
  return y;
}

function drawSliderTrack(doc, q, startY, fontFamily) {
  let y = startY + 2;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.hint);
  setColor(doc, COLOR.textMid);
  const min = q.min ?? 0;
  const max = q.max ?? 100;
  const trackY = y + 4;
  const trackX1 = PAGE.marginX + QUESTION_INDENT;
  const trackX2 = PAGE.marginX + PAGE.contentWidth - 4;
  setDrawColor(doc, COLOR.accent);
  doc.setLineWidth(0.6);
  doc.line(trackX1, trackY, trackX2, trackY);
  // Tick marks
  doc.line(trackX1, trackY - 2, trackX1, trackY + 2);
  doc.line(trackX2, trackY - 2, trackX2, trackY + 2);
  doc.text(String(min), trackX1, trackY + 5, { align: "center" });
  doc.text(String(max), trackX2, trackY + 5, { align: "center" });
  y = trackY + 9;
  return y;
}

// Writing lines: solid hairlines (same as editorial)
function drawWritingLines(doc, startY, count) {
  let y = startY;
  setDrawColor(doc, COLOR.textFaint);
  doc.setLineWidth(0.3);
  const x1 = PAGE.marginX + QUESTION_INDENT;
  const x2 = PAGE.marginX + PAGE.contentWidth - 4;
  for (let i = 0; i < count; i++) {
    if (y + SPACING.writingLineGap > PAGE.height - PAGE.marginY - 14) break;
    doc.line(x1, y, x2, y);
    y += SPACING.writingLineGap;
  }
  return y;
}

function estimateQuestionHeight(q, imageCache) {
  // PR 30.1: matched to PR 29.1.4 calibration used in modern/editorial.
  const promptLen = (q.q || q.prompt || q.question || "").length || 30;
  const promptLines = Math.max(1, Math.ceil(promptLen / 100));
  const base = 2;
  let imageH = 0;
  if (q.image_url && imageCache?.get(q.image_url)) {
    const img = imageCache.get(q.image_url);
    const { h } = scaleImageToFit(img.naturalW, img.naturalH, PAGE.contentWidth * 0.6, 55);
    imageH = h + SPACING.afterImage;
  }
  const typeH =
    q.type === "mcq" ? (q.options?.length || 4) * SPACING.betweenOptions :
    q.type === "tf" ? SPACING.betweenOptions + 1 :
    q.type === "fill" ? 0 :
    q.type === "match" ? (q.pairs?.length || 4) * 5 :
    q.type === "order" ? (q.items?.length || 4) * 5 :
    q.type === "slider" ? 10 :
    (q.type === "free" || q.type === "open") ? 5 * SPACING.writingLineGap :
    3 * SPACING.writingLineGap;
  return base + promptLines * 4.5 + imageH + typeH;
}

function drawMatchAnswerBlock(doc, q, num, startY, fontFamily) {
  const pairs = Array.isArray(q.pairs) ? q.pairs : [];
  if (pairs.length === 0) {
    doc.text(`${num}. —`, PAGE.marginX, startY);
    return startY + 7;
  }
  const lineH = 5.5;
  const blockH = 7 + pairs.length * lineH + 2;
  if (startY + blockH > PAGE.height - PAGE.marginY - 14) {
    doc.addPage();
    startY = PAGE.marginY;
  }
  let y = startY;
  drawNumberBadge(doc, PAGE.marginX, y - NUMBER_BADGE_SIZE + 1, num, fontFamily);
  doc.setFont(fontFamily, "italic");
  doc.setFontSize(FONT.hint);
  setColor(doc, COLOR.textMute);
  doc.text("match", PAGE.marginX + QUESTION_INDENT, y);
  y += 6;

  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.questionText);
  setColor(doc, COLOR.textDark);
  for (const p of pairs) {
    const txt = `${p.left}  →  ${p.right}`;
    const wrapped = doc.splitTextToSize(txt, PAGE.contentWidth - QUESTION_INDENT);
    doc.text(wrapped[0] || "", PAGE.marginX + QUESTION_INDENT, y);
    y += lineH;
  }
  return y + 2;
}

// Footer — centered page indicator + branding underneath
function drawFooterAllPages(doc, fontFamily, labels) {
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);

    // PR 30.1: footer must sit INSIDE the inner frame (which has bottom
    // edge at PAGE.height - FRAME.inner = PAGE.height - 9). Move text up
    // so it doesn't collide with the frame line.
    doc.setFont(fontFamily, "italic");
    doc.setFontSize(FONT.footer);
    setColor(doc, COLOR.textMute);
    const pageText = labels.pageOf
      ? labels.pageOf.replace("{page}", p).replace("{total}", total)
      : `Page ${p} of ${total}`;
    const yFooter = PAGE.height - 16;
    doc.text(pageText, PAGE.width / 2, yFooter, { align: "center" });

    // Branding (smaller, gray, below page indicator but still inside frame)
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(FONT.footer - 1);
    setColor(doc, COLOR.textFaint);
    doc.text(labels.poweredBy, PAGE.width / 2, yFooter + 4, { align: "center" });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function ensureSpace(doc, y, neededH) {
  if (y + neededH > PAGE.height - PAGE.marginY - 14) {
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
