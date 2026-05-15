// ─── pdf-styles/editorial ────────────────────────────────────────────────
//
// PR 29.0.7: "Editorial" style — "La revista" (the magazine). The most
// distinctive of the three styles. Premium, magazine/journal-like, designed
// to feel like something The Atlantic or MIT Press would print.
//
// Signature elements:
//
//   1. DROP CAP on the first letter of the deck title — large serif letter
//      occupying ~3 lines of text height, baseline-aligned with the
//      title's first line. This is the editorial-identity move. Nothing
//      else in our 3-style suite uses one.
//
//   2. Eyebrow in tracked-out SMALL CAPS above the title (1pt tracking).
//      Reads like a magazine kicker.
//
//   3. Thick top rule under the header (1.5mm solid black, full width).
//      A single decisive line, not the classic's double-rule.
//
//   4. Section labels: "PART ONE" / "PART TWO" (words, not numerals)
//      in small caps with a tiny black square bullet before them.
//
//   5. Monospaced question numbers in the left gutter: "01", "02", "03"...
//      No circles, just the number aligned to a fixed left margin.
//      Question text begins at a hanging indent.
//
//   6. MCQ options use EM-DASH bullets: "— option text", letter prefixed.
//      Cleaner than circles for the editorial vibe, more list-like.
//
//   7. TF as inline check-style: two big squares (4×4mm) with the words
//      "True" / "False" right next to them. Squares not circles — closer
//      to ballot/form aesthetics that match magazine tone.
//
//   8. Written-response lines: thin solid hairlines (not dotted). Subtle.
//
//   9. Footer matches the editorial restraint: thin top hairline, gray
//      page number left, branding right.
//
// All grayscale + black. No color. Color is reserved for modern; editorial's
// distinction is in typography and rhythm, not pigment.

import {
  PAGE_A4, DEFAULT_MARGINS, LABELS,
  drawWrappedText, deterministicShuffle, formatAnswerForKey,
  fetchImageAsDataURL, scaleImageToFit,
  groupQuestionsBySection,
} from "./shared";

const PAGE = {
  ...PAGE_A4,
  marginX: 22,             // wider margins — magazine column feel
  marginY: 22,
  contentWidth: PAGE_A4.width - 22 * 2,
  contentHeight: PAGE_A4.height - 22 * 2,
};

const FONT = {
  eyebrow: 8.5,        // SPANISH 1A · WARMUP — tracked small caps
  title: 30,           // PR 29.1.2: was 26 (paired with drop cap). After
                       // removing the drop cap, bumped to 30 so the title
                       // still has presence on the page.
  byline: 9.5,         // "by Profe Jota · 7° grado"
  meta: 9.5,
  fieldLabel: 9.5,
  partLabel: 9,        // "PART ONE" small caps
  sectionTitle: 13,
  sectionSub: 9.5,
  questionNum: 11,     // monospaced "01" in the gutter
  questionText: 11,
  option: 10.5,
  hint: 8.5,
  footer: 8,
};

const SPACING = {
  afterTitle: 3,           // PR 29.1.4: was 4
  afterRule: 5,            // PR 29.1.4: was 6
  afterFieldsRow: 7,       // PR 29.1.4: was 9
  beforeSection: 7,        // PR 29.1.4: was 10
  afterSectionHeader: 6,   // PR 29.1.4: was 9
  afterQuestionNum: 3,     // PR 29.1.4: was 4
  betweenOptions: 5,       // PR 29.1.4: was 6.5
  writingLineGap: 6.5,     // PR 29.1.4: was 7
  betweenQuestions: 6,     // PR 29.1.4: was 10
  afterImage: 4,           // PR 29.1.4: was 5
};

const COLOR = {
  textBlack: [15, 15, 15],
  textDark: [40, 40, 40],
  textMid: [85, 85, 85],
  textMute: [140, 140, 140],
  textFaint: [180, 180, 180],
  rule: [15, 15, 15],          // thick black rule
  hairline: [200, 200, 200],
  highlight: [240, 235, 220],  // cream highlight for section header bg
};

// Layout constants for question rendering — the question number lives in
// a fixed-width gutter to the left of the prompt.
const GUTTER_W = 10;            // mm reserved for the number "01"/"02"
const QUESTION_INDENT = GUTTER_W + 4;  // where the prompt starts

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

  y = drawExamHeader(doc, deck, classObj, y, fontFamily, labels, totalQ);

  // ── Section 1: Selection ──────────────────────────────────────────
  if (selection.length > 0) {
    y = ensureSpace(doc, y, 26);
    y = drawSectionHeader(
      doc, y, fontFamily,
      "PART ONE",
      labels.sectionSelection,
      labels.sectionSelectionSub,
    );
    for (let i = 0; i < selection.length; i++) {
      const q = selection[i];
      const estH = estimateQuestionHeight(q, imageCache);
      // PR 29.1.4: widow check removed — was wasting space on page 1.
      y = ensureSpace(doc, y, estH);
      y = drawQuestion(doc, q, y, fontFamily, lang, imageCache);
      y += (q.type === "fill") ? Math.round(SPACING.betweenQuestions * 0.55) : SPACING.betweenQuestions;
    }
  }

  // ── Section 2: Written response ───────────────────────────────────
  if (written.length > 0) {
    y += SPACING.beforeSection;
    y = ensureSpace(doc, y, 26);
    y = drawSectionHeader(
      doc, y, fontFamily,
      "PART TWO",
      labels.sectionWritten,
      labels.sectionWrittenSub,
    );
    for (let i = 0; i < written.length; i++) {
      const q = written[i];
      const estH = estimateQuestionHeight(q, imageCache);
      y = ensureSpace(doc, y, estH);
      y = drawQuestion(doc, q, y, fontFamily, lang, imageCache);
      y += SPACING.betweenQuestions;
    }
  }

  drawFooterAllPages(doc, fontFamily, labels);
}

// ═══════════════════════════════════════════════════════════════════════
// ANSWER KEY
// ═══════════════════════════════════════════════════════════════════════
export async function renderAnswerKey(doc, deck, classObj, opts = {}) {
  const { lang = "en", fontFamily = "helvetica" } = opts;
  const labels = LABELS[lang] || LABELS.en;
  let y = PAGE.marginY;

  // Eyebrow
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.eyebrow);
  setColor(doc, COLOR.textMute);
  doc.text(labels.answerKey.toUpperCase(), PAGE.marginX, y, { charSpace: 0.6 });
  // PR 30.2: gap proportional to title cap height. Title=30pt needs ~10mm.
  y += FONT.title * 0.25 + 2;

  // Title
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.title);
  setColor(doc, COLOR.textBlack);
  y = drawWrappedText(doc, deck.title || "Deck", PAGE.marginX, y, PAGE.contentWidth, FONT.title * 0.4);
  y += SPACING.afterTitle;

  // Byline if class is set
  if (classObj?.name) {
    doc.setFont(fontFamily, "italic");
    doc.setFontSize(FONT.byline);
    setColor(doc, COLOR.textMid);
    doc.text(`for ${classObj.name}`, PAGE.marginX, y);
    y += 6;
  }

  // Thick top rule
  drawThickRule(doc, y);
  y += SPACING.afterRule + 2;

  // Answers — monospace number "01." then text.
  // PR 29.1.3: same ordering as exam.
  const { selection, written } = groupQuestionsBySection(deck.questions || []);
  const orderedQuestions = [...selection, ...written];
  const lineHeight = 7;
  for (let i = 0; i < orderedQuestions.length; i++) {
    const q = orderedQuestions[i];
    const displayNum = q._originalNum;
    if (y + lineHeight > PAGE.height - PAGE.marginY - 8) {
      doc.addPage();
      y = PAGE.marginY;
    }
    if (q.type === "match") {
      y = drawMatchAnswerBlock(doc, q, displayNum, y, fontFamily);
      continue;
    }
    // Number in gutter (monospace feel via courier)
    doc.setFont("courier", "bold");
    doc.setFontSize(FONT.questionNum);
    setColor(doc, COLOR.textMute);
    doc.text(padNum(displayNum), PAGE.marginX, y);

    // Answer text
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(FONT.questionText);
    setColor(doc, COLOR.textDark);
    const answerText = formatAnswerForKey(q, labels);
    const wrapped = doc.splitTextToSize(answerText, PAGE.contentWidth - GUTTER_W);
    for (let j = 0; j < wrapped.length; j++) {
      if (y + lineHeight > PAGE.height - PAGE.marginY - 8) {
        doc.addPage();
        y = PAGE.marginY;
      }
      doc.text(wrapped[j], PAGE.marginX + GUTTER_W, y);
      y += lineHeight;
    }
  }

  drawFooterAllPages(doc, fontFamily, labels);
}

// ═══════════════════════════════════════════════════════════════════════
// HEADER — eyebrow + drop cap title + byline + thick rule + fields
// ═══════════════════════════════════════════════════════════════════════
function drawExamHeader(doc, deck, classObj, y, fontFamily, labels, totalQ) {
  // Eyebrow line: class name + optional meta
  const eyebrowParts = [];
  if (classObj?.name) eyebrowParts.push(classObj.name);
  const estMinutes = Math.max(5, Math.round(totalQ * 1.5));
  eyebrowParts.push(`${totalQ} ${labels.questions}`);
  eyebrowParts.push(`~${estMinutes} ${labels.minutes}`);
  const eyebrowText = eyebrowParts.join("  ·  ").toUpperCase();

  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.eyebrow);
  setColor(doc, COLOR.textMute);
  doc.text(eyebrowText, PAGE.marginX, y, { charSpace: 0.6 });
  y += 9;

  // Title block
  //
  // PR 29.1.2: removed the drop cap. After two attempts to align a
  // 42pt initial with 26pt body title using shared baselines, the result
  // was still visually broken in jsPDF — the giant letter never lined
  // up reliably with the rest of the title because jsPDF's text baseline
  // is the ALPHABETIC baseline and font ascender heights vary.
  //
  // Replacement: title rendered LARGE (32pt) in one font run, no
  // initial-letter trick. Editorial identity still comes from:
  //   - tracked small-caps eyebrow above
  //   - thick black rule below
  //   - monospace question numbers in the gutter
  //   - em-dash MCQ bullets
  //   - tiny square section bullet
  //
  // The drop cap was a "nice to have" — these other elements carry the
  // editorial feel without the rendering risk.
  const title = deck.title || "Deck";
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.title);
  setColor(doc, COLOR.textBlack);
  y = drawWrappedText(doc, title, PAGE.marginX, y + 10, PAGE.contentWidth, FONT.title * 0.42);
  y += SPACING.afterTitle;

  // Thick top rule
  drawThickRule(doc, y);
  y += SPACING.afterRule;

  // Fields row
  y = drawFieldsRow(doc, y, fontFamily, labels);
  y += SPACING.afterFieldsRow;

  return y;
}

// Thick top rule — a single solid 1.5mm bar (no double, no fade). The
// editorial "decisive line" that says the masthead has ended.
function drawThickRule(doc, y) {
  setFillColor(doc, COLOR.rule);
  doc.rect(PAGE.marginX, y, PAGE.contentWidth, 1.5, "F");
  return y + 1.5;
}

// Fields row: Name / Date / Score with a single hairline underline
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

  // Single hairline underline (not dotted — editorial uses solid lines)
  const lineY = y + 3.5;
  setDrawColor(doc, COLOR.textMid);
  doc.setLineWidth(0.4);
  doc.line(PAGE.marginX, lineY, PAGE.marginX + PAGE.contentWidth, lineY);

  return lineY;
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION HEADER — "PART ONE · Selection"
// ═══════════════════════════════════════════════════════════════════════
//
// Layout:
//
//   ■ PART ONE
//   Selection
//   Choose the correct answer
//
// Tiny black square bullet, then small-caps part label. Below: the
// section title in larger weight, then italic subtitle. Left-aligned.
function drawSectionHeader(doc, y, fontFamily, partLabel, title, subtitle) {
  // Tiny solid black square bullet
  setFillColor(doc, COLOR.textBlack);
  doc.rect(PAGE.marginX, y - 2.4, 2, 2, "F");

  // Part label small caps with tracking
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.partLabel);
  setColor(doc, COLOR.textBlack);
  doc.text(partLabel, PAGE.marginX + 4, y, { charSpace: 0.8 });
  y += 6;

  // Section title
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.sectionTitle);
  setColor(doc, COLOR.textBlack);
  doc.text(title, PAGE.marginX, y);
  y += 5;

  // Subtitle in italic gray
  doc.setFont(fontFamily, "italic");
  doc.setFontSize(FONT.sectionSub);
  setColor(doc, COLOR.textMute);
  doc.text(subtitle, PAGE.marginX, y);

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

  // Monospaced question number in the left gutter
  doc.setFont("courier", "bold");
  doc.setFontSize(FONT.questionNum);
  setColor(doc, COLOR.textMute);
  doc.text(padNum(num), PAGE.marginX, y);

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
        console.warn("[pdf editorial] addImage failed:", err);
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

// MCQ — em-dash bullets, letter prefix. List feel.
function drawMCQOptions(doc, q, startY, fontFamily, textX) {
  let y = startY;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.option);
  const options = q.options || [];
  const letters = ["a", "b", "c", "d", "e", "f"];
  for (let i = 0; i < options.length; i++) {
    // Em-dash bullet
    setColor(doc, COLOR.textMute);
    doc.text("—", textX, y);
    // Letter
    doc.setFont(fontFamily, "bold");
    setColor(doc, COLOR.textBlack);
    doc.text(`${letters[i]}`, textX + 6, y);
    // Option text
    doc.setFont(fontFamily, "normal");
    setColor(doc, COLOR.textDark);
    const optionText = String(options[i] ?? "");
    const wrapped = doc.splitTextToSize(optionText, PAGE.contentWidth - (textX - PAGE.marginX) - 12);
    for (let j = 0; j < wrapped.length; j++) {
      doc.text(wrapped[j], textX + 11, y);
      if (j < wrapped.length - 1) y += 4.5;
    }
    y += SPACING.betweenOptions;
  }
  return y;
}

// TF — two filled square checkboxes (4×4mm) with words. Form-like.
function drawTFOptions(doc, startY, fontFamily, labels, textX) {
  let y = startY;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.option);
  setColor(doc, COLOR.textDark);
  setDrawColor(doc, COLOR.textBlack);
  doc.setLineWidth(0.5);
  // True square
  doc.rect(textX, y - 3.4, 4, 4, "S");
  doc.text(labels.true, textX + 6, y);
  const trueWidth = doc.getTextWidth(labels.true);
  const falseX = textX + 6 + trueWidth + 16;
  // False square
  doc.rect(falseX - 6, y - 3.4, 4, 4, "S");
  doc.text(labels.false, falseX, y);
  y += SPACING.betweenOptions;
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
    if (y + lineHeight > PAGE.height - PAGE.marginY - 8) break;
    doc.setFont("courier", "bold");
    doc.setFontSize(9);
    setColor(doc, COLOR.textMute);
    doc.text(`${i + 1}.`, xLeft, y);
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(FONT.option);
    setColor(doc, COLOR.textDark);
    const leftWrapped = doc.splitTextToSize(lefts[i], colWidth - 8);
    doc.text(leftWrapped, xLeft + 7, y);
    const letter = String.fromCharCode(65 + i);
    doc.setFont("courier", "bold");
    doc.setFontSize(9);
    setColor(doc, COLOR.textMute);
    doc.text(`${letter}.`, xRight, y);
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(FONT.option);
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
    if (y + 6 > PAGE.height - PAGE.marginY - 8) break;
    // Position slot — thin solid hairline
    setDrawColor(doc, COLOR.textMid);
    doc.setLineWidth(0.4);
    doc.line(textX, y + 0.5, textX + 7, y + 0.5);
    const itemText = String(items[i]);
    const wrapped = doc.splitTextToSize(itemText, PAGE.contentWidth - (textX - PAGE.marginX) - 10);
    doc.text(wrapped, textX + 10, y);
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
  setDrawColor(doc, COLOR.textBlack);
  doc.setLineWidth(0.6);
  doc.line(trackX1, trackY, trackX2, trackY);
  // Tick marks at start and end as small vertical strokes
  doc.line(trackX1, trackY - 1.8, trackX1, trackY + 1.8);
  doc.line(trackX2, trackY - 1.8, trackX2, trackY + 1.8);
  doc.text(String(min), trackX1, trackY + 5, { align: "center" });
  doc.text(String(max), trackX2, trackY + 5, { align: "center" });
  y = trackY + 9;
  doc.setFontSize(FONT.option);
  setColor(doc, COLOR.textDark);
  doc.text("____________", trackX1, y);
  y += 4;
  return y;
}

// Editorial uses SOLID hairlines for writing — different from classic's
// dotted lines and modern's same dotted pattern. Spare and clean.
function drawWritingLines(doc, startY, count) {
  let y = startY;
  setDrawColor(doc, COLOR.hairline);
  doc.setLineWidth(0.3);
  const x1 = PAGE.marginX + QUESTION_INDENT;
  const x2 = PAGE.marginX + PAGE.contentWidth - 4;
  for (let i = 0; i < count; i++) {
    if (y + SPACING.writingLineGap > PAGE.height - PAGE.marginY - 8) break;
    doc.line(x1, y, x2, y);
    y += SPACING.writingLineGap;
  }
  return y;
}

function estimateQuestionHeight(q, imageCache) {
  // PR 29.1.3: tighter still. Jota: "una pregunta quedo arriba al
  // principio de la pagina y luego era la seccion 2" — fix by lowering
  // estimate so the orphan question fits on the prior page.
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
    q.type === "mcq" ? (q.options?.length || 4) * 5 :
    q.type === "tf" ? 5 :
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
    doc.text(`${padNum(num)} —`, PAGE.marginX, startY);
    return startY + 7;
  }

  // Editorial answer key match block: monospace number, then a list of
  // "left → right" pairs at hanging indent. No box, no fill — keeps the
  // restraint.
  const lineH = 5.5;
  const blockH = 7 + pairs.length * lineH + 2;
  if (startY + blockH > PAGE.height - PAGE.marginY - 8) {
    doc.addPage();
    startY = PAGE.marginY;
  }
  let y = startY;

  doc.setFont("courier", "bold");
  doc.setFontSize(FONT.questionNum);
  setColor(doc, COLOR.textMute);
  doc.text(padNum(num), PAGE.marginX, y);
  doc.setFont(fontFamily, "italic");
  doc.setFontSize(FONT.hint);
  setColor(doc, COLOR.textMute);
  doc.text("match", PAGE.marginX + GUTTER_W, y);
  y += 6;

  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.questionText);
  setColor(doc, COLOR.textDark);
  for (const p of pairs) {
    const txt = `${p.left}  →  ${p.right}`;
    const wrapped = doc.splitTextToSize(txt, PAGE.contentWidth - GUTTER_W);
    doc.text(wrapped[0] || "", PAGE.marginX + GUTTER_W, y);
    y += lineH;
  }
  return y + 2;
}

// Footer — thin hairline + monospace page indicator + branding
function drawFooterAllPages(doc, fontFamily, labels) {
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);

    // Hairline above footer
    setDrawColor(doc, COLOR.hairline);
    doc.setLineWidth(0.2);
    const ruleY = PAGE.height - 11;
    doc.line(PAGE.marginX, ruleY, PAGE.marginX + PAGE.contentWidth, ruleY);

    // Page indicator in courier (matches the question-number aesthetic)
    doc.setFont("courier", "normal");
    doc.setFontSize(FONT.footer);
    setColor(doc, COLOR.textMute);
    const yFooter = PAGE.height - 6;
    doc.text(`${padNum(p)} / ${padNum(total)}`, PAGE.marginX, yFooter);

    // Branding in sans (right)
    doc.setFont(fontFamily, "normal");
    setColor(doc, COLOR.textMute);
    const branding = labels.poweredBy;
    const w = doc.getTextWidth(branding);
    doc.text(branding, PAGE.marginX + PAGE.contentWidth - w, yFooter);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

// Zero-padded 2-digit number: 1 → "01", 12 → "12", 100 → "100".
function padNum(n) {
  return n < 10 ? `0${n}` : String(n);
}

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
