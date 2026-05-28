// ─── src/lib/analytics/metrics.ts ────────────────────────────────────
// Pure KPI math. No React, no Supabase. Tested in __tests__/metrics.test.ts.
//
// Used by the Analytics Studio widgets (StatCardWithSparkline, TrendPanel,
// CompositionDonut, etc.) to format/compute small derived values. Anything
// that needs more than this (risk, benchmark, forecast) gets its own file
// in src/lib/analytics/.

/** Arithmetic mean. Returns null for empty input. */
export function mean(xs: readonly number[]): number | null {
  if (!xs || xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Absolute delta b - a. Returns null if either side is missing. */
export function delta(
  a: number | null | undefined,
  b: number | null | undefined,
): number | null {
  if (a == null || b == null) return null;
  return b - a;
}

/**
 * Percent change from a to b, signed (so -25 means dropped 25%).
 * Returns null when a is 0 (division undefined) or either side is missing.
 */
export function pctChange(
  a: number | null | undefined,
  b: number | null | undefined,
): number | null {
  if (a == null || b == null) return null;
  if (a === 0) return null;
  return ((b - a) / a) * 100;
}

/**
 * Simple linear regression slope of {x,y} points.
 * Returns null if fewer than 2 points or all x are identical (vertical line).
 */
export function trendSlope(
  points: readonly { x: number; y: number }[],
): number | null {
  if (!points || points.length < 2) return null;
  const n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  return (n * sumXY - sumX * sumY) / denom;
}

/**
 * Participation as a 0..100 percent.
 * Returns null when members is 0 (undefined); returns 0 when participants is 0.
 */
export function participationRate(
  participants: number,
  members: number,
): number | null {
  if (!members) return null;
  return (participants / members) * 100;
}
