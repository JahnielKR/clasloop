// ─── OnboardingCelebration ──────────────────────────────────────────────────
// The "you did it!" moment after a teacher saves their very first warmup during
// guided onboarding. Full-screen, Cleo + two party poppers (striped cones) at
// the bottom corners that fire ONCE on mount — confetti + streamers burst out,
// arc, and fall away. No looping background. Honors prefers-reduced-motion (the
// poppers render as static cones, no burst). Same warm card-on-bgSoft language
// as TeacherWelcome.
import { useId, useMemo } from "react";
import Cleo from "./Cleo";
import { C } from "./tokens";
import { CIcon } from "./Icons";
import { useT } from "../i18n";

const CONFETTI = ["#2383e2", "#8b5cf6", "#ec4899", "#f6c846", "#34c759", "#ff9500"];
const STREAMERS = ["#E6B800", "#2BB3C0", "#5BC236", "#E8423A"];

function prefersReduced() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

const css = `
  @keyframes oc-pop { 0% { opacity:0; transform:scale(.7) } 60% { transform:scale(1.06) } 100% { opacity:1; transform:scale(1) } }
  @keyframes oc-bob { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-6px) } }
  /* One-shot popper burst: launch from the cone mouth, arc to a peak, fall away. */
  @keyframes ocb-burst {
    0%   { opacity:0; transform: translate(0,0) rotate(0deg) scale(.5); }
    8%   { opacity:1; transform: translate(0,0) rotate(0deg) scale(1); }
    55%  { opacity:1; transform: translate(var(--px), var(--py)) rotate(var(--pr)); }
    100% { opacity:0; transform: translate(var(--fx), var(--fy)) rotate(var(--fr)); }
  }
  .ocb-card { animation: oc-pop .45s cubic-bezier(.16,1,.3,1) both }
  .ocb-cleo { animation: oc-bob 3s ease-in-out infinite }
  .ocb-cta { transition: transform .15s, box-shadow .15s }
  .ocb-cta:hover { transform: translateY(-1px); box-shadow: 0 8px 22px rgba(35,131,226,0.28) }
  .ocb-piece {
    position:absolute; left:0; top:0; will-change:transform;
    animation-name: ocb-burst; animation-timing-function: cubic-bezier(.25,.7,.4,1);
    animation-iteration-count: 1; animation-fill-mode: forwards;
  }
  @media (prefers-reduced-motion: reduce) {
    .ocb-card, .ocb-cleo { animation: none !important }
  }
`;

// One popper's worth of particles, launched up-and-to-the-right (the right-side
// popper is mirrored with scaleX(-1), so the same data fires up-and-left there).
function makeParticles() {
  return Array.from({ length: 22 }, (_, i) => {
    const streamer = i % 6 === 0;
    const ang = ((-18 - Math.random() * 64) * Math.PI) / 180; // -18°..-82° (up-right)
    const dist = 110 + Math.random() * 170;
    const px = Math.cos(ang) * dist;
    const py = Math.sin(ang) * dist; // negative = up
    return {
      streamer,
      color: streamer ? STREAMERS[i % STREAMERS.length] : CONFETTI[i % CONFETTI.length],
      px: px.toFixed(1),
      py: py.toFixed(1),
      fx: (px + 15 + Math.random() * 50).toFixed(1),
      fy: (py + 150 + Math.random() * 220).toFixed(1), // falls well below the peak
      pr: Math.round(Math.random() * 240 - 120),
      fr: Math.round(Math.random() * 720 - 360),
      w: streamer ? 5 : 7 + Math.random() * 6,
      h: streamer ? 16 + Math.random() * 16 : 7 + Math.random() * 6,
      radius: streamer ? "3px" : "50%",
      delay: (Math.random() * 0.1).toFixed(2),
      dur: (1.3 + Math.random() * 0.9).toFixed(2),
    };
  });
}

function Popper({ side, reduced }) {
  const sid = useId().replace(/[:]/g, "");
  const particles = useMemo(() => (reduced ? [] : makeParticles()), [reduced]);
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        bottom: 6,
        [side === "right" ? "right" : "left"]: 6,
        width: 130,
        height: 130,
        transform: side === "right" ? "scaleX(-1)" : undefined,
        transformOrigin: "bottom",
        pointerEvents: "none",
      }}
    >
      {/* Striped cone (red + yellow), tip at the outer-bottom corner. */}
      <svg viewBox="0 0 120 120" width="120" height="120" style={{ position: "absolute", left: 0, top: 0 }}>
        <defs>
          <pattern id={`stripe${sid}`} width="15" height="15" patternUnits="userSpaceOnUse" patternTransform="rotate(52)">
            <rect width="15" height="15" fill="#E8423A" />
            <rect width="7.5" height="15" fill="#F6C846" />
          </pattern>
        </defs>
        <path d="M12,106 L64,42 L96,68 Z" fill={`url(#stripe${sid})`} stroke="#B5302A" strokeWidth="2.5" strokeLinejoin="round" />
        <ellipse cx="80" cy="55" rx="6.5" ry="18" transform="rotate(39 80 55)" fill="#5E1712" opacity="0.92" />
      </svg>
      {/* Burst origin = the cone mouth (~80,55 in the svg above). */}
      <div style={{ position: "absolute", left: 80, top: 55 }}>
        {particles.map((p, i) => (
          <span
            key={i}
            className="ocb-piece"
            style={{
              width: p.w,
              height: p.h,
              background: p.color,
              borderRadius: p.radius,
              "--px": `${p.px}px`,
              "--py": `${p.py}px`,
              "--fx": `${p.fx}px`,
              "--fy": `${p.fy}px`,
              "--pr": `${p.pr}deg`,
              "--fr": `${p.fr}deg`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function OnboardingCelebration({ lang = "en", onStartSession, onViewClass }) {
  const t = useT("onboarding", lang);
  const reduced = prefersReduced();

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200, overflow: "hidden",
      background: C.bgSoft,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "'Outfit', sans-serif",
    }}>
      <style>{css}</style>

      {/* Two party poppers firing once from the bottom corners. */}
      <Popper side="left" reduced={reduced} />
      <Popper side="right" reduced={reduced} />

      <div className="ocb-card" style={{
        position: "relative", zIndex: 1,
        background: C.bg, borderRadius: 20, border: `1px solid ${C.border}`,
        padding: "56px 34px 34px", maxWidth: 460, width: "100%",
        boxShadow: "0 14px 44px rgba(0,0,0,0.10)", textAlign: "center",
      }}>
        <div className="ocb-cleo" aria-hidden="true" style={{ position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)" }}>
          <Cleo size={88} />
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 700, color: C.text, margin: "0 0 8px", letterSpacing: "-0.01em" }}>
          {t.celebrateTitle}
        </h1>
        <p style={{ fontSize: 15, color: C.textSecondary, lineHeight: 1.5, margin: "0 auto 28px", maxWidth: 380 }}>
          {t.celebrateBody}
        </p>

        <button
          className="ocb-cta"
          onClick={() => onStartSession?.()}
          style={{
            width: "100%", padding: "14px", borderRadius: 12,
            fontSize: 15.5, fontWeight: 600,
            background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
            color: "#fff", border: "none", cursor: "pointer",
            fontFamily: "'Outfit', sans-serif",
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <CIcon name="rocket" inline size={17} /> {t.celebrateStartSession}
        </button>
        <button
          onClick={() => onViewClass?.()}
          style={{
            width: "100%", padding: "11px", marginTop: 10,
            borderRadius: 10, fontSize: 13.5, fontWeight: 500,
            background: "transparent", color: C.textMuted,
            border: "none", cursor: "pointer", fontFamily: "'Outfit', sans-serif",
          }}
        >
          {t.celebrateViewClass}
        </button>
      </div>
    </div>
  );
}
