// ─── pdf-styles/scanner ─────────────────────────────────────────────────
//
// PR 47: rediseño completo de la hoja escaneable. Diseño con identidad
// Clasloop (no copia de ZipGrade) y 4 templates fijos según la cantidad
// de preguntas escaneables del deck.
//
// La hoja contiene:
//
//   - 4 marcas fiduciales en las esquinas + 2 mid-laterales (para que
//     la cam corrija perspectiva con más robustez)
//   - Header con logomark Clasloop + wordmark + badge SCORE / __
//   - Doble línea horizontal (signature visual) arriba y abajo
//   - Campos Name / Date / Class en small-caps con líneas finas
//   - Título del deck (centrado)
//   - Grid de burbujas según template (T10, T20, T30 o T50)
//   - Mini ejemplo de cómo NO y cómo SÍ rellenar la burbuja
//   - Footer con QR + logomark + clasloop.com
//
// Templates internos (se elige según scannable.length):
//
//   T10 → 1-10 preguntas:   1 columna, burbujas grandes
//   T20 → 11-20 preguntas:  2 columnas
//   T30 → 21-30 preguntas:  3 columnas
//   T50 → 31-50 preguntas:  3 cols arriba (1-30) + 2 cols abajo (31-50)
//                           alineadas verticalmente con las cols 1-2
//
// Dentro de cada template dibujamos SOLO las preguntas reales. Si el
// deck tiene 7 preguntas, T10 dibuja 7 filas (no rellena las 3 vacías).
//
// IMPORTANTE: la hoja es siempre blanco+negro austero. NO usa paletas
// (PR 32) porque las cámaras detectan mejor en alto contraste. NO usa
// el font del style elegido en el modal — Helvetica forzada (o
// NotoSansKR si el deck es coreano).
//
// La answer key NO vive en este PDF. Vive en la app, indexada por
// deck_id que va dentro del QR. El scanner del PR futuro leerá el QR
// para cargar las respuestas correctas y comparar.

import QRCode from "qrcode";
import { PAGE_A4, groupQuestionsBySection } from "./shared";

// ─── Page geometry ──────────────────────────────────────────────────────
const PAGE = {
  ...PAGE_A4,
  marginX: 12,
  marginY: 12,
};

// PR 49: exportado para el CV (sabe la proporción target del warp).
export const PAGE_DIMS = { width: PAGE.width, height: PAGE.height };

// ─── Marcas fiduciales ──────────────────────────────────────────────────
const FIDUCIAL_CORNER = 7;
const FIDUCIAL_CORNER_INSET = 6;
const FIDUCIAL_MID = 5;
const FIDUCIAL_MID_Y = PAGE.height / 2 - FIDUCIAL_MID / 2;

// ─── Header / branding constants ────────────────────────────────────────
const HEADER_LOGO_X = 22;
const HEADER_LOGO_Y = 24;
const HEADER_SCORE_BOX_X = 155;
const HEADER_SCORE_BOX_Y = 17;
const HEADER_SCORE_BOX_W = 35;
const HEADER_SCORE_BOX_H = 14;

const TOP_RULE_Y = 34;
const FIELDS_Y = 44;
const TITLE_Y = 76;

const BOTTOM_RULE_Y_DEFAULT = 245;
const BOTTOM_RULE_Y_T50 = 272;

const QR_SIZE = 22;
const QR_OFFSET_FROM_RULE = 5;

// ─── Templates: layout params por cada uno ──────────────────────────────
// PR 49: exportados para que el CV pipeline del scanner cam pueda
// replicar las coordenadas exactas de las burbujas y saber dónde
// samplear en la imagen "ideal" (después del 4-point warp).
export const TEMPLATES = {
  T10: {
    capacity: 10,
    cols: 1,
    bubbleR: 3.5,
    bubbleGap: 12,
    rowHeight: 12,
    fontNum: 9,
    fontLetter: 3.5,
    fontHeader: 8,        // letras A/B/C/D arriba de cada columna
    headerOffset: 6,      // mm arriba del centro de la primera burbuja
    numTextOffset: -8,
    colXBase: [88],
    yStart: 95,
    exampleAt: { x: 60, y: 222 },
    bottomRuleY: BOTTOM_RULE_Y_DEFAULT,
  },
  T20: {
    capacity: 20,
    cols: 2,
    bubbleR: 2.5,
    bubbleGap: 8,
    rowHeight: 10,
    fontNum: 7,
    fontLetter: 2.7,
    fontHeader: 6.5,
    headerOffset: 5,
    numTextOffset: -7,
    colXBase: [65, 125],
    yStart: 90,
    exampleAt: { x: 60, y: 200 },
    bottomRuleY: BOTTOM_RULE_Y_DEFAULT,
  },
  T30: {
    capacity: 30,
    cols: 3,
    bubbleR: 2,
    bubbleGap: 6,
    rowHeight: 9,
    fontNum: 6,
    fontLetter: 2.2,
    fontHeader: 6,
    headerOffset: 4.5,
    numTextOffset: -7,
    colXBase: [35, 97, 159],
    yStart: 89.5,
    exampleAt: { x: 60, y: 195 },
    bottomRuleY: BOTTOM_RULE_Y_DEFAULT,
  },
  T50: {
    capacity: 50,
    cols: 3,
    cols2: 2,
    bubbleR: 2,
    bubbleGap: 6,
    rowHeight: 8.5,
    fontNum: 6,
    fontLetter: 2.2,
    fontHeader: 6,
    headerOffset: 4.5,
    numTextOffset: -7,
    colXBase: [38, 97, 156],
    yStart: 88.5,
    colXBase2: [38, 97],
    yStart2: 182,
    exampleAt: { x: 145, y: 195 },
    bottomRuleY: BOTTOM_RULE_Y_T50,
  },
};

export function pickTemplate(scannableCount) {
  if (scannableCount <= 10) return TEMPLATES.T10;
  if (scannableCount <= 20) return TEMPLATES.T20;
  if (scannableCount <= 30) return TEMPLATES.T30;
  return TEMPLATES.T50;
}

// ─── Helpers de dibujo ──────────────────────────────────────────────────

function drawFiducials(doc) {
  doc.setFillColor(0, 0, 0);
  doc.rect(FIDUCIAL_CORNER_INSET, FIDUCIAL_CORNER_INSET, FIDUCIAL_CORNER, FIDUCIAL_CORNER, "F");
  doc.rect(PAGE.width - FIDUCIAL_CORNER_INSET - FIDUCIAL_CORNER, FIDUCIAL_CORNER_INSET, FIDUCIAL_CORNER, FIDUCIAL_CORNER, "F");
  doc.rect(FIDUCIAL_CORNER_INSET, PAGE.height - FIDUCIAL_CORNER_INSET - FIDUCIAL_CORNER, FIDUCIAL_CORNER, FIDUCIAL_CORNER, "F");
  doc.rect(PAGE.width - FIDUCIAL_CORNER_INSET - FIDUCIAL_CORNER, PAGE.height - FIDUCIAL_CORNER_INSET - FIDUCIAL_CORNER, FIDUCIAL_CORNER, FIDUCIAL_CORNER, "F");
  doc.rect(FIDUCIAL_CORNER_INSET + 1, FIDUCIAL_MID_Y, FIDUCIAL_MID, FIDUCIAL_MID, "F");
  doc.rect(PAGE.width - FIDUCIAL_CORNER_INSET - FIDUCIAL_MID - 1, FIDUCIAL_MID_Y, FIDUCIAL_MID, FIDUCIAL_MID, "F");
}

function drawLogomark(doc, cx, cy, outerR = 3.5, innerR = 1.8) {
  doc.setDrawColor(0, 0, 0);
  doc.setFillColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.circle(cx, cy, outerR, "S");
  doc.circle(cx, cy, innerR, "F");
}

function drawHeader(doc, fontFamily) {
  drawLogomark(doc, HEADER_LOGO_X, HEADER_LOGO_Y, 3.5, 1.8);
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("CLASLOOP", HEADER_LOGO_X + 8, HEADER_LOGO_Y - 1.5, { charSpace: 0.6 });
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(7);
  doc.setTextColor(136, 136, 136);
  doc.text("ANSWER SHEET", HEADER_LOGO_X + 8, HEADER_LOGO_Y + 2.5, { charSpace: 0.3 });

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.roundedRect(HEADER_SCORE_BOX_X, HEADER_SCORE_BOX_Y, HEADER_SCORE_BOX_W, HEADER_SCORE_BOX_H, 2, 2, "S");
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(6);
  doc.setTextColor(136, 136, 136);
  doc.text("SCORE", HEADER_SCORE_BOX_X + 3, HEADER_SCORE_BOX_Y + 6, { charSpace: 0.4 });
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(13);
  doc.text("/", HEADER_SCORE_BOX_X + HEADER_SCORE_BOX_W / 2, HEADER_SCORE_BOX_Y + 11.5, { align: "center" });

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(20, TOP_RULE_Y, 190, TOP_RULE_Y);
  doc.setLineWidth(0.2);
  doc.line(20, TOP_RULE_Y + 1.5, 190, TOP_RULE_Y + 1.5);
}

function drawFields(doc, fontFamily) {
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(7);
  doc.setTextColor(136, 136, 136);

  doc.text("NAME", 20, FIELDS_Y, { charSpace: 0.5 });
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(20, FIELDS_Y + 6, 120, FIELDS_Y + 6);

  doc.text("DATE", 128, FIELDS_Y, { charSpace: 0.5 });
  doc.line(128, FIELDS_Y + 6, 190, FIELDS_Y + 6);

  doc.text("CLASS", 20, FIELDS_Y + 13, { charSpace: 0.5 });
  doc.line(20, FIELDS_Y + 19, 190, FIELDS_Y + 19);
}

function drawTitle(doc, deck, fontFamily) {
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const title = (deck.title || "Answer sheet").trim();
  doc.text(title, PAGE.width / 2, TITLE_Y, { align: "center" });
}

function drawBubbleRow(doc, numLabel, choices, baseX, baseY, t, fontFamily) {
  // Número de pregunta a la izquierda
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(t.fontNum);
  doc.setTextColor(0, 0, 0);
  doc.text(numLabel, baseX + t.numTextOffset, baseY + t.fontNum / 4, { align: "right" });

  // Solo las circulos vacías — los headers A/B/C/D van arriba de la columna
  // (drawColumnHeader), no dentro de cada burbuja.
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  choices.forEach((letter, i) => {
    const cx = baseX + i * t.bubbleGap;
    doc.circle(cx, baseY, t.bubbleR, "S");
  });
}

/**
 * Header de columna: dibuja "A B C D" arriba de la primera fila de
 * burbujas, alineado horizontalmente con los centros. Diseño minimal,
 * tipográfico — letterspacing generoso, color gris medio para que no
 * compita con los números de pregunta.
 *
 * Para columnas que tienen solo TF preguntas mostraría "T F", pero
 * como típicamente las cols son MCQ-mayoritarias o mixtas, siempre
 * pinto "A B C D" (las TF usan A=T, B=F implícitamente — su burbuja
 * sigue siendo válida en posiciones 1 y 2).
 */
function drawColumnHeader(doc, colBaseX, yStart, t, fontFamily) {
  const choices = ["A", "B", "C", "D"];
  const headerY = yStart - t.headerOffset;
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(t.fontHeader);
  doc.setTextColor(110, 110, 110);
  choices.forEach((letter, i) => {
    const cx = colBaseX + i * t.bubbleGap;
    doc.text(letter, cx, headerY, { align: "center" });
  });
}

function drawBlockSeparator(doc, x1, x2, y) {
  doc.setDrawColor(221, 221, 221);
  doc.setLineWidth(0.3);
  doc.line(x1, y, x2, y);
}

function drawColumn(doc, questions, startQNum, colBaseX, yStart, t, fontFamily) {
  questions.forEach((q, idx) => {
    const rowY = yStart + idx * t.rowHeight;
    const qNum = startQNum + idx;
    const choices = q.type === "tf" ? ["T", "F"] : ["A", "B", "C", "D"];
    drawBubbleRow(doc, String(qNum), choices, colBaseX, rowY, t, fontFamily);
  });

  if (questions.length >= 6) {
    const sepY = yStart + 4 * t.rowHeight + t.rowHeight / 2;
    drawBlockSeparator(
      doc,
      colBaseX - (t.bubbleR + 4),
      colBaseX + 3 * t.bubbleGap + t.bubbleR + 2,
      sepY
    );
  }
}

function drawGrid(doc, scannable, t, fontFamily) {
  if (t === TEMPLATES.T50) {
    const upper = scannable.slice(0, 30);
    for (let c = 0; c < t.cols; c++) {
      const colQs = upper.slice(c * 10, (c + 1) * 10);
      if (colQs.length === 0) break;
      drawColumnHeader(doc, t.colXBase[c], t.yStart, t, fontFamily);
      drawColumn(doc, colQs, c * 10 + 1, t.colXBase[c], t.yStart, t, fontFamily);
    }
    const lower = scannable.slice(30, 50);
    for (let c = 0; c < t.cols2; c++) {
      const colQs = lower.slice(c * 10, (c + 1) * 10);
      if (colQs.length === 0) break;
      drawColumnHeader(doc, t.colXBase2[c], t.yStart2, t, fontFamily);
      drawColumn(doc, colQs, 30 + c * 10 + 1, t.colXBase2[c], t.yStart2, t, fontFamily);
    }
  } else {
    for (let c = 0; c < t.cols; c++) {
      const colQs = scannable.slice(c * 10, (c + 1) * 10);
      if (colQs.length === 0) break;
      drawColumnHeader(doc, t.colXBase[c], t.yStart, t, fontFamily);
      drawColumn(doc, colQs, c * 10 + 1, t.colXBase[c], t.yStart, t, fontFamily);
    }
  }
}

function drawExample(doc, t, fontFamily) {
  const { x: ox, y: oy } = t.exampleAt;

  doc.setFont(fontFamily, "bold");
  doc.setFontSize(7);
  doc.setTextColor(136, 136, 136);

  if (t === TEMPLATES.T50) {
    // Layout vertical-ish: 3 burbujas en fila + texto debajo
    doc.text("EXAMPLE", ox, oy, { charSpace: 0.6 });

    const yBubbles = oy + 10;
    const bR = 3;

    // Tachadura (mal)
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.circle(ox + 3, yBubbles, bR, "S");
    doc.setLineWidth(0.6);
    doc.line(ox + 3 - bR * 0.7, yBubbles - bR * 0.7, ox + 3 + bR * 0.7, yBubbles + bR * 0.7);
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(5);
    doc.text("no", ox + 3, yBubbles + bR + 3, { align: "center" });

    // Línea horizontal (mal)
    doc.setLineWidth(0.4);
    doc.circle(ox + 16, yBubbles, bR, "S");
    doc.setLineWidth(0.8);
    doc.line(ox + 16 - bR * 0.7, yBubbles, ox + 16 + bR * 0.7, yBubbles);
    doc.setFontSize(5);
    doc.text("no", ox + 16, yBubbles + bR + 3, { align: "center" });

    // Rellena (bien)
    doc.setFillColor(0, 0, 0);
    doc.circle(ox + 29, yBubbles, bR, "F");
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(5);
    doc.setTextColor(0, 0, 0);
    doc.text("yes", ox + 29, yBubbles + bR + 3, { align: "center" });

    doc.setFont(fontFamily, "normal");
    doc.setFontSize(6);
    doc.setTextColor(85, 85, 85);
    doc.text("Fill the bubble", ox, oy + 28);
    doc.text("completely with", ox, oy + 33);
    doc.text("a dark pen.", ox, oy + 38);
    doc.setTextColor(136, 136, 136);
    doc.text("Erase stray marks.", ox, oy + 46);
  } else {
    // Layout horizontal: tres burbujas en línea + texto a la derecha
    doc.text("EXAMPLE", ox, oy, { charSpace: 0.6, align: "right" });

    const yBubbles = oy + 4;
    const startX = ox + 8;
    const bR = 2;

    // Tachadura (mal)
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.circle(startX, yBubbles, bR, "S");
    doc.setLineWidth(0.55);
    doc.line(startX - 1.3, yBubbles - 1.3, startX + 1.3, yBubbles + 1.3);
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(5);
    doc.text("no", startX, yBubbles + 7, { align: "center" });

    // Línea horizontal (mal)
    doc.setLineWidth(0.4);
    doc.circle(startX + 12, yBubbles, bR, "S");
    doc.setLineWidth(0.7);
    doc.line(startX + 12 - 1.4, yBubbles, startX + 12 + 1.4, yBubbles);
    doc.setFontSize(5);
    doc.text("no", startX + 12, yBubbles + 7, { align: "center" });

    // Rellena (bien)
    doc.setFillColor(0, 0, 0);
    doc.circle(startX + 24, yBubbles, bR, "F");
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(5);
    doc.setTextColor(0, 0, 0);
    doc.text("yes", startX + 24, yBubbles + 7, { align: "center" });

    // Flecha + texto
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.line(startX + 32, yBubbles, startX + 38, yBubbles);
    doc.setFillColor(0, 0, 0);
    doc.triangle(startX + 36, yBubbles - 2, startX + 40, yBubbles, startX + 36, yBubbles + 2, "F");

    doc.setFont(fontFamily, "normal");
    doc.setFontSize(6);
    doc.setTextColor(0, 0, 0);
    doc.text("Fill the bubble completely with a dark pen", startX + 42, yBubbles + 1.5);
  }
}

async function drawFooter(doc, deck, fontFamily, bottomRuleY) {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(20, bottomRuleY, 190, bottomRuleY);
  doc.setLineWidth(0.2);
  doc.line(20, bottomRuleY + 1.5, 190, bottomRuleY + 1.5);

  const qrPayload = `clasloop:deck:${deck.id || ""}`;
  let qrDataURL;
  try {
    qrDataURL = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: "M",
      margin: 0,
      width: 200,
    });
  } catch (err) {
    console.error("[clasloop scanner] QR generation failed:", err);
  }

  const qrY = bottomRuleY + QR_OFFSET_FROM_RULE;
  const qrX = PAGE.width - PAGE.marginX - QR_SIZE;
  const qrYSafe = Math.min(qrY, PAGE.height - PAGE.marginY - QR_SIZE - 2);

  if (qrDataURL) {
    doc.addImage(qrDataURL, "PNG", qrX, qrYSafe, QR_SIZE, QR_SIZE);
  }

  const logoY = qrYSafe + 10;
  drawLogomark(doc, 22, logoY, 2.5, 1.2);
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text("clasloop.com", 26, logoY + 1.5, { charSpace: 0.4 });
}

// ─── Public API ─────────────────────────────────────────────────────────

export async function drawScanSheet(doc, deck, classObj, opts = {}) {
  const { fontFamily = "helvetica" } = opts;

  const allQuestions = deck.questions || [];

  // BUG FIX (PR 47.2): el scan sheet DEBE seguir el mismo orden que el
  // exam normal. Los styles del exam usan groupQuestionsBySection que
  // reordena dentro de "selection" según SELECTION_TYPE_ORDER (mcq, tf,
  // match, order, slider, fill) — entonces los MCQ van primero, después
  // los TF.
  //
  // Antes filtrábamos directo de deck.questions en orden de creación,
  // lo que producía: si el deck era [MCQ, TF, MCQ, TF], el exam lo
  // mostraba como 1=MCQ, 2=MCQ, 3=TF, 4=TF — pero el scan sheet lo
  // mostraba como 1=MCQ, 2=TF, 3=MCQ, 4=TF. Resultado: el estudiante
  // marca según el exam y todo va mal al escanear.
  //
  // Ahora usamos la misma función de agrupación → orden consistente →
  // la fila N del scan sheet corresponde exactamente a la pregunta N
  // del exam.
  const { selection } = groupQuestionsBySection(allQuestions);

  // Dentro de "selection" filtramos solo los tipos escaneables (MCQ +
  // TF). El orden se preserva: MCQs primero, después TFs.
  const scannable = selection.filter(
    q => q && (q.type === "mcq" || q.type === "tf")
  );
  // Para la nota footer, contar TODAS las no escaneables (selection
  // tipos no MCQ/TF + written).
  const manual = allQuestions.filter(
    q => q && q.type !== "mcq" && q.type !== "tf"
  );

  if (scannable.length > 50) {
    drawFiducials(doc);
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Too many scannable questions", PAGE.marginX, 40);
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(10);
    const errMsg = `This deck has ${scannable.length} MCQ/TF questions. ` +
      `Scan sheet supports up to 50. ` +
      `Print the regular Exam variant (without scan sheet) instead.`;
    doc.text(doc.splitTextToSize(errMsg, PAGE.width - PAGE.marginX * 2), PAGE.marginX, 55);
    return;
  }

  if (scannable.length === 0) {
    drawFiducials(doc);
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("No scannable questions", PAGE.marginX, 40);
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(10);
    doc.text(
      "This deck has no MCQ or T/F questions. The scan sheet has nothing to grade. Print the regular Exam variant instead.",
      PAGE.marginX, 55, { maxWidth: PAGE.width - PAGE.marginX * 2 }
    );
    return;
  }

  const template = pickTemplate(scannable.length);

  drawFiducials(doc);
  drawHeader(doc, fontFamily);
  drawFields(doc, fontFamily);
  drawTitle(doc, deck, fontFamily);
  drawGrid(doc, scannable, template, fontFamily);
  drawExample(doc, template, fontFamily);

  if (manual.length > 0) {
    const noteY = template.bottomRuleY - 7;
    doc.setFont(fontFamily, "italic");
    doc.setFontSize(6);
    doc.setTextColor(136, 136, 136);
    doc.text(
      `Note: ${manual.length} additional question${manual.length > 1 ? "s" : ""} (fill / open / match / order) require manual grading.`,
      PAGE.marginX, noteY,
      { maxWidth: PAGE.width - PAGE.marginX * 2 - QR_SIZE - 4 }
    );
  }

  await drawFooter(doc, deck, fontFamily, template.bottomRuleY);
}
