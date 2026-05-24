// ─── DeckCardPreview ─────────────────────────────────────────────────────
// Live mock of how the deck's cover card will look in the list — shown on the
// editor's Customize tab so the teacher can see cover/color/icon changes in
// context as they make them.

import { C, MONO } from "../../../components/tokens";
import { DeckCover, colorTint } from "../../../lib/deck-cover";

export default function DeckCardPreview({ title, description, cover_color, cover_icon, cover_image_url, subject, grade, language, questionCount, t }) {
  const deckLike = { cover_color, cover_icon, cover_image_url, subject };
  const tint = colorTint(deckLike, "0F"); // ~6% tint
  const langCode = (language || "en").toUpperCase().slice(0, 2);
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600 }}>{t.preview}</div>
      <div style={{
        background: C.bg,
        borderRadius: 14,
        border: `1px solid ${C.border}`,
        boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
        overflow: "hidden",
      }}>
        <DeckCover deck={deckLike} variant="banner" height={92} radius={14} />
        <div style={{ padding: 16, background: tint, borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
          {description && <p style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.4, margin: "0 0 8px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{description}</p>}
          <div style={{ fontSize: 11, color: C.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
            {subject || "—"} {grade && `· ${grade}`} · {questionCount} {t.questionCount} · <span style={{ padding: "1px 5px", borderRadius: 4, background: C.bgSoft, fontFamily: MONO, fontSize: 9, fontWeight: 700, color: C.textSecondary, border: `1px solid ${C.border}` }}>{langCode}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
