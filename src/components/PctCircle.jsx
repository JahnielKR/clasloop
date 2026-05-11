// ─── PctCircle ──────────────────────────────────────────────────────────
//
// Percentage circle for the session insight bar. SVG-based.
// Two sizes (sm for inline, lg for block headers).
// Two color levels: danger if pct >= 50, warn otherwise (30-49).
// Below 30% never renders (the candidate logic filters those out).

import { C } from "./tokens";

const RADIUS = 15;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 94.2

export default function PctCircle({ pct, size = "sm" }) {
  const isDanger = pct >= 50;
  const dimension = size === "sm" ? 38 : 48;
  const fontSize = size === "sm" ? 11 : 13;
  const offset = CIRCUMFERENCE * (1 - pct / 100);
  const color = isDanger ? C.red : C.orange;

  return (
    <span style={{
      position: "relative",
      display: "inline-grid",
      placeItems: "center",
      width: dimension,
      height: dimension,
      flexShrink: 0,
      verticalAlign: "middle",
    }}>
      <svg
        viewBox="0 0 36 36"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          transform: "rotate(-90deg)",
        }}
      >
        {/* Track */}
        <circle
          cx="18" cy="18" r={RADIUS}
          fill="none"
          stroke={C.bgSoft}
          strokeWidth="4"
        />
        {/* Filled arc */}
        <circle
          cx="18" cy="18" r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <span style={{
        position: "relative",
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 700,
        fontSize,
        color,
        zIndex: 1,
      }}>
        {pct}%
      </span>
    </span>
  );
}
