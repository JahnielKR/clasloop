// ─── Cleo motion — stylesheet builder ───────────────────────────────────────
// Assembles the full <style> text that ../index.jsx injects per instance when
// `animate` is on. Two layers:
//   • per-instance, uid-scoped: the auto-blink (eyes) and the one-shot "pop" on
//     expression change — unchanged from the original inline version.
//   • shared, stable-named: the idle limb gestures (see ./keyframes.js).
// One prefers-reduced-motion guard silences everything; the face still changes,
// only the motion stops.

import { MOTION } from "../../tokens";
import { GESTURE_CSS, GESTURE_CLASSES } from "./keyframes";

export function buildCleoCSS(uid) {
  const reducedTargets = [`.cleo-eyes-${uid}`, `.cleo-pop-${uid}`, ...GESTURE_CLASSES.map((c) => `.${c}`)].join(",");
  return `
    @keyframes cleo-blink-${uid}{0%,90%,100%{transform:scaleY(1)}95%{transform:scaleY(.12)}}
    @keyframes cleo-pop-${uid}{0%{transform:scale(1)}42%{transform:scale(1.05)}100%{transform:scale(1)}}
    .cleo-eyes-${uid}{transform-box:fill-box;transform-origin:center;animation:cleo-blink-${uid} 5.4s infinite}
    .cleo-pop-${uid}{transform-box:fill-box;transform-origin:center;animation:cleo-pop-${uid} .46s ${MOTION.spring}}
    ${GESTURE_CSS}
    @media (prefers-reduced-motion:reduce){${reducedTargets}{animation:none!important}}
  `;
}
