// ─── OnboardingCelebration ──────────────────────────────────────────────────
// The "you did it!" moment after a teacher saves their very first warmup during
// guided onboarding. Full-screen, Cleo + dependency-free CSS confetti + two
// CTAs (run it live now / view the class). Honors prefers-reduced-motion (the
// confetti simply doesn't render). Same warm card-on-bgSoft language as
// TeacherWelcome.
import { useMemo } from "react";
import Cleo from "./Cleo";
import { C } from "./tokens";
import { CIcon } from "./Icons";
import { useT } from "../i18n";

const CONFETTI_COLORS = [C.accent, C.purple, C.pink, C.yellow, C.green, C.orange];

const css = `
  @keyframes oc-pop { 0% { opacity:0; transform:scale(.7) } 60% { transform:scale(1.06) } 100% { opacity:1; transform:scale(1) } }
  @keyframes oc-fall {
    0%   { opacity:0; transform:translateY(-12vh) rotate(0deg) }
    10%  { opacity:1 }
    100% { opacity:.9; transform:translateY(108vh) rotate(720deg) }
  }
  @keyframes oc-bob { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-6px) } }
  .ocb-card { animation: oc-pop .45s cubic-bezier(.16,1,.3,1) both }
  .ocb-cleo { animation: oc-bob 3s ease-in-out infinite }
  .ocb-piece { position:absolute; top:-12vh; will-change:transform; animation: oc-fall linear infinite; }
  .ocb-cta { transition: transform .15s, box-shadow .15s }
  .ocb-cta:hover { transform: translateY(-1px); box-shadow: 0 8px 22px rgba(35,131,226,0.28) }
  @media (prefers-reduced-motion: reduce) {
    .ocb-card, .ocb-cleo { animation: none !important }
    .ocb-confetti { display: none !important }
  }
`;

export default function OnboardingCelebration({ lang = "en", onStartSession, onViewClass }) {
  const t = useT("onboarding", lang);

  // 26 confetti pieces with varied lane / size / color / timing. Computed once
  // per mount (client-only screen, so Math.random is fine — no hydration).
  const pieces = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => {
        const size = 7 + Math.round(Math.random() * 8);
        return {
          left: Math.round(Math.random() * 100),
          size,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          delay: (Math.random() * 2.2).toFixed(2),
          duration: (2.6 + Math.random() * 2).toFixed(2),
          radius: Math.random() > 0.5 ? "50%" : "2px",
        };
      }),
    []
  );

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200, overflow: "hidden",
      background: C.bgSoft,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "'Outfit', sans-serif",
    }}>
      <style>{css}</style>

      {/* Confetti layer */}
      <div className="ocb-confetti" aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {pieces.map((p, i) => (
          <span
            key={i}
            className="ocb-piece"
            style={{
              left: `${p.left}%`,
              width: p.size, height: p.size,
              background: p.color, borderRadius: p.radius,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
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
