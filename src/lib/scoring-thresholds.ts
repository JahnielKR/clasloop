// PR 154 (M33): single source of truth for the app's score-tier thresholds.
//
// There are TWO independent axes — do NOT conflate them:
//   • SCORE / percent-correct → 80 green / 50 orange (higher = better).
//     Used by class-insights + deck-stats (this file's `pctColor`).
//   • RETENTION               → 70 green / 40 orange (higher = better).
//     The majority convention across the session/review surfaces. Those
//     consumers still inline it; migrating them is a follow-up (see
//     CHANGES_TO_PLAN.md) — RETENTION_TIERS/retentionTier are defined here so
//     that follow-up has a canonical anchor.
//
// Intentionally NOT unified here:
//   • PctCircle measures the MISS / wrong rate (higher = worse → red) — the
//     inverse of these scales. Folding it in would invert its colors.
//   • spaced-repetition's 0–5 SR quality is a different output, not a tier.

export type ScoreTier = "green" | "orange" | "red";

export interface TierPalette {
  textMuted: string;
  green: string;
  orange: string;
  red: string;
}

// ── SCORE / percent-correct ──────────────────────────────────────────────
export const SCORE_TIERS = { green: 80, orange: 50 } as const;

export function scoreTier(pct: number): ScoreTier {
  if (pct >= SCORE_TIERS.green) return "green";
  if (pct >= SCORE_TIERS.orange) return "orange";
  return "red";
}

// Canonical color for a percent-correct value. Callers pass their own palette
// (usually the `C` design tokens). null → muted (no data yet). This is the
// behavior the two former copies (class-insights.js / deck-stats.ts) shared.
export function pctColor(pct: number | null, palette: TierPalette): string {
  if (pct == null) return palette.textMuted;
  if (pct >= SCORE_TIERS.green) return palette.green;
  if (pct >= SCORE_TIERS.orange) return palette.orange;
  return palette.red;
}

// ── RETENTION ─────────────────────────────────────────────────────────────
export const RETENTION_TIERS = { green: 70, orange: 40 } as const;

export function retentionTier(pct: number): ScoreTier {
  if (pct >= RETENTION_TIERS.green) return "green";
  if (pct >= RETENTION_TIERS.orange) return "orange";
  return "red";
}
