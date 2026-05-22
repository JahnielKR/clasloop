import { C, MONO } from "../../../components/tokens";

// ─── Floating doc card data ────────────────────────────────
// 4 cards animan en el hero. Cada card representa un input típico (PDF,
// PPTX, DOCX, topic) y morphea a una pregunta del tipo correspondiente.
// La animación cuenta visualmente lo que dice el sub: "any file or topic
// in, verified questions out".
const FLOATING_CARDS = [
  {
    id: 1,
    fileType: "PDF",
    fileColor: "#D85A30",
    fileName: "chapter5.pdf",
    questionTag: { en: "WARMUP · MCQ", es: "WARMUP · MCQ", ko: "워밍업 · 객관식" },
    questionText: { en: "What is photosynthesis?", es: "¿Qué es la fotosíntesis?", ko: "광합성이란 무엇인가요?" },
    bg: "#DDEBFB", border: "#2383E2", labelColor: "#185FA5", textColor: "#042C53",
    pos: { top: 90, left: 60 }, size: { w: 225, h: 150 },
    floatDelay: 0,
  },
  {
    id: 2,
    fileType: "PPT",
    fileColor: "#BA7517",
    fileName: "lesson.pptx",
    questionTag: { en: "EXIT TICKET · TF", es: "EXIT TICKET · VF", ko: "종료 티켓 · 참거짓" },
    questionText: { en: "Mitosis happens in 4 phases.", es: "La mitosis tiene 4 fases.", ko: "유사분열은 4단계입니다." },
    bg: "#FAEEDA", border: "#BA7517", labelColor: "#854F0B", textColor: "#412402",
    pos: { top: 65, right: 75 }, size: { w: 215, h: 145 },
    floatDelay: -1,
  },
  {
    id: 3,
    fileType: "DOC",
    fileColor: "#185FA5",
    fileName: "notes.docx",
    questionTag: { en: "WARMUP · FILL", es: "WARMUP · ESPACIO", ko: "워밍업 · 빈칸" },
    questionText: { en: "The mitochondria is the ___.", es: "La mitocondria es el ___.", ko: "미토콘드리아는 ___입니다." },
    bg: "#E1F5EE", border: "#1D9E75", labelColor: "#0F6E56", textColor: "#04342C",
    pos: { bottom: 75, left: 110 }, size: { w: 215, h: 145 },
    floatDelay: -2,
  },
  {
    id: 4,
    fileType: "TXT",
    fileColor: "#5A5A5A",
    fileName: "topic",
    questionTag: { en: "EXIT TICKET · MATCH", es: "EXIT TICKET · EMPAREJAR", ko: "종료 티켓 · 짝짓기" },
    questionText: { en: "Match cell parts to functions", es: "Empareja partes de la célula", ko: "세포 부분과 기능 짝짓기" },
    bg: "#FBEAF0", border: "#D4537E", labelColor: "#993556", textColor: "#4B1528",
    pos: { bottom: 100, right: 60 }, size: { w: 210, h: 140 },
    floatDelay: -1.5,
  },
];

// Helper para float class por id
const floatClass = (id) => ["ph-float-a", "ph-float-b", "ph-float-c", "ph-float-d"][(id - 1) % 4];

export default function Hero({ t, lang, onSignUp, onOpenCode, onSeeHow }) {
  return (
    <section className="ph-section ph-hero ph-fade" style={{
      padding: "100px 32px 70px",
      position: "relative",
      textAlign: "center",
      minHeight: 700,
      background: `radial-gradient(ellipse at top center, ${C.accentSoft} 0%, transparent 50%)`,
    }}>
      {FLOATING_CARDS.map(card => (
        <div
          key={card.id}
          data-card={card.id}
          className={`ph-floating-card ph-float ${floatClass(card.id)}`}
          style={{
            position: "absolute",
            top: card.pos.top, left: card.pos.left,
            right: card.pos.right, bottom: card.pos.bottom,
            width: card.size.w, height: card.size.h,
            animationDelay: `${card.floatDelay}s`,
            zIndex: 1,
          }}
        >
          <div className="ph-morph-from" style={{
            width: "100%", height: "100%",
            background: "white", border: `1px solid ${C.border}`,
            borderRadius: 12, padding: 18,
            boxShadow: "0 6px 16px rgba(0,0,0,0.07)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
              <div style={{
                width: 38, height: 38, background: card.fileColor,
                borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontSize: 13, fontWeight: 700, fontFamily: MONO,
              }}>{card.fileType}</div>
              <span style={{ fontSize: 14, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {card.fileName}
              </span>
            </div>
            <div style={{ height: 4, background: C.border, borderRadius: 2, marginBottom: 6 }} />
            <div style={{ height: 4, background: C.border, borderRadius: 2, marginBottom: 6, width: "80%" }} />
            <div style={{ height: 4, background: C.border, borderRadius: 2, marginBottom: 6 }} />
            <div style={{ height: 4, background: C.border, borderRadius: 2, width: "65%" }} />
          </div>
          <div className="ph-morph-to" style={{
            background: card.bg, border: `1px solid ${card.border}`,
            borderRadius: 12, padding: 18, textAlign: "left",
          }}>
            <div style={{ fontSize: 13, color: card.labelColor, fontWeight: 700, marginBottom: 9, letterSpacing: "0.5px" }}>
              {card.questionTag[lang] || card.questionTag.en}
            </div>
            <div style={{ fontSize: 16, color: card.textColor, lineHeight: 1.4 }}>
              {card.questionText[lang] || card.questionText.en}
            </div>
          </div>
        </div>
      ))}

      <div className="ph-hero-content" style={{ position: "relative", zIndex: 2, maxWidth: 1100, margin: "0 auto" }}>
        <div className="ph-pill" style={{
          display: "inline-block",
          padding: "9px 22px",
          background: C.accentSoft, color: C.accent,
          borderRadius: 100, fontSize: 17, fontWeight: 600,
          marginBottom: 34, letterSpacing: "0.2px",
        }}>{t.pill}</div>

        <h1 className="ph-tagline" style={{
          fontSize: 80, fontWeight: 700, color: C.text,
          lineHeight: 1.08, margin: "0 0 28px",
          letterSpacing: "-0.02em",
        }}>
          {t.taglinePart1} <span style={{ color: C.accent }}>{t.taglineHighlight}</span>
        </h1>

        <p className="ph-sub" style={{
          fontSize: 24, color: C.textSecondary,
          lineHeight: 1.55, margin: "0 0 46px",
          maxWidth: 800, marginLeft: "auto", marginRight: "auto",
        }}>{t.sub}</p>

        <button
          className="ph-cta-primary ph-btn-primary"
          onClick={() => onSignUp?.()}
          style={{
            background: C.accent, color: "#fff",
            padding: "20px 44px", borderRadius: 12,
            fontSize: 21, fontWeight: 600,
            border: "none", cursor: "pointer",
            fontFamily: "'Outfit',sans-serif",
          }}
        >{t.ctaPrimary}</button>

        <p style={{
          fontSize: 17, color: C.textMuted,
          margin: "18px 0 0", fontFamily: "'Outfit',sans-serif",
        }}>{t.ctaSubtext}</p>

        {/* Got a code? — solo en mobile (header lo esconde, lo movemos
            acá para que el estudiante con código siga teniéndolo a mano). */}
        <button
          className="ph-mobile-code-btn"
          onClick={() => onOpenCode?.()}
          style={{
            display: "none",
            marginTop: 24,
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

        {/* Scroll cue — invita a bajar a la narrativa del producto. Oculto
            si el visitante prefiere reduced-motion lo deja estático (CSS). */}
        <div style={{ marginTop: 46 }}>
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
