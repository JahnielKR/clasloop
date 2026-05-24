// ─── Confetti ────────────────────────────────────────────────────────────────
// One-shot ribbon-strip confetti shower for celebration moments (e.g. a good
// quiz result). Thin strips fall once, sway + spin, then they're gone — no
// looping background. Fixed full-screen overlay, pointer-events:none. Honors
// prefers-reduced-motion (renders nothing). Same ribbon language as the
// onboarding celebration so the brand's "you did it" moment feels consistent.
import { useMemo } from "react";

const COLORS = ["#2383e2", "#8b5cf6", "#ec4899", "#f6c846", "#34c759", "#ff9500", "#E6B800", "#2BB3C0"];

function prefersReduced() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

const css = `
  @keyframes cft-fall {
    0%   { opacity:0; transform: translateY(-16vh) translateX(0) rotate(0deg); }
    7%   { opacity:1; }
    88%  { opacity:1; }
    100% { opacity:0; transform: translateY(112vh) translateX(var(--sway)) rotate(var(--spin)); }
  }
  .cft-strip {
    position:absolute; top:0; will-change:transform;
    animation-name: cft-fall; animation-timing-function: cubic-bezier(.3,.25,.5,1);
    /* fill-mode both: the stagger delay backfills the 0% state (hidden, above
       the viewport) instead of leaving the strip parked, visible, at the top. */
    animation-iteration-count: 1; animation-fill-mode: both;
  }
`;

function makeStrips(count) {
  return Array.from({ length: count }, (_, i) => ({
    left: (Math.random() * 98).toFixed(1),
    w: 4 + Math.random() * 4,
    h: 14 + Math.random() * 14,
    color: COLORS[i % COLORS.length],
    sway: Math.round(Math.random() * 140 - 70),
    spin: Math.round(Math.random() * 720 + 360) * (Math.random() > 0.5 ? 1 : -1),
    delay: (Math.random() * 0.7).toFixed(2),
    dur: (2.2 + Math.random() * 1.5).toFixed(2),
  }));
}

export default function Confetti({ count = 46, zIndex = 50 }) {
  const strips = useMemo(() => (prefersReduced() ? [] : makeStrips(count)), [count]);
  if (!strips.length) return null;
  return (
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex, overflow: "hidden" }}>
      <style>{css}</style>
      {strips.map((s, i) => (
        <span
          key={i}
          className="cft-strip"
          style={{
            left: `${s.left}%`,
            width: s.w, height: s.h,
            background: s.color, borderRadius: 2,
            "--sway": `${s.sway}px`,
            "--spin": `${s.spin}deg`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.dur}s`,
          }}
        />
      ))}
    </div>
  );
}
