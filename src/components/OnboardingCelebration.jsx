// ─── OnboardingCelebration ──────────────────────────────────────────────────
// The "you did it!" moment after a teacher saves their very first warmup during
// guided onboarding. Full-screen Cleo card with a ONE-SHOT confetti shower:
// thin ribbon strips fall over the modal once and then they're gone (no looping
// background). Honors prefers-reduced-motion (no falling strips). Same warm
// card-on-bgSoft language as TeacherWelcome.
import { useMemo } from "react";
import Cleo from "./Cleo";
import { C } from "./tokens";
import { CIcon } from "./Icons";
import { useT } from "../i18n";

const CONFETTI = ["#2383e2", "#8b5cf6", "#ec4899", "#f6c846", "#34c759", "#ff9500", "#E6B800", "#2BB3C0"];

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
  /* One-shot ribbon fall: drop in from above, sway + spin, exit past the bottom. */
  @keyframes ocb-fall {
    0%   { opacity:0; transform: translateY(-16vh) translateX(0) rotate(0deg); }
    7%   { opacity:1; }
    88%  { opacity:1; }
    100% { opacity:0; transform: translateY(112vh) translateX(var(--sway)) rotate(var(--spin)); }
  }
  .ocb-card { animation: oc-pop .45s cubic-bezier(.16,1,.3,1) both }
  .ocb-cleo { animation: oc-bob 3s ease-in-out infinite }
  .ocb-cta { transition: transform .15s, box-shadow .15s }
  .ocb-cta:hover { transform: translateY(-1px); box-shadow: 0 8px 22px rgba(35,131,226,0.28) }
  .ocb-strip {
    position:absolute; top:0; will-change:transform;
    animation-name: ocb-fall; animation-timing-function: cubic-bezier(.3,.25,.5,1);
    animation-iteration-count: 1; animation-fill-mode: forwards;
  }
  @media (prefers-reduced-motion: reduce) {
    .ocb-card, .ocb-cleo { animation: none !important }
  }
`;

// Ribbon strips that fall once. Computed per mount (client-only screen).
function makeStrips() {
  return Array.from({ length: 46 }, (_, i) => ({
    left: (Math.random() * 98).toFixed(1),
    w: 4 + Math.random() * 4,
    h: 14 + Math.random() * 14,
    color: CONFETTI[i % CONFETTI.length],
    sway: Math.round(Math.random() * 140 - 70),
    spin: Math.round(Math.random() * 720 + 360) * (Math.random() > 0.5 ? 1 : -1),
    delay: (Math.random() * 0.7).toFixed(2),
    dur: (2.2 + Math.random() * 1.5).toFixed(2),
  }));
}

export default function OnboardingCelebration({ lang = "en", onStartSession, onViewClass }) {
  const t = useT("onboarding", lang);
  const strips = useMemo(() => (prefersReduced() ? [] : makeStrips()), []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200, overflow: "hidden",
      background: C.bgSoft,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "'Outfit', sans-serif",
    }}>
      <style>{css}</style>

      {/* One-shot confetti shower (thin ribbons) raining over the modal. */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        {strips.map((s, i) => (
          <span
            key={i}
            className="ocb-strip"
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
