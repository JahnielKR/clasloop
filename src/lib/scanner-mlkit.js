// ─── lib/scanner-mlkit.js ──────────────────────────────────────────────
//
// PR 57.2 (FASE 3 Capacitor): scanner cam usando ML Kit nativo.
//
// Reemplaza scanner-cv.js (~600 líneas con OpenCV.js de 8MB).
//
// Pipeline:
//   1. DocumentScanner.scanDocument() → ML Kit abre cámara nativa,
//      detecta hoja, hace cropping + perspective correction
//      automáticamente. Retorna URI a JPEG ya rectificado.
//   2. BarcodeScanner.readBarcodesFromImage(uri) → lee QR de la hoja
//      para validar deck_id.
//   3. sampleBubbles(uri, template, deck) → carga imagen como
//      ImageData en un canvas, samplea pixels en las posiciones
//      conocidas (en mm) de cada burbuja según el template.
//   4. Retorna [{question_id, qNum, marked, correct, is_correct,
//      confidence, is_uncertain}].
//
// Las funciones de sampling (computeBubblePositions, sampleIntensity,
// extractCorrectAnswer) se reutilizan de la lógica del PR 49 — esa
// parte estaba bien, lo que fallaba era el pipeline de CV en JS puro
// (adaptive threshold, blob detection, perspective transform).
// ML Kit hace todo eso por nosotros.

import { Capacitor } from "@capacitor/core";
import { TEMPLATES, pickTemplate, PAGE_DIMS } from "./pdf-styles/scanner";
import { groupQuestionsBySection } from "./pdf-styles/shared";

// ─── Constants ─────────────────────────────────────────────────────────
//
// WARP_SCALE: pixels por mm en la imagen rectificada. ML Kit devuelve
// imágenes de tamaño variable según el device. Cuando cargamos la
// imagen en canvas, la escalamos a este factor para tener coordenadas
// predecibles.
//
// Páginas A4 son 210×297mm. Con WARP_SCALE=5: 1050×1485px.
const WARP_SCALE = 5;
const WARP_W = PAGE_DIMS.width * WARP_SCALE;
const WARP_H = PAGE_DIMS.height * WARP_SCALE;

// Bubble sampling thresholds:
//
// - Una burbuja vacía promedia intensidad ~250 (blanco)
// - Una burbuja rellena promedia ~50-100 (negro)
// - BUBBLE_DARK_THRESHOLD: por debajo de esto, consideramos que está
//   rellena. Probado en PR 49 y funcionaba.
// - BUBBLE_AMBIGUITY_MARGIN: si la 2da burbuja más oscura está dentro
//   de este margen de la 1ra, hay duda (ej: profe rellenó dos por
//   error, o luz mala). Marcamos como dudosa.
const BUBBLE_DARK_THRESHOLD = 130;
const BUBBLE_AMBIGUITY_MARGIN = 15;
const SAMPLE_RADIUS_MM = 1.4;

// Confidence thresholds:
//
// - Si darkest < THRESHOLD - HIGH_CONF_BUFFER → very confident (1.0)
// - Si darkest cerca de THRESHOLD → low confidence
// - Si dos burbujas similares → low confidence
//
// is_uncertain = confidence < 0.3 (revisión manual por el profe)
const HIGH_CONF_BUFFER = 40;
const UNCERTAIN_THRESHOLD = 0.3;

// ─── Public API ────────────────────────────────────────────────────────

/**
 * Opens ML Kit native document scanner. User points camera at the
 * scan sheet, ML Kit auto-detects edges + does perspective correction,
 * user confirms, we get back a JPEG URI of the rectified document.
 *
 * Throws if:
 *   - Not running in native (web has no ML Kit)
 *   - User cancels the scan
 *   - Device doesn't have Google Play Services (rare on modern Android)
 *
 * @returns {Promise<string>} URI to the scanned JPEG image
 */
export async function scanDocument() {
  if (!Capacitor.isNativePlatform()) {
    throw new Error("scanDocument() requires native platform (Capacitor)");
  }

  const { DocumentScanner } = await import("@capacitor-mlkit/document-scanner");

  // Check if the ML Kit module is installed. On a fresh device, ML Kit
  // downloads its model on first use (~10MB), so first scan can be slow.
  const { available } = await DocumentScanner.isGoogleDocumentScannerModuleAvailable();
  if (!available) {
    // Trigger the install. The user sees a progress notification from
    // Google Play Services. We could subscribe to the
    // 'googleDocumentScannerModuleInstallProgress' event for a custom
    // UI, but for now just start the install and rely on the system UI.
    await DocumentScanner.installGoogleDocumentScannerModule();
  }

  const result = await DocumentScanner.scanDocument({
    galleryImportAllowed: true,   // user can pick from gallery if scan fails
    pageLimit: 1,                  // we only want 1 page (1 hoja)
    resultFormats: "JPEG",         // we don't need PDF, just the image
    scannerMode: "FULL",           // full UX: auto-detect + manual crop + filter
  });

  if (!result.scannedImages || result.scannedImages.length === 0) {
    throw new Error("No image returned from document scanner");
  }

  // Returns a file:// URI on Android.
  return result.scannedImages[0];
}

/**
 * Reads a QR code from a scanned image. Expects payload like
 * "clasloop:deck:{deck_id}". Returns the deck_id, or null if no
 * QR found or payload doesn't match our format.
 *
 * @param {string} imageUri  URI from scanDocument()
 * @returns {Promise<string|null>}
 */
export async function readQRFromImage(imageUri) {
  if (!Capacitor.isNativePlatform()) {
    throw new Error("readQRFromImage() requires native platform");
  }

  const { BarcodeScanner } = await import("@capacitor-mlkit/barcode-scanning");

  // Check ML Kit module (separate from DocumentScanner)
  const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
  if (!available) {
    await BarcodeScanner.installGoogleBarcodeScannerModule();
  }

  const result = await BarcodeScanner.readBarcodesFromImage({
    path: imageUri,
    formats: ["QR_CODE"],   // only QR, ignore other barcode types
  });

  if (!result.barcodes || result.barcodes.length === 0) {
    return null;
  }

  // Find first barcode whose payload matches "clasloop:deck:{uuid}"
  for (const barcode of result.barcodes) {
    const m = barcode.rawValue?.match(/^clasloop:deck:(.+)$/);
    if (m) return m[1];
  }

  return null;
}

/**
 * Samples all bubbles in the scanned image and returns the marked
 * answers per question with confidence.
 *
 * @param {string} imageUri   URI from scanDocument()
 * @param {object} deck       deck object with questions[]
 * @returns {Promise<{
 *   answers: Array<{
 *     question_id: string,
 *     qNum: number,
 *     marked: string|null,
 *     correct: string|null,
 *     is_correct: boolean,
 *     confidence: number,
 *     is_uncertain: boolean,
 *   }>,
 *   score: number,
 *   total: number,
 * }>}
 */
export async function sampleBubbles(imageUri, deck) {
  // Get scannable questions in the canonical order (MCQ first then TF,
  // same as the PDF — PR 47.2 fix). We trust this matches the PDF.
  const grouped = groupQuestionsBySection(deck.questions || []);
  const scannable = [
    ...(grouped.selection || []).filter(q => q.type === "mcq" || q.type === "tf"),
  ];

  // Order: MCQ first, TF second (same as drawScanSheet does)
  scannable.sort((a, b) => {
    if (a.type === b.type) return 0;
    return a.type === "mcq" ? -1 : 1;
  });

  if (scannable.length === 0) {
    return { answers: [], score: 0, total: 0 };
  }
  if (scannable.length > 50) {
    throw new Error(`Too many scannable questions (${scannable.length} > 50)`);
  }

  const template = pickTemplate(scannable.length);

  // Load the image into a canvas at WARP_W × WARP_H so we can sample
  // pixels at predictable mm coordinates.
  const grayData = await loadImageAsGrayscale(imageUri, WARP_W, WARP_H);

  // Sample each bubble per question
  const positions = computeBubblePositions(scannable, template);
  const sampleRadiusPx = Math.round(SAMPLE_RADIUS_MM * WARP_SCALE);

  const answers = [];
  let score = 0;

  for (const item of positions) {
    const samples = item.choices.map((letter, i) => {
      const xMm = item.cxMm + i * template.bubbleGap;
      const yMm = item.cyMm;
      const xPx = Math.round(xMm * WARP_SCALE);
      const yPx = Math.round(yMm * WARP_SCALE);
      const intensity = sampleIntensity(grayData, WARP_W, WARP_H, xPx, yPx, sampleRadiusPx);
      return { letter, intensity };
    });

    samples.sort((a, b) => a.intensity - b.intensity);
    const darkest = samples[0];
    const second = samples[1];

    // Detect marked letter
    let marked = null;
    let confidence = 0;
    let is_uncertain = false;

    if (darkest.intensity < BUBBLE_DARK_THRESHOLD) {
      const gap = second ? second.intensity - darkest.intensity : 1000;
      if (gap >= BUBBLE_AMBIGUITY_MARGIN) {
        marked = darkest.letter;
        // Confidence based on how dark + how clear the gap is:
        //   - intensity well below threshold = high confidence
        //   - big gap to second = high confidence
        const darknessConf = Math.min(
          1.0,
          (BUBBLE_DARK_THRESHOLD - darkest.intensity) / HIGH_CONF_BUFFER
        );
        const gapConf = Math.min(
          1.0,
          gap / (BUBBLE_AMBIGUITY_MARGIN * 3)
        );
        confidence = Math.min(darknessConf, gapConf);
      } else {
        // Two similar dark bubbles → ambiguous, marked but uncertain
        marked = darkest.letter;
        confidence = 0.2;
        is_uncertain = true;
      }
    } else if (darkest.intensity < BUBBLE_DARK_THRESHOLD + 30) {
      // Borderline: probably filled but not confidently
      marked = darkest.letter;
      confidence = 0.25;
      is_uncertain = true;
    } else {
      // Nothing marked
      marked = null;
      confidence = 0.9;  // confident that nothing is marked
    }

    is_uncertain = is_uncertain || confidence < UNCERTAIN_THRESHOLD;

    const correct = extractCorrectAnswer(item.q);
    const is_correct = marked !== null && marked === correct;

    if (is_correct) score++;

    answers.push({
      question_id: item.q.id,
      qNum: item.qNum,
      marked,
      correct,
      is_correct,
      confidence: Number(confidence.toFixed(2)),
      is_uncertain,
    });
  }

  return { answers, score, total: scannable.length };
}

/**
 * Helper for the Scanner.jsx UI: when user manually confirms/changes
 * an answer that was uncertain. Returns updated answers + new score.
 *
 * @param {Array} answers     current answers from sampleBubbles
 * @param {string} questionId which question
 * @param {string|null} newMarked the user's confirmed answer
 * @returns {{answers, score, total}}
 */
export function updateAnswer(answers, questionId, newMarked) {
  const updated = answers.map(a => {
    if (a.question_id !== questionId) return a;
    return {
      ...a,
      marked: newMarked,
      is_correct: newMarked !== null && newMarked === a.correct,
      confidence: 1.0,        // user confirmed = max confidence
      is_uncertain: false,
    };
  });
  const score = updated.filter(a => a.is_correct).length;
  return { answers: updated, score, total: answers.length };
}

// ─── Internal helpers ──────────────────────────────────────────────────

/**
 * Loads an image from a URI into a canvas, converts to grayscale,
 * resizes to (w, h), and returns the grayscale Uint8Array.
 *
 * The image from ML Kit comes already rectified (perspective corrected)
 * so we can just resize and grayscale it without any CV transforms.
 */
async function loadImageAsGrayscale(imageUri, w, h) {
  // Convert file:// URI to a webview-readable URL if needed
  let url = imageUri;
  if (imageUri.startsWith("file://") || imageUri.startsWith("/")) {
    url = Capacitor.convertFileSrc(imageUri);
  }

  const img = await loadImage(url);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2d context");

  // Draw image scaled to the canvas. ML Kit gives us a rectified image
  // so this is a clean stretch — no perspective transform needed.
  ctx.drawImage(img, 0, 0, w, h);

  // Pull pixel data + convert to grayscale
  const imgData = ctx.getImageData(0, 0, w, h);
  const rgba = imgData.data;
  const gray = new Uint8Array(w * h);

  for (let i = 0; i < gray.length; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    // Standard luminance formula
    gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  return gray;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error("Failed to load image: " + src));
    img.src = src;
  });
}

/**
 * Computes the (cx, cy) in mm for each question's bubble row.
 *
 * REUTILIZADO de scanner-cv.js (PR 49.6). La lógica era correcta;
 * el problema del scanner viejo era el pipeline de CV, no este sampling.
 */
function computeBubblePositions(scannable, t) {
  const positions = [];
  const addColumn = (qsInCol, startQNum, colBaseX, yStart) => {
    qsInCol.forEach((q, idx) => {
      const cyMm = yStart + idx * t.rowHeight;
      const choices = q.type === "tf" ? ["T", "F"] : ["A", "B", "C", "D"];
      positions.push({ q, qNum: startQNum + idx, cxMm: colBaseX, cyMm, choices });
    });
  };

  if (t === TEMPLATES.T50) {
    // T50 has 2 sets of columns (upper + lower)
    const upper = scannable.slice(0, 30);
    for (let c = 0; c < t.cols; c++) {
      const colQs = upper.slice(c * 10, (c + 1) * 10);
      if (colQs.length === 0) break;
      addColumn(colQs, c * 10 + 1, t.colXBase[c], t.yStart);
    }
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
 * Sample mean grayscale intensity within a circle centered at (cx, cy).
 * Returns mean intensity 0..255. Lower = darker = bubble is filled.
 *
 * REUTILIZADO de scanner-cv.js (PR 49.6 fix 3): sampleamos solo dentro
 * del círculo (no del bounding square) para evitar contaminación de
 * píxeles blancos en las esquinas → señal mucho más limpia.
 */
function sampleIntensity(gray, W, H, cxPx, cyPx, radiusPx) {
  const r2 = radiusPx * radiusPx;
  let sum = 0, count = 0;
  for (let dy = -radiusPx; dy <= radiusPx; dy++) {
    for (let dx = -radiusPx; dx <= radiusPx; dx++) {
      if (dx * dx + dy * dy > r2) continue;
      const px = cxPx + dx;
      const py = cyPx + dy;
      if (px < 0 || px >= W || py < 0 || py >= H) continue;
      sum += gray[py * W + px];
      count++;
    }
  }
  return count > 0 ? sum / count : 255;
}

function extractCorrectAnswer(q) {
  if (!q) return null;
  if (q.type === "mcq") {
    if (typeof q.correct === "number") return "ABCD"[q.correct] || null;
    return null;
  }
  if (q.type === "tf") {
    if (q.correct === true) return "T";
    if (q.correct === false) return "F";
    return null;
  }
  return null;
}

// Re-export for convenience (Scanner.jsx might use these)
export { TEMPLATES, pickTemplate, PAGE_DIMS };
