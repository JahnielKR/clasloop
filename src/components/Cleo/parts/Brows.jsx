// ─── Cleo — brows (none on the default happy face) ──────────────────────────
import { OUTLINE } from "./constants";

export function Brows({ variant }) {
  if (!variant) return null;
  const s = { fill: "none", stroke: OUTLINE, strokeWidth: 2.4, strokeLinecap: "round" };
  switch (variant) {
    case "worried": // inner ends up (sad)
      return (
        <>
          <path d="M34 48 Q39 45.5 44 47.5" {...s} />
          <path d="M56 47.5 Q61 45.5 66 48" {...s} />
        </>
      );
    case "angry": // inner ends down, a V (annoyed)
      return (
        <>
          <path d="M34 45.5 L44 49" {...s} />
          <path d="M56 49 L66 45.5" {...s} />
        </>
      );
    case "raised": // both high + arched (surprised)
      return (
        <>
          <path d="M35 45 Q40 42.5 45 45" {...s} />
          <path d="M55 45 Q60 42.5 65 45" {...s} />
        </>
      );
    case "oneRaised": // right brow up, curious (thinking)
      return (
        <>
          <path d="M35 48 Q40 47 44 48" {...s} />
          <path d="M55 46 Q60 43.5 66 46.5" {...s} />
        </>
      );
    default:
      return null;
  }
}
