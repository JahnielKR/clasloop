// ─── src/lib/analytics/formatters.ts ─────────────────────────────────
// Pure formatters used by Analytics Studio. No React, no Supabase.
// Stable strings across locales — el i18n del proyecto, si hace falta,
// se aplica al wrap del componente, no acá.

const DASH = "—";

/** Round and append %. Optional decimals. null/undefined → em-dash. */
export function formatPercent(
  x: number | null | undefined,
  decimals = 0,
): string {
  if (x == null) return DASH;
  const factor = 10 ** decimals;
  const rounded = Math.round(x * factor) / factor;
  return `${rounded.toFixed(decimals)}%`;
}

/** Delta with arrow + sign. ▲ / ▼ / →. null → em-dash. */
export function formatDelta(x: number | null | undefined): string {
  if (x == null) return DASH;
  if (x > 0) return `▲ ${x}%`;
  if (x < 0) return `▼ ${Math.abs(x)}%`;
  return `→ 0%`;
}

/** Integer with thousand separator. null → em-dash. */
export function formatNumber(x: number | null | undefined): string {
  if (x == null) return DASH;
  return x.toLocaleString("en-US");
}

/** Milliseconds → "Xs" or "Nm Ss". 0/null → em-dash. */
export function formatDurationShort(ms: number | null | undefined): string {
  if (!ms) return DASH;
  const seconds = ms / 1000;
  // Truncate (not round) to 1 decimal so 450ms reads as 0.4s, not 0.5s
  // — convention for "how long did this take" displays.
  if (seconds < 60) return `${(Math.floor(seconds * 10) / 10).toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds - m * 60);
  return `${m}m ${s}s`;
}

/** "hoy" / "ayer" / "hace Nd". null → em-dash. */
export function formatRelativeDay(
  d: Date | string | null | undefined,
  now: Date = new Date(),
): string {
  if (d == null) return DASH;
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return DASH;
  // Day-only delta. Compare floor-to-day (UTC).
  const dayMs = 24 * 60 * 60 * 1000;
  const floorDay = (t: Date) =>
    Math.floor(t.getTime() / dayMs);
  const diff = floorDay(now) - floorDay(date);
  if (diff <= 0) return "hoy";
  if (diff === 1) return "ayer";
  return `hace ${diff}d`;
}
