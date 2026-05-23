// ─── Cleo — extras ──────────────────────────────────────────────────────────
// Small mood decorations: a tear, a sweat drop, sparkles, thought dots. Only the
// thought dots take motion — when `gesture` is supplied (thinking + animate) the
// three dots rise and fade in sequence (staggered delay) so Cleo reads as
// actively pondering. Everything else is static.

import { OUTLINE, ARM } from "./constants";

function Sparkle({ x, y, s = 1 }) {
  return (
    <path
      d={`M${x} ${y - 5 * s} L${x + 1.4 * s} ${y - 1.4 * s} L${x + 5 * s} ${y} L${x + 1.4 * s} ${y + 1.4 * s} L${x} ${y + 5 * s} L${x - 1.4 * s} ${y + 1.4 * s} L${x - 5 * s} ${y} L${x - 1.4 * s} ${y - 1.4 * s} Z`}
      fill="#FFD968"
      stroke="#F4B53C"
      strokeWidth="0.8"
      strokeLinejoin="round"
    />
  );
}

export function Extras({ variant, gesture }) {
  switch (variant) {
    case "tear":
      return <path d="M63.5 60 Q66.5 64.5 63.5 67 Q60.5 64.5 63.5 60 Z" fill="#8FD0F5" stroke={ARM} strokeWidth="1.4" />;
    case "sweat":
      return <path d="M72 39 Q75 43.5 72 46 Q69 43.5 72 39 Z" fill="#8FD0F5" stroke={ARM} strokeWidth="1.4" />;
    case "sparkles":
      return (
        <>
          <Sparkle x={20} y={34} s={1} />
          <Sparkle x={82} y={40} s={0.8} />
        </>
      );
    case "thoughtDots": {
      const dot = (cx, cy, r, delay) => (
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={OUTLINE}
          opacity="0.85"
          className={gesture || undefined}
          style={gesture ? { animationDelay: `${delay}s` } : undefined}
        />
      );
      return (
        <>
          {dot(74, 42, 2, 0)}
          {dot(80, 35, 2.6, 0.18)}
          {dot(87, 29, 3.2, 0.36)}
        </>
      );
    }
    default:
      return null;
  }
}
