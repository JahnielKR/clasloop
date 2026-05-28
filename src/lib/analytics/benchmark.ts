// ─── src/lib/analytics/benchmark.ts ────────────────────────────────────
// Pure helpers para comparar períodos / clases / alumnos contra
// referencias (período anterior, media de cohorte, etc.). Sin React, sin
// Supabase. Tested en __tests__/benchmark.test.ts.

/**
 * Shift a date window back by the same length.
 * Example: from=2026-05-01, to=2026-05-31 → prev: 2026-03-31 → 2026-04-30.
 * If either input is null, returns { from: null, to: null }.
 */
export function previousPeriod(
  from: string | null | undefined,
  to: string | null | undefined,
): { from: string | null; to: string | null } {
  if (!from || !to) return { from: null, to: null };
  const fromD = new Date(from);
  const toD = new Date(to);
  if (Number.isNaN(fromD.getTime()) || Number.isNaN(toD.getTime())) {
    return { from: null, to: null };
  }
  const lengthMs = toD.getTime() - fromD.getTime();
  const prevFrom = new Date(fromD.getTime() - lengthMs);
  const prevTo = new Date(toD.getTime() - lengthMs);
  return { from: prevFrom.toISOString(), to: prevTo.toISOString() };
}

/**
 * Percentile rank of `value` within `values` (0..100). Counts elements
 * with `v <= value`. Returns null when:
 *   - the array is empty
 *   - value is null/undefined
 *   - filtered array (numbers only) is empty
 */
export function percentileRank(
  values: readonly (number | null | undefined)[],
  value: number | null | undefined,
): number | null {
  if (value == null) return null;
  if (!values || values.length === 0) return null;
  const clean = values.filter((v): v is number => typeof v === "number");
  if (clean.length === 0) return null;
  const leq = clean.filter((v) => v <= value).length;
  return Math.round((leq / clean.length) * 100);
}

/**
 * Percent change a -> b. Returns null on missing input or a === 0.
 * Mirror of pctChange in metrics.ts but with rename to avoid collision
 * (the barrel exports both libs and percent-change semantics are
 * subtly different here — this version is benchmark-specific).
 */
export function pctChangeOrNull(
  a: number | null | undefined,
  b: number | null | undefined,
): number | null {
  if (a == null || b == null) return null;
  if (a === 0) return null;
  return ((b - a) / a) * 100;
}
