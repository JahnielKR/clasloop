// ─── DeckOptionsForm ─────────────────────────────────────────────────────────
// The little "set up your quiz" form Cleo shows before a deck is generated:
// name + type + language + count + images. Extracted from CleoActionCard so the
// single-action card AND a deck step inside a multi-step plan (CleoPlanCard)
// share the exact same controls — no duplicated form.
//
// It OWNS its field state and reports the current (edited) payload up via
// onChange; the PARENT owns the run button. That split matters for a plan,
// where one "Confirm & create" runs every step at once, so a deck step can't
// have its own Create button.
import { useState, useEffect, useRef } from "react";
import { C } from "./tokens";

const SECTION_CODES = ["warmup", "exit_ticket", "general_review"];
const LANGS = [["en", "EN"], ["es", "ES"], ["ko", "KO"]];
const COUNTS = [3, 5, 10, 15, 20];
const sectionLabel = (s, t) =>
  s === "warmup" ? t.sectionWarmup : s === "exit_ticket" ? t.sectionExit : t.sectionGeneral;

export default function DeckOptionsForm({ action, t, lang = "en", fileName = "", onChange }) {
  const isPptx = /\.pptx$/i.test(fileName || "");

  // Seeded from Cleo's proposal + the UI language, so the teacher just tweaks.
  const [title, setTitle] = useState(
    action.title || action.topic || (fileName ? fileName.replace(/\.[^.]+$/, "") : "")
  );
  const [section, setSection] = useState(
    SECTION_CODES.includes(action.section) ? action.section : "general_review"
  );
  const [dLang, setDLang] = useState(action.language || lang || "en");
  const [count, setCount] = useState(COUNTS.includes(action.numQuestions) ? action.numQuestions : 5);
  // Default to reusing a PPTX's own images; off otherwise (AI images are opt-in).
  const [images, setImages] = useState(action.source === "document" && isPptx);

  // The parts the form doesn't edit (classId, source, topic, type…) are fixed
  // for this card's lifetime — capture them once so the effect depends only on
  // the editable fields, and keep onChange in a ref so a new identity each
  // render doesn't re-fire it.
  const baseRef = useRef(action);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    onChangeRef.current?.({
      ...baseRef.current,
      section,
      title: title.trim() || baseRef.current.title || baseRef.current.topic || "",
      language: dLang,
      numQuestions: count,
      images: images ? "on" : "off",
    });
  }, [title, section, dLang, count, images]);

  const pill = (active) => ({
    padding: "5px 11px", borderRadius: 8, fontSize: 12, fontWeight: 600,
    fontFamily: "'Outfit',sans-serif", cursor: "pointer", lineHeight: 1.3,
    border: `1px solid ${active ? C.accent : C.border}`,
    background: active ? C.accentSoft : "transparent",
    color: active ? C.accent : C.textMuted,
  });
  const fieldLabel = { fontSize: 11, fontWeight: 600, color: C.textMuted, margin: "0 0 5px" };
  const pillRow = { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 };

  return (
    <div>
      <p style={fieldLabel}>{t.fieldName}</p>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t.titlePlaceholder}
        maxLength={120}
        style={{
          width: "100%", padding: "8px 10px", borderRadius: 8, marginBottom: 12,
          border: `1px solid ${C.border}`, background: C.bg, color: C.text,
          fontSize: 13, fontFamily: "'Outfit',sans-serif", outline: "none", boxSizing: "border-box",
        }}
      />

      <p style={fieldLabel}>{t.fieldSection}</p>
      <div style={pillRow}>
        {SECTION_CODES.map((code) => (
          <button key={code} style={pill(section === code)} onClick={() => setSection(code)}>{sectionLabel(code, t)}</button>
        ))}
      </div>

      <p style={fieldLabel}>{t.fieldLanguage}</p>
      <div style={pillRow}>
        {LANGS.map(([code, lbl]) => (
          <button key={code} style={pill(dLang === code)} onClick={() => setDLang(code)}>{lbl}</button>
        ))}
      </div>

      <p style={fieldLabel}>{t.fieldCount}</p>
      <div style={pillRow}>
        {COUNTS.map((n) => (
          <button key={n} style={pill(count === n)} onClick={() => setCount(n)}>{n}</button>
        ))}
      </div>

      <p style={fieldLabel}>{t.fieldImages}</p>
      <div style={{ ...pillRow, marginBottom: images && !isPptx ? 6 : 12 }}>
        <button style={pill(images)} onClick={() => setImages(true)}>{t.optYes}</button>
        <button style={pill(!images)} onClick={() => setImages(false)}>{t.optNo}</button>
      </div>
      {images && !isPptx && (
        <p style={{ fontSize: 11, color: C.textMuted, margin: "0 0 12px", lineHeight: 1.4 }}>{t.aiImagesNote}</p>
      )}
    </div>
  );
}
