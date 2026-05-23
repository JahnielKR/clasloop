import { useState, useRef } from "react";
import { C, MONO } from "../../../components/tokens";
import { STYLE_THUMBS } from "../../../components/PdfStyleThumbs";
import { CIcon } from "../../../components/Icons";
import { useT } from "../../../i18n";
import { useReveal } from "../useReveal";
import { useScrollProgress, useTilt } from "../landing-motion";

// ─── PrintAndScanDemo ──────────────────────────────────────────────────────
// Teacher "wow" #2 — the differentiator no live-quiz app has: the same
// AI-generated questions become a polished printable test in 4 styles (reusing
// the EXACT thumbnails from the export modal, via the shared PdfStyleThumbs
// module), with an answer key + a scannable sheet you grade with your phone.
//
// Interactive: click a style to swap the paper preview; the variant chips and
// the print→answer→scan→graded loop tell the rest of the story. The real PDF
// rendering needs jsPDF (heavy) so the landing shows faithful HTML/SVG mockups.

export default function PrintAndScanDemo({ t, lang }) {
  const pdf = useT("pdfExportModal", lang);
  const [headRef, headVisible] = useReveal();
  const [bodyRef, bodyVisible] = useReveal({ threshold: 0.2 });
  const [loopRef, loopVisible] = useReveal({ threshold: 0.3 });

  // Scrollytelling: the print → answer → scan → graded loop lights up step by
  // step as it travels through the viewport (same node the reveal observes).
  // Discrete active step (0-3) updated IMPERATIVELY — setActiveStep no-ops when
  // the step is unchanged, so the loop re-renders only on the 4 step crossings,
  // not on every scroll frame.
  const [activeStep, setActiveStep] = useState(0);
  const loopProgressRef = useScrollProgress((p) => {
    const step = Math.max(0, Math.min(3, Math.floor(p * 4.5)));
    setActiveStep((prev) => (prev === step ? prev : step));
  });
  const setLoopRef = (n) => { loopRef.current = n; loopProgressRef.current = n; };

  // Pointer tilt on the paper preview (no-op on touch / reduced-motion).
  const paperRef = useRef(null);
  const tilt = useTilt(paperRef, 7);

  const [style, setStyle] = useState("classic");
  const [variant, setVariant] = useState("exam");

  const STYLES = [
    { id: "classic", name: pdf.classicName },
    { id: "modern", name: pdf.modernName },
    { id: "editorial", name: pdf.editorialName },
    { id: "framed", name: pdf.framedName },
  ];
  const VARIANTS = [
    { id: "exam", label: t.printVariantExam },
    { id: "answer_key", label: t.printVariantKey },
    { id: "scan", label: t.printVariantScan },
  ];
  const LOOP = [
    { icon: "printer", label: t.printLoop1 },
    { icon: "handwrite", label: t.printLoop2 },
    { icon: "scan", label: t.printLoop3 },
    { icon: "graded", label: t.printLoop4 },
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
          <h2 className="ph-section-h2" style={{ fontSize: 52, fontWeight: 700, color: C.text, margin: "0 0 18px", letterSpacing: "-0.02em" }}>
            {t.printTitle}
          </h2>
          <p className="ph-section-sub" style={{ fontSize: 21, color: C.textSecondary, margin: "0 auto 56px", maxWidth: 740, lineHeight: 1.5 }}>
            {t.printSub}
          </p>
        </div>

        <div
          ref={bodyRef}
          className={`ph-print-grid ph-reveal ${bodyVisible ? "is-visible" : ""}`}
          style={{ display: "grid", gridTemplateColumns: "minmax(220px, 300px) 1fr", gap: 44, alignItems: "center" }}
        >
          {/* Paper preview with scan line */}
          <div style={{ position: "relative", justifySelf: "center", width: "100%", maxWidth: 300 }}>
            <div ref={paperRef} style={{
              position: "relative",
              background: "#fff",
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              boxShadow: "0 14px 40px rgba(0,0,0,0.13)",
              overflow: "hidden",
              transform: tilt || undefined,
              transition: "transform .12s ease-out",
            }}>
              <Thumb />
              {/* Scan line — conveys "grade it by camera" */}
              <div className="ph-scanline" aria-hidden="true" style={{
                position: "absolute", left: 0, right: 0, height: 3,
                background: `linear-gradient(90deg, transparent, ${C.accent}, transparent)`,
                boxShadow: `0 0 12px 2px ${C.accent}`,
              }} />
            </div>
          </div>

          {/* Controls */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.textMuted, marginBottom: 12 }}>
              {t.printStyleLabel}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
              {STYLES.map(s => {
                const SThumb = STYLE_THUMBS[s.id];
                const selected = style === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setStyle(s.id)}
                    aria-pressed={selected}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                      background: C.bg, cursor: "pointer", padding: 6,
                      border: `2px solid ${selected ? C.accent : C.border}`,
                      borderRadius: 10, fontFamily: "'Outfit',sans-serif",
                      transition: "border-color .15s, transform .15s",
                      transform: selected ? "translateY(-2px)" : "none",
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

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {VARIANTS.map(v => {
                const selected = variant === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => setVariant(v.id)}
                    aria-pressed={selected}
                    style={{
                      padding: "9px 16px", borderRadius: 100,
                      border: `1.5px solid ${selected ? C.accent : C.border}`,
                      background: selected ? C.accentSoft : C.bg,
                      color: selected ? C.accent : C.textSecondary,
                      fontSize: 13.5, fontWeight: 600, cursor: "pointer",
                      fontFamily: "'Outfit',sans-serif", transition: "all .15s",
                    }}
                  >{v.label}</button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Print → answer → scan → graded loop */}
        <div
          ref={setLoopRef}
          className={`ph-reveal ${loopVisible ? "is-visible" : ""}`}
          style={{ marginTop: 64 }}
        >
          <div style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 22 }}>
            {t.printLoopTitle}
          </div>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {LOOP.map((step, i) => {
              // Scrollytelling: the current step is emphasized, earlier steps
              // read as "done", later ones stay neutral. The sweep advances
              // with scroll (activeStep); under reduced-motion it resolves to
              // the last step (progress = 1) — still legible, just not animated.
              const isActive = i === activeStep;
              const isDone = i < activeStep;
              const lit = isActive || isDone;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div className="ph-pop-in" style={{
                    animationDelay: `${0.1 + i * 0.14}s`,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                    background: isActive ? C.accentSoft : C.bg,
                    border: `${isActive ? 2 : 1}px solid ${lit ? C.accent : C.border}`,
                    borderRadius: 14,
                    padding: "16px 14px", width: 132, minHeight: 104, justifyContent: "center",
                    boxShadow: isActive ? "0 10px 26px rgba(35,131,226,0.18)" : "0 2px 10px rgba(0,0,0,0.04)",
                    transform: isActive ? "translateY(-4px)" : "none",
                    transition: "transform .25s ease, box-shadow .25s ease, background .25s ease, border-color .25s ease",
                  }}>
                    <CIcon name={step.icon} size={46} />
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: lit ? C.accent : C.textSecondary, textAlign: "center", lineHeight: 1.3, transition: "color .25s ease" }}>
                      {step.label}
                    </span>
                  </div>
                  {i < LOOP.length - 1 && (
                    <span aria-hidden="true" style={{ color: isDone ? C.accent : C.textMuted, fontSize: 18, fontFamily: MONO, transition: "color .25s ease" }}>→</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
