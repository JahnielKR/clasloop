// src/components/LobbyThemeSelector.jsx
//
// PR 22: Modal for picking the visual theme of a class. The chosen
// theme cascades to all sessions launched from that class, applying
// to the student-side quiz render (and, once PR 21 lands, to the
// teacher's projected screen too).
//
// Layout:
//   ┌─ modal ────────────────────────────────────────────────────┐
//   │ Header: title + close                                       │
//   ├─ body ──────────────────────────────────────────────────────┤
//   │ [theme grid 2×2]    [live preview of Question state]        │
//   │  - Calm                                                     │
//   │  - Ocean                                                    │
//   │  - Pop                                                      │
//   │  - Mono                                                     │
//   ├─ footer ────────────────────────────────────────────────────┤
//   │                                       [cancel]  [save]      │
//   └─────────────────────────────────────────────────────────────┘
//
// Click a theme card → that theme becomes "selected" and the preview
// on the right re-renders with its styles. Nothing persists until the
// teacher clicks Save.

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { listThemes } from "../lib/themes";
import { C } from "./tokens";

const i18n = {
  en: {
    title: "Theme",
    subtitle: "Pick how the quiz looks on your students' devices.",
    cancel: "Cancel",
    save: "Save",
    saving: "Saving…",
    previewLabel: "Preview — Question 4 of 8",
    sampleQuestion: "Which of these conjugates the verb ser in present?",
    sampleOptions: ["soy", "estoy", "tengo", "voy"],
    sampleSection: "Warmup",
    selected: "Selected",
    errorSaving: "Couldn't save the theme. Try again.",
  },
  es: {
    title: "Tema",
    subtitle: "Elegí cómo se ve el quiz en los dispositivos de tus estudiantes.",
    cancel: "Cancelar",
    save: "Guardar",
    saving: "Guardando…",
    previewLabel: "Vista previa — Pregunta 4 de 8",
    sampleQuestion: "¿Cuál de estas conjuga el verbo ser en presente?",
    sampleOptions: ["soy", "estoy", "tengo", "voy"],
    sampleSection: "Warmup",
    selected: "Seleccionado",
    errorSaving: "No se pudo guardar el tema. Intentá de nuevo.",
  },
  ko: {
    title: "테마",
    subtitle: "학생의 기기에서 퀴즈가 어떻게 보일지 선택하세요.",
    cancel: "취소",
    save: "저장",
    saving: "저장 중…",
    previewLabel: "미리보기 — 4 / 8",
    sampleQuestion: "다음 중 동사 ser의 현재형은?",
    sampleOptions: ["soy", "estoy", "tengo", "voy"],
    sampleSection: "Warmup",
    selected: "선택됨",
    errorSaving: "테마를 저장할 수 없습니다. 다시 시도해 주세요.",
  },
};

export default function LobbyThemeSelector({
  classId,
  currentTheme = "calm",
  className = "",
  lang = "en",
  onClose,
  onSaved,
}) {
  const t = i18n[lang] || i18n.en;
  const themes = listThemes(); // [{ id, name, description, is_premium, ... }]
  const [selected, setSelected] = useState(currentTheme);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (selected === currentTheme) {
      // No-op; just close
      onClose?.();
      return;
    }
    setSaving(true);
    setError("");
    const { error: err } = await supabase
      .from("classes")
      .update({ lobby_theme: selected })
      .eq("id", classId);
    setSaving(false);
    if (err) {
      console.error("Failed to save theme:", err);
      setError(t.errorSaving);
      return;
    }
    onSaved?.(selected);
    onClose?.();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
        animation: "cl-fade-in 0.15s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.bg,
          borderRadius: 16,
          maxWidth: 920,
          width: "100%",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >

        {/* Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontFamily: "'Outfit', sans-serif",
              fontSize: 20,
              fontWeight: 600,
              color: C.text,
            }}>{t.title}</h2>
            <p style={{
              margin: "4px 0 0",
              fontSize: 13,
              color: C.textSecondary,
            }}>
              {className && <strong style={{ color: C.text }}>{className} · </strong>}
              {t.subtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: "transparent",
              border: `1px solid ${C.border}`,
              cursor: "pointer", color: C.textMuted,
              display: "grid", placeItems: "center",
              fontSize: 16,
              flexShrink: 0,
            }}
          >×</button>
        </div>

        {/* Body: grid + preview */}
        <div style={{
          flex: 1,
          overflow: "auto",
          padding: 20,
          display: "grid",
          gridTemplateColumns: "minmax(260px, 320px) 1fr",
          gap: 20,
          alignItems: "start",
        }}>

          {/* Theme grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}>
            {themes.map(th => {
              const isSelected = selected === th.id;
              return (
                <button
                  key={th.id}
                  onClick={() => setSelected(th.id)}
                  style={{
                    position: "relative",
                    padding: 12,
                    borderRadius: 12,
                    border: isSelected
                      ? `2px solid ${C.accent}`
                      : `1px solid ${C.border}`,
                    background: isSelected ? C.accentSoft : C.bg,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textAlign: "left",
                    transition: "border-color .15s ease, background .15s ease",
                  }}
                >
                  {/* Mini swatch — small representation of the theme's background */}
                  <div style={{
                    width: "100%",
                    height: 60,
                    borderRadius: 8,
                    marginBottom: 8,
                    background: themeSwatchBackground(th.id),
                    border: th.id === "calm" ? `1px solid ${C.border}` : "none",
                  }} />
                  <div style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.text,
                    marginBottom: 2,
                  }}>{th.name}</div>
                  <div style={{
                    fontSize: 11,
                    color: C.textSecondary,
                    lineHeight: 1.3,
                  }}>{th.description}</div>
                  {isSelected && (
                    <div style={{
                      position: "absolute",
                      top: 6, right: 6,
                      width: 18, height: 18,
                      borderRadius: 50,
                      background: C.accent,
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 700,
                      display: "grid",
                      placeItems: "center",
                    }}>✓</div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Live preview — embedded mini Question state */}
          <ThemePreview themeId={selected} t={t} />

        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 20px",
          borderTop: `1px solid ${C.border}`,
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          alignItems: "center",
        }}>
          {error && (
            <span style={{ flex: 1, fontSize: 12, color: C.red || "#C44D4D" }}>{error}</span>
          )}
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              background: "transparent",
              color: C.textSecondary,
              border: `1px solid ${C.border}`,
              cursor: saving ? "default" : "pointer",
              fontFamily: "'Outfit', sans-serif",
              fontSize: 13,
              fontWeight: 500,
            }}
          >{t.cancel}</button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              background: C.accent,
              color: "#fff",
              border: "none",
              cursor: saving ? "wait" : "pointer",
              opacity: saving ? 0.7 : 1,
              fontFamily: "'Outfit', sans-serif",
              fontSize: 13,
              fontWeight: 600,
            }}
          >{saving ? t.saving : t.save}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function themeSwatchBackground(id) {
  switch (id) {
    case "calm": return "#FAFAF8";
    case "ocean": return "linear-gradient(160deg, #1A3D6B 0%, #0A1F3F 55%, #050E20 100%)";
    case "pop": return "linear-gradient(165deg, #FFD93D 0%, #FF6B9D 60%, #C147FF 100%)";
    case "mono": return "#000000";
    default: return "#FAFAF8";
  }
}

// ─── Mini Question state preview ─────────────────────────────────────
// Self-contained — reuses .stage CSS classes from themes.css. Wrapped
// in a scaled-down container so it fits the preview panel without
// taking over the screen like the real student render does.
function ThemePreview({ themeId, t }) {
  return (
    <div style={{
      width: "100%",
      aspectRatio: "16/10",
      borderRadius: 14,
      overflow: "hidden",
      border: `1px solid ${C.border}`,
      position: "relative",
      // Scale down: the real .stage CSS expects 100vw/vh, so we trick
      // it by making this container its own positioning context. The
      // CSS measurements (font sizes etc) are absolute, so this
      // becomes a "mini" version — not a perfect 1:1 scaled mock, but
      // close enough that the theme's feel comes through.
      contain: "layout style",
    }}>
      <div
        className="stage"
        data-theme={themeId}
        style={{
          /* Override the full-screen sizing from themes.css */
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      >
        {/* Top strip (simplified — no exit button, no avatar) */}
        <div className="top-strip" style={{ padding: "10px 14px 8px" }}>
          <div className="brand-area">
            <span className="brand-name" style={{ fontSize: 11 }}>Clasloop</span>
            <div className="session-info" style={{ fontSize: 9 }}>
              <span className="section-pill" style={{ fontSize: 8, padding: "1px 6px" }}>{t.sampleSection}</span>
              <span className="dot" />
              <span>Spanish 9th</span>
            </div>
          </div>
          <div className="student-block">
            <div className="student-meta-text">
              <div className="student-name-top" style={{ fontSize: 10 }}>María R.</div>
            </div>
            <div className="student-avatar" style={{ width: 22, height: 22, fontSize: 10 }}>M</div>
          </div>
        </div>

        {/* Body — simplified Question state */}
        <div className="content">
          <div
            className="question-state"
            style={{
              gridTemplateColumns: "1fr 90px",
              width: "100%",
              height: "100%",
              minHeight: 0,
            }}
          >
            <div className="question-main" style={{ padding: "14px 18px 16px" }}>
              <div className="question-meta" style={{ marginBottom: 8 }}>
                <span className="q-counter" style={{ fontSize: 9 }}>
                  <strong>4</strong> / 8
                </span>
                <div className="q-progress" style={{ height: 3 }}>
                  <div className="q-progress-fill" style={{ width: "50%" }}></div>
                </div>
              </div>

              <div className="question-center">
                <div
                  className="question-text-tablet"
                  style={{ fontSize: 14, marginBottom: 0, maxWidth: "100%" }}
                >
                  {t.sampleQuestion}
                </div>
              </div>

              <div
                className="answers-grid"
                style={{
                  gridTemplateRows: "32px 32px",
                  gap: 6,
                }}
              >
                {t.sampleOptions.map((opt, i) => (
                  <div
                    key={i}
                    className="answer-tile"
                    style={{
                      padding: "6px 8px",
                      gap: 6,
                      borderRadius: 6,
                    }}
                  >
                    <div
                      className="tile-letter"
                      style={{ width: 20, height: 20, fontSize: 10, borderRadius: 4 }}
                    >{String.fromCharCode(65 + i)}</div>
                    <div className="tile-text" style={{ fontSize: 10 }}>{opt}</div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="question-rail"
              style={{ padding: "10px 8px", gap: 8 }}
            >
              <div>
                <div
                  className="timer-ring-big"
                  style={{ width: 40, height: 40 }}
                >
                  <svg viewBox="0 0 100 100">
                    <circle className="timer-track" cx="50" cy="50" r="44" strokeWidth="6" />
                    <circle
                      className="timer-fill"
                      cx="50" cy="50" r="44"
                      strokeWidth="6"
                      strokeDasharray="276.46"
                      strokeDashoffset="50.9"
                    />
                  </svg>
                  <div
                    className="timer-num"
                    style={{ fontSize: 11 }}
                  >12</div>
                </div>
              </div>

              <div className="rail-stat" style={{ fontSize: 9 }}>
                <div className="rail-stat-label" style={{ fontSize: 7 }}>Score</div>
                <div className="rail-stat-value" style={{ fontSize: 11 }}>2,710</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
