// ─── Cleo — sleep marks ─────────────────────────────────────────────────────
// The little "z z Z" that float above Cleo's head while she's asleep. Three
// stylized Z glyphs, staggered up-and-to-the-right of her head and growing as
// they rise. They render at opacity 0 and are animated (rise + fade loop)
// imperatively from the data-cleo="zzz" group in ../index.jsx — same idea as the
// other marks: the glyphs are plain SVG, the motion lives in the controller. So
// when not asleep (and when not live) they're simply invisible and inert.

import { OUTLINE } from "./constants";

// One "Z" centered at (cx,cy); `s` scales it. Three strokes: top, diagonal, bottom.
function Z({ cx, cy, s = 1 }) {
  const w = 3 * s;
  const h = 3.4 * s;
  return (
    <path
      d={`M${cx - w} ${cy - h} L${cx + w} ${cy - h} L${cx - w} ${cy + h} L${cx + w} ${cy + h}`}
      fill="none"
      stroke={OUTLINE}
      strokeWidth={1.5 * s}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export function SleepMarks() {
  return (
    <>
      <Z cx={67} cy={40} s={0.7} />
      <Z cx={74} cy={32} s={0.95} />
      <Z cx={82} cy={23} s={1.25} />
    </>
  );
}
