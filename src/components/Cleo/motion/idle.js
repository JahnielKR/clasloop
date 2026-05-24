// ─── Cleo motion — idle "life" ──────────────────────────────────────────────
// The layer that makes Cleo feel alive beyond her per-mood gesture. Three parts,
// all data here, all driven by ./useCleoMotion.js:
//   • BREATH  — a continuous, gentle breathing applied to the whole body group.
//   • BLINK   — natural blink with *randomized* spacing (never metronomic).
//   • MICRO   — occasional one-shot micro-behaviours (a glance, a small lean),
//               picked at weighted random on a randomized gap, layered on top of
//               whatever the mood is doing. Targets are disjoint sub-groups
//               (data-cleo="…") so they never fight the breathing or the gesture.
// Keeping the timings random + layered is what reads as "alive" rather than a
// single move on a fixed timer.

// Continuous breathing — declarative loop on the body group.
export const BREATH = { scale: [1, 1.018, 1], y: [0, -0.6, 0] };
export const BREATH_TRANSITION = { duration: 4.2, repeat: Infinity, ease: "easeInOut" };

// Blink: a quick lid close/open, fired on a random delay in [min,max] ms.
export const BLINK = { min: 2800, max: 6500, duration: 0.16 };

// One-shot micro-behaviours. `target` is a data-cleo group; `keyframes`/`transition`
// are passed straight to motion's animate(). `weight` biases the random pick.
export const MICRO = [
  { id: "glanceR", target: "look", weight: 3, keyframes: { x: [0, 1.5, 1.5, 0] }, transition: { duration: 1.1, times: [0, 0.16, 0.74, 1], ease: "easeInOut" } },
  { id: "glanceL", target: "look", weight: 3, keyframes: { x: [0, -1.5, -1.5, 0] }, transition: { duration: 1.1, times: [0, 0.16, 0.74, 1], ease: "easeInOut" } },
  { id: "lookUp", target: "look", weight: 1, keyframes: { y: [0, -1.4, -1.4, 0] }, transition: { duration: 1.2, times: [0, 0.18, 0.7, 1], ease: "easeInOut" } },
  { id: "leanR", target: "lean", weight: 2, keyframes: { rotate: [0, 2.6, 0] }, transition: { duration: 1.5, ease: "easeInOut" } },
  { id: "leanL", target: "lean", weight: 2, keyframes: { rotate: [0, -2.6, 0] }, transition: { duration: 1.5, ease: "easeInOut" } },
  { id: "doubleBlink", target: "blink", weight: 1, keyframes: { scaleY: [1, 0.12, 1, 0.12, 1] }, transition: { duration: 0.5, times: [0, 0.14, 0.4, 0.54, 1], ease: "easeInOut" } },
];

// Gap between micro-behaviours (ms), randomized so it never looks scheduled.
export const MICRO_GAP = { min: 4200, max: 9000 };
