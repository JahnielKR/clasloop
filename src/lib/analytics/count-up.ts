// ─── src/lib/analytics/count-up.ts ─────────────────────────────────────
// Easing puro + sampler para el count-up de los KPIs. Sin React, sin
// Supabase, sin rAF (el componente AnimatedNumber maneja el rAF y llama
// a sampleCountUp en cada frame). Testeable sin DOM.

/** Ease-out cubic, clamp a [0,1]. f(0)=0, f(1)=1, front-loaded. */
export function easeOutCubic(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const u = 1 - t;
  return 1 - u * u * u;
}

/**
 * Valor interpolado del count-up en el instante `elapsed` (ms) de una
 * animación de `from` → `to` que dura `duration` ms. elapsed<=0 → from;
 * elapsed>=duration (o duration 0) → to. Usa easeOutCubic sobre el tiempo.
 */
export function sampleCountUp(
  from: number,
  to: number,
  elapsed: number,
  duration: number,
): number {
  if (duration <= 0 || elapsed >= duration) return to;
  if (elapsed <= 0) return from;
  const eased = easeOutCubic(elapsed / duration);
  return from + (to - from) * eased;
}
