// ─── Skeleton ──────────────────────────────────────────────────────────────
// Shimmer placeholder for loading states — replaces the bare "Loading…" text
// so screens fill gracefully instead of blinking empty then popping content.
// The shimmer animation lives in .ui-skeleton (src/index.css) and is disabled
// under prefers-reduced-motion.
//
//   <Skeleton width={200} height={16} />
//   <Skeleton height={150} radius={14} />          // a card-shaped block
//   <Skeleton circle width={40} height={40} />     // avatar placeholder
//
// SkeletonText renders N stacked lines (the last one shorter) for paragraphs.

import { R } from "../tokens";

export default function Skeleton({
  width = "100%",
  height = 14,
  radius = R.sm,
  circle = false,
  className = "",
  style,
}) {
  return (
    <div
      className={["ui-skeleton", className].filter(Boolean).join(" ")}
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius: circle ? "50%" : radius,
        ...style,
      }}
    />
  );
}

export function SkeletonText({ lines = 3, gap = 8, lineHeight = 12, style }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap, ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={lineHeight} width={i === lines - 1 ? "60%" : "100%"} />
      ))}
    </div>
  );
}
