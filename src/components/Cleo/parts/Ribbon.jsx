// ─── Cleo — ribbon ──────────────────────────────────────────────────────────
// Cleo's signature accessory: a gold hair bow that sits on top of her head and
// reads clearly as "a girl" (it replaces the old 3-point crown). Two loops + a
// center knot + a couple of specular highlights, reusing the shared gold gradient
// (passed as `gradId`) so the palette stays consistent.
//
// When `live`, the whole bow does a gentle wobble and a soft gleam sweeps across
// it now and then (motion/react). When not live it renders as a plain, static <g>.

import { motion } from "motion/react";

// Loop + knot geometry, in Cleo's 100×100 viewBox. The bow sits above the body
// top (y≈34) so it stays visible (index.jsx draws it before the body).
const LOOP_L = "M50 27 C 41 19, 31 21, 33 28 C 31 34, 43 33, 50 27 Z";
const LOOP_R = "M50 27 C 59 19, 69 21, 67 28 C 69 34, 57 33, 50 27 Z";

const WOBBLE = { rotate: [-2, 2, -2] };
const WOBBLE_TRANSITION = { duration: 3.4, repeat: Infinity, ease: "easeInOut" };
// Occasional shine — a quick sweep, then a long rest, so it feels special.
const GLEAM = { x: [30, 70], opacity: [0, 0.5, 0] };
const GLEAM_TRANSITION = { duration: 1.1, repeat: Infinity, repeatDelay: 5.5, ease: "easeInOut" };

export function Ribbon({ live, gradId }) {
  const fill = `url(#${gradId})`;
  const stroke = { stroke: "#20425E", strokeWidth: 2.2, strokeLinejoin: "round" };
  const shape = (
    <>
      <path d={LOOP_L} fill={fill} {...stroke} />
      <path d={LOOP_R} fill={fill} {...stroke} />
      <ellipse cx="50" cy="27.5" rx="3.6" ry="4" fill={fill} {...stroke} />
      <ellipse cx="40" cy="25" rx="2.4" ry="1.3" fill="#FFE8A3" opacity="0.9" />
      <ellipse cx="60" cy="25" rx="2.4" ry="1.3" fill="#FFE8A3" opacity="0.9" />
    </>
  );

  if (!live) return <g>{shape}</g>;

  const clipId = `${gradId}-clip`;
  return (
    <motion.g animate={WOBBLE} transition={WOBBLE_TRANSITION} style={{ transformBox: "view-box", transformOrigin: "50px 27.5px" }}>
      {shape}
      <defs>
        <clipPath id={clipId}>
          <path d={LOOP_L} />
          <path d={LOOP_R} />
          <ellipse cx="50" cy="27.5" rx="3.6" ry="4" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <motion.g animate={GLEAM} transition={GLEAM_TRANSITION} style={{ opacity: 0 }}>
          <rect x="0" y="16" width="5.5" height="24" fill="#FFFFFF" transform="skewX(-16)" />
        </motion.g>
      </g>
    </motion.g>
  );
}
