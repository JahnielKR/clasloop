// ─── pdf-styles/classic ─────────────────────────────────────────────────
//
// PR 29.0: "Classic" PDF style — sober, professional, textbook-like.
// This is the default style and the closest match to what existed before
// the multi-style refactor. Black titles, generous whitespace, no color,
// monospace touches absent. Designed for printability (B&W, 300dpi).
//
// Both exam + answer key live here so the styling stays consistent across
// the two artifacts of the same deck.

import {
  PAGE_A4, DEFAULT_MARGINS, LABELS,
  drawWrappedText, deterministicShuffle, formatAnswerForKey,
  fetchImageAsDataURL, scaleImageToFit,
} from "./shared";

const PAGE = {
  ...PAGE_A4,
  ...DEFAULT_MARGINS,
  contentWidth: PAGE_A4.width - DEFAULT_MARGINS.marginX * 2,
  contentHeight: PAGE_A4.height - DEFAULT_MARGINS.marginY * 2,
};

const FONT = {
  title: 16,
  subtitle: 11,
  questionNum: 11,
  questionText: 11,
  option: 10.5,
  meta: 9,
  hint: 8.5,
  footer: 8,
};

const SPACING = {
  afterHeader: 8,
  afterQuestionNum: 4,
  betweenOptions: 6,
  blankLine: 7,
  betweenQuestions: 12,
  afterImage: 6,
};

// ═══════════════════════════════════════════════════════════════════════
// EXAM (student-facing)
// ═══════════════════════════════════════════════════════════════════════
export async function renderExam(doc, deck, classObj, opts = {}) {
  const { lang = "en", fontFamily = "helvetica" } = opts;
  const labels = LABELS[lang] || LABELS.en;
  let y = PAGE.marginY;

  // Pre-fetch images so the page-break math accounts for them properly.
  // (If we fetched inside the question loop, image height would be unknown
  // until after we'd already committed to a page.) Cache by URL — same
  // image referenced by multiple questions only fetches once.
  const imageCache = await preloadImages(deck.questions || []);

  // ─── Header: title + class + name/date ─────────────────────────────
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

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(PAGE.marginX, y, PAGE.marginX + PAGE.contentWidth, y);
  y += 6;

  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.subtitle);
  doc.setTextColor(60, 60, 60);
  const nameLabelW = doc.getTextWidth(labels.name + ":");
  const dateLabelW = doc.getTextWidth(labels.date + ":");
  doc.text(labels.name + ":", PAGE.marginX, y);
  doc.text(labels.date + ":", PAGE.marginX + PAGE.contentWidth * 0.6, y);
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

  // ─── Questions ─────────────────────────────────────────────────────
  const questions = deck.questions || [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const estimatedHeight = estimateQuestionHeight(q, imageCache);
    if (y + estimatedHeight > PAGE.height - PAGE.marginY) {
      doc.addPage();
      y = PAGE.marginY;
    }
    y = drawQuestionForExam(doc, q, i + 1, y, fontFamily, lang, imageCache);
    y += SPACING.betweenQuestions;
  }

  // ─── Footer on every page (Clasloop branding + page numbers) ───────
  drawFooterAllPages(doc, fontFamily, labels);
}

// ═══════════════════════════════════════════════════════════════════════
// ANSWER KEY (teacher-facing)
// ═══════════════════════════════════════════════════════════════════════
export async function renderAnswerKey(doc, deck, classObj, opts = {}) {
  const { lang = "en", fontFamily = "helvetica" } = opts;
  const labels = LABELS[lang] || LABELS.en;
  let y = PAGE.marginY;

  // Header — title + "Answer key" label
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.title);
  doc.setTextColor(20, 20, 20);
  y = drawWrappedText(doc, deck.title || "Deck", PAGE.marginX, y, PAGE.contentWidth, FONT.title * 0.45);
  y += 1;

  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.subtitle);
  doc.setTextColor(120, 120, 120);
  doc.text(labels.answerKey, PAGE.marginX, y);
  y += 8;

  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(PAGE.marginX, y, PAGE.marginX + PAGE.contentWidth, y);
  y += 6;

  // Answer list
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
    if (questions[i].type === "match") {
      y = drawMatchAnswerBlock(doc, questions[i], i + 1, y, fontFamily);
      continue;
    }
    const answerText = formatAnswerForKey(questions[i], labels);
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

  drawFooterAllPages(doc, fontFamily, labels);
}

// ═══════════════════════════════════════════════════════════════════════
// INTERNALS — exam question rendering
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

function drawQuestionForExam(doc, q, num, startY, fontFamily, lang, imageCache) {
  let y = startY;
  const labels = LABELS[lang] || LABELS.en;

  // Number + prompt
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(FONT.questionNum);
  doc.setTextColor(20, 20, 20);
  const numText = `${num}.`;
  const numWidth = doc.getTextWidth(numText) + 2;
  doc.text(numText, PAGE.marginX, y);

  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.questionText);
  const questionText = q.q || q.prompt || q.question || "";
  y = drawWrappedText(
    doc, questionText,
    PAGE.marginX + numWidth, y,
    PAGE.contentWidth - numWidth, FONT.questionText * 0.45,
  );
  y += SPACING.afterQuestionNum;

  // Image (if present and successfully fetched)
  if (q.image_url && imageCache.has(q.image_url)) {
    const img = imageCache.get(q.image_url);
    if (img) {
      const maxW = PAGE.contentWidth * 0.7;
      const maxH = 60; // mm — keeps the image compact
      const { w, h } = scaleImageToFit(img.naturalW, img.naturalH, maxW, maxH);
      const x = PAGE.marginX + (PAGE.contentWidth - w) / 2;
      try {
        doc.addImage(img.dataUrl, img.format, x, y, w, h);
        y += h + SPACING.afterImage;
      } catch (err) {
        console.warn("[pdf classic] addImage failed:", err);
      }
    }
  }

  // Type-specific response area
  switch (q.type) {
    case "mcq": y = drawMCQOptions(doc, q, y, fontFamily); break;
    case "tf": y = drawTFOptions(doc, y, fontFamily, labels); break;
    case "fill": y = drawFillBlanks(y); break;
    case "match": y = drawMatchPairs(doc, q, y, fontFamily); break;
    case "order": y = drawOrderItems(doc, q, y, fontFamily); break;
    case "slider": y = drawSliderTrack(doc, q, y, fontFamily); break;
    case "sentence":
    case "free":
    case "open":
    default:
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
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.3);
    doc.rect(PAGE.marginX + 4, y - 3.2, 3.2, 3.2);
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
  doc.rect(PAGE.marginX + 4, y - 3.2, 3.2, 3.2);
  doc.text(labels.true, PAGE.marginX + 10, y);
  const trueWidth = doc.getTextWidth(labels.true);
  doc.rect(PAGE.marginX + 14 + trueWidth, y - 3.2, 3.2, 3.2);
  doc.text(labels.false, PAGE.marginX + 20 + trueWidth, y);
  y += SPACING.betweenOptions;
  return y;
}

function drawFillBlanks(startY) {
  // Fill-the-blank already contains ___ in the prompt. Just breathing space.
  return startY + 4;
}

function drawMatchPairs(doc, q, startY, fontFamily) {
  let y = startY;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.option);
  doc.setTextColor(40, 40, 40);
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
    if (y + lineHeight > PAGE.height - PAGE.marginY) break;
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

function drawOrderItems(doc, q, startY, fontFamily) {
  let y = startY;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(FONT.option);
  doc.setTextColor(40, 40, 40);
  const items = q.items || q.options || [];
  for (let i = 0; i < items.length; i++) {
    if (y + 6 > PAGE.height - PAGE.marginY) break;
    doc.setDrawColor(120, 120, 120);
    doc.line(PAGE.marginX + 4, y + 0.5, PAGE.marginX + 12, y + 0.5);
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
  const min = q.min ?? 0;
  const max = q.max ?? 100;
  const trackY = y + 4;
  const trackX1 = PAGE.marginX + 8;
  const trackX2 = PAGE.marginX + PAGE.contentWidth - 8;
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.5);
  doc.line(trackX1, trackY, trackX2, trackY);
  doc.line(trackX1, trackY - 1.5, trackX1, trackY + 1.5);
  doc.line(trackX2, trackY - 1.5, trackX2, trackY + 1.5);
  doc.text(String(min), trackX1, trackY + 5, { align: "center" });
  doc.text(String(max), trackX2, trackY + 5, { align: "center" });
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

function estimateQuestionHeight(q, imageCache) {
  const base = 12;
  const promptLines = Math.ceil(((q.q || "").length || 30) / 80);
  let imageH = 0;
  if (q.image_url && imageCache?.get(q.image_url)) {
    const img = imageCache.get(q.image_url);
    const { h } = scaleImageToFit(img.naturalW, img.naturalH, PAGE.contentWidth * 0.7, 60);
    imageH = h + SPACING.afterImage;
  }
  const typeH =
    q.type === "mcq" ? (q.options?.length || 4) * SPACING.betweenOptions :
    q.type === "tf" ? SPACING.betweenOptions :
    q.type === "fill" ? 4 :
    q.type === "match" ? (q.pairs?.length || 4) * 6 + 4 :
    q.type === "order" ? (q.items?.length || 4) * 6 :
    q.type === "slider" ? 14 :
    3 * SPACING.blankLine;
  return base + promptLines * 5 + imageH + typeH;
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

  if (startY + blockHeight > PAGE.height - PAGE.marginY) {
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

  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(250, 250, 248);
  doc.setLineWidth(0.3);
  doc.roundedRect(
    PAGE.marginX, y,
    PAGE.contentWidth, blockHeight,
    1.5, 1.5,
    "FD"
  );

  y += padTop + 4;
  doc.setFont(fontFamily, "bold");
  doc.setTextColor(40, 40, 40);
  doc.text(`${num}.`, PAGE.marginX + padX, y);
  doc.setFont(fontFamily, "normal");
  doc.setTextColor(110, 110, 110);
  doc.setFontSize(FONT.meta);
  doc.text("(match)", PAGE.marginX + padX + 8, y);
  y += (headerHeight - 4);

  doc.setFontSize(FONT.questionText);
  doc.setTextColor(40, 40, 40);
  for (const p of pairs) {
    doc.setFillColor(140, 140, 140);
    doc.circle(PAGE.marginX + padX + 2, y - 1.4, 0.7, "F");
    const leftText = doc.splitTextToSize(String(p.left || ""), maxLeftAllowed)[0];
    doc.text(leftText, PAGE.marginX + padX + 6, y);
    const arrowX = PAGE.marginX + padX + 6 + maxLeftWidth + arrowGap;
    doc.setTextColor(140, 140, 140);
    doc.text("→", arrowX, y);
    doc.setTextColor(40, 40, 40);
    const rightStartX = arrowX + 5;
    const rightMaxWidth = PAGE.marginX + PAGE.contentWidth - rightStartX - padX;
    const rightText = doc.splitTextToSize(String(p.right || ""), rightMaxWidth)[0];
    doc.text(rightText, rightStartX, y);
    y += rowHeight;
  }
  return startY + blockHeight + 2;
}

// ─── Footer with Clasloop branding + page numbers ────────────────────────
// Drawn at the end on every page. Discreet — bottom 8mm strip with light
// gray text. The branding appears in both free and (eventually) premium;
// premium will swap the footer for a custom one when billing is wired up.
function drawFooterAllPages(doc, fontFamily, labels) {
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(FONT.footer);
    doc.setTextColor(160, 160, 160);
    const yFooter = PAGE.height - 8;
    // Page X of Y — left
    doc.text(labels.pageOfTotal(p, total), PAGE.marginX, yFooter);
    // Branding — right
    const branding = labels.poweredBy;
    const w = doc.getTextWidth(branding);
    doc.text(branding, PAGE.marginX + PAGE.contentWidth - w, yFooter);
  }
}
