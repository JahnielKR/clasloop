// ─── lib/scanner-cv.js ──────────────────────────────────────────────────
//
// PR 49.5: pipeline de computer vision en JavaScript puro.
//
// Reemplaza la versión anterior basada en OpenCV.js (PR 49.3). OpenCV.js
// (~8MB WASM) no se carga confiablemente en navegadores móviles (Safari
// iOS y Chrome Android tarda minutos o nunca completa la inicialización
// en redes/CPUs típicas).
//
// Esta versión usa solo APIs nativas del browser:
//   - Canvas 2D para leer pixeles
//   - Algoritmos de CV implementados a mano (~250 líneas)
//   - jsQR para leer el QR (~25KB, sin WASM)
//
// Pipeline:
//   1. Render del frame a canvas grayscale (Uint8ClampedArray)
//   2. Adaptive threshold local (~31×31 px) → binary
//   3. Connected-component labeling (flood-fill 4-conn) → blobs
//   4. Filter blobs por shape (square-ish, área proporcional, solidez)
//   5. Identificar 4 esquinas extremas
//   6. Perspective transform: calcular matriz 3x3 (DLT)
//   7. Warp inverso a canvas "ideal" A4 (~1050×1485 px)
//   8. jsQR sobre la región del QR
//   9. Sample pixels alrededor del centro de cada burbuja → darkness
//  10. Comparar contra answer key del deck → score + detalle
//
// API pública intencionalmente idéntica a la versión anterior:
//   processScanFrame(canvas, deck) → result
//   loadOpenCV() → no-op (lo mantenemos exportado para no romper imports)

import { TEMPLATES, pickTemplate, PAGE_DIMS } from "./pdf-styles/scanner";
import jsQR from "jsqr";

// ─── Constants ──────────────────────────────────────────────────────────

// Warp target: 5× sobre los mm reales del A4 (210×297mm) = 1050×1485 px.
// Suficiente para distinguir las burbujas más chicas (1.7mm = 8.5px de
// radio).
const WARP_SCALE = 5;
const WARP_W = PAGE_DIMS.width  * WARP_SCALE; // 1050
const WARP_H = PAGE_DIMS.height * WARP_SCALE; // 1485

// Bubble sampling thresholds (mismos valores que la versión OpenCV).
const BUBBLE_DARK_THRESHOLD = 130;
const BUBBLE_AMBIGUITY_MARGIN = 15;
const SAMPLE_RADIUS_MM = 1.4;

// QR search region en mm (lower-right, cubre tanto T50 como otros).
const QR_SEARCH_REGION_MM = {
  x: 130, y: 240, w: 70, h: 55,
};

// Adaptive threshold params (ajustables).
const THRESHOLD_BLOCK = 31;  // tamaño de bloque para promedio local
const THRESHOLD_OFFSET = 10; // píxeles más oscuros que (promedio - offset) → foreground

// Fiducial inset esperado en mm (centro del cuadrado de esquina):
// 6mm (CORNER_INSET) + 3.5mm (CORNER_SIZE/2) = 9.5mm.
const FIDUCIAL_INSET_MM = 9.5;

// ─── No-op para compat con import existente ─────────────────────────────
export function loadOpenCV() {
  return Promise.resolve(); // no más OpenCV — todo en JS puro
}

// ─── Pipeline ───────────────────────────────────────────────────────────

/**
 * Process a captured frame against the selected deck.
 * Returns:
 *   { ok: true,  score, total, answers, deckId, template, warpedCanvas }
 *   { ok: false, code, message, ...extra }
 */
export async function processScanFrame(sourceCanvas, deck) {
  const scannable = (deck.questions || []).filter(
    q => q && (q.type === "mcq" || q.type === "tf")
  );
  if (scannable.length === 0) {
    return { ok: false, code: "no_questions", message: "Deck has no MCQ/TF questions" };
  }
  const template = pickTemplate(scannable.length);

  // 1. Source → grayscale Uint8Array
  const srcCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  const srcImg = srcCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const W = srcImg.width, H = srcImg.height;
  const gray = toGrayscale(srcImg);

  // Allow the browser to paint between costly steps.
  await yieldToBrowser();

  // 2. Adaptive threshold → binary (Uint8Array, 0 or 255)
  const bin = adaptiveThreshold(gray, W, H, THRESHOLD_BLOCK, THRESHOLD_OFFSET);
  await yieldToBrowser();

  // 3. Connected component labeling → list of blobs with bbox + area
  const blobs = findBlobs(bin, W, H);
  await yieldToBrowser();

  // 4. Filter blobs that look like fiducial squares
  const candidates = filterFiducialCandidates(blobs, W, H);
  if (candidates.length < 4) {
    return {
      ok: false, code: "no_fiducials",
      message: `Only found ${candidates.length} fiducial candidates`,
    };
  }

  // 5. Identify 4 corners by extreme position
  const corners = pickCornerFiducials(candidates, W / 2, H / 2);
  if (!corners) {
    return { ok: false, code: "no_fiducials", message: "Could not identify 4 distinct corners" };
  }

  // 6. Build perspective transform: source corners → destination corners
  // Destination = fiducial centers in the ideal warped A4
  const fidInsetPx = FIDUCIAL_INSET_MM * WARP_SCALE;
  const srcPts = [
    [corners.tl.cx, corners.tl.cy],
    [corners.tr.cx, corners.tr.cy],
    [corners.br.cx, corners.br.cy],
    [corners.bl.cx, corners.bl.cy],
  ];
  const dstPts = [
    [fidInsetPx,             fidInsetPx],
    [WARP_W - fidInsetPx,    fidInsetPx],
    [WARP_W - fidInsetPx,    WARP_H - fidInsetPx],
    [fidInsetPx,             WARP_H - fidInsetPx],
  ];

  const inverseMatrix = computePerspectiveTransform(dstPts, srcPts);
  if (!inverseMatrix) {
    return { ok: false, code: "no_fiducials", message: "Degenerate perspective transform" };
  }

  await yieldToBrowser();

  // 7. Warp: para cada pixel del destino calculamos su origen en la fuente
  const warpedCanvas = document.createElement("canvas");
  warpedCanvas.width = WARP_W;
  warpedCanvas.height = WARP_H;
  const warpedCtx = warpedCanvas.getContext("2d", { willReadFrequently: true });
  const warpedImg = warpPerspective(srcImg, inverseMatrix, WARP_W, WARP_H);
  warpedCtx.putImageData(warpedImg, 0, 0);

  await yieldToBrowser();

  // Grayscale version of warped image for sampling
  const warpedGray = toGrayscale(warpedImg);

  // 8. Read QR
  const qrX = QR_SEARCH_REGION_MM.x * WARP_SCALE;
  const qrY = QR_SEARCH_REGION_MM.y * WARP_SCALE;
  const qrW = QR_SEARCH_REGION_MM.w * WARP_SCALE;
  const qrH = QR_SEARCH_REGION_MM.h * WARP_SCALE;
  const qrRegion = warpedCtx.getImageData(qrX, qrY, qrW, qrH);
  const qrCode = jsQR(qrRegion.data, qrRegion.width, qrRegion.height, {
    inversionAttempts: "attemptBoth",
  });
  if (!qrCode) {
    return {
      ok: false, code: "qr_not_found",
      message: "Could not read QR code on the answer sheet",
      warpedCanvas,
    };
  }

  // 9. Validate deck_id
  const expectedQR = `clasloop:deck:${deck.id}`;
  if (qrCode.data !== expectedQR) {
    const m = /^clasloop:deck:(.+)$/.exec(qrCode.data);
    const sheetDeckId = m ? m[1] : qrCode.data;
    return {
      ok: false, code: "wrong_deck",
      message: "Sheet belongs to a different deck",
      sheetDeckId, expectedDeckId: deck.id,
      warpedCanvas,
    };
  }

  // 10. Sample each bubble
  const answers = sampleAllBubbles(warpedGray, WARP_W, WARP_H, scannable, template);
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
}

// ─── JS-puro CV primitives ──────────────────────────────────────────────

/** ImageData (RGBA) → Uint8Array (grayscale 0-255). */
function toGrayscale(imgData) {
  const data = imgData.data;
  const N = imgData.width * imgData.height;
  const out = new Uint8Array(N);
  for (let i = 0, j = 0; i < N; i++, j += 4) {
    // Rec. 709 luminance: 0.2126 R + 0.7152 G + 0.0722 B
    out[i] = (data[j] * 0.2126 + data[j + 1] * 0.7152 + data[j + 2] * 0.0722) | 0;
  }
  return out;
}

/**
 * Adaptive threshold: cada pixel se compara contra el promedio de un
 * bloque local (mean - C). Foreground (oscuro) = 255 en el output.
 * Implementado con integral image (suma acumulada) → O(N).
 */
function adaptiveThreshold(gray, W, H, block, C) {
  // Build integral image
  const intg = new Float64Array((W + 1) * (H + 1));
  for (let y = 1; y <= H; y++) {
    let rowSum = 0;
    for (let x = 1; x <= W; x++) {
      rowSum += gray[(y - 1) * W + (x - 1)];
      intg[y * (W + 1) + x] = intg[(y - 1) * (W + 1) + x] + rowSum;
    }
  }
  const r = Math.floor(block / 2);
  const out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const y1 = Math.max(0, y - r);
    const y2 = Math.min(H - 1, y + r);
    for (let x = 0; x < W; x++) {
      const x1 = Math.max(0, x - r);
      const x2 = Math.min(W - 1, x + r);
      const area = (x2 - x1 + 1) * (y2 - y1 + 1);
      const sum =
        intg[(y2 + 1) * (W + 1) + (x2 + 1)] -
        intg[(y1)     * (W + 1) + (x2 + 1)] -
        intg[(y2 + 1) * (W + 1) + (x1)] +
        intg[(y1)     * (W + 1) + (x1)];
      const mean = sum / area;
      out[y * W + x] = gray[y * W + x] < mean - C ? 255 : 0;
    }
  }
  return out;
}

/**
 * Connected component labeling (4-connectivity).
 * Devuelve array de { area, bbox: {x, y, w, h} } sin las regiones que
 * tocan el borde de la imagen (típicamente ruido o el papel mismo).
 *
 * Implementado con un BFS iterativo usando un buffer plano (no recursivo
 * para evitar stack overflow en imágenes grandes).
 */
function findBlobs(bin, W, H) {
  const labels = new Int32Array(W * H); // 0 = no asignado
  const blobs = [];
  let nextLabel = 1;
  const queueX = new Int32Array(W * H);
  const queueY = new Int32Array(W * H);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      if (bin[idx] !== 255 || labels[idx] !== 0) continue;

      const label = nextLabel++;
      let qHead = 0, qTail = 0;
      queueX[qTail] = x; queueY[qTail] = y; qTail++;
      labels[idx] = label;

      let area = 0, minX = x, minY = y, maxX = x, maxY = y;
      let touchesBorder = false;

      while (qHead < qTail) {
        const cx = queueX[qHead], cy = queueY[qHead];
        qHead++;
        area++;
        if (cx < minX) minX = cx;
        if (cy < minY) minY = cy;
        if (cx > maxX) maxX = cx;
        if (cy > maxY) maxY = cy;
        if (cx === 0 || cy === 0 || cx === W - 1 || cy === H - 1) {
          touchesBorder = true;
        }
        // 4-connected neighbors
        for (let d = 0; d < 4; d++) {
          const nx = cx + (d === 0 ? -1 : d === 1 ? 1 : 0);
          const ny = cy + (d === 2 ? -1 : d === 3 ? 1 : 0);
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const nIdx = ny * W + nx;
          if (bin[nIdx] === 255 && labels[nIdx] === 0) {
            labels[nIdx] = label;
            queueX[qTail] = nx; queueY[qTail] = ny; qTail++;
          }
        }
      }

      if (!touchesBorder) {
        blobs.push({
          area,
          bbox: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
        });
      }
    }
  }
  return blobs;
}

/** Apply same shape filter as PR 49.3 to find fiducial candidates. */
function filterFiducialCandidates(blobs, W, H) {
  const imgArea = W * H;
  const minArea = imgArea * 0.0001;
  const maxArea = imgArea * 0.01;
  const out = [];
  for (const b of blobs) {
    if (b.area < minArea || b.area > maxArea) continue;
    const aspect = b.bbox.w / b.bbox.h;
    if (aspect < 0.7 || aspect > 1.4) continue;
    const solidity = b.area / (b.bbox.w * b.bbox.h);
    if (solidity < 0.7) continue;
    out.push({
      cx: b.bbox.x + b.bbox.w / 2,
      cy: b.bbox.y + b.bbox.h / 2,
      area: b.area,
    });
  }
  return out;
}

/** Pick the 4 candidates most extreme in each corner direction. */
function pickCornerFiducials(cands, imgCx, imgCy) {
  let tl = null, tr = null, br = null, bl = null;
  let tlS = Infinity, trS = -Infinity, brS = -Infinity, blS = -Infinity;
  for (const c of cands) {
    const dx = c.cx - imgCx;
    const dy = c.cy - imgCy;
    if (dx + dy < tlS) { tlS = dx + dy; tl = c; }
    if (dx - dy > trS) { trS = dx - dy; tr = c; }
    if (dx + dy > brS) { brS = dx + dy; br = c; }
    if (dy - dx > blS) { blS = dy - dx; bl = c; }
  }
  if (!tl || !tr || !br || !bl) return null;
  if (new Set([tl, tr, br, bl]).size < 4) return null;
  return { tl, tr, br, bl };
}

/**
 * Compute the 3×3 perspective transform matrix mapping 4 source points
 * to 4 destination points. Solves the linear system from the DLT
 * (Direct Linear Transform).
 *
 * Returns a flat array [a, b, c, d, e, f, g, h, 1] or null if degenerate.
 *
 * Math: for each (x, y) → (X, Y):
 *   X = (a x + b y + c) / (g x + h y + 1)
 *   Y = (d x + e y + f) / (g x + h y + 1)
 *
 * Rearranged into 8 linear equations in (a, b, c, d, e, f, g, h).
 */
function computePerspectiveTransform(srcPts, dstPts) {
  // 8×8 system A · h = b
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = srcPts[i];
    const [X, Y] = dstPts[i];
    A.push([x, y, 1, 0, 0, 0, -X * x, -X * y]); b.push(X);
    A.push([0, 0, 0, x, y, 1, -Y * x, -Y * y]); b.push(Y);
  }
  const h = solveLinearSystem(A, b);
  if (!h) return null;
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

/** Solve a square linear system A x = b via Gaussian elimination. */
function solveLinearSystem(A, b) {
  const n = A.length;
  // Build augmented matrix
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    // Partial pivot
    let maxRow = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[maxRow][col])) maxRow = r;
    }
    if (Math.abs(M[maxRow][col]) < 1e-9) return null; // singular
    if (maxRow !== col) {
      const tmp = M[col]; M[col] = M[maxRow]; M[maxRow] = tmp;
    }
    // Eliminate
    for (let r = col + 1; r < n; r++) {
      const factor = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) {
        M[r][c] -= factor * M[col][c];
      }
    }
  }
  // Back-substitution
  const x = new Array(n);
  for (let r = n - 1; r >= 0; r--) {
    let sum = M[r][n];
    for (let c = r + 1; c < n; c++) sum -= M[r][c] * x[c];
    x[r] = sum / M[r][r];
  }
  return x;
}

/**
 * Apply perspective transform to warp source image into dst W×H.
 * The matrix maps DST → SRC (inverse warp): for each dst pixel we
 * compute the source coords and sample (nearest-neighbor for speed).
 */
function warpPerspective(srcImg, matrix, dstW, dstH) {
  const [a, b, c, d, e, f, g, h] = matrix;
  const out = new ImageData(dstW, dstH);
  const outData = out.data;
  const srcData = srcImg.data;
  const srcW = srcImg.width;
  const srcH = srcImg.height;

  let oi = 0;
  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++, oi += 4) {
      const denom = g * x + h * y + 1;
      const sx = (a * x + b * y + c) / denom;
      const sy = (d * x + e * y + f) / denom;
      const xi = sx | 0;
      const yi = sy | 0;
      if (xi < 0 || yi < 0 || xi >= srcW || yi >= srcH) {
        // Outside source: leave as default (transparent black). Set alpha
        // anyway so jsQR can read uniform background as "white".
        outData[oi] = 255; outData[oi + 1] = 255;
        outData[oi + 2] = 255; outData[oi + 3] = 255;
        continue;
      }
      const si = (yi * srcW + xi) * 4;
      outData[oi]     = srcData[si];
      outData[oi + 1] = srcData[si + 1];
      outData[oi + 2] = srcData[si + 2];
      outData[oi + 3] = 255;
    }
  }
  return out;
}

/** Yield to the browser so it can repaint between heavy steps. */
function yieldToBrowser() {
  return new Promise(r => setTimeout(r, 0));
}

// ─── Bubble sampling ────────────────────────────────────────────────────

function templateName(t) {
  if (t === TEMPLATES.T10) return "T10";
  if (t === TEMPLATES.T20) return "T20";
  if (t === TEMPLATES.T30) return "T30";
  return "T50";
}

function sampleAllBubbles(warpedGray, W, H, scannable, template) {
  const results = [];
  const sampleRadiusPx = Math.round(SAMPLE_RADIUS_MM * WARP_SCALE);
  const positions = computeBubblePositions(scannable, template);

  for (const item of positions) {
    const samples = item.choices.map((letter, i) => {
      const xMm = item.cxMm + i * template.bubbleGap;
      const yMm = item.cyMm;
      const xPx = Math.round(xMm * WARP_SCALE);
      const yPx = Math.round(yMm * WARP_SCALE);
      const intensity = sampleIntensity(warpedGray, W, H, xPx, yPx, sampleRadiusPx);
      return { letter, intensity };
    });

    samples.sort((a, b) => a.intensity - b.intensity);
    const darkest = samples[0];
    const second = samples[1];

    let marked = null;
    if (darkest.intensity < BUBBLE_DARK_THRESHOLD) {
      if (!second || (second.intensity - darkest.intensity) >= BUBBLE_AMBIGUITY_MARGIN) {
        marked = darkest.letter;
      }
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

function computeBubblePositions(scannable, t) {
  const positions = [];
  const addColumn = (qsInCol, startQNum, colBaseX, yStart) => {
    qsInCol.forEach((q, idx) => {
      const cyMm = yStart + idx * t.rowHeight;
      const choices = q.type === "tf" ? ["T", "F"] : ["A", "B", "C", "D"];
      positions.push({
        q, qNum: startQNum + idx,
        cxMm: colBaseX, cyMm, choices,
      });
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
  const x0 = Math.max(0, cxPx - radiusPx);
  const y0 = Math.max(0, cyPx - radiusPx);
  const x1 = Math.min(W - 1, cxPx + radiusPx);
  const y1 = Math.min(H - 1, cyPx + radiusPx);
  let sum = 0, count = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      sum += gray[y * W + x];
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
