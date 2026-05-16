// ─── pdf-styles/scanner ─────────────────────────────────────────────────
//
// PR 45: "Scanner version" — un PDF tipo ZipGrade que los estudiantes
// rellenan con burbujas y el profe escanea con la cámara de su tablet
// o celular. Imprime una sola hoja A4 con:
//
//   - 4 marcas fiduciales en las esquinas (cuadrados negros) — la cam
//     las usa para detectar orientación + corregir perspectiva
//   - Header con nombre/curso/fecha (líneas para escribir)
//   - QR code abajo con el deck_id — el scanner lee el QR para cargar
//     la answer key correcta
//   - Hasta 50 preguntas MCQ/TF en grilla compacta:
//       MCQ: 4 burbujas A B C D
//       TF:  2 burbujas V F
//   - Preguntas no-escaneables (fill, free, match, order) se imprimen
//     debajo con espacio para escribir, marcadas como "graded manually"
//
// Diseño austero / funcional. NO usa paletas (PR 32) — todo blanco y
// negro porque las cámaras detectan mejor en alto contraste.
//
// IMPORTANTE: este estilo NO tiene answer key separado. La answer key
// vive en la app — cuando el profe escanea, la cam carga las respuestas
// correctas del deck via el QR y compara automáticamente.

import QRCode from "qrcode";
import { PAGE_A4, LABELS } from "./shared";

// ─── Layout constants ────────────────────────────────────────────────────
const PAGE = {
  ...PAGE_A4,
  // Más margen para que las esquinas con marcas fiduciales no caigan al borde
  marginX: 12,
  marginY: 12,
};

// Marcas fiduciales (cuadrados negros) — la cam usa estos 4 puntos para
// detectar dónde está la hoja y corregir perspectiva.
const FIDUCIAL_SIZE = 8; // mm
const FIDUCIAL_INSET = 6; // mm desde el borde de página

// Header (nombre/curso/fecha)
const HEADER_HEIGHT = 22; // mm para la fila de campos

// Bubble grid layout
const QUESTION_ROW_HEIGHT = 5.2; // mm por pregunta. Apretado.
const BUBBLE_SIZE = 3.5; // mm diámetro
const BUBBLE_SPACING = 5.5; // mm entre bubbles
const NUMBER_COL_WIDTH = 8; // mm para "1.", "2.", etc.
const TYPE_LABEL_WIDTH = 6; // mm para "MCQ" / "T/F" mini-label

// QR code en el footer
const QR_SIZE = 22; // mm
const QR_MARGIN_TOP = 5; // mm

// Max preguntas escaneables — más arriba de eso, no entra en una hoja
const MAX_SCAN_QUESTIONS = 50;

// ─── Helpers ─────────────────────────────────────────────────────────────

/** Dibuja un cuadrado relleno (marca fiducial). */
function drawFiducial(doc, x, y) {
  doc.setFillColor(0, 0, 0);
  doc.rect(x, y, FIDUCIAL_SIZE, FIDUCIAL_SIZE, "F");
}

/** Dibuja las 4 marcas fiduciales en las esquinas. */
function drawAllFiducials(doc) {
  const w = PAGE.width;
  const h = PAGE.height;
  // Esquinas: top-left, top-right, bottom-left, bottom-right
  drawFiducial(doc, FIDUCIAL_INSET, FIDUCIAL_INSET);
  drawFiducial(doc, w - FIDUCIAL_INSET - FIDUCIAL_SIZE, FIDUCIAL_INSET);
  drawFiducial(doc, FIDUCIAL_INSET, h - FIDUCIAL_INSET - FIDUCIAL_SIZE);
  drawFiducial(doc, w - FIDUCIAL_INSET - FIDUCIAL_SIZE, h - FIDUCIAL_INSET - FIDUCIAL_SIZE);
}

/** Dibuja una burbuja vacía (círculo con borde solamente). */
function drawBubble(doc, x, y, letter, fontFamily) {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  // jsPDF: circle x/y es el CENTRO, radio en unidad actual (mm)
  const r = BUBBLE_SIZE / 2;
  doc.circle(x + r, y + r, r, "S");
  // Letra dentro de la burbuja
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  const textWidth = doc.getTextWidth(letter);
  doc.text(letter, x + r - textWidth / 2, y + r + 1.2);
}

/** Dibuja una fila de pregunta MCQ con 4 burbujas A/B/C/D.
 *  Devuelve la nueva Y. */
function drawMCQRow(doc, qNum, qText, x, y, fontFamily, contentWidth) {
  // Número de pregunta
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text(`${qNum}.`, x, y + BUBBLE_SIZE / 2 + 1);

  // "MCQ" mini-label
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(6.2);
  doc.setTextColor(80, 80, 80);
  doc.text("MCQ", x + NUMBER_COL_WIDTH, y + BUBBLE_SIZE / 2 + 1);

  // Burbujas A/B/C/D
  const bubblesStartX = x + NUMBER_COL_WIDTH + TYPE_LABEL_WIDTH;
  ["A", "B", "C", "D"].forEach((letter, i) => {
    drawBubble(doc, bubblesStartX + i * BUBBLE_SPACING, y, letter, fontFamily);
  });

  // Texto de la pregunta (truncado si es muy largo, para que entre)
  const textStartX = bubblesStartX + 4 * BUBBLE_SPACING + 3;
  const textWidth = contentWidth - (textStartX - x);
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  const shortText = truncateText(doc, qText, textWidth);
  doc.text(shortText, textStartX, y + BUBBLE_SIZE / 2 + 1);

  return y + QUESTION_ROW_HEIGHT;
}

/** Dibuja una fila de pregunta TF con 2 burbujas V/F. */
function drawTFRow(doc, qNum, qText, x, y, fontFamily, labels, contentWidth) {
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text(`${qNum}.`, x, y + BUBBLE_SIZE / 2 + 1);

  doc.setFont(fontFamily, "normal");
  doc.setFontSize(6.2);
  doc.setTextColor(80, 80, 80);
  doc.text("T/F", x + NUMBER_COL_WIDTH, y + BUBBLE_SIZE / 2 + 1);

  // Las burbujas de TF usan T/F en inglés siempre (más universal que V/F),
  // pero el texto de la pregunta queda en el idioma del deck.
  const bubblesStartX = x + NUMBER_COL_WIDTH + TYPE_LABEL_WIDTH;
  ["T", "F"].forEach((letter, i) => {
    drawBubble(doc, bubblesStartX + i * BUBBLE_SPACING, y, letter, fontFamily);
  });

  // Texto de la pregunta
  const textStartX = bubblesStartX + 2 * BUBBLE_SPACING + 3;
  const textWidth = contentWidth - (textStartX - x);
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  const shortText = truncateText(doc, qText, textWidth);
  doc.text(shortText, textStartX, y + BUBBLE_SIZE / 2 + 1);

  return y + QUESTION_ROW_HEIGHT;
}

/** Trunca texto agregando "…" si es más ancho que maxWidth. */
function truncateText(doc, text, maxWidth) {
  if (!text) return "";
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 3 && doc.getTextWidth(truncated + "…") > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "…";
}

/** Header de la hoja: línea para nombre, curso, fecha. */
function drawHeader(doc, deck, classObj, y, fontFamily, labels) {
  const x = PAGE.marginX;
  const contentWidth = PAGE.width - PAGE.marginX * 2;

  // Título del deck (centrado, chico)
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const title = (deck.title || "Deck").toUpperCase();
  const titleWidth = doc.getTextWidth(title);
  doc.text(title, (PAGE.width - titleWidth) / 2, y + 3);

  // Línea de clase abajo del título (si hay)
  if (classObj?.name) {
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    const className = classObj.name;
    const classWidth = doc.getTextWidth(className);
    doc.text(className, (PAGE.width - classWidth) / 2, y + 8);
  }

  // Fila con campos: Nombre _____________ Fecha _________ Nota ____
  const fieldsY = y + 14;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);

  // Nombre (más ancho)
  doc.text(`${labels.name}:`, x, fieldsY);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.line(x + 14, fieldsY + 0.5, x + 100, fieldsY + 0.5);

  // Fecha
  doc.text(`${labels.date}:`, x + 105, fieldsY);
  doc.line(x + 120, fieldsY + 0.5, x + 155, fieldsY + 0.5);

  // Nota
  doc.text(`${labels.score}:`, x + 160, fieldsY);
  doc.line(x + 173, fieldsY + 0.5, x + 197, fieldsY + 0.5);

  // Separador horizontal
  doc.setLineWidth(0.4);
  doc.line(x, y + HEADER_HEIGHT - 1, x + contentWidth, y + HEADER_HEIGHT - 1);

  return y + HEADER_HEIGHT;
}

/** Footer con QR code + instrucciones. */
async function drawFooter(doc, deck, fontFamily) {
  // Genera el QR como dataURL
  const qrPayload = `clasloop:deck:${deck.id || ""}`;
  let qrDataURL;
  try {
    qrDataURL = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: "M",
      margin: 0,
      width: 200, // px (jsPDF rescalará)
    });
  } catch (err) {
    console.error("[clasloop scanner] QR generation failed:", err);
    return;
  }

  // QR position: bottom-right, dentro del margen
  const qrX = PAGE.width - PAGE.marginX - QR_SIZE;
  const qrY = PAGE.height - PAGE.marginY - QR_SIZE;
  doc.addImage(qrDataURL, "PNG", qrX, qrY, QR_SIZE, QR_SIZE);

  // Texto al lado izquierdo del QR
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  const infoY = qrY + 4;
  doc.text("Fill in bubbles completely.", PAGE.marginX, infoY);
  doc.text("Use a dark pen or pencil.", PAGE.marginX, infoY + 4);
  doc.text("Do not write outside the bubbles.", PAGE.marginX, infoY + 8);
  // Footer mínimo de Clasloop
  doc.setFontSize(6);
  doc.setTextColor(140, 140, 140);
  doc.text("clasloop.com", PAGE.marginX, qrY + QR_SIZE - 1);
}

// ─── Public API ─────────────────────────────────────────────────────────
//
// PR 46: scanner ya no es un "estilo" del modal — ahora es una página
// adicional que se prepend al examen cuando la variante es
// "exam_with_scan". Esta función dibuja la hoja escaneable en el doc
// que recibe (asumiendo página en blanco actual).
//
// El dispatcher (pdf-export.js) llama:
//   1. await drawScanSheet(doc, deck, classObj, opts)
//   2. doc.addPage()
//   3. await classic.renderExam(doc, deck, classObj, opts)  // o el style elegido

export async function drawScanSheet(doc, deck, classObj, opts = {}) {
  const { lang = "en", fontFamily = "helvetica" } = opts;
  const labels = LABELS[lang] || LABELS.en;

  const allQuestions = deck.questions || [];

  // Separar escaneables (MCQ + TF) de no escaneables
  const scannable = allQuestions.filter(
    q => q && (q.type === "mcq" || q.type === "tf")
  );
  const manual = allQuestions.filter(
    q => q && q.type !== "mcq" && q.type !== "tf"
  );

  // Hard limit del scanner
  if (scannable.length > MAX_SCAN_QUESTIONS) {
    // Render una página de error en lugar de la hoja
    drawAllFiducials(doc);
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Too many scannable questions", PAGE.marginX, 40);
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(10);
    const errMsg = `This deck has ${scannable.length} MCQ/TF questions. ` +
      `Scan sheet supports up to ${MAX_SCAN_QUESTIONS}. ` +
      `Print the regular Exam variant (without scan sheet) instead.`;
    doc.text(doc.splitTextToSize(errMsg, PAGE.width - PAGE.marginX * 2), PAGE.marginX, 55);
    return;
  }

  // Si no hay preguntas escaneables, página explicativa (no útil generar)
  if (scannable.length === 0) {
    drawAllFiducials(doc);
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

  // ─── Dibujar la hoja escaneable ─────────────────────────────────────────
  drawAllFiducials(doc);

  let y = PAGE.marginY + FIDUCIAL_SIZE + 4;
  y = drawHeader(doc, deck, classObj, y, fontFamily, labels);

  doc.setFont(fontFamily, "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text(
    "Answer sheet — fill in the bubble for your choice on each question.",
    PAGE.marginX, y - 1
  );
  y += 3;

  // Bubble grid en 2 columnas
  const contentWidth = PAGE.width - PAGE.marginX * 2;
  const colWidth = contentWidth / 2 - 4;
  const col1X = PAGE.marginX;
  const col2X = PAGE.marginX + colWidth + 8;
  const gridStartY = y;
  const gridBottomLimit = PAGE.height - PAGE.marginY - QR_SIZE - QR_MARGIN_TOP - 16;
  const availableHeight = gridBottomLimit - gridStartY;
  const rowsPerCol = Math.floor(availableHeight / QUESTION_ROW_HEIGHT);
  const totalCapacity = rowsPerCol * 2;

  const itemsToRender = scannable.slice(0, totalCapacity);

  itemsToRender.forEach((q, idx) => {
    const qNum = idx + 1;
    const inCol2 = idx >= rowsPerCol;
    const x = inCol2 ? col2X : col1X;
    const rowInCol = inCol2 ? idx - rowsPerCol : idx;
    const rowY = gridStartY + rowInCol * QUESTION_ROW_HEIGHT;

    const qText = q.question || q.prompt || "";
    if (q.type === "mcq") {
      drawMCQRow(doc, qNum, qText, x, rowY, fontFamily, colWidth);
    } else if (q.type === "tf") {
      drawTFRow(doc, qNum, qText, x, rowY, fontFamily, labels, colWidth);
    }
  });

  if (manual.length > 0) {
    doc.setFont(fontFamily, "italic");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    const noteY = gridBottomLimit + 5;
    doc.text(
      `Note: ${manual.length} question${manual.length > 1 ? "s" : ""} (fill / open / match / order) require manual grading.`,
      PAGE.marginX, noteY,
      { maxWidth: contentWidth - QR_SIZE - 4 }
    );
  }

  await drawFooter(doc, deck, fontFamily);
}
