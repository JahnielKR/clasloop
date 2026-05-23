import { C, MONO } from "../../../components/tokens";
// Real in-app section theming (the same module the student quiz uses) so the
// warmup / exit-ticket cards on the landing look exactly like the product.
// forceDark=false → always the light values (the landing is always light).
import { getSectionTheme, getSectionLabel } from "../../../lib/section-theme";
import { useScrollY } from "../landing-motion";

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
    section: "warmup",
    typeTag: { en: "MCQ", es: "MCQ", ko: "객관식" },
    questionText: { en: "What is photosynthesis?", es: "¿Qué es la fotosíntesis?", ko: "광합성이란 무엇인가요?" },
    pos: { top: 90, left: 60 }, size: { w: 225, h: 150 },
    floatDelay: 0,
  },
  {
    id: 2,
    fileType: "PPT",
    fileColor: "#BA7517",
    fileName: "lesson.pptx",
    section: "exit_ticket",
    typeTag: { en: "TF", es: "VF", ko: "참거짓" },
    questionText: { en: "Mitosis happens in 4 phases.", es: "La mitosis tiene 4 fases.", ko: "유사분열은 4단계입니다." },
    pos: { top: 65, right: 75 }, size: { w: 215, h: 145 },
    floatDelay: -1,
  },
  {
    id: 3,
    fileType: "DOC",
    fileColor: "#185FA5",
    fileName: "notes.docx",
    section: "warmup",
    typeTag: { en: "FILL", es: "ESPACIO", ko: "빈칸" },
    questionText: { en: "The mitochondria is the ___.", es: "La mitocondria es el ___.", ko: "미토콘드리아는 ___입니다." },
    pos: { bottom: 75, left: 110 }, size: { w: 215, h: 145 },
    floatDelay: -2,
  },
  {
    id: 4,
    fileType: "TXT",
    fileColor: "#5A5A5A",
    fileName: "topic",
    section: "exit_ticket",
    typeTag: { en: "MATCH", es: "EMPAREJAR", ko: "짝짓기" },
    questionText: { en: "Match cell parts to functions", es: "Empareja partes de la célula", ko: "세포 부분과 기능 짝짓기" },
    pos: { bottom: 100, right: 60 }, size: { w: 210, h: 140 },
    floatDelay: -1.5,
  },
];

// Section glyphs — mirror SectionBadge.jsx (☀ warmup, ⤓ exit ticket) so the
// landing badge reads identically to the in-app one.
const SECTION_GLYPH = { warmup: "☀", exit_ticket: "⤓" };

// Helper para float class por id
const floatClass = (id) => ["ph-float-a", "ph-float-b", "ph-float-c", "ph-float-d"][(id - 1) % 4];

// Per-card parallax speed. Applied via the CSS `translate` property (which
// composes with the float keyframes' `transform`), so cards drift at different
// rates as the hero scrolls — depth without fighting the float loop. Negative
// = outruns the scroll, positive = lags behind it.
const PARALLAX = { 1: -0.10, 2: 0.07, 3: -0.14, 4: 0.09 };

// The "question" face of a floating card, themed to look like a real warmup /
// exit-ticket question (uses the in-app getSectionTheme). Keeps the
// .ph-morph-to class so the doc↔question morph animation still works.
function MorphTo({ card, lang }) {
  const th = getSectionTheme(card.section, false);
  const typeTag = card.typeTag[lang] || card.typeTag.en;
  return (
    <div className="ph-morph-to" style={{
      background: th.tint, border: `1px solid ${th.accent}`,
      borderRadius: 12, padding: 16, textAlign: "left",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 9, flexWrap: "wrap" }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          background: th.iconBg, color: th.iconFg,
          borderRadius: 5, padding: "2px 7px",
          fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
        }}>
          <span aria-hidden="true" style={{ fontSize: 11, lineHeight: 1 }}>{SECTION_GLYPH[card.section]}</span>
          {getSectionLabel(card.section, lang)}
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: th.labelFg, letterSpacing: "0.06em" }}>{typeTag}</span>
      </div>
      <div style={{ fontSize: 15, color: th.onTint, lineHeight: 1.4 }}>
        {card.questionText[lang] || card.questionText.en}
      </div>
    </div>
  );
}

export default function Hero({ t, lang, onSignUp, onOpenCode, onSeeHow }) {
  const scrollY = useScrollY();
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
            // Parallax via `translate` (composes with the float's `transform`).
            translate: `0px ${(scrollY * (PARALLAX[card.id] || 0)).toFixed(1)}px`,
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
          <MorphTo card={card} lang={lang} />
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
