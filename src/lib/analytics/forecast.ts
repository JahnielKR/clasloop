// ─── src/lib/analytics/forecast.ts ─────────────────────────────────────
// Pure forecast helpers (regresión lineal simple + proyección a N puntos).
// Sin React, sin Supabase. Used por TrendBarChart's `forecast` prop en F5
// (banda de pronóstico al final de las series de tendencia).
//
// Heurística: ajusta y = slope*x + intercept por mínimos cuadrados sobre
// los datos del rango actual; extrapola N puntos hacia adelante (índices
// n, n+1, ...). Si el slope no se puede calcular (puntos insuficientes /
// x idénticos), devuelve null o []. Clamp opcional para evitar valores
// fuera de rango razonable (e.g. % no puede ser < 0).

export type Point = { x: number; y: number };

export interface RegressionResult {
  slope: number;
  intercept: number;
}

/**
 * Fits y = slope*x + intercept via ordinary least squares.
 * Returns null if fewer than 2 finite points or all x are identical.
 */
export function linearRegression(
  points: readonly Point[],
): RegressionResult | null {
  if (!points || points.length < 2) return null;
  const clean: Point[] = [];
  for (const p of points) {
    if (Number.isFinite(p.x) && Number.isFinite(p.y)) clean.push(p);
  }
  if (clean.length < 2) return null;
  const n = clean.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const p of clean) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export interface ForecastBucket {
  bucket: string;
  value: number;
}

export interface ForecastOptions {
  /** Lower bound for forecasted values (e.g. 0 for %). Default: no clamp. */
  clampMin?: number;
  /** Upper bound (e.g. 100 for %). Default: no clamp. */
  clampMax?: number;
}

/**
 * Extrapolate `horizon` future points from a series. Each input bucket
 * becomes (i, value) for the regression; outputs are labeled "+1", "+2", …
 * Returns [] when the data is too short to fit a line.
 */
export function forecastPoints(
  data: readonly ForecastBucket[],
  horizon: number,
  opts: ForecastOptions = {},
): ForecastBucket[] {
  if (!data || data.length < 2 || horizon < 1) return [];
  const pts: Point[] = data.map((d, i) => ({ x: i, y: Number(d.value) }));
  const fit = linearRegression(pts);
  if (!fit) return [];
  const out: ForecastBucket[] = [];
  for (let k = 1; k <= horizon; k++) {
    const xNext = data.length - 1 + k;
    let v = fit.slope * xNext + fit.intercept;
    if (opts.clampMin != null) v = Math.max(opts.clampMin, v);
    if (opts.clampMax != null) v = Math.min(opts.clampMax, v);
    out.push({ bucket: `+${k}`, value: Math.round(v * 10) / 10 });
  }
  return out;
}
