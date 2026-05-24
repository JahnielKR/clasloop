import { useState, useRef } from "react";
import { C, MONO } from "../../../components/tokens";
import { STYLE_THUMBS } from "../../../components/PdfStyleThumbs";
import { CIcon } from "../../../components/Icons";
import { useT } from "../../../i18n";
import { useReveal } from "../useReveal";
import { useScrollProgress, useTilt } from "../landing-motion";
import SectionHeader from "./SectionHeader";

// ─── PrintAndScanDemo ──────────────────────────────────────────────────────
// Teacher "wow" #2 — the differentiator no live-quiz app has. The PINNED scene
// shows a REAL exam sheet (the same PdfStyleThumbs the export modal renders)
// physically going through the paper pipeline as you scroll: printed → answered
// by hand → scanned by phone → auto-graded. Each stage cross-fades overlays on
// top of the sheet, so it reads like the actual product flow — not abstract
// icons. You can still pick any of the 4 print styles. Pure HTML/CSS/SVG, no
// screenshots / image weight. Degrades to a static stacked sheet (graded state)
// on short/narrow screens + reduced-motion (see landing-scroll-css.js).

const STEPS = [
  { icon: "printer", key: "printLoop1" },
  { icon: "handwrite", key: "printLoop2" },
  { icon: "scan", key: "printLoop3" },
  { icon: "graded", key: "printLoop4" },
];

// Ink-blue handwriting — student answers. Style-agnostic marks placed in generic
// spots (the 4 thumb layouts differ) so they read as "answered by hand" on any.
function AnswersOverlay({ visible }) {
  const ink = "#2B59C3";
  return (
    <svg
      viewBox="0 0 140 190"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: visible ? 1 : 0, transition: "opacity .45s ease", pointerEvents: "none" }}
    >
      <ellipse cx="44" cy="111" rx="13" ry="5" fill="none" stroke={ink} strokeWidth="1.2" transform="rotate(-4 44 111)" />
      <path d="M103 95 l2.6 3 l5.4 -7.5" fill="none" stroke={ink} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M103 152 l2.6 3 l5.4 -7.5" fill="none" stroke={ink} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 169 q10 -3 20 0 t20 0" fill="none" stroke={ink} strokeWidth="1" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}

// Phone-scan — a camera viewfinder over the page + the sweeping scan line.
function ScanOverlay({ visible }) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, opacity: visible ? 1 : 0, transition: "opacity .35s ease", pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(20,30,45,0.10)", borderRadius: 8 }} />
      <div style={{ position: "absolute", inset: "9% 11%" }}>
        {[["top", "left"], ["top", "right"], ["bottom", "left"], ["bottom", "right"]].map(([v, h]) => (
          <span
            key={`${v}${h}`}
            style={{
              position: "absolute", [v]: 0, [h]: 0, width: 20, height: 20,
              borderTop: v === "top" ? `2.5px solid ${C.accent}` : "none",
              borderBottom: v === "bottom" ? `2.5px solid ${C.accent}` : "none",
              borderLeft: h === "left" ? `2.5px solid ${C.accent}` : "none",
              borderRight: h === "right" ? `2.5px solid ${C.accent}` : "none",
              [`border${v === "top" ? "Top" : "Bottom"}${h === "left" ? "Left" : "Right"}Radius`]: 4,
            }}
          />
        ))}
        {visible && (
          <div className="ph-scanline" style={{ position: "absolute", left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${C.accent}, transparent)`, boxShadow: `0 0 12px 2px ${C.accent}` }} />
        )}
      </div>
      <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 6, background: "rgba(27,30,38,0.92)", color: "#fff", borderRadius: 100, padding: "4px 11px", fontSize: 10, fontWeight: 700, fontFamily: MONO, letterSpacing: "0.06em" }}>
        <span className="ph-pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent }} /> SCAN
      </div>
    </div>
  );
}

// Graded — green ticks + one cross, and a score badge clipped to the corner.
function GradedOverlay({ visible, t }) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, opacity: visible ? 1 : 0, transition: "opacity .45s ease", pointerEvents: "none" }}>
      <svg viewBox="0 0 140 190" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <path d="M118 95 l3 4 l6.5 -9" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M118 123 l3 4 l6.5 -9" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M119 150 l7 7 M126 150 l-7 7" stroke="#E03E3E" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", top: -14, right: -12, background: "#0F7B6C", color: "#fff", borderRadius: 13, padding: "7px 13px", boxShadow: "0 8px 22px rgba(15,123,108,0.38)", fontFamily: MONO, display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.05 }}>
        <span style={{ fontSize: 17, fontWeight: 700 }}>18/20</span>
        <span style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: "0.1em", opacity: 0.9 }}>{(t.printLoop4 || "GRADED").toUpperCase()}</span>
      </div>
    </div>
  );
}

export default function PrintAndScanDemo({ t, lang }) {
  const pdf = useT("pdfExportModal", lang);
  const [headRef, headVisible] = useReveal();
  const [sceneRef, sceneVisible] = useReveal({ threshold: 0.15 });

  // The sheet advances through 4 stages as the tall sticky track scrolls past.
  // Discrete step updated only on crossings; reduced-motion → progress 1 → step 3
  // (graded), the natural end state for a static fallback.
  const [activeStep, setActiveStep] = useState(0);
  const sceneProgressRef = useScrollProgress((p) => {
    const step = Math.max(0, Math.min(3, Math.floor(p * 4.5)));
    setActiveStep((prev) => (prev === step ? prev : step));
  });

  // Subtle pointer tilt on the sheet (no-op on touch / reduced-motion).
  const paperRef = useRef(null);
  const tilt = useTilt(paperRef, 6);

  const [style, setStyle] = useState("classic");
  const STYLES = [
    { id: "classic", name: pdf.classicName },
    { id: "modern", name: pdf.modernName },
    { id: "editorial", name: pdf.editorialName },
    { id: "framed", name: pdf.framedName },
  ];
  const Thumb = STYLE_THUMBS[style] || STYLE_THUMBS.classic;

  return (
    <section id="print" className="ph-section ph-anchor" style={{
      padding: "110px 32px",
      background: C.bgSoft,
      borderTop: `1px solid ${C.border}`,
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div ref={headRef} className={`ph-reveal ${headVisible ? "is-visible" : ""}`} style={{ textAlign: "center" }}>
          <SectionHeader num="02" eyebrow={t.eyebrowPrint} title={t.printTitle} sub={t.printSub} />
        </div>

        {/* PINNED scrollytelling scene: the real sheet transforms through the
            paper pipeline as you scroll. Sticky is CSS-gated off on short/narrow
            screens (→ stacked, graded state). */}
        <div ref={sceneProgressRef} className="ph-scene" style={{ minHeight: "min(220vh, 1600px)" }}>
          <div className="ph-scene-stick">
            <div
              ref={sceneRef}
              className={`ph-print-grid ph-reveal ${sceneVisible ? "is-visible" : ""}`}
              style={{ display: "grid", gridTemplateColumns: "minmax(240px, 300px) 1fr", gap: 48, alignItems: "center" }}
            >
              {/* LEFT — the transforming sheet */}
              <div style={{ position: "relative", justifySelf: "center", width: "100%", maxWidth: 300 }}>
                <div
                  ref={paperRef}
                  style={{
                    position: "relative",
                    background: "#fff",
                    borderRadius: 8,
                    border: `1px solid ${C.border}`,
                    boxShadow: "0 18px 48px rgba(0,0,0,0.16)",
                    overflow: "visible",
                    transform: tilt || undefined,
                    transition: "transform .12s ease-out",
                  }}
                >
                  <div style={{ borderRadius: 8, overflow: "hidden" }}>
                    <Thumb />
                  </div>
                  <AnswersOverlay visible={activeStep >= 1} />
                  <ScanOverlay visible={activeStep === 2} />
                  <GradedOverlay visible={activeStep === 3} t={t} />
                </div>
              </div>

              {/* RIGHT — style picker + vertical stage tracker */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.textMuted, marginBottom: 12 }}>
                  {t.printStyleLabel}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 30 }}>
                  {STYLES.map((s) => {
                    const SThumb = STYLE_THUMBS[s.id];
                    const selected = style === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setStyle(s.id)}
                        aria-pressed={selected}
                        className="ph-springy"
                        style={{
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                          background: C.bg, cursor: "pointer", padding: 6,
                          border: `2px solid ${selected ? C.accent : C.border}`,
                          borderRadius: 10, fontFamily: "'Outfit',sans-serif",
                          boxShadow: selected ? "0 6px 16px rgba(35,131,226,0.16)" : "none",
                        }}
                      >
                        <div style={{ width: "100%", borderRadius: 4, overflow: "hidden", background: "#fff" }}>
                          <SThumb />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: selected ? C.accent : C.textSecondary }}>{s.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Vertical stage tracker — mirrors the journey rail; lit by scroll. */}
                <div style={{ position: "relative", paddingLeft: 4 }}>
                  {STEPS.map((step, i) => {
                    const isActive = i === activeStep;
                    const isDone = i < activeStep;
                    const lit = isActive || isDone;
                    return (
                      <div key={step.key} style={{ display: "flex", alignItems: "center", gap: 14, position: "relative", paddingBottom: i < STEPS.length - 1 ? 18 : 0 }}>
                        {/* connector segment */}
                        {i < STEPS.length - 1 && (
                          <span style={{ position: "absolute", left: 20, top: 40, width: 2, height: 18, background: isDone ? C.accent : C.border, transition: "background .3s ease" }} />
                        )}
                        <span style={{
                          width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                          display: "grid", placeItems: "center",
                          background: isActive ? C.accentSoft : C.bg,
                          border: `${isActive ? 2 : 1}px solid ${lit ? C.accent : C.border}`,
                          boxShadow: isActive ? "0 8px 20px rgba(35,131,226,0.18)" : "none",
                          transform: isActive ? "scale(1.06)" : "none",
                          transition: "transform .25s ease, box-shadow .25s ease, background .25s ease, border-color .25s ease",
                        }}>
                          <CIcon name={step.icon} size={22} />
                        </span>
                        <span style={{ fontSize: 15, fontWeight: isActive ? 700 : 600, color: lit ? C.text : C.textMuted, transition: "color .25s ease" }}>
                          {t[step.key]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
