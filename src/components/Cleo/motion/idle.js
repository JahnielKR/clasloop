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

// ─── Cleo motion — idle "easter-eggs" (opt-in) ──────────────────────────────
// A longer-horizon layer on top of the always-on life above: after a stretch of
// USER inactivity Cleo escalates through stages (see ../../hooks/useUserIdle):
//   active  → normal life (breath + blink + micro)
//   playful → she occasionally plays with her bow (IDLE_ACTS)
//   asleep  → eyes shut, slow deep breathing, floating "Z"s, until activity wakes her
// Only the persistent chat FAB opts in (Cleo idle="playful"); every other Cleo
// stays "calm" and byte-identical. All of it is still gated by `live`.

// Inactivity thresholds (ms). CleoChat passes these to useUserIdle.
export const IDLE_TIMING = { playful: 20000, asleep: 60000 };

// Easter-egg acts for the "playful" stage. Same spirit as MICRO but each act can
// drive several disjoint groups at once via `tracks` (so the bow bounces WHILE
// the eyes glance up at it). `weight` biases the random pick. NB: "play with the
// bow" is read by animating the BOW + an eyes-up glance — never an arm reaching
// up to it (a one-segment arm can't reach the head without looking impossible).
export const IDLE_ACTS = [
  {
    id: "playBow",
    weight: 1,
    tracks: [
      // The bow wiggles/bounces well past its gentle idle wobble, then settles.
      { target: "ribbon", keyframes: { rotate: [0, -11, 9, -6, 3, 0], y: [0, -1.6, 0, -1, 0] }, transition: { duration: 1.7, ease: "easeInOut" } },
      // Eyes drift up toward the bow and back.
      { target: "look", keyframes: { y: [0, -2.4, -2.4, 0] }, transition: { duration: 1.7, times: [0, 0.22, 0.72, 1], ease: "easeInOut" } },
    ],
  },
];

// Gap between easter-egg acts (ms) — rarer/more special than MICRO_GAP.
export const IDLE_GAP = { min: 6000, max: 12000 };

// Sleep: a slower, deeper breath that replaces BREATH while asleep (declarative,
// swapped on the Breath group in ../index.jsx), plus the floating "Z" loop driven
// imperatively on the data-cleo="zzz" group, and how shut the lids sit.
export const SLEEP_BREATH = { scale: [1, 1.035, 1], y: [0, -1.4, 0] };
export const SLEEP_BREATH_TRANSITION = { duration: 7, repeat: Infinity, ease: "easeInOut" };
export const SLEEP_LIDS = 0.08; // lids scaleY when shut (≈ a closed line)
export const SLEEP_ZZZ = { opacity: [0, 0.9, 0.9, 0], y: [0, -7, -12, -16], scale: [0.6, 1, 1, 1.15] };
export const SLEEP_ZZZ_TRANSITION = { duration: 3.4, repeat: Infinity, ease: "easeOut" };
