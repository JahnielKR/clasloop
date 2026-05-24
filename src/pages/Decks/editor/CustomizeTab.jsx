// ─── Deck editor — Customize tab ─────────────────────────────────────────
// Presentational block for the editor's "Customize" tab: the live deck-card
// preview, cover-style selector (color/preset/image), color swatches, and the
// mode-specific content (icon grid, preset patterns, image upload). Pure
// relocation from CreateDeckEditor — receives the hook object `ed` whole.

import { CIcon } from "../../../components/Icons";
import {
  DECK_COLORS, DECK_ICONS,
  PRESET_PATTERNS, presetToDataUrl,
  resolveColor,
} from "../../../lib/deck-cover";
import { C } from "../styles";
import DeckCardPreview from "./DeckCardPreview";

export default function CustomizeTab({ ed, t }) {
  const {
    title,
    desc,
    subject,
    grade,
    deckLang,
    questions,
    coverColor, setCoverColor,
    coverIcon, setCoverIcon,
    coverImageUrl,
    uploading,
    uploadError,
    fileInputRef,
    handleImageChange,
    handleSelectPreset,
    handleClearCover,
    coverMode,
    handleImagePick,
  } = ed;

  return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Live preview — full card mock ─────────────────────────── */}
          <DeckCardPreview
            title={title || t.titlePlaceholder}
            description={desc}
            cover_color={coverColor}
            cover_icon={coverIcon}
            cover_image_url={coverImageUrl}
            subject={subject}
            grade={grade}
            language={deckLang}
            questionCount={questions.length}
            t={t}
          />

          {/* Cover style selector ─────────────────────────── */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 8 }}>{t.coverStyle}</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              {[
                { id: "color",  label: t.styleColor,  icon: "paint" },
                { id: "preset", label: t.stylePreset, icon: "sparkle" },
                { id: "image",  label: t.styleImage,  icon: "art" },
              ].map(opt => {
                const active = coverMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className="dk-mode-btn"
                    onClick={() => {
                      if (opt.id === "color")  handleClearCover();
                      if (opt.id === "preset" && coverMode !== "preset") handleSelectPreset(PRESET_PATTERNS[0].id);
                      if (opt.id === "image"  && coverMode !== "image")  handleImagePick();
                    }}
                    style={{
                      padding: "10px 8px", borderRadius: 9, fontSize: 12, fontWeight: 600,
                      background: active ? C.accentSoft : C.bg,
                      color: active ? C.accent : C.textSecondary,
                      border: `1.5px solid ${active ? C.accent : C.border}`,
                      cursor: "pointer", fontFamily: "'Outfit',sans-serif",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                      transition: "all .15s ease",
                    }}
                  >
                    <CIcon name={opt.icon} size={14} inline /> {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hidden file input (always rendered, triggered by handlers) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
            style={{ display: "none" }}
          />

          {/* Color always visible — it tints presets too ─────────── */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 6 }}>{t.coverColor}</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {DECK_COLORS.map(col => (
                <button
                  key={col.id}
                  type="button"
                  aria-label={col.label}
                  title={col.label}
                  onClick={() => setCoverColor(col.id)}
                  className="dk-color-swatch"
                  style={{
                    width: 32, height: 32, borderRadius: 9,
                    background: col.value,
                    border: coverColor === col.id ? `2.5px solid ${C.text}` : `2px solid transparent`,
                    cursor: "pointer", padding: 0,
                    boxShadow: coverColor === col.id ? `0 0 0 2px ${C.bg}, 0 2px 6px ${col.value}55` : `0 1px 3px ${col.value}33`,
                    transition: "all .15s ease",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Mode-specific content */}
          {coverMode === "color" && (
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 6 }}>{t.coverIcon}</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 4 }}>
                {DECK_ICONS.map(ic => (
                  <button
                    key={ic}
                    type="button"
                    aria-label={ic}
                    title={ic}
                    onClick={() => setCoverIcon(ic)}
                    className="dk-icon-btn"
                    style={{
                      aspectRatio: "1 / 1",
                      borderRadius: 8,
                      background: coverIcon === ic ? C.accentSoft : C.bg,
                      border: `1.5px solid ${coverIcon === ic ? C.accent : C.border}`,
                      cursor: "pointer", padding: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all .15s ease",
                    }}
                  >
                    <CIcon name={ic} size={18} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {coverMode === "preset" && (
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 6 }}>{t.presetPatterns}</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {PRESET_PATTERNS.map(p => {
                  const active = coverImageUrl === `preset:${p.id}`;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      title={p.label}
                      onClick={() => handleSelectPreset(p.id)}
                      className="dk-preset-btn"
                      style={{
                        position: "relative",
                        aspectRatio: "16 / 9",
                        borderRadius: 8,
                        backgroundImage: presetToDataUrl(p.id, resolveColor({ cover_color: coverColor })),
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        border: active ? `2.5px solid ${C.text}` : `2px solid transparent`,
                        cursor: "pointer", padding: 0,
                        boxShadow: active ? `0 0 0 2px ${C.bg}, 0 2px 6px rgba(0,0,0,0.15)` : "0 1px 3px rgba(0,0,0,0.08)",
                        transition: "all .15s ease",
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {coverMode === "image" && (
            <div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <button
                  type="button"
                  className="dk-btn"
                  onClick={handleImagePick}
                  disabled={uploading}
                  style={{
                    flex: 1, padding: "10px 14px", borderRadius: 9, fontSize: 13, fontWeight: 600,
                    background: C.accentSoft, color: C.accent, border: `1px solid ${C.accent}33`,
                    cursor: uploading ? "default" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    fontFamily: "'Outfit',sans-serif",
                  }}
                >
                  <CIcon name="refresh" size={14} inline />
                  {uploading ? t.uploading : t.changeImage}
                </button>
                <button
                  type="button"
                  className="dk-btn-secondary"
                  onClick={handleClearCover}
                  disabled={uploading}
                  style={{
                    padding: "10px 14px", borderRadius: 9, fontSize: 13, fontWeight: 500,
                    background: C.bg, color: C.red, border: `1px solid ${C.border}`,
                    cursor: "pointer", fontFamily: "'Outfit',sans-serif",
                  }}
                >
                  {t.removeImage}
                </button>
              </div>
              <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>{t.uploadHint}</p>
              {uploadError && <p style={{ fontSize: 12, color: C.red, marginTop: 6 }}>{uploadError}</p>}
            </div>
          )}
        </div>
  );
}
