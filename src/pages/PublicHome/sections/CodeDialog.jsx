import { CIcon } from "../../../components/Icons";
import { C, MONO } from "../../../components/tokens";

// Student "Got a code?" dialog — 6-digit teacher code → hands off to /join.
// Moved out of the monolith; behavior identical (Escape-to-close is wired
// from index.jsx, the parent owns open state).
export default function CodeDialog({ t, code, setCode, codeValid, onJoin, onClose }) {
  return (
    <div className="ph-dialog-bg" onClick={onClose}>
      <div className="ph-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 style={{
          fontSize: 18, fontWeight: 700, color: C.text,
          margin: "0 0 6px",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <CIcon name="rocket" size={18} inline /> {t.codeDialogTitle}
        </h3>
        <p style={{
          fontSize: 13, color: C.textSecondary,
          margin: "0 0 16px",
        }}>{t.codeDialogHint}</p>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && onJoin()}
          placeholder={t.codePlaceholder}
          className="ph-input"
          autoFocus
          style={{
            fontFamily: MONO, background: C.bg,
            border: `2px solid ${C.border}`, color: C.accent,
            padding: 14, borderRadius: 12,
            fontSize: 28, fontWeight: 700,
            letterSpacing: ".22em", textAlign: "center",
            width: "100%", outline: "none",
            transition: "border-color .15s, box-shadow .15s",
          }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: 12, borderRadius: 10,
              fontSize: 14, fontWeight: 600,
              background: C.bg, color: C.textSecondary,
              border: `1px solid ${C.border}`, cursor: "pointer",
              fontFamily: "'Outfit',sans-serif",
            }}
          >{t.codeCancel}</button>
          <button
            onClick={onJoin}
            disabled={!codeValid}
            className="ph-btn-primary"
            style={{
              flex: 1, padding: 12, borderRadius: 10,
              fontSize: 14, fontWeight: 600,
              background: codeValid ? C.accent : C.bgSoft,
              color: codeValid ? "#fff" : C.textMuted,
              border: "none",
              cursor: codeValid ? "pointer" : "default",
              fontFamily: "'Outfit',sans-serif",
            }}
          >{t.codeJoin}</button>
        </div>
      </div>
    </div>
  );
}
