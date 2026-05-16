// ─── lib/scanner-cv.js ──────────────────────────────────────────────────
//
// PR 49: pipeline de computer vision para el scanner camera.
//
// Recibe un canvas con el frame capturado de la cámara y devuelve un
// resultado con las respuestas detectadas + score contra la answer key.
//
// Pipeline:
//   1. Convertir a escala de grises + thresholding adaptativo
//   2. Detectar contornos de los 4 fiduciales esquineros (cuadrados
//      negros sólidos en las esquinas, definidos por scanner.js como
//      cuadrados de 7mm con 6mm de inset)
//   3. Identificar cuáles son las 4 esquinas (TL, TR, BL, BR) por
//      posición relativa al centro de la imagen
//   4. Computar la matriz de perspectiva (cv.getPerspectiveTransform)
//   5. Warp a una imagen "ideal" de proporción A4 (210:297) con
//      tamaño fijo (ej. 1050×1485, factor 5x sobre los mm reales)
//   6. Detectar el QR code (jsQR) en la región esperada (esquina
//      inferior-derecha) → extraer el deck_id
//   7. Verificar que el deck_id del QR coincide con el deck seleccionado
//   8. Para cada burbuja según el template:
//        a. Convertir coordenadas mm → píxeles (factor 5x)
//        b. Samplear un círculo pequeño en el centro
//        c. Calcular el "darkness ratio" (% de píxeles oscuros)
//        d. Si supera el threshold (~40%), está marcada
//   9. Para cada pregunta: si tiene exactamente 1 burbuja marcada,
//      esa es la respuesta. Si tiene 0 → null (en blanco). Si tiene
//      2+ → "ambiguous" (treated as null, contado como incorrecta)
//  10. Comparar contra la answer key del deck → score + detalle
//
// OpenCV.js (~8MB) y jsQR (~25KB) se cargan lazy desde acá. La primera
// llamada inicializa todo y devuelve la promesa cuando está listo.

import { TEMPLATES, pickTemplate, PAGE_DIMS } from "./pdf-styles/scanner";
import jsQR from "jsqr";

// ─── Constants ──────────────────────────────────────────────────────────

// Resolución del warp "ideal". 5x sobre los mm reales del A4
// (210×297mm) da 1050×1485px. Suficiente para distinguir burbujas de
// 1.7mm = 8.5px de radio (el caso más chico del T50).
const WARP_SCALE = 5;
const WARP_W = PAGE_DIMS.width * WARP_SCALE;   // 1050
const WARP_H = PAGE_DIMS.height * WARP_SCALE;  // 1485

// Threshold para considerar una burbuja "marcada". Promedio de
// intensidad (0-255) por debajo de este valor = marcada. Calibrado
// para detectar marcas con lápiz oscuro o pluma; toleranta hojas
// con sombras o impresión irregular.
const BUBBLE_DARK_THRESHOLD = 130;

// Si la diferencia entre la burbuja más oscura y la segunda más oscura
// de una fila es muy chica (<15), consideramos que es ambigüo y no
// asignamos respuesta. Esto evita decir "marcó A" cuando en realidad
// está toda la fila oscura por una sombra.
const BUBBLE_AMBIGUITY_MARGIN = 15;

// Tamaño del kernel de muestreo dentro de la burbuja, en mm. La burbuja
// más chica tiene radio 1.7mm. Sampleo un cuadrado de 2mm de lado
// centrado en la burbuja (queda dentro del círculo en todos los
// templates).
const SAMPLE_RADIUS_MM = 1.4;

// Coordenadas esperadas del QR en la hoja, en mm. Definidas por
// scanner.js drawFooter: QR de 22×22mm en el lower-right, justo
// debajo del bottomRule. La posición exacta depende del template
// (T10/20/30 vs T50). Por ahora buscamos en una región amplia del
// lower-right de la hoja.
const QR_SEARCH_REGION_MM = {
  x: 130,    // desde la izquierda
  y: 240,    // desde arriba
  w: 70,     // ancho
  h: 55,     // alto (cubre tanto T50 con bottomRule 272 como los demás con 245)
};

// ─── OpenCV lazy loader ─────────────────────────────────────────────────

const OPENCV_URL = "https://docs.opencv.org/4.10.0/opencv.js";

let openCvPromise = null;

/**
 * Carga OpenCV.js dinámicamente (1 sola vez) y resuelve cuando el
 * runtime está listo. La librería se inicializa async — el script
 * inicial define window.cv pero `cv.Mat` no existe hasta que se
 * dispara onRuntimeInitialized.
 */
export function loadOpenCV() {
  if (openCvPromise) return openCvPromise;

  openCvPromise = new Promise((resolve, reject) => {
    // Si ya está cargado (ej. desde otro lugar), usar directo.
    if (window.cv && typeof window.cv.Mat === "function") {
      resolve(window.cv);
      return;
    }

    const script = document.createElement("script");
    script.src = OPENCV_URL;
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load OpenCV.js from CDN"));
    script.onload = () => {
      // OpenCV.js define window.cv, pero el runtime WASM no está listo
      // todavía. Hay dos casos:
      //   - cv.Mat ya existe → listo (sucede en algunos browsers)
      //   - cv.onRuntimeInitialized lo dispara cuando termina (común)
      if (window.cv && typeof window.cv.Mat === "function") {
        resolve(window.cv);
        return;
      }
      if (window.cv && typeof window.cv === "object") {
        window.cv.onRuntimeInitialized = () => resolve(window.cv);
        // Safety timeout: si OpenCV no inicializa en 30s asumimos que
        // algo se rompió y rechazamos.
        setTimeout(() => reject(new Error("OpenCV initialization timeout")), 30000);
        return;
      }
      reject(new Error("OpenCV.js loaded but window.cv is missing"));
    };
    document.head.appendChild(script);
  });

  return openCvPromise;
}

// ─── Pipeline ───────────────────────────────────────────────────────────

/**
 * Result types:
 *   { ok: true, score, total, answers: [...], deckId, warpedCanvas }
 *   { ok: false, code: "no_fiducials" | "wrong_deck" | "qr_not_found" |
 *                      "opencv_failed" | "no_questions", message }
 */
export async function processScanFrame(sourceCanvas, deck) {
  let cv;
  try {
    cv = await loadOpenCV();
  } catch (err) {
    return { ok: false, code: "opencv_failed", message: err.message };
  }

  // ─── Identify expected scannable questions + template ─────────────
  const scannable = (deck.questions || []).filter(
    q => q && (q.type === "mcq" || q.type === "tf")
  );
  if (scannable.length === 0) {
    return { ok: false, code: "no_questions", message: "Deck has no MCQ/TF questions" };
  }
  const template = pickTemplate(scannable.length);

  // OpenCV mats que necesitamos liberar al final.
  const toDelete = [];

  try {
    // 1. Source → Mat
    const src = cv.imread(sourceCanvas);
    toDelete.push(src);

    // 2. Gray + binarize
    const gray = new cv.Mat();
    toDelete.push(gray);
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    const bin = new cv.Mat();
    toDelete.push(bin);
    // Adaptive threshold tolera iluminación irregular mejor que un
    // threshold fijo. Block size 51 + C 10 calibrado empíricamente
    // para hojas A4 fotografiadas con luz de aula típica.
    cv.adaptiveThreshold(
      gray, bin, 255,
      cv.ADAPTIVE_THRESH_MEAN_C,
      cv.THRESH_BINARY_INV,
      51, 10
    );

    // 3. Find contours
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    toDelete.push(contours, hierarchy);
    cv.findContours(bin, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    // 4. Filter contours that look like fiducials: small square-ish
    // dark blobs (the corner marks are 7mm = 35-50px depending on
    // capture resolution).
    const candidates = [];
    const srcArea = src.rows * src.cols;
    // Fiducial expected area range: between 0.01% and 1% of the image
    // (covers a wide range of capture distances).
    const minArea = srcArea * 0.0001;
    const maxArea = srcArea * 0.01;

    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i);
      const area = cv.contourArea(cnt);
      if (area < minArea || area > maxArea) {
        cnt.delete();
        continue;
      }
      const rect = cv.boundingRect(cnt);
      // Square-ish: aspect ratio within [0.7, 1.4]
      const aspect = rect.width / rect.height;
      if (aspect < 0.7 || aspect > 1.4) {
        cnt.delete();
        continue;
      }
      // Solidity: area / bounding rect area should be >0.7 (filled square)
      const solidity = area / (rect.width * rect.height);
      if (solidity < 0.7) {
        cnt.delete();
        continue;
      }
      candidates.push({
        cx: rect.x + rect.width / 2,
        cy: rect.y + rect.height / 2,
        area,
      });
      cnt.delete();
    }

    // 5. Identify the 4 corner fiducials. The PDF has 4 corner + 2
    // mid-lateral fiducials. We pick the 4 that are "most extreme"
    // in each corner direction.
    if (candidates.length < 4) {
      return { ok: false, code: "no_fiducials", message: `Only found ${candidates.length} fiducial candidates` };
    }

    const cx = src.cols / 2;
    const cy = src.rows / 2;
    // For each corner, pick the candidate furthest from center in that
    // direction (TL = most -x AND most -y; etc).
    const corners = pickCornerFiducials(candidates, cx, cy);
    if (!corners) {
      return { ok: false, code: "no_fiducials", message: "Could not identify 4 distinct corners" };
    }

    // 6. Compute perspective transform: corners → ideal A4 rect
    const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
      corners.tl.cx, corners.tl.cy,
      corners.tr.cx, corners.tr.cy,
      corners.br.cx, corners.br.cy,
      corners.bl.cx, corners.bl.cy,
    ]);
    toDelete.push(srcPts);

    // The fiducial centers correspond to specific mm positions on the
    // page (from scanner.js):
    //   TL: (FIDUCIAL_CORNER_INSET + FIDUCIAL_CORNER/2, same) = (9.5, 9.5)
    //   TR: (PAGE.width - 9.5, 9.5)
    //   BR: (PAGE.width - 9.5, PAGE.height - 9.5)
    //   BL: (9.5, PAGE.height - 9.5)
    // Scaled by WARP_SCALE.
    const FID_INSET = (6 + 3.5) * WARP_SCALE; // 47.5
    const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
      FID_INSET,           FID_INSET,
      WARP_W - FID_INSET,  FID_INSET,
      WARP_W - FID_INSET,  WARP_H - FID_INSET,
      FID_INSET,           WARP_H - FID_INSET,
    ]);
    toDelete.push(dstPts);

    const M = cv.getPerspectiveTransform(srcPts, dstPts);
    toDelete.push(M);

    // 7. Warp to ideal A4
    const warped = new cv.Mat();
    toDelete.push(warped);
    cv.warpPerspective(src, warped, M, new cv.Size(WARP_W, WARP_H));

    // Also create grayscale of warped for sampling
    const warpedGray = new cv.Mat();
    toDelete.push(warpedGray);
    cv.cvtColor(warped, warpedGray, cv.COLOR_RGBA2GRAY);

    // Render warped to a canvas (for QR reading + optional debug display)
    const warpedCanvas = document.createElement("canvas");
    warpedCanvas.width = WARP_W;
    warpedCanvas.height = WARP_H;
    cv.imshow(warpedCanvas, warped);

    // 8. Detect QR in the lower-right region
    const qrCtx = warpedCanvas.getContext("2d");
    const qrRegion = qrCtx.getImageData(
      QR_SEARCH_REGION_MM.x * WARP_SCALE,
      QR_SEARCH_REGION_MM.y * WARP_SCALE,
      QR_SEARCH_REGION_MM.w * WARP_SCALE,
      QR_SEARCH_REGION_MM.h * WARP_SCALE,
    );
    const qrCode = jsQR(qrRegion.data, qrRegion.width, qrRegion.height);
    if (!qrCode) {
      return {
        ok: false, code: "qr_not_found",
        message: "Could not read QR code on the answer sheet",
        warpedCanvas,
      };
    }

    // 9. Validate deck_id
    // QR payload format from scanner.js drawFooter: `clasloop:deck:${deck.id}`
    const expectedQR = `clasloop:deck:${deck.id}`;
    if (qrCode.data !== expectedQR) {
      // Extract deck_id from QR if format matches, for better error msg
      const m = /^clasloop:deck:(.+)$/.exec(qrCode.data);
      const sheetDeckId = m ? m[1] : qrCode.data;
      return {
        ok: false, code: "wrong_deck",
        message: `Sheet belongs to a different deck`,
        sheetDeckId,
        expectedDeckId: deck.id,
        warpedCanvas,
      };
    }

    // 10. Sample each bubble
    const answers = sampleAllBubbles(warpedGray, scannable, template, cv);

    // 11. Score
    let score = 0;
    answers.forEach(a => { if (a.isRight) score++; });

    return {
      ok: true,
      score,
      total: scannable.length,
      answers,
      deckId: deck.id,
      template: templateName(template),
      warpedCanvas,
    };

  } finally {
    // Clean up all OpenCV mats to avoid memory leaks
    toDelete.forEach(m => {
      try { m.delete(); } catch {}
    });
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────

function templateName(t) {
  if (t === TEMPLATES.T10) return "T10";
  if (t === TEMPLATES.T20) return "T20";
  if (t === TEMPLATES.T30) return "T30";
  return "T50";
}

/**
 * From a list of fiducial candidates, pick the 4 that are at the
 * most extreme corners of the image. Returns { tl, tr, br, bl } or
 * null if not enough distinct candidates.
 */
function pickCornerFiducials(cands, imgCx, imgCy) {
  // Score each candidate by how far it is in each corner direction.
  // For TL: minimize (cx + cy). For TR: maximize cx, minimize cy. Etc.
  let tl = null, tr = null, br = null, bl = null;
  let tlScore = Infinity, trScore = -Infinity, brScore = -Infinity, blScore = -Infinity;

  for (const c of cands) {
    const dx = c.cx - imgCx;
    const dy = c.cy - imgCy;
    // TL: most negative dx AND dy
    const tlS = dx + dy;
    if (tlS < tlScore) { tlScore = tlS; tl = c; }
    // TR: positive dx, negative dy → maximize (dx - dy)
    const trS = dx - dy;
    if (trS > trScore) { trScore = trS; tr = c; }
    // BR: positive dx AND dy
    const brS = dx + dy;
    if (brS > brScore) { brScore = brS; br = c; }
    // BL: negative dx, positive dy → maximize (-dx + dy) = (dy - dx)
    const blS = dy - dx;
    if (blS > blScore) { blScore = blS; bl = c; }
  }

  // Sanity: all 4 must be distinct
  if (!tl || !tr || !br || !bl) return null;
  const set = new Set([tl, tr, br, bl]);
  if (set.size < 4) return null;

  return { tl, tr, br, bl };
}

/**
 * For each question in the scan template, sample the bubbles and decide
 * which (if any) is marked. Compare against the question's correct_answer.
 *
 * Returns an array of: { qNum, marked, correct, isRight }
 *   marked  = "A"/"B"/"C"/"D" or "T"/"F" or null (blank/ambiguous)
 *   correct = same letter set, what the answer key says
 *   isRight = true if marked === correct
 */
function sampleAllBubbles(warpedGray, scannable, template, cv) {
  const results = [];
  const sampleRadiusPx = Math.round(SAMPLE_RADIUS_MM * WARP_SCALE);

  // For T50 the questions are split between upper block and lower block.
  // Build a list of { q, qNum, cxMm, cyMm, choices } for all questions.
  const bubblePositions = computeBubblePositions(scannable, template);

  for (const item of bubblePositions) {
    const samples = item.choices.map((letter, i) => {
      const xMm = item.cxMm + i * template.bubbleGap;
      const yMm = item.cyMm;
      const xPx = Math.round(xMm * WARP_SCALE);
      const yPx = Math.round(yMm * WARP_SCALE);
      const intensity = sampleIntensity(warpedGray, xPx, yPx, sampleRadiusPx, cv);
      return { letter, intensity };
    });

    // Pick the darkest sample
    samples.sort((a, b) => a.intensity - b.intensity);
    const darkest = samples[0];
    const second = samples[1];

    let marked = null;
    if (darkest.intensity < BUBBLE_DARK_THRESHOLD) {
      // Could be marked. Check ambiguity.
      if (!second || (second.intensity - darkest.intensity) >= BUBBLE_AMBIGUITY_MARGIN) {
        marked = darkest.letter;
      }
      // Otherwise multiple bubbles are equally dark → ambiguous → null
    }

    const correct = extractCorrectAnswer(item.q);
    results.push({
      qNum: item.qNum,
      marked,
      correct,
      isRight: marked !== null && marked === correct,
    });
  }

  return results;
}

/**
 * Compute (cxMm, cyMm) of the FIRST bubble center for each question,
 * plus the list of choices (which letters are present).
 *
 * Follows the same layout logic as scanner.js drawGrid:
 *   - T10/T20/T30: one block, cols × 10 rows. Questions filled
 *     col-first: q1-q10 in col 1, q11-q20 in col 2, etc.
 *   - T50: upper block (3 cols × 10 = 30 questions) + lower block
 *     (2 cols × 10 = 20 questions).
 */
function computeBubblePositions(scannable, t) {
  const positions = [];

  const addColumn = (qsInCol, startQNum, colBaseX, yStart) => {
    qsInCol.forEach((q, idx) => {
      const cyMm = yStart + idx * t.rowHeight;
      const choices = q.type === "tf" ? ["T", "F"] : ["A", "B", "C", "D"];
      positions.push({
        q,
        qNum: startQNum + idx,
        cxMm: colBaseX,
        cyMm,
        choices,
      });
    });
  };

  if (t === TEMPLATES.T50) {
    // Upper: 3 cols × 10 (questions 1-30)
    const upper = scannable.slice(0, 30);
    for (let c = 0; c < t.cols; c++) {
      const colQs = upper.slice(c * 10, (c + 1) * 10);
      if (colQs.length === 0) break;
      addColumn(colQs, c * 10 + 1, t.colXBase[c], t.yStart);
    }
    // Lower: 2 cols × 10 (questions 31-50)
    const lower = scannable.slice(30, 50);
    for (let c = 0; c < t.cols2; c++) {
      const colQs = lower.slice(c * 10, (c + 1) * 10);
      if (colQs.length === 0) break;
      addColumn(colQs, 30 + c * 10 + 1, t.colXBase2[c], t.yStart2);
    }
  } else {
    for (let c = 0; c < t.cols; c++) {
      const colQs = scannable.slice(c * 10, (c + 1) * 10);
      if (colQs.length === 0) break;
      addColumn(colQs, c * 10 + 1, t.colXBase[c], t.yStart);
    }
  }

  return positions;
}

/**
 * Sample a small square region around (cxPx, cyPx) in the grayscale
 * image and return the mean intensity (0-255). Lower = darker = more
 * likely to be a filled bubble.
 */
function sampleIntensity(grayMat, cxPx, cyPx, radiusPx, cv) {
  // Bound check
  const x = Math.max(0, cxPx - radiusPx);
  const y = Math.max(0, cyPx - radiusPx);
  const w = Math.min(grayMat.cols - x, radiusPx * 2);
  const h = Math.min(grayMat.rows - y, radiusPx * 2);
  if (w <= 0 || h <= 0) return 255;

  const roi = grayMat.roi(new cv.Rect(x, y, w, h));
  const mean = cv.mean(roi);
  roi.delete();
  return mean[0]; // grayscale channel
}

/**
 * Extract the correct answer from a question object.
 *
 * Shape del codebase (single source of truth en src/lib/scoring.js):
 *   MCQ: q.correct es el índice 0-based en q.options.
 *        (Si es un array, es multi-correct — para el scanner solo
 *        consideramos respuestas únicas; si la pregunta es multi-correct
 *        devolvemos null y la marcamos como "incorrect" implícitamente,
 *        ya que ninguna sola burbuja marcada va a coincidir.)
 *   TF:  q.correct es true | false (boolean).
 *
 * Returns "A"/"B"/"C"/"D" or "T"/"F" or null.
 */
function extractCorrectAnswer(q) {
  if (!q) return null;

  if (q.type === "mcq") {
    if (typeof q.correct === "number") {
      return "ABCD"[q.correct] || null;
    }
    // Multi-correct: scanner no soporta. Devolver null (la pregunta
    // no va a sumar punto).
    return null;
  }

  if (q.type === "tf") {
    if (q.correct === true) return "T";
    if (q.correct === false) return "F";
    return null;
  }

  return null;
}
