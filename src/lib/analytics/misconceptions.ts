// ─── src/lib/analytics/misconceptions.ts ──────────────────────────────
// Pure helpers para decodear answer_distribution y resaltar la opción
// correcta + identificar la "wrong-answer más popular" en MCQ/TF.
// Sin React, sin Supabase. Tested en __tests__/misconceptions.test.ts.

export interface QuestionLike {
  type?: string;
  correct?: number | number[] | boolean | string | null;
}

export type DistributionEntry = {
  key: string;
  count: number;
  isCorrect: boolean;
};

/**
 * Correct key string for an MCQ question.
 * MCQ shape: { type:'mcq', correct: number | number[] }.
 * For multi-correct returns the first correct as a string ("the canonical").
 */
export function correctKeyForMcq(q: QuestionLike | null | undefined): string | null {
  if (!q || q.type !== "mcq") return null;
  const c = q.correct;
  if (typeof c === "number") return String(c);
  if (Array.isArray(c) && c.length > 0 && typeof c[0] === "number") return String(c[0]);
  return null;
}

/**
 * Correct key string for a true/false question.
 * TF shape: { type:'tf', correct: boolean }.
 * Returns 'true' / 'false' (lowercase string).
 */
export function correctKeyForTf(q: QuestionLike | null | undefined): string | null {
  if (!q || q.type !== "tf") return null;
  if (q.correct === true) return "true";
  if (q.correct === false) return "false";
  return null;
}

/**
 * Highest-count answer key that ISN'T the correct one.
 * Returns null when:
 *   - correctKey is null (can't tell what's wrong without it)
 *   - distribution is empty
 *   - only the correct key has counts (no misconception to highlight)
 */
export function pickTopMisconception(
  distribution: Record<string, number> | null | undefined,
  correctKey: string | null,
): { key: string; count: number } | null {
  if (!correctKey || !distribution) return null;
  let top: { key: string; count: number } | null = null;
  for (const [k, v] of Object.entries(distribution)) {
    if (k === correctKey) continue;
    const count = Number(v) || 0;
    if (count <= 0) continue;
    if (!top || count > top.count) top = { key: k, count };
  }
  return top;
}

/**
 * Sorted entries (DESC by count) with `isCorrect` flag.
 * Stable and easy to render as a bar list.
 */
export function decorateDistribution(
  distribution: Record<string, number> | null | undefined,
  correctKey: string | null,
): DistributionEntry[] {
  if (!distribution) return [];
  return Object.entries(distribution)
    .map(([key, count]) => ({
      key,
      count: Number(count) || 0,
      isCorrect: correctKey != null && key === correctKey,
    }))
    .sort((a, b) => b.count - a.count);
}
