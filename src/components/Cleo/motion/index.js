// ─── Cleo motion — public API ───────────────────────────────────────────────
// The motion library for the Cleo mascot, built on motion/react:
//   • MOOD_GESTURES   — per-mood gesture map (./gestures)
//   • GESTURE_VARIANTS — the motion keyframe data each gesture plays (./variants)
//   • useCleoMotion   — the controller hook (blink, micro-life, pop) (./useCleoMotion)
// The idle "life" data lives in ./idle and is consumed by the hook.

export { MOOD_GESTURES } from "./gestures";
export { GESTURE_VARIANTS } from "./variants";
export { useCleoMotion } from "./useCleoMotion";
