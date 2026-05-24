// ─── Cleo — mouth ───────────────────────────────────────────────────────────
// Only the surprised "o" takes motion: when `live` and a gesture variant is given
// (mouthGasp), the mouth opens/closes in sync with the gasp via motion/react.
// Everything else is static.

import { motion } from "motion/react";
import { GESTURE_VARIANTS } from "../motion/variants";
import { OUTLINE } from "./constants";

export function Mouth({ variant, gesture, live }) {
  const s = { fill: "none", stroke: OUTLINE, strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (variant) {
    case "openSmile": // big grin + tongue (cheer)
      return (
        <>
          <path d="M43 66 Q50 79 57 66 Z" fill={OUTLINE} />
          <path d="M46.5 72.5 Q50 75 53.5 72.5" fill="#FF8FB3" stroke="none" />
        </>
      );
    case "frown": // gentle downturn (sad)
      return <path d="M44 71.5 Q50 66.5 56 71.5" {...s} />;
    case "flat": // small pursed pout (annoyed)
      return <path d="M45 69 Q50 70.5 55 68.8" {...s} />;
    case "o": { // open O (surprised) — opens in sync with the gasp when live
      const v = live && gesture ? GESTURE_VARIANTS[gesture] : null;
      if (!v) return <ellipse cx="50" cy="70" rx="3.8" ry="4.8" fill={OUTLINE} />;
      return (
        <motion.ellipse
          cx="50" cy="70" rx="3.8" ry="4.8" fill={OUTLINE}
          animate={v.animate}
          transition={v.transition}
          style={{ transformBox: "view-box", transformOrigin: "50px 70px" }}
        />
      );
    }
    case "hmm": // small asymmetric line (thinking)
      return <path d="M46 69.5 Q50 68.2 54 70" {...s} />;
    case "grin": // confident smile (encouraging)
      return <path d="M43 67 Q50 74.5 57 67.5" {...s} strokeWidth="2.6" />;
    case "w": // the signature "w" (happy / default)
    default:
      return <path d="M44 67 Q47 71.5 50 68 Q53 71.5 56 67" {...s} />;
  }
}
