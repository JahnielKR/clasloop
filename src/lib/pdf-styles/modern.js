// ─── pdf-styles/modern ──────────────────────────────────────────────────
//
// PR 29.0.2: "Modern" style — "El sticker pack". Colorful and friendly,
// designed for younger students (primary, early secondary). Uses Clasloop's
// established teal/coral palette so the PDF feels native to the product.
//
// Signature elements:
//   - Header banner: title left, decorative circle-sticker top-right with
//     "deck" lettering inside (like a wax seal / merit badge)
//   - Section headers are FULL COLOR BANDS — wide rounded rect with white
//     text on the section color (teal for selection, coral for written)
//   - Question numbers are colored badges (filled circles matching section)
//   - MCQ options sit in pale-tinted pills
//   - Match pairs in soft tinted boxes
//   - Dotted writing lines (same as classic for consistency)
//
// Two colors total. Print impact: the section bands and number badges
// take some ink, but the rest stays mostly white. Acceptable B&W behavior
// because section bands print as solid dark gray, badges as gray circles,
// pills as light gray fills — all still readable.

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
  eyebrow: 9,
  title: 20,        // bigger and bolder than classic
  meta: 9.5,
  fieldLabel: 10,
  sectionBand: 13,  // bold white text on color band
  sectionSub: 9.5,
  questionNum: 11,  // sits inside colored badge
  questionText: 11,
  option: 10.5,
  hint: 8.5,
  footer: 8,
  stickerLabel: 7,  // "DECK" inside the sticker seal
  stickerNum: 14,   // big number inside the sticker
};

const SPACING = {
  afterHeader: 14,
  beforeSection: 10,
  afterSection: 8,
  afterQuestionNum: 4,
  betweenOptions: 5,
  dottedLineGap: 7,
  betweenQuestions: 11,
  afterImage: 6,
};

// Clasloop established palette — pulled from existing app theme tokens.
const COLOR = {
  teal: [15, 123, 108],          // C.green / accent — Selection section
  tealSoft: [229, 243, 240],     // section pill background, badge fade
  tealLight: [200, 230, 220],    // dot leader, faint accents
  coral: [216, 90, 48],          // Written section
  coralSoft: [251, 232, 222],
  coralLight: [240, 200, 175],
  textBlack: [20, 20, 20],
  textDark: [40, 40, 40],
  textMid: [90, 90, 90],
  textMute: [140, 140, 140],
  textFaint: [180, 180, 180],
  white: [255, 255, 255],
  ruleFaint: [225, 225, 225],
};

// Per-section visual config
const SECTION = {
  selection: { color: COLOR.teal, soft: COLOR.tealSoft, light: COLOR.tealLight },
  written: { color: COLOR.coral, soft: COLOR.coralSoft, light: COLOR.coralLight },
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

  // ── Header with sticker badge ─────────────────────────────────────
  y = drawExamHeader(doc, deck, classObj, y, fontFamily, labels, totalQ);

  // ── Section 1: Selection ──────────────────────────────────────────
  if (selection.length > 0) {
    y = ensureSpace(doc, y, 36);
    y = drawSectionBand(
      doc, y, fontFamily,
      labels.partLabel.toUpperCase() + " I",
      labels.sectionSelection,
      labels.sectionSelectionSub,
      SECTION.selection,
    );
    for (let i = 0; i < selection.length; i++) {
      const q = selection[i];
      const estH = estimateQuestionHeight(q, imageCache);
      // PR 29.0.4: widow protection rewritten — was too aggressive (broke
      // pages when 50mm+ remained). New rule: only break if current ends
      // with VERY LITTLE space left (< 25mm) and next is too tall to fit.
      const next = selection[i + 1];
      const remaining = PAGE.height - PAGE.marginY - 14 - y;
      const remainingAfter = remaining - estH - SPACING.betweenQuestions;
      const widowRisk = next
        && (y > PAGE.marginY + 80)
        && (estH < remaining)
        && (remainingAfter > 0)
        && (remainingAfter < 25)
        && (estimateQuestionHeight(next, imageCache) > remainingAfter);
      if (widowRisk) {
        doc.addPage();
        y = PAGE.marginY;
      } else {
        y = ensureSpace(doc, y, estH);
      }
      y = drawQuestion(doc, q, y, fontFamily, lang, imageCache, SECTION.selection);
      // PR 29.0.3 fix 2: fill questions get a tighter gap below since
      // they don't render an answer area (blanks are inline).
      y += (q.type === "fill") ? Math.round(SPACING.betweenQuestions * 0.55) : SPACING.betweenQuestions;
    }
  }

  // ── Section 2: Written response ───────────────────────────────────
  if (written.length > 0) {
    y += SPACING.beforeSection;
    y = ensureSpace(doc, y, 36);
    y = drawSectionBand(
      doc, y, fontFamily,
      labels.partLabel.toUpperCase() + " II",
      labels.sectionWritten,
      labels.sectionWrittenSub,
      SECTION.written,
    );
    for (let i = 0; i < written.length; i++) {
      const q = written[i];
      const estH = estimateQuestionHeight(q, imageCache);
      const next = written[i + 1];
      const remaining = PAGE.height - PAGE.marginY - 14 - y;
      const remainingAfter = remaining - estH - SPACING.betweenQuestions;
      const widowRisk = next
        && (y > PAGE.marginY + 80)
        && (estH < remaining)
        && (remainingAfter > 0)
        && (remainingAfter < 25)
        && (estimateQuestionHeight(next, imageCache) > remainingAfter);
      if (widowRisk) {
        doc.addPage();
        y = PAGE.marginY;
      } else {
        y = ensureSpace(doc, y, estH);
      }
      y = drawQuestion(doc, q, y, fontFamily, lang, imageCache, SECTION.written);
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

  // Header with "ANSWER KEY" in coral instead of class name (so the
  // teacher knows at a glance which version they grabbed)
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.eyebrow);
  setColor(doc, COLOR.coral);
  doc.text(labels.answerKey.toUpperCase(), PAGE.marginX, y, { charSpace: 0.4 });
  // PR 29.0.3 fix 4: 7mm spacing
  y += 7;

  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.title);
  setColor(doc, COLOR.textBlack);
  y = drawWrappedText(doc, deck.title || "Deck", PAGE.marginX, y, PAGE.contentWidth, FONT.title * 0.42);
  y += 2;

  if (classObj?.name) {
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(FONT.meta);
    setColor(doc, COLOR.textMid);
    doc.text(classObj.name, PAGE.marginX, y);
    y += 6;
  } else {
    y += 4;
  }

  // Coral accent rule (instead of double-rule)
  setFillColor(doc, COLOR.coral);
  doc.rect(PAGE.marginX, y, 40, 1.4, "F");
  y += 8;

  // Answers list — coral number badges, then answer text
  const questions = deck.questions || [];
  const lineHeight = 8;
  for (let i = 0; i < questions.length; i++) {
    if (y + lineHeight > PAGE.height - PAGE.marginY - 14) {
      doc.addPage();
      y = PAGE.marginY;
    }
    if (questions[i].type === "match") {
      y = drawMatchAnswerBlock(doc, questions[i], i + 1, y, fontFamily);
      continue;
    }
    // Small coral badge with number
    const badgeX = PAGE.marginX + 3;
    const badgeY = y - 1.3;
    setFillColor(doc, COLOR.coral);
    doc.circle(badgeX, badgeY, 2.8, "F");
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(9.5);
    setColor(doc, COLOR.white);
    doc.text(String(i + 1), badgeX, badgeY + 1.2, { align: "center" });

    // Answer text
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(FONT.questionText);
    setColor(doc, COLOR.textDark);
    const answerText = formatAnswerForKey(questions[i], labels);
    const textX = PAGE.marginX + 10;
    const wrapped = doc.splitTextToSize(answerText, PAGE.contentWidth - 10);
    for (let j = 0; j < wrapped.length; j++) {
      if (y + lineHeight > PAGE.height - PAGE.marginY - 14) {
        doc.addPage();
        y = PAGE.marginY;
      }
      doc.text(wrapped[j], textX, y);
      y += lineHeight;
    }
  }

  drawFooterAllPages(doc, fontFamily, labels);
}

// ═══════════════════════════════════════════════════════════════════════
// EXAM HEADER — title left, sticker badge top-right
// ═══════════════════════════════════════════════════════════════════════
//
// Layout:
//
//   CLASE NOMBRE                                    ╭─────╮
//   La célula y                                    │ DECK │
//   sus organelos                                  │  10  │
//   10 preguntas · ~15 minutos                      ╰─────╯
//   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ (teal accent rule)
//
//   Nombre _____  Fecha _____  Nota _____
//
// The sticker is a circle filled with the teal color + "DECK" small caps
// + the total question count big. Like a merit badge. Fun without being
// childish.
function drawExamHeader(doc, deck, classObj, y, fontFamily, labels, totalQ) {
  const startY = y;
  // Reserve sticker zone on the right (28mm wide)
  const stickerR = 14;
  const stickerCX = PAGE.marginX + PAGE.contentWidth - stickerR - 2;
  const stickerCY = y + stickerR + 2;

  // Title block (left)
  if (classObj?.name) {
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(FONT.eyebrow);
    setColor(doc, COLOR.teal);
    doc.text(classObj.name.toUpperCase(), PAGE.marginX, y, { charSpace: 0.4 });
    // PR 29.0.3 fix 4: 7mm instead of 4.8mm so the eyebrow doesn't
    // visually merge into the deck title below.
    y += 7;
  }

  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.title);
  setColor(doc, COLOR.textBlack);
  const titleMaxW = PAGE.contentWidth - (stickerR * 2 + 8);
  y = drawWrappedText(doc, deck.title || "Deck", PAGE.marginX, y, titleMaxW, FONT.title * 0.42);
  // Small extra breath after title before meta line
  y += 1.5;

  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.meta);
  setColor(doc, COLOR.textMid);
  const estMinutes = Math.max(5, Math.round(totalQ * 1.5));
  const metaText = `${totalQ} ${labels.questions}  ·  ~${estMinutes} ${labels.minutes}`;
  doc.text(metaText, PAGE.marginX, y);
  y += 6;

  // Sticker badge (right side)
  drawStickerBadge(doc, stickerCX, stickerCY, stickerR, totalQ, fontFamily);

  // Ensure y is below the sticker
  const stickerBottom = stickerCY + stickerR + 2;
  if (y < stickerBottom) y = stickerBottom;
  y += 3;

  // Teal accent rule (40mm wide, like a colored highlight stripe)
  setFillColor(doc, COLOR.teal);
  doc.rect(PAGE.marginX, y, 40, 1.4, "F");
  y += SPACING.afterHeader;

  // Field row (Nombre / Fecha / Nota) — softer than classic
  y = drawFieldsRow(doc, y, fontFamily, labels);
  y += 6;

  return y;
}

// Sticker badge: circle filled with teal, "DECK" small label, big question
// count number underneath. Reads as a printed merit badge.
function drawStickerBadge(doc, cx, cy, r, count, fontFamily) {
  // Outer filled circle
  setFillColor(doc, COLOR.teal);
  doc.circle(cx, cy, r, "F");

  // Inner thin ring (white, for definition)
  setDrawColor(doc, COLOR.white);
  doc.setLineWidth(0.7);
  doc.circle(cx, cy, r - 1.6, "S");

  // "DECK" label
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.stickerLabel);
  setColor(doc, COLOR.white);
  doc.text("DECK", cx, cy - 1.5, { align: "center", charSpace: 0.6 });

  // Big number
  doc.setFontSize(FONT.stickerNum);
  doc.text(String(count), cx, cy + 4.5, { align: "center" });
}

function drawFieldsRow(doc, y, fontFamily, labels) {
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.fieldLabel);
  setColor(doc, COLOR.textDark);

  // PR 29.0.3 fix 5: was 3 separate teal underlines under each field.
  // Replaced by ONE continuous dotted teal line spanning all fields,
  // with labels sitting above. Reads as a single ledger line.
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

  // Continuous dotted line in teal (subtle, on-brand)
  const lineY = y + 3.5;
  setFillColor(doc, COLOR.teal);
  const step = 1.8;
  for (let cx = PAGE.marginX; cx <= PAGE.marginX + PAGE.contentWidth; cx += step) {
    doc.circle(cx, lineY, 0.32, "F");
  }

  return lineY;
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION BAND — full-width colored bar with section title in white
// ═══════════════════════════════════════════════════════════════════════
//
//   ╔════════════════════════════════════════════════════════════════╗
//   ║  PARTE I       Selección                                       ║
//   ║                Elegí la respuesta correcta                     ║
//   ╚════════════════════════════════════════════════════════════════╝
//
// 22mm tall, color-filled. Part label small/uppercase, then title large,
// then subtitle on a second visual line.
function drawSectionBand(doc, y, fontFamily, partLabel, title, subtitle, sectionCfg) {
  const bandH = 22;
  setFillColor(doc, sectionCfg.color);
  doc.roundedRect(PAGE.marginX, y, PAGE.contentWidth, bandH, 3, 3, "F");

  // Part label (small, uppercase) on left
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.eyebrow);
  setColor(doc, COLOR.white);
  doc.text(partLabel, PAGE.marginX + 6, y + 8, { charSpace: 0.6 });

  // Title (big) on right of part label
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.sectionBand);
  setColor(doc, COLOR.white);
  doc.text(title, PAGE.marginX + 32, y + 9);

  // Subtitle
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.sectionSub);
  setColor(doc, COLOR.white);
  doc.text(subtitle, PAGE.marginX + 32, y + 16);

  return y + bandH + SPACING.afterSection;
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

function drawQuestion(doc, q, startY, fontFamily, lang, imageCache, sectionCfg) {
  let y = startY;
  const labels = LABELS[lang] || LABELS.en;
  const num = q._originalNum;

  // Colored badge with number
  const badgeX = PAGE.marginX + 4;
  const badgeY = y - 1.4;
  const badgeR = 4;
  setFillColor(doc, sectionCfg.color);
  doc.circle(badgeX, badgeY, badgeR, "F");
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.questionNum);
  setColor(doc, COLOR.white);
  doc.text(String(num), badgeX, badgeY + 1.5, { align: "center" });

  // Question prompt
  const textX = PAGE.marginX + badgeR * 2 + 6;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.questionText);
  setColor(doc, COLOR.textDark);
  const questionText = q.q || q.prompt || q.question || "";
  const promptMaxW = PAGE.contentWidth - (textX - PAGE.marginX);
  y = drawWrappedText(doc, questionText, textX, y, promptMaxW, FONT.questionText * 0.45);
  y += SPACING.afterQuestionNum;

  // Image
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
        console.warn("[pdf modern] addImage failed:", err);
      }
    }
  }

  // Type-specific response area
  switch (q.type) {
    case "mcq": y = drawMCQOptions(doc, q, y, fontFamily, textX, sectionCfg); break;
    case "tf": y = drawTFOptions(doc, y, fontFamily, labels, textX, sectionCfg); break;
    case "fill": y = drawFillBlankHint(y); break;
    case "match": y = drawMatchPairs(doc, q, y, fontFamily, sectionCfg); break;
    case "order": y = drawOrderItems(doc, q, y, fontFamily, textX, sectionCfg); break;
    case "slider": y = drawSliderTrack(doc, q, y, fontFamily, sectionCfg); break;
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

// MCQ options as pills: rounded rect with pale section-color fill + letter
function drawMCQOptions(doc, q, startY, fontFamily, textX, sectionCfg) {
  let y = startY;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.option);
  const options = q.options || [];
  const letters = ["a", "b", "c", "d", "e", "f"];
  const pillH = 7;
  const pillW = PAGE.contentWidth - (textX - PAGE.marginX) - 2;

  for (let i = 0; i < options.length; i++) {
    // Pill background (soft tint)
    setFillColor(doc, sectionCfg.soft);
    doc.roundedRect(textX, y - 4.5, pillW, pillH, 2, 2, "F");

    // Letter badge (filled circle, section color)
    setFillColor(doc, sectionCfg.color);
    doc.circle(textX + 4, y - 1.2, 2.4, "F");
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(9.5);
    setColor(doc, COLOR.white);
    doc.text(letters[i], textX + 4, y + 0.3, { align: "center" });

    // Option text
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(FONT.option);
    setColor(doc, COLOR.textDark);
    const optionText = String(options[i] ?? "");
    const wrapped = doc.splitTextToSize(optionText, pillW - 12);
    doc.text(wrapped[0] || "", textX + 9, y);
    // multi-line option: extra dropped lines below the pill
    for (let j = 1; j < wrapped.length; j++) {
      y += 4.5;
      doc.text(wrapped[j], textX + 9, y);
    }
    y += pillH + 1.5;
  }
  return y;
}

function drawTFOptions(doc, startY, fontFamily, labels, textX, sectionCfg) {
  let y = startY;
  // PR 29.0.3 fix 1: TF badges bumped from 2.4mm to 3.2mm radius so
  // students can comfortably mark them. Pill height grows accordingly
  // (8 → 10mm) so the badge isn't crammed against the edges.
  const r = 3.2;
  const pillH = 10;
  const colW = (PAGE.contentWidth - (textX - PAGE.marginX) - 6) / 2;

  // True pill
  setFillColor(doc, sectionCfg.soft);
  doc.roundedRect(textX, y - 5.5, colW, pillH, 2.5, 2.5, "F");
  setFillColor(doc, sectionCfg.color);
  doc.circle(textX + r + 2, y - 0.5, r, "F");
  doc.setFont(fontFamily, "bold");
  setColor(doc, COLOR.textDark);
  doc.setFontSize(FONT.option);
  doc.text(labels.true, textX + r * 2 + 5, y);

  // False pill
  const falseX = textX + colW + 4;
  setFillColor(doc, sectionCfg.soft);
  doc.roundedRect(falseX, y - 5.5, colW, pillH, 2.5, 2.5, "F");
  setFillColor(doc, sectionCfg.color);
  doc.circle(falseX + r + 2, y - 0.5, r, "F");
  doc.text(labels.false, falseX + r * 2 + 5, y);

  y += pillH + 2;
  return y;
}

function drawFillBlankHint(startY) {
  return startY + 3;
}

function drawMatchPairs(doc, q, startY, fontFamily, sectionCfg) {
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
  const lineHeight = 6.5;

  for (let i = 0; i < pairs.length; i++) {
    if (y + lineHeight > PAGE.height - PAGE.marginY - 14) break;
    // Left item: number badge + text
    setFillColor(doc, sectionCfg.soft);
    doc.roundedRect(xLeft, y - 4.5, colWidth, 6.5, 1.5, 1.5, "F");
    setFillColor(doc, sectionCfg.color);
    doc.circle(xLeft + 4, y - 1.3, 2.2, "F");
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(9);
    setColor(doc, COLOR.white);
    doc.text(`${i + 1}`, xLeft + 4, y + 0.1, { align: "center" });

    doc.setFont(fontFamily, "normal");
    doc.setFontSize(FONT.option);
    setColor(doc, COLOR.textDark);
    const leftWrapped = doc.splitTextToSize(lefts[i], colWidth - 12);
    doc.text(leftWrapped[0] || "", xLeft + 9, y);

    // Right item: letter badge + text
    setFillColor(doc, sectionCfg.soft);
    doc.roundedRect(xRight, y - 4.5, colWidth, 6.5, 1.5, 1.5, "F");
    setFillColor(doc, sectionCfg.color);
    doc.circle(xRight + 4, y - 1.3, 2.2, "F");
    const letter = String.fromCharCode(65 + i);
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(9);
    setColor(doc, COLOR.white);
    doc.text(letter, xRight + 4, y + 0.1, { align: "center" });

    doc.setFont(fontFamily, "normal");
    doc.setFontSize(FONT.option);
    setColor(doc, COLOR.textDark);
    const rightWrapped = doc.splitTextToSize(shuffled[i].text, colWidth - 12);
    doc.text(rightWrapped[0] || "", xRight + 9, y);

    y += lineHeight + (Math.max(leftWrapped.length, rightWrapped.length) - 1) * 4;
  }
  return y + 2;
}

function drawOrderItems(doc, q, startY, fontFamily, textX, sectionCfg) {
  let y = startY;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.option);
  setColor(doc, COLOR.textDark);
  const items = q.items || q.options || [];
  const pillH = 7;
  const pillW = PAGE.contentWidth - (textX - PAGE.marginX) - 2;
  for (let i = 0; i < items.length; i++) {
    if (y + pillH + 2 > PAGE.height - PAGE.marginY - 14) break;
    // Pill background
    setFillColor(doc, sectionCfg.soft);
    doc.roundedRect(textX, y - 4.5, pillW, pillH, 2, 2, "F");

    // Empty number slot (small white circle with border for student to fill)
    setFillColor(doc, COLOR.white);
    doc.circle(textX + 4, y - 1.2, 2.4, "F");
    setDrawColor(doc, sectionCfg.color);
    doc.setLineWidth(0.5);
    doc.circle(textX + 4, y - 1.2, 2.4, "S");

    // Item text
    setColor(doc, COLOR.textDark);
    const itemText = String(items[i]);
    const wrapped = doc.splitTextToSize(itemText, pillW - 13);
    doc.text(wrapped[0] || "", textX + 9, y);
    y += pillH + 1.5;
  }
  return y;
}

function drawSliderTrack(doc, q, startY, fontFamily, sectionCfg) {
  let y = startY + 2;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.hint);
  setColor(doc, COLOR.textMid);
  const min = q.min ?? 0;
  const max = q.max ?? 100;
  const trackY = y + 4;
  const trackX1 = PAGE.marginX + 8;
  const trackX2 = PAGE.marginX + PAGE.contentWidth - 8;

  // Track in section color
  setDrawColor(doc, sectionCfg.color);
  doc.setLineWidth(1);
  doc.line(trackX1, trackY, trackX2, trackY);
  // End caps as filled circles
  setFillColor(doc, sectionCfg.color);
  doc.circle(trackX1, trackY, 1.4, "F");
  doc.circle(trackX2, trackY, 1.4, "F");

  setColor(doc, COLOR.textMid);
  doc.text(String(min), trackX1, trackY + 5, { align: "center" });
  doc.text(String(max), trackX2, trackY + 5, { align: "center" });
  y = trackY + 9;
  doc.setFontSize(FONT.option);
  setColor(doc, COLOR.textDark);
  doc.text("____________", PAGE.marginX + 8, y);
  y += 4;
  return y;
}

function drawDottedLines(doc, startY, count) {
  let y = startY;
  setFillColor(doc, COLOR.textFaint);
  for (let i = 0; i < count; i++) {
    if (y + SPACING.dottedLineGap > PAGE.height - PAGE.marginY - 14) break;
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
  const base = 14;
  const promptLines = Math.ceil(((q.q || "").length || 30) / 80);
  let imageH = 0;
  if (q.image_url && imageCache?.get(q.image_url)) {
    const img = imageCache.get(q.image_url);
    const { h } = scaleImageToFit(img.naturalW, img.naturalH, PAGE.contentWidth * 0.6, 55);
    imageH = h + SPACING.afterImage;
  }
  const typeH =
    q.type === "mcq" ? (q.options?.length || 4) * (SPACING.betweenOptions + 4) :
    q.type === "tf" ? 11 :
    q.type === "fill" ? 4 :
    q.type === "match" ? (q.pairs?.length || 4) * 7 + 4 :
    q.type === "order" ? (q.items?.length || 4) * 9 :
    q.type === "slider" ? 14 :
    (q.type === "free" || q.type === "open") ? 5 * SPACING.dottedLineGap :
    3 * SPACING.dottedLineGap;
  return base + promptLines * 5 + imageH + typeH;
}

function drawMatchAnswerBlock(doc, q, num, startY, fontFamily) {
  const pairs = Array.isArray(q.pairs) ? q.pairs : [];
  if (pairs.length === 0) {
    doc.text(`${num}. —`, PAGE.marginX, startY);
    return startY + 7;
  }

  const padTop = 5;
  const headerHeight = 9;
  const rowHeight = 5.5;
  const padBottom = 5;
  const padX = 6;
  const arrowGap = 6;

  const blockHeight = padTop + headerHeight + (pairs.length * rowHeight) + padBottom;

  if (startY + blockHeight > PAGE.height - PAGE.marginY - 14) {
    doc.addPage();
    startY = PAGE.marginY;
  }

  let y = startY;

  // Coral-tinted block (it's an answer key, so all match blocks use coral)
  setFillColor(doc, COLOR.coralSoft);
  setDrawColor(doc, COLOR.coralLight);
  doc.setLineWidth(0.4);
  doc.roundedRect(PAGE.marginX, y, PAGE.contentWidth, blockHeight, 3, 3, "FD");

  // Header with coral badge
  y += padTop + 4;
  setFillColor(doc, COLOR.coral);
  doc.circle(PAGE.marginX + padX, y - 1.3, 2.8, "F");
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(9.5);
  setColor(doc, COLOR.white);
  doc.text(String(num), PAGE.marginX + padX, y + 0.2, { align: "center" });
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.hint);
  setColor(doc, COLOR.textMid);
  doc.text("match", PAGE.marginX + padX + 5, y);
  y += (headerHeight - 4);

  doc.setFontSize(FONT.questionText);
  setColor(doc, COLOR.textDark);
  let maxLeftWidth = 0;
  for (const p of pairs) {
    const w = doc.getTextWidth(String(p.left || ""));
    if (w > maxLeftWidth) maxLeftWidth = w;
  }
  const maxLeftAllowed = PAGE.contentWidth * 0.45;
  if (maxLeftWidth > maxLeftAllowed) maxLeftWidth = maxLeftAllowed;

  for (const p of pairs) {
    setFillColor(doc, COLOR.coral);
    doc.circle(PAGE.marginX + padX + 2, y - 1.4, 0.8, "F");
    const leftText = doc.splitTextToSize(String(p.left || ""), maxLeftAllowed)[0];
    doc.text(leftText, PAGE.marginX + padX + 6, y);
    const arrowX = PAGE.marginX + padX + 6 + maxLeftWidth + arrowGap;
    setColor(doc, COLOR.coral);
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

// Footer — colored thin rule + Clasloop branding
function drawFooterAllPages(doc, fontFamily, labels) {
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);

    // Teal thin rule above footer
    setFillColor(doc, COLOR.teal);
    const ruleY = PAGE.height - 14;
    doc.rect(PAGE.marginX, ruleY, 30, 0.8, "F");

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
