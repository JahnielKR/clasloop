// ─── Motion tokens ───────────────────────────────────────────────────────
// One vocabulary for durations + easings so transitions feel uniform across
// the app (today each page picks its own ms/easing ad-hoc). Compose into
// `transition` strings: `transition: \`transform ${MOTION.fast} ${MOTION.easeOut}\``.
//
// Always pair motion with a prefers-reduced-motion guard at the component
// level — these tokens describe the "on" state only.

export const MOTION = {
  // Durations
  fast: "120ms",   // hovers, taps, small state flips
  base: "180ms",   // most transitions
  slow: "300ms",   // entrances, layout shifts

  // Easings
  ease: "ease",
  easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",         // smooth deceleration (entrances)
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",      // playful overshoot (pops/celebration)
};
