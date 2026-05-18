// ─── lib/scanner-mlkit.js ──────────────────────────────────────────────
//
// PR 60 (FIX REAL del bug de respuestas alucinadas): el scanner ahora
// detecta las 8 fiduciales del PDF (PR 59) y corrige las posiciones de
// las burbujas usando esos puntos de referencia.
//
// Pipeline:
//   1. DocumentScanner.scanDocument() → ML Kit abre cámara nativa,
//      detecta hoja, hace cropping + perspective correction del PAPEL.
//      Retorna URI a JPEG ya rectificado a tamaño A4.
//   2. BarcodeScanner.readBarcodesFromImage(uri) → lee QR para validar
//      deck_id.
//   3. NUEVO (PR 60): findFiducials(grayData) → busca las 8 fiduciales
//      negras del PDF en posiciones esperadas. Devuelve los centros
//      detectados.
//   4. NUEVO (PR 60): para cada burbuja, calcular su posición REAL en
//      la imagen usando interpolación bilineal entre las fiduciales
//      vecinas (compensa margen de impresora, curvatura del papel,
//      inclinación residual).
//   5. sampleBubbles(...) → samplea pixels en las posiciones corregidas.
//
// Por qué interpolación bilineal y no homografía/perspective warp:
//   - ML Kit ya rectificó el papel (eliminó perspective)
//   - Las distorsiones restantes son LOCALES (margen impresora 3-5mm en
//     un lado, curvatura del papel en el medio, etc)
//   - Una homografía global asume papel perfectamente plano (no es así)
//   - Bilineal por cuadrantes captura las distorsiones locales mejor
//
// Fallback: si findFiducials no detecta las 8 (foto muy mala, sombras,
// dedo tapando), usar las coordenadas crudas (comportamiento viejo).
// Esto da degradación graciosa — peor caso = como antes, no peor.

import { Capacitor } from "@capacitor/core";
import {
  TEMPLATES,
  pickTemplate,
  PAGE_DIMS,
  SCAN_AREA,
  FIDUCIAL_CENTERS,
} from "./pdf-styles/scanner";
import { groupQuestionsBySection } from "./pdf-styles/shared";

// ─── Constants ─────────────────────────────────────────────────────────
const WARP_SCALE = 5;
const WARP_W = PAGE_DIMS.width * WARP_SCALE;
const WARP_H = PAGE_DIMS.height * WARP_SCALE;

// Fiducial detection:
const FIDUCIAL_SEARCH_RADIUS_MM = 15;
const FIDUCIAL_BINARY_THRESHOLD = 100;
const FIDUCIAL_MIN_AREA_PX = 300;
const FIDUCIAL_MAX_AREA_PX = 2500;

// Bubble sampling (igual que antes):
const BUBBLE_DARK_THRESHOLD = 130;
const BUBBLE_AMBIGUITY_MARGIN = 15;
const SAMPLE_RADIUS_MM = 1.4;
const HIGH_CONF_BUFFER = 40;
const UNCERTAIN_THRESHOLD = 0.3;

// ─── Public API ────────────────────────────────────────────────────────

export async function scanDocument() {
  if (!Capacitor.isNativePlatform()) {
    throw new Error("scanDocument() requires native platform (Capacitor)");
  }

  const { DocumentScanner } = await import("@capacitor-mlkit/document-scanner");

  const { available } = await DocumentScanner.isGoogleDocumentScannerModuleAvailable();
  if (!available) {
    await DocumentScanner.installGoogleDocumentScannerModule();
  }

  const result = await DocumentScanner.scanDocument({
    galleryImportAllowed: true,
    pageLimit: 1,
    resultFormats: "JPEG",
    scannerMode: "FULL",
  });

  if (!result.scannedImages || result.scannedImages.length === 0) {
    throw new Error("No image returned from document scanner");
  }

  return result.scannedImages[0];
}

export async function readQRFromImage(imageUri) {
  if (!Capacitor.isNativePlatform()) {
    throw new Error("readQRFromImage() requires native platform");
  }

  const { BarcodeScanner } = await import("@capacitor-mlkit/barcode-scanning");

  const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
  if (!available) {
    await BarcodeScanner.installGoogleBarcodeScannerModule();
  }

  const result = await BarcodeScanner.readBarcodesFromImage({
    path: imageUri,
    formats: ["QR_CODE"],
  });

  if (!result.barcodes || result.barcodes.length === 0) {
    return null;
  }

  for (const barcode of result.barcodes) {
    const m = barcode.rawValue?.match(/^clasloop:deck:(.+)$/);
    if (m) return m[1];
  }

  return null;
}

/**
 * Samples all bubbles in the scanned image and returns marked answers.
 *
 * PR 60: ahora usa detección de fiduciales + interpolación bilineal
 * para corregir las posiciones de las burbujas. Si las fiduciales no
 * se detectan, fallback a coords crudas (comportamiento viejo).
 *
 * @returns {Promise<{
 *   answers: Array<{...}>,
 *   score: number,
 *   total: number,
 *   fiducialsDetected: number,   // 0-8
 *   warpApplied: boolean,
 * }>}
 */
export async function sampleBubbles(imageUri, deck) {
  const grouped = groupQuestionsBySection(deck.questions || []);
  const scannable = [
    ...(grouped.selection || []).filter(q => q.type === "mcq" || q.type === "tf"),
  ];

  scannable.sort((a, b) => {
    if (a.type === b.type) return 0;
    return a.type === "mcq" ? -1 : 1;
  });

  if (scannable.length === 0) {
    return { answers: [], score: 0, total: 0, fiducialsDetected: 0, warpApplied: false };
  }
  if (scannable.length > 50) {
    throw new Error(`Too many scannable questions (${scannable.length} > 50)`);
  }

  const template = pickTemplate(scannable.length);
  const grayData = await loadImageAsGrayscale(imageUri, WARP_W, WARP_H);

  // PR 60: detectar fiduciales
  const fiducials = findFiducials(grayData, WARP_W, WARP_H);
  const detectedCount = Object.values(fiducials).filter(f => f.found).length;
  const warpApplied = detectedCount >= 6;  // necesitamos al menos 6 de 8

  if (warpApplied) {
    console.log(`[scanner-mlkit] Fiduciales detectadas: ${detectedCount}/8. Warp bilineal aplicado.`);
  } else {
    console.warn(`[scanner-mlkit] Solo ${detectedCount}/8 fiduciales detectadas. Usando coords crudas (degraded mode).`);
  }

  const virtualCenter = computeVirtualCenter(fiducials);

  const positions = computeBubblePositions(scannable, template);
  const sampleRadiusPx = Math.round(SAMPLE_RADIUS_MM * WARP_SCALE);

  const answers = [];
  let score = 0;

  for (const item of positions) {
    const samples = item.choices.map((letter, i) => {
      const xMm = item.cxMm + i * template.bubbleGap;
      const yMm = item.cyMm;

      // PR 60: corregir posición usando fiduciales (si están detectadas)
      const { x: correctedX, y: correctedY } = warpApplied
        ? warpPosition(xMm, yMm, fiducials, virtualCenter)
        : { x: xMm, y: yMm };

      const xPx = Math.round(correctedX * WARP_SCALE);
      const yPx = Math.round(correctedY * WARP_SCALE);
      const intensity = sampleIntensity(grayData, WARP_W, WARP_H, xPx, yPx, sampleRadiusPx);
      return { letter, intensity };
    });

    // PR 61: detección por GAP en lugar de "elegir la más oscura".
    //
    // Algoritmo:
    //   1. Ordenar burbujas por intensidad ascendente (más oscura primero).
    //   2. Buscar el "salto" más grande entre intensidades consecutivas.
    //   3. Si el salto es lo suficientemente grande Y la burbuja anterior
    //      al salto está bajo el umbral oscuro → todas las anteriores
    //      al salto están MARCADAS.
    //   4. Si no hay salto claro o ninguna está oscura → nada marcado.
    //
    // Esto permite detectar 0, 1, 2, 3 o 4 burbujas marcadas en la misma
    // pregunta sin un umbral fijo absoluto (más robusto a luz variable).
    const detection = detectMarkedBubbles(samples);
    const marked = detection.marked;        // array de letras, puede ser []
    const confidence = detection.confidence;
    let is_uncertain = detection.is_uncertain;

    is_uncertain = is_uncertain || confidence < UNCERTAIN_THRESHOLD;

    // PR 61: extractCorrectAnswers devuelve SIEMPRE array (incluso si
    // q.correct es un solo número, lo wrappea como [letter]).
    const correct = extractCorrectAnswers(item.q);

    // PR 61: regla lenient — alumno acierta si todas sus marcas están
    // en correct Y marcó al menos una.
    const is_correct = marked.length > 0
                      && marked.every(m => correct.includes(m));

    if (is_correct) score++;

    answers.push({
      question_id: item.q.id,
      qNum: item.qNum,
      marked,        // array, ej: ["A"], ["A","B"], o []
      correct,       // array, ej: ["A"] o ["A","B"]
      is_correct,
      confidence: Number(confidence.toFixed(2)),
      is_uncertain,
    });
  }

  return {
    answers,
    score,
    total: scannable.length,
    fiducialsDetected: detectedCount,
    warpApplied,
  };
}

/**
 * Helper for the Scanner.jsx UI: cuando el usuario manualmente
 * confirma/cambia una respuesta uncertain.
 *
 * @param {Array} answers      lista actual de answers (de sampleBubbles)
 * @param {string} questionId  qué pregunta cambiar
 * @param {Array<string>|string|null} newMarked
 *        Array de letras (ej ["A","B"]) o string single (ej "A") o null
 *        (sin respuesta). Se normaliza a array.
 */
export function updateAnswer(answers, questionId, newMarked) {
  // Normalizar newMarked a array
  let normalized;
  if (newMarked === null || newMarked === undefined) {
    normalized = [];
  } else if (Array.isArray(newMarked)) {
    normalized = [...newMarked].sort();
  } else {
    normalized = [String(newMarked)];
  }

  const updated = answers.map(a => {
    if (a.question_id !== questionId) return a;
    // Regla lenient: alumno acierta si todas sus marcas están en correct
    // Y marcó al menos una.
    const correctArr = Array.isArray(a.correct) ? a.correct : (a.correct ? [a.correct] : []);
    const is_correct = normalized.length > 0
                      && normalized.every(m => correctArr.includes(m));
    return {
      ...a,
      marked: normalized,
      is_correct,
      confidence: 1.0,        // user confirmed = max confidence
      is_uncertain: false,
    };
  });
  const score = updated.filter(a => a.is_correct).length;
  return { answers: updated, score, total: answers.length };
}

// ─── Fiducial detection (PR 60) ────────────────────────────────────────

/**
 * Busca las 8 fiduciales del PDF en la imagen rectificada.
 * Para cada fiducial esperada, busca en una ventana de ±FIDUCIAL_SEARCH_RADIUS_MM
 * alrededor de su posición esperada. Encuentra el blob negro más grande
 * dentro de esa ventana cuyo área esté en el rango esperado, y calcula
 * su centroide.
 */
function findFiducials(gray, W, H) {
  const searchRadiusPx = Math.round(FIDUCIAL_SEARCH_RADIUS_MM * WARP_SCALE);
  const result = {};

  for (const [name, expectedMm] of Object.entries(FIDUCIAL_CENTERS)) {
    const expectedPx = {
      x: expectedMm.x * WARP_SCALE,
      y: expectedMm.y * WARP_SCALE,
    };

    const x0 = Math.max(0, Math.round(expectedPx.x - searchRadiusPx));
    const y0 = Math.max(0, Math.round(expectedPx.y - searchRadiusPx));
    const x1 = Math.min(W - 1, Math.round(expectedPx.x + searchRadiusPx));
    const y1 = Math.min(H - 1, Math.round(expectedPx.y + searchRadiusPx));

    const blob = findLargestDarkBlob(gray, W, H, x0, y0, x1, y1, expectedPx.x, expectedPx.y);

    result[name] = {
      expected: expectedPx,
      found: blob,
    };
  }

  return result;
}

/**
 * Dentro de una ventana rectangular, encuentra el blob de pixels oscuros
 * (< threshold) que mejor matchea una fiducial: área en rango esperado
 * y centroide CERCANO a la posición esperada.
 *
 * IMPORTANTE: NO elegimos "el blob más grande" — eso puede agarrar el
 * logo Clasloop o números de pregunta. Elegimos el blob cuyo centroide
 * está MÁS CERCA del centro esperado, dentro del rango de área válido.
 *
 * BFS de componentes conexos (4-connectivity).
 */
function findLargestDarkBlob(gray, W, H, x0, y0, x1, y1, expectedCenterX, expectedCenterY) {
  const winW = x1 - x0 + 1;
  const winH = y1 - y0 + 1;
  const visited = new Uint8Array(winW * winH);

  let bestBlob = null;
  let bestDist = Infinity;

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const winIdx = (y - y0) * winW + (x - x0);
      if (visited[winIdx]) continue;
      if (gray[y * W + x] >= FIDUCIAL_BINARY_THRESHOLD) {
        visited[winIdx] = 1;
        continue;
      }

      const blob = floodFillBlob(gray, W, H, visited, x, y, x0, y0, winW, winH);

      if (blob.area >= FIDUCIAL_MIN_AREA_PX && blob.area <= FIDUCIAL_MAX_AREA_PX) {
        const dx = blob.x - expectedCenterX;
        const dy = blob.y - expectedCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bestDist) {
          bestDist = dist;
          bestBlob = blob;
        }
      }
    }
  }

  return bestBlob;
}

/**
 * BFS flood fill desde un pixel oscuro. Stack-based para evitar
 * stack overflow en blobs grandes.
 */
function floodFillBlob(gray, W, H, visited, startX, startY, winX0, winY0, winW, winH) {
  const stack = [startX, startY];
  let sumX = 0, sumY = 0, count = 0;

  while (stack.length > 0) {
    const y = stack.pop();
    const x = stack.pop();

    const winIdx = (y - winY0) * winW + (x - winX0);
    if (visited[winIdx]) continue;
    if (gray[y * W + x] >= FIDUCIAL_BINARY_THRESHOLD) {
      visited[winIdx] = 1;
      continue;
    }

    visited[winIdx] = 1;
    sumX += x;
    sumY += y;
    count++;

    // 4-vecinos, solo si dentro de la ventana
    if (x > winX0 && !visited[winIdx - 1]) stack.push(x - 1, y);
    if (x < winX0 + winW - 1 && !visited[winIdx + 1]) stack.push(x + 1, y);
    if (y > winY0 && !visited[winIdx - winW]) stack.push(x, y - 1);
    if (y < winY0 + winH - 1 && !visited[winIdx + winW]) stack.push(x, y + 1);
  }

  return {
    x: count > 0 ? sumX / count : 0,
    y: count > 0 ? sumY / count : 0,
    area: count,
  };
}

// ─── Bilinear warp (PR 60) ─────────────────────────────────────────────

/**
 * Calcula el "centro virtual" del área escaneable como el promedio de
 * las 4 fiduciales medio (TC, BC, ML, MR). Si alguna no se detectó,
 * fallback al centro geométrico esperado.
 */
function computeVirtualCenter(fiducials) {
  const midNames = ["topCenter", "bottomCenter", "midLeft", "midRight"];
  const found = midNames
    .map(n => fiducials[n])
    .filter(f => f && f.found);

  if (found.length === 4) {
    const sumX = found.reduce((s, f) => s + f.found.x, 0);
    const sumY = found.reduce((s, f) => s + f.found.y, 0);
    return { x: sumX / 4, y: sumY / 4 };
  }

  return {
    x: (SCAN_AREA.x + SCAN_AREA.width / 2) * WARP_SCALE,
    y: (SCAN_AREA.y + SCAN_AREA.height / 2) * WARP_SCALE,
  };
}

/**
 * Corrige una posición esperada (xMm, yMm) usando interpolación
 * bilineal entre las 4 fiduciales del cuadrante correspondiente.
 *
 * El área escaneable se divide en 4 cuadrantes (TL, TR, BL, BR).
 * Cada cuadrante tiene 4 vertices: V1 (top-left), V2 (top-right),
 * V3 (bottom-left), V4 (bottom-right) referidos al cuadrante.
 *
 * Fórmula bilineal: P = (1-u)(1-v)·V1 + u(1-v)·V2 + (1-u)v·V3 + uv·V4
 */
function warpPosition(xMm, yMm, fiducials, virtualCenter) {
  const xPx = xMm * WARP_SCALE;
  const yPx = yMm * WARP_SCALE;

  const expectedCenterX = (SCAN_AREA.x + SCAN_AREA.width / 2) * WARP_SCALE;
  const expectedCenterY = (SCAN_AREA.y + SCAN_AREA.height / 2) * WARP_SCALE;

  const isLeft = xPx < expectedCenterX;
  const isTop = yPx < expectedCenterY;

  // Helper: obtener posición real (found) o esperada (fallback)
  const getPos = (name) => {
    if (name === "_virtual") return virtualCenter;
    const f = fiducials[name];
    return (f && f.found) ? f.found : f.expected;
  };

  // Identificar V1, V2, V3, V4 según cuadrante
  // Cada cuadrante: V1=top-left, V2=top-right, V3=bottom-left, V4=bottom-right
  let v1Name, v2Name, v3Name, v4Name;
  if (isTop && isLeft) {
    // Cuadrante TL: vertices son TL, TC, ML, virtualCenter
    v1Name = "topLeft"; v2Name = "topCenter";
    v3Name = "midLeft"; v4Name = "_virtual";
  } else if (isTop && !isLeft) {
    // Cuadrante TR: TC, TR, virtualCenter, MR
    v1Name = "topCenter"; v2Name = "topRight";
    v3Name = "_virtual"; v4Name = "midRight";
  } else if (!isTop && isLeft) {
    // Cuadrante BL: ML, virtualCenter, BL, BC
    v1Name = "midLeft"; v2Name = "_virtual";
    v3Name = "bottomLeft"; v4Name = "bottomCenter";
  } else {
    // Cuadrante BR: virtualCenter, MR, BC, BR
    v1Name = "_virtual"; v2Name = "midRight";
    v3Name = "bottomCenter"; v4Name = "bottomRight";
  }

  const v1 = getPos(v1Name);
  const v2 = getPos(v2Name);
  const v3 = getPos(v3Name);
  const v4 = getPos(v4Name);

  // Posiciones ESPERADAS de los 4 vertices del cuadrante (para calcular u, v)
  const getExpected = (name) => {
    if (name === "_virtual") {
      return { x: expectedCenterX, y: expectedCenterY };
    }
    const f = FIDUCIAL_CENTERS[name];
    return { x: f.x * WARP_SCALE, y: f.y * WARP_SCALE };
  };

  const expV1 = getExpected(v1Name);
  const expV2 = getExpected(v2Name);
  const expV3 = getExpected(v3Name);
  // expV4 no se usa para u,v (asumimos cuadrante esperado rectangular)

  // u, v normalizados en [0,1] dentro del cuadrante (basado en expected)
  // expV1 es top-left, expV2 es top-right, expV3 es bottom-left
  const dxQuadrant = expV2.x - expV1.x;
  const dyQuadrant = expV3.y - expV1.y;

  const u = dxQuadrant !== 0 ? (xPx - expV1.x) / dxQuadrant : 0;
  const v = dyQuadrant !== 0 ? (yPx - expV1.y) / dyQuadrant : 0;

  const uc = Math.max(0, Math.min(1, u));
  const vc = Math.max(0, Math.min(1, v));

  // Interpolación bilineal usando posiciones REALES
  const newX = (1 - uc) * (1 - vc) * v1.x + uc * (1 - vc) * v2.x
             + (1 - uc) * vc * v3.x + uc * vc * v4.x;
  const newY = (1 - uc) * (1 - vc) * v1.y + uc * (1 - vc) * v2.y
             + (1 - uc) * vc * v3.y + uc * vc * v4.y;

  return { x: newX / WARP_SCALE, y: newY / WARP_SCALE };
}

// ─── Image loading ─────────────────────────────────────────────────────

async function loadImageAsGrayscale(imageUri, w, h) {
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

  ctx.drawImage(img, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const rgba = imgData.data;
  const gray = new Uint8Array(w * h);

  for (let i = 0; i < gray.length; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
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

// ─── Bubble positions + intensity sampling ────────────────────────────

function computeBubblePositions(scannable, t) {
  const positions = [];
  const addColumn = (qsInCol, startQNum, colBaseX, yStart) => {
    qsInCol.forEach((q, idx) => {
      const cyMm = yStart + idx * t.rowHeight;
      // PR 60: TF usa A=T y B=F (consistente con el PDF nuevo)
      const choices = q.type === "tf" ? ["A", "B"] : ["A", "B", "C", "D"];
      positions.push({ q, qNum: startQNum + idx, cxMm: colBaseX, cyMm, choices });
    });
  };

  if (t === TEMPLATES.T50) {
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

/**
 * PR 61: extrae las respuestas correctas como ARRAY de letras ["A","B",...].
 *
 * Acepta los siguientes formatos de q.correct (backwards compat):
 *   - number    → ej 0 → ["A"]                  (deck single-correct viejo)
 *   - number[]  → ej [0,1] → ["A","B"]          (deck multi-correct)
 *   - boolean   → para TF: true → ["A"], false → ["B"]
 *   - undefined/null → []
 */
function extractCorrectAnswers(q) {
  if (!q) return [];
  if (q.type === "mcq") {
    if (typeof q.correct === "number") {
      const L = "ABCD"[q.correct];
      return L ? [L] : [];
    }
    if (Array.isArray(q.correct)) {
      return q.correct
        .map(v => {
          if (typeof v === "number") return "ABCD"[v] || null;
          if (typeof v === "string") return v.toUpperCase();
          return null;
        })
        .filter(Boolean);
    }
    return [];
  }
  if (q.type === "tf") {
    if (q.correct === true) return ["A"];   // T = A
    if (q.correct === false) return ["B"];  // F = B
    return [];
  }
  return [];
}

/**
 * PR 61: detecta cuáles burbujas están marcadas usando GAP DETECTION.
 *
 * Recibe samples = [{letter, intensity}, ...] (típicamente 2 o 4 burbujas).
 *
 * Algoritmo:
 *   1. Ordenar por intensidad ascendente (más oscura primero).
 *   2. Buscar el "salto" más grande entre intensidades consecutivas.
 *   3. La regla:
 *      - Si TODAS son blancas (intensity > THRESHOLD): nada marcado.
 *      - Si la más oscura está bajo el umbral Y el gap más grande
 *        supera GAP_MIN: las anteriores al salto están marcadas.
 *      - Si la más oscura está bajo el umbral pero el gap es chico:
 *        probablemente TODAS están marcadas (raro pero posible).
 *      - Si hay valores en zona borderline: marcamos pero is_uncertain.
 *
 * Retorna: { marked: ["A","B"], confidence: 0..1, is_uncertain: bool }
 */
function detectMarkedBubbles(samples) {
  if (!samples || samples.length === 0) {
    return { marked: [], confidence: 1.0, is_uncertain: false };
  }

  const sorted = [...samples].sort((a, b) => a.intensity - b.intensity);
  const darkest = sorted[0];
  const lightest = sorted[sorted.length - 1];

  // CASO 1: todas blancas. Nada marcado, confianza alta.
  if (darkest.intensity >= BUBBLE_DARK_THRESHOLD + 30) {
    return { marked: [], confidence: 0.95, is_uncertain: false };
  }

  // CASO 2: la más oscura está borderline (entre THRESHOLD y THRESHOLD+30).
  // Probablemente marca débil. Marcamos pero baja confianza.
  if (darkest.intensity >= BUBBLE_DARK_THRESHOLD) {
    return {
      marked: [darkest.letter],
      confidence: 0.25,
      is_uncertain: true,
    };
  }

  // CASO 3: al menos la más oscura está claramente marcada.
  // Buscar el gap más grande para detectar dónde termina el grupo "marcadas".

  // Si solo hay UNA burbuja sample (ej. después del warp algo raro), retornarla.
  if (sorted.length === 1) {
    return {
      marked: [darkest.letter],
      confidence: 0.9,
      is_uncertain: false,
    };
  }

  let maxGap = 0;
  let maxGapIdx = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = sorted[i + 1].intensity - sorted[i].intensity;
    if (gap > maxGap) {
      maxGap = gap;
      maxGapIdx = i;
    }
  }

  // Si el gap más grande es razonable, separamos marcadas vs no.
  // GAP_MIN = BUBBLE_AMBIGUITY_MARGIN (15) — el mismo umbral que usábamos
  // para la lógica single-answer.
  if (maxGap >= BUBBLE_AMBIGUITY_MARGIN) {
    // Las burbujas con índice <= maxGapIdx están marcadas
    const markedSamples = sorted.slice(0, maxGapIdx + 1);

    // Filtro adicional: las "marcadas" tienen que estar bajo el umbral
    // oscuro. Si maxGapIdx puso burbujas que no están bajo threshold,
    // las dropeamos.
    const trulyMarked = markedSamples.filter(s => s.intensity < BUBBLE_DARK_THRESHOLD);
    const marked = trulyMarked.map(s => s.letter).sort();  // sort alfabético

    // Confidence basado en oscuridad de la más oscura + tamaño del gap
    const darknessConf = Math.min(
      1.0,
      (BUBBLE_DARK_THRESHOLD - darkest.intensity) / HIGH_CONF_BUFFER
    );
    const gapConf = Math.min(1.0, maxGap / (BUBBLE_AMBIGUITY_MARGIN * 3));
    const confidence = Math.min(darknessConf, gapConf);

    return {
      marked,
      confidence,
      is_uncertain: confidence < UNCERTAIN_THRESHOLD,
    };
  }

  // CASO 4: el gap es chico, varias burbujas tienen intensidad similar y
  // baja. Marcamos las que estén bajo el umbral pero is_uncertain=true.
  const ambiguousMarked = sorted
    .filter(s => s.intensity < BUBBLE_DARK_THRESHOLD)
    .map(s => s.letter)
    .sort();

  return {
    marked: ambiguousMarked,
    confidence: 0.2,
    is_uncertain: true,
  };
}

// Re-export for convenience
export { TEMPLATES, pickTemplate, PAGE_DIMS };

// ─── Internal exports for testing (PR 60, PR 61) ──────────────────────
export const _internal = {
  findFiducials,
  findLargestDarkBlob,
  warpPosition,
  computeVirtualCenter,
  loadImageAsGrayscale,
  sampleIntensity,
  computeBubblePositions,
  // PR 61:
  extractCorrectAnswers,
  detectMarkedBubbles,
  WARP_SCALE,
  WARP_W,
  WARP_H,
};
