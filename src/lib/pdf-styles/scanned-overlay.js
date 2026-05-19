// ─── lib/pdf-styles/scanned-overlay.js ─────────────────────────────────
//
// PR 66: genera un PDF "corregido" tomando la foto escaneada y dibujando
// encima ✓ verde / ✗ rojo / ○ punteado verde en la respuesta correcta.
//
// Workflow:
//   1. Cargar la foto escaneada (URI de ML Kit) como dataURL
//   2. doc.addImage(foto, ...) llenando una hoja A4
//   3. Para cada answer:
//      - Si is_correct → ✓ verde a la derecha de las 4 burbujas
//      - Si NO is_correct → ✗ rojo a la derecha + ○ punteado verde
//        rodeando cada burbuja correcta (para que el alumno vea cuál era)
//   4. Rellenar la cajita SCORE arriba con "X/Y" en verde
//   5. Devolver el doc para que el caller decida cómo entregar
//      (Share sheet en Capacitor, doc.save en web)
//
// Por qué overlay vectorial y NO rasterizar todo en canvas:
//   - Vectores en jsPDF son escalables (zoom infinito, nítidos siempre)
//   - PDF resultante es más chico (líneas/círculos vs pixels)
//   - Reutilizamos primitivas que ya usamos en pdf-styles/scanner.js
//
// Por qué a la derecha de las 4 burbujas y NO encima de la burbuja marcada:
//   - SIEMPRE hay espacio a la derecha (los templates dejan margen)
//   - Marcar encima de la burbuja del alumno tapa lo que escribió
//   - Es la convención visual que profes ya usan al corregir a mano

import { SCAN_AREA, TEMPLATES } from "./scanner.js";

// ─── Colors ────────────────────────────────────────────────────────────
const COLORS = {
  green: { r: 22, g: 163, b: 74 },   // #16a34a (tailwind green-600)
  red:   { r: 220, g: 38, b: 38 },   // #dc2626 (tailwind red-600)
  greenLight: { r: 240, g: 253, b: 244 },  // #f0fdf4 (verde muy suave)
};

// ─── Layout ────────────────────────────────────────────────────────────
//
// Para cada fila de preguntas, las marcas van a la DERECHA de las 4
// burbujas (D + margen). bubbleR sale del template, igual que bubbleGap.

/**
 * Dada una pregunta (answer + bubblePositions), calcula la posición en mm
 * donde va el ✓ o ✗ — a la derecha de la última burbuja con un margen.
 */
function getMarkPosition(answer, template) {
  // Última burbuja = D (índice 3) o B (índice 1 en TF)
  const lastBubble = answer.bubblePositions[answer.bubblePositions.length - 1];
  // Margen a la derecha = 2× el radio de burbuja (margen visual cómodo)
  const xMm = lastBubble.xMm + template.bubbleR * 2 + 4;
  const yMm = lastBubble.yMm;
  return { xMm, yMm };
}

// ─── Drawing primitives ────────────────────────────────────────────────

/**
 * Dibuja un check ✓ verde grande en la posición (xMm, yMm).
 * Tamaño size en mm (ancho del check).
 */
function drawCheck(doc, xMm, yMm, size = 5) {
  const c = COLORS.green;
  doc.setDrawColor(c.r, c.g, c.b);
  doc.setLineWidth(1.0);
  doc.setLineCap("round");
  doc.setLineJoin("round");

  // Tres puntos del check: izquierdo abajo, medio (esquina), derecho arriba
  const x1 = xMm - size * 0.4;
  const y1 = yMm + size * 0.1;
  const x2 = xMm - size * 0.1;
  const y2 = yMm + size * 0.45;
  const x3 = xMm + size * 0.5;
  const y3 = yMm - size * 0.4;

  doc.line(x1, y1, x2, y2);
  doc.line(x2, y2, x3, y3);
}

/**
 * Dibuja una X roja grande en la posición (xMm, yMm).
 * Tamaño size en mm (lado del cuadrado que la contiene).
 */
function drawX(doc, xMm, yMm, size = 5) {
  const c = COLORS.red;
  doc.setDrawColor(c.r, c.g, c.b);
  doc.setLineWidth(1.0);
  doc.setLineCap("round");

  const half = size * 0.5;
  doc.line(xMm - half, yMm - half, xMm + half, yMm + half);
  doc.line(xMm + half, yMm - half, xMm - half, yMm + half);
}

/**
 * Dibuja un círculo punteado verde rodeando la posición (xMm, yMm).
 * Usado para señalar la burbuja correcta cuando el alumno se equivocó.
 *
 * jsPDF NO tiene stroke-dasharray nativo. Lo simulamos dibujando muchos
 * arcos cortos. Approach: 12 segmentos espaciados igual alrededor del
 * círculo, dibujando solo los segmentos pares (los impares son "huecos").
 */
function drawDashedCircle(doc, xMm, yMm, radiusMm) {
  const c = COLORS.green;
  doc.setDrawColor(c.r, c.g, c.b);
  doc.setLineWidth(0.5);

  // 16 segmentos, dibujamos los pares (8 dashes, 8 huecos)
  const segments = 16;
  const angleStep = (2 * Math.PI) / segments;

  for (let i = 0; i < segments; i += 2) {
    const a1 = i * angleStep;
    const a2 = (i + 1) * angleStep;
    const x1 = xMm + radiusMm * Math.cos(a1);
    const y1 = yMm + radiusMm * Math.sin(a1);
    const x2 = xMm + radiusMm * Math.cos(a2);
    const y2 = yMm + radiusMm * Math.sin(a2);
    doc.line(x1, y1, x2, y2);
  }
}

// ─── Image loading ─────────────────────────────────────────────────────

/**
 * Carga una imagen (URI o file://) y la devuelve como dataURL.
 * Necesario porque jsPDF.addImage requiere dataURL o Uint8Array, no URI.
 */
async function loadImageAsDataUrl(imageUri) {
  // En Capacitor, file:// URIs no son accesibles directamente desde JS.
  // Hay que usar Capacitor.convertFileSrc para convertirla a un URL
  // que el WebView pueda cargar.
  let url = imageUri;
  if (typeof window !== "undefined" && window.Capacitor) {
    if (imageUri.startsWith("file://") || imageUri.startsWith("/")) {
      url = window.Capacitor.convertFileSrc(imageUri);
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      try {
        resolve({
          dataUrl: canvas.toDataURL("image/jpeg", 0.85),
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      } catch (e) {
        reject(new Error("Failed to convert image to dataURL: " + e.message));
      }
    };
    img.onerror = () => reject(new Error("Failed to load image: " + url));
    img.src = url;
  });
}

// ─── Main: draw the corrected overlay PDF ──────────────────────────────

/**
 * Genera un PDF "corregido" con la foto escaneada de fondo + overlay.
 *
 * @param {jsPDF} doc      jsPDF document (nuevo, sin contenido)
 * @param {object} scan    resultado de sampleBubbles, debe incluir:
 *                         - answers (con bubblePositions)
 *                         - score, total
 *                         - imageUri
 *                         - templateName ("T10"|"T20"|"T30"|"T50")
 * @param {object} deck    el deck original (para título, etc)
 * @param {string} studentName  nombre del alumno (opcional, para header)
 */
export async function drawCorrectedScanPdf(doc, scan, deck, studentName = "") {
  const template = TEMPLATES[scan.templateName] || TEMPLATES.T30;

  // ── 1. Cargar imagen + agregarla al PDF ───────────────────────────
  const { dataUrl, width: imgW, height: imgH } = await loadImageAsDataUrl(scan.imageUri);

  // La imagen viene de ML Kit ya rectificada a aspect ratio A4 (210×297).
  // Llenamos toda la página A4.
  doc.addImage(dataUrl, "JPEG", 0, 0, 210, 297, undefined, "FAST");

  // ── 2. Rellenar score box (arriba derecha en el header) ──────────
  // Las coords del score box vienen de scanner.js: HEADER_SCORE_BOX
  // está en x=140.5, y=42, width=35, height=14
  // Centro del box: (140.5 + 17.5, 42 + 7) = (158, 49)
  const scoreBoxX = 158;
  const scoreBoxY = 49;
  const c = COLORS.green;
  doc.setTextColor(c.r, c.g, c.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const scoreText = `${scan.score}/${scan.total}`;
  doc.text(scoreText, scoreBoxX, scoreBoxY + 2, { align: "center" });

  // ── 3. Para cada pregunta: dibujar ✓ o ✗ a la derecha ────────────
  for (const answer of scan.answers) {
    if (!answer.bubblePositions || answer.bubblePositions.length === 0) {
      continue;  // Defensive: si no hay positions, skip
    }

    const { xMm, yMm } = getMarkPosition(answer, template);

    if (answer.is_correct) {
      // ✓ verde
      drawCheck(doc, xMm, yMm, template.bubbleR * 1.6);
    } else {
      // ✗ rojo + ○ punteado en la(s) correcta(s)
      drawX(doc, xMm, yMm, template.bubbleR * 1.6);

      // Buscar las burbujas que ERAN correctas y rodearlas
      for (const letter of answer.correct) {
        const correctBubble = answer.bubblePositions.find(b => b.letter === letter);
        if (correctBubble) {
          drawDashedCircle(
            doc,
            correctBubble.xMm,
            correctBubble.yMm,
            template.bubbleR + 1.5,  // un poco más grande que la burbuja
          );
        }
      }
    }
  }

  // ── 4. Footer con info de quién/cuándo (opcional) ─────────────────
  if (studentName) {
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Corrected for ${studentName}`, 26.5, 290);
  }

  return doc;
}

// ─── Public API: convenience wrapper ───────────────────────────────────

/**
 * Genera un PDF corregido y lo devuelve. El caller decide si guardarlo,
 * compartirlo, mostrarlo, etc.
 */
export async function createCorrectedScanPdf(scan, deck, studentName = "") {
  // Lazy-load jsPDF para no bloatear el bundle inicial
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await drawCorrectedScanPdf(doc, scan, deck, studentName);
  return doc;
}
