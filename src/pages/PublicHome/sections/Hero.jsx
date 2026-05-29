import { useRef, useEffect, useState } from "react";
import { C } from "../../../components/tokens";
// Real in-app section theming (the same module the student quiz uses) so the
// verified warmup / exit-ticket cards the machine produces look exactly like the
// product. forceDark=false → light values (the landing is always light).
import { getSectionTheme, getSectionLabel } from "../../../lib/section-theme";
import { useTilt } from "../landing-motion";
import TickingSeconds from "./TickingSeconds";

// ─── Hero ────────────────────────────────────────────────────────────────────
// The first impression. The centerpiece is a live "60-second machine": input
// files / a topic flow LEFT → a glowing AI core verifies in the MIDDLE →
// finished, verified question cards land on the RIGHT. It assembles itself on
// load (the parts fly in) and then breathes in a continuous loop — light packets
// travel the wires, the core ring spins + pings, a verify-shimmer sweeps the
// cards. Visitors literally watch the product's promise build itself.
//
// Everything is pure HTML/CSS/SVG (no screenshots, no image weight). All motion
// collapses to a clean, readable static "before → after" snapshot under
// prefers-reduced-motion (see the machine block + reduced-motion block in
// landing-css.js).

// Section glyphs — mirror SectionBadge.jsx (☀ warmup, ⤓ exit ticket).
const SECTION_GLYPH = { warmup: "☀", exit_ticket: "⤓" };

const txt = (v, lang) => (typeof v === "string" ? v : v[lang] || v.en);

// Inputs that feed the machine (left column).
const INPUTS = [
  { type: "PDF", color: "#D85A30", name: "chapter5.pdf" },
  { type: "PPT", color: "#BA7517", name: "lesson.pptx" },
  { type: "Aa", color: "#5A5A5A", name: { en: "a topic", es: "un tema", ko: "주제" } },
];

// Verified questions the machine produces (right column). Themed per section so
// they read as the real product output.
const OUTPUTS = [
  {
    section: "warmup",
    typeTag: { en: "MCQ", es: "MCQ", ko: "객관식" },
    text: { en: "Which organelle powers the cell?", es: "¿Qué orgánulo da energía a la célula?", ko: "세포에 에너지를 공급하는 소기관은?" },
  },
  {
    section: "exit_ticket",
    typeTag: { en: "TF", es: "VF", ko: "참거짓" },
    text: { en: "Mitosis happens in 4 phases.", es: "La mitosis tiene 4 fases.", ko: "유사분열은 4단계로 일어난다." },
  },
  {
    section: "warmup",
    typeTag: { en: "FILL", es: "ESPACIO", ko: "빈칸" },
    text: { en: "The mitochondria is the ___.", es: "La mitocondria es el ___.", ko: "미토콘드리아는 ___이다." },
  },
];

// A small input chip ("chapter5.pdf").
function InputChip({ chip, lang }) {
  return (
    <div className="ph-mc-chip">
      <span className="ph-mc-chip-badge" style={{ background: chip.color }}>{chip.type}</span>
      <span style={{ fontSize: 13, color: C.textSecondary, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {txt(chip.name, lang)}
      </span>
    </div>
  );
}

// A verified question card the machine outputs, themed like the real product.
function OutputCard({ q, lang, verifiedLabel }) {
  const th = getSectionTheme(q.section, false);
  return (
    <div className="ph-mc-qcard" style={{ background: th.tint, border: `1px solid ${th.accent}` }}>
      <div className="ph-mc-qcard-top">
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          background: th.iconBg, color: th.iconFg, borderRadius: 5, padding: "2px 7px",
          fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
        }}>
          <span aria-hidden="true" style={{ fontSize: 11, lineHeight: 1 }}>{SECTION_GLYPH[q.section]}</span>
          {getSectionLabel(q.section, lang)}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, color: th.labelFg, letterSpacing: "0.05em" }}>
          {q.typeTag[lang] || q.typeTag.en}
        </span>
        <span className="ph-mc-verified">
          <span aria-hidden="true">✓</span> {verifiedLabel}
        </span>
      </div>
      <div style={{ fontSize: 13.5, color: th.onTint, lineHeight: 1.4, fontWeight: 500 }}>
        {txt(q.text, lang)}
      </div>
    </div>
  );
}

export default function Hero({ t, lang, onSignUp, onOpenCode, onSeeHow }) {
  const heroRef = useRef(null);
  // Flip .is-in one frame after mount → triggers the machine's entrance assembly.
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Subtle cursor-reactive 3D tilt on the whole machine (no-op on touch /
  // reduced-motion). Applied to the outer wrapper so it composes with the inner
  // parts' entrance transforms.
  const machineRef = useRef(null);
  const tilt = useTilt(machineRef, 7);

  return (
    <section ref={heroRef} className={`ph-section ph-hero${entered ? " is-in" : ""}`} style={{
      padding: "84px 32px 64px",
      position: "relative",
      textAlign: "center",
      // Layered, reserved depth: accent wash up top + a faint purple whisper at
      // the top-right. The dot-grid lives in .ph-hero::before.
      background: `radial-gradient(ellipse 92% 56% at 50% -6%, ${C.accentSoft} 0%, transparent 60%), radial-gradient(circle 480px at 88% 10%, rgba(105,64,165,0.055), transparent 70%)`,
    }}>
      <div className="ph-hero-content ph-hero-enter" style={{ position: "relative", zIndex: 2, maxWidth: 1080, margin: "0 auto" }}>
        <div className="ph-pill" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "7px 16px 7px 13px",
          background: C.accentSoft, color: C.accent,
          border: "1px solid rgba(35,131,226,0.18)",
          borderRadius: 100, fontSize: 14, fontWeight: 600,
          marginBottom: 24, letterSpacing: "0.01em",
        }}>
          <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, flexShrink: 0 }} />
          {t.pill}
        </div>

        <h1 className="ph-tagline" aria-label={`${t.taglinePart1} ${t.taglineHighlight}`} style={{
          fontSize: 64, fontWeight: 700, color: C.text,
          lineHeight: 1.08, margin: "0 0 20px",
          letterSpacing: "-0.02em",
        }}>
          {t.taglinePart1}{" "}
          <span style={{ color: C.accent }} aria-hidden="true">
            <TickingSeconds highlight={t.taglineHighlight} />
          </span>
        </h1>

        <p className="ph-sub" style={{
          fontSize: 20, color: C.textSecondary,
          lineHeight: 1.5, margin: "0 0 40px",
          maxWidth: 680, marginLeft: "auto", marginRight: "auto",
        }}>{t.sub}</p>

        {/* ── The 60-second machine — the centerpiece ── */}
        <div ref={machineRef} className="ph-machine" style={{ transform: tilt || undefined }}>
          <div className="ph-machine-grid">
            <div className="ph-mc-col ph-mc-inputs" aria-hidden="true">
              {INPUTS.map((chip) => <InputChip key={chip.type} chip={chip} lang={lang} />)}
            </div>

            <div className="ph-mc-wire ph-mc-wire-in" aria-hidden="true"><span className="ph-mc-packet" /></div>

            <div className="ph-mc-core-wrap">
              <div className="ph-mc-core" aria-hidden="true">
                <svg className="ph-mc-core-ring" viewBox="0 0 92 92" width="92" height="92">
                  <circle cx="46" cy="46" r="42" fill="none" stroke="rgba(35,131,226,0.18)" strokeWidth="3" />
                  <circle cx="46" cy="46" r="42" fill="none" stroke={C.accent} strokeWidth="3" strokeLinecap="round" strokeDasharray="70 195" />
                </svg>
                <span className="ph-mc-ping" />
                <span className="ph-mc-core-orb">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 2.6l1.7 5.5 5.5 1.7-5.5 1.7L12 17l-1.7-5.5L4.8 9.8l5.5-1.7z" fill="#fff" />
                    <circle cx="18.7" cy="5.3" r="1.5" fill="#fff" opacity="0.85" />
                  </svg>
                </span>
              </div>
              <span className="ph-mc-core-label">{t.genVerifying}</span>
            </div>

            <div className="ph-mc-wire ph-mc-wire-out" aria-hidden="true"><span className="ph-mc-packet" /></div>

            <div className="ph-mc-col ph-mc-outputs">
              {OUTPUTS.map((q, i) => <OutputCard key={i} q={q} lang={lang} verifiedLabel={t.genVerified} />)}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 40 }}>
          <button
            className="ph-cta-primary ph-btn-primary"
            onClick={() => onSignUp?.()}
            style={{
              background: C.brandGradient, color: "#fff",
              padding: "18px 42px", borderRadius: 12,
              fontSize: 20, fontWeight: 600,
              border: "none", cursor: "pointer",
              fontFamily: "'Outfit',sans-serif",
            }}
          >{t.ctaPrimary}</button>

          <p style={{
            fontSize: 16, color: C.textMuted,
            margin: "16px 0 0", fontFamily: "'Outfit',sans-serif",
          }}>{t.ctaSubtext}</p>
        </div>

        {/* Got a code? — mobile only (header hides it there). */}
        <button
          className="ph-mobile-code-btn"
          onClick={() => onOpenCode?.()}
          style={{
            display: "none",
            marginTop: 22,
            background: "transparent",
            color: C.accent,
            border: `1.5px solid ${C.accent}`,
            padding: "10px 22px",
            borderRadius: 8,
            fontSize: 14, fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'Outfit',sans-serif",
          }}
        >{t.haveCode}</button>

        {/* Scroll cue — invites the visitor into the product narrative. */}
        <div style={{ marginTop: 36 }}>
          <button
            onClick={() => onSeeHow?.()}
            aria-label={t.scrollCue || "See how it works"}
            style={{
              display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4,
              background: "transparent", border: "none", cursor: "pointer",
              color: C.textMuted, fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            <span>{t.scrollCue || "See how it works"}</span>
            <span className="ph-scroll-cue" aria-hidden="true" style={{ fontSize: 20, lineHeight: 1 }}>↓</span>
          </button>
        </div>
      </div>
    </section>
  );
}
