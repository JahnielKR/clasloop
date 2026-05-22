import { C, MONO } from "../../../components/tokens";
import { useReveal } from "../useReveal";

// ─── GenerationDemo ────────────────────────────────────────────────────────
// Teacher "wow" #1: any file/topic → AI writes + VERIFIES → ready questions.
// A vertical pipeline (input chips → AI working card → verified question
// cards) that animates in when scrolled into view. Pure HTML/CSS/SVG — no
// product screenshots, no image weight.

const INPUT_CHIPS = [
  { label: "chapter5.pdf", type: "PDF", color: "#D85A30" },
  { label: "lesson.pptx", type: "PPT", color: "#BA7517" },
  { label: "notes.docx", type: "DOC", color: "#185FA5" },
  { label: { en: "or a topic", es: "o un tema", ko: "또는 주제" }, type: "✎", color: "#5A5A5A" },
];

const OUTPUT_QS = [
  {
    tag: { en: "WARMUP · MCQ", es: "WARMUP · MCQ", ko: "워밍업 · 객관식" },
    text: { en: "Which organelle powers the cell?", es: "¿Qué orgánulo da energía a la célula?", ko: "세포에 에너지를 공급하는 소기관은?" },
    bg: "#DDEBFB", border: "#2383E2", labelColor: "#185FA5", textColor: "#042C53",
  },
  {
    tag: { en: "EXIT TICKET · TF", es: "EXIT TICKET · VF", ko: "종료 티켓 · 참거짓" },
    text: { en: "Photosynthesis happens in the mitochondria.", es: "La fotosíntesis ocurre en la mitocondria.", ko: "광합성은 미토콘드리아에서 일어난다." },
    bg: "#E1F5EE", border: "#1D9E75", labelColor: "#0F6E56", textColor: "#04342C",
  },
];

const txt = (v, lang) => (typeof v === "string" ? v : (v[lang] || v.en));

function Arrow() {
  return (
    <div aria-hidden="true" style={{ color: C.textMuted, fontSize: 22, lineHeight: 1, textAlign: "center", padding: "2px 0" }}>↓</div>
  );
}

export default function GenerationDemo({ t, lang }) {
  const [headRef, headVisible] = useReveal();
  const [flowRef, flowVisible] = useReveal({ threshold: 0.25 });

  return (
    <section id="generate" className="ph-section ph-anchor" style={{ padding: "110px 32px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
        <div ref={headRef} className={`ph-reveal ${headVisible ? "is-visible" : ""}`}>
          <h2 className="ph-section-h2" style={{ fontSize: 52, fontWeight: 700, color: C.text, margin: "0 0 18px", letterSpacing: "-0.02em" }}>
            {t.genTitle}
          </h2>
          <p className="ph-section-sub" style={{ fontSize: 21, color: C.textSecondary, margin: "0 auto 56px", maxWidth: 720, lineHeight: 1.5 }}>
            {t.genSub}
          </p>
        </div>

        <div
          ref={flowRef}
          className={`ph-reveal ${flowVisible ? "is-visible" : ""}`}
          style={{ maxWidth: 540, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}
        >
          {/* Input — file chips */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            {INPUT_CHIPS.map((c, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 8,
                background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
                padding: "8px 12px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}>
                <span style={{
                  width: 26, height: 26, borderRadius: 6, background: c.color, color: "#fff",
                  fontSize: 11, fontWeight: 700, fontFamily: MONO,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>{c.type}</span>
                <span style={{ fontSize: 13, color: C.textSecondary, fontWeight: 500 }}>{txt(c.label, lang)}</span>
              </div>
            ))}
          </div>

          <Arrow />

          {/* AI working card */}
          <div style={{
            background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14,
            padding: "16px 18px", boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
            display: "flex", flexDirection: "column", gap: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="ph-pulse-dot" style={{ width: 12, height: 12, borderRadius: "50%", background: C.accent, flexShrink: 0 }} />
              <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{t.genVerifying}</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 12, color: C.textMuted, fontFamily: MONO }}>AI</span>
            </div>
            {/* Indeterminate progress track */}
            <div style={{ position: "relative", height: 6, borderRadius: 3, background: C.bgSoft, overflow: "hidden" }}>
              <div className="ph-progress-bar" style={{
                position: "absolute", top: 0, left: 0, height: "100%", width: "40%",
                borderRadius: 3, background: `linear-gradient(90deg, ${C.accent}, ${C.purple})`,
              }} />
            </div>
          </div>

          <Arrow />

          {/* Output — verified question cards */}
          {OUTPUT_QS.map((q, i) => (
            <div
              key={i}
              className="ph-pop-in"
              style={{
                animationDelay: `${0.15 + i * 0.18}s`,
                background: q.bg, border: `1px solid ${q.border}`, borderRadius: 12,
                padding: "14px 16px", textAlign: "left", position: "relative",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                <span style={{ fontSize: 12, color: q.labelColor, fontWeight: 700, letterSpacing: "0.5px" }}>
                  {txt(q.tag, lang)}
                </span>
                <span style={{ flex: 1 }} />
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  fontSize: 11, fontWeight: 700, color: "#0F6E56",
                  background: "#E1F5EE", border: "1px solid #1D9E75",
                  borderRadius: 100, padding: "2px 9px",
                }}>
                  <span aria-hidden="true">✓</span> {t.genVerified}
                </span>
              </div>
              <div style={{ fontSize: 16, color: q.textColor, lineHeight: 1.4, fontWeight: 500 }}>
                {txt(q.text, lang)}
              </div>
            </div>
          ))}

          {/* Ready pill */}
          <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>
            <span className="ph-pop-in" style={{
              animationDelay: "0.55s",
              display: "inline-flex", alignItems: "center", gap: 7,
              background: C.accentSoft, color: C.accent, borderRadius: 100,
              padding: "9px 18px", fontSize: 14, fontWeight: 600,
            }}>
              <span aria-hidden="true">⚡</span> {t.genReady}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
