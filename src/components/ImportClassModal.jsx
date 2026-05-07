// ─── Import Class Modal ─────────────────────────────────────────────────
// Two-phase flow:
//   1. "select"    — file input visible. User picks a JSON. We parse and
//                    validate; on success we move to step 2; on failure
//                    we stay here and show the error.
//   2. "preview"   — show what's about to be imported with editable name.
//                    User confirms or cancels.
//   3. "importing" — spinner while DB writes happen.
//
// The parent (MyClassesTeacher) controls whether the modal is rendered at
// all and is notified on success via onImported(insertedClass) so it can
// navigate / refresh the list.
//
// All copy comes via `t` from the parent. DEFAULT_LABELS keeps the modal
// usable if a key is missing.

import { useRef, useState } from "react";
import { CIcon } from "./Icons";
import { C } from "./tokens";
import { importClassFromJson, validateImportJson, IMPORT_LIMITS, ImportError } from "../lib/class-import";

const DEFAULT_LABELS = {
  title: "Import class",
  description: "Pick a JSON file you've previously exported from a Clasloop class.",
  pickFile: "Choose JSON file",
  changeFile: "Choose a different file",
  cancel: "Cancel",
  close: "Close",
  // Preview
  previewTitle: "Ready to import",
  className: "Class name",
  classNamePlaceholder: "Class name",
  willImport: "Will import",
  unitsCount: "{n} units",
  decksCount: "{n} decks",
  fromOriginal: "From export of {name}",
  importButton: "Import",
  importing: "Importing...",
  // Errors
  errorReadFile: "Couldn't read the file.",
  errorParseJson: "This file isn't valid JSON.",
  errorEmptyName: "Class name can't be empty.",
  errorImportFailed: "Could not import class.",
  // Validation error explainers (keyed by ImportError.code)
  errorWrongSchema: "This file isn't a Clasloop class export. The schema doesn't match.",
  errorNoClass: "The file is missing the class info.",
  errorTooManyUnits: "This export has too many units (limit: {max}).",
  errorTooManyDecks: "This export has too many decks (limit: {max}).",
  errorInvalidGeneric: "The file structure isn't valid.",
};

const L = (t, key) => (t && t[key]) || DEFAULT_LABELS[key] || key;

// Map an ImportError to a user-facing message.
function errorMessageFor(err, t) {
  if (!(err instanceof ImportError)) {
    return err?.message || L(t, "errorImportFailed");
  }
  switch (err.code) {
    case "wrong-schema":
      return L(t, "errorWrongSchema");
    case "no-class":
    case "invalid-class-name":
    case "invalid-class-subject":
    case "invalid-class-grade":
      return L(t, "errorNoClass");
    case "too-many-units":
      return L(t, "errorTooManyUnits").replace("{max}", String(IMPORT_LIMITS.MAX_UNITS));
    case "too-many-decks":
      return L(t, "errorTooManyDecks").replace("{max}", String(IMPORT_LIMITS.MAX_DECKS));
    case "not-object":
    case "invalid-units":
    case "invalid-decks":
    case "invalid-unit":
    case "invalid-deck":
    case "invalid-color":
      return `${L(t, "errorInvalidGeneric")} (${err.message})`;
    default:
      return err.message || L(t, "errorImportFailed");
  }
}

export default function ImportClassModal({ userId, t, onClose, onImported }) {
  const fileInputRef = useRef(null);
  // 'select' | 'preview' | 'importing'
  const [phase, setPhase] = useState("select");
  // Parsed JSON kept around between select and preview phases.
  const [parsed, setParsed] = useState(null);
  // Editable class name in the preview.
  const [editedName, setEditedName] = useState("");
  // Original name from the export (display-only context).
  const [originalName, setOriginalName] = useState("");
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");

  // ── File picker handler ───────────────────────────────────────────────
  // Read → JSON.parse → validateImportJson → if all good, advance to
  // preview. We do NOT call importClassFromJson here; that happens on
  // confirm. This means a teacher can preview, decide not to import,
  // and we never touched the DB.
  const handlePickFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    let text;
    try {
      text = await file.text();
    } catch (readErr) {
      setError(L(t, "errorReadFile"));
      return;
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch (parseErr) {
      setError(L(t, "errorParseJson"));
      return;
    }

    try {
      validateImportJson(json);
    } catch (validationErr) {
      setError(errorMessageFor(validationErr, t));
      return;
    }

    // Valid — set up preview.
    setParsed(json);
    setEditedName(json.class.name || "");
    setOriginalName(json.class.name || "");
    setPhase("preview");
    // Reset the input so picking the same file again still triggers onChange.
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Re-open the picker from the preview screen ("change file" affordance).
  const handleChangeFile = () => {
    setParsed(null);
    setEditedName("");
    setOriginalName("");
    setPhase("select");
    setError("");
    setNameError("");
    // Defer the click so React commits the phase change first.
    setTimeout(() => fileInputRef.current?.click(), 0);
  };

  // ── Confirm import ───────────────────────────────────────────────────
  const handleImport = async () => {
    if (!parsed) return;
    const trimmed = editedName.trim();
    if (!trimmed) {
      setNameError(L(t, "errorEmptyName"));
      return;
    }
    setNameError("");
    setError("");
    setPhase("importing");
    try {
      const insertedClass = await importClassFromJson({
        json: parsed,
        userId,
        name: trimmed,
      });
      onImported && onImported(insertedClass);
    } catch (importErr) {
      setPhase("preview"); // back to the form so user can retry
      setError(errorMessageFor(importErr, t));
    }
  };

  // The whole modal is dismissible by backdrop click EXCEPT during the
  // actual DB write — closing mid-import would leave the user wondering
  // whether the class made it. We block the close path during 'importing'.
  const closeable = phase !== "importing";
  const handleBackdrop = () => { if (closeable) onClose(); };

  // Render variants share the outer chrome (overlay + card) and only
  // swap the inner content. Reduces duplication.
  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100, padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="ns-fade"
        style={{
          background: C.bg,
          borderRadius: 14,
          padding: 24,
          maxWidth: 480,
          width: "100%",
          boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
          fontFamily: "'Outfit',sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8, color: C.text }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 20V8m0 0l-4 4m4-4l4 4M4 4h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {L(t, "title")}
          </h3>
          {closeable && (
            <button
              onClick={onClose}
              aria-label={L(t, "close")}
              style={{
                width: 28, height: 28, borderRadius: 7,
                background: "transparent",
                border: `1px solid ${C.border}`,
                cursor: "pointer",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                color: C.textMuted,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* Hidden file input — always rendered so we can ref it from any
            phase. .json restriction is just a hint; we still validate. */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handlePickFile}
          style={{ display: "none" }}
        />

        {/* ── SELECT phase ─────────────────────────────────────────── */}
        {phase === "select" && (
          <div>
            <p style={{ fontSize: 13, color: C.textSecondary, margin: "0 0 14px", lineHeight: 1.5 }}>
              {L(t, "description")}
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 10,
                background: C.bgSoft,
                border: `1px dashed ${C.border}`,
                color: C.text,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'Outfit',sans-serif",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "background .15s ease, border-color .15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.accentSoft; e.currentTarget.style.borderColor = C.accent; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = C.bgSoft; e.currentTarget.style.borderColor = C.border; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 2v6h6M9 13l3 3 3-3M12 11v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {L(t, "pickFile")}
            </button>
            {error && (
              <p style={{ fontSize: 12, color: C.red, margin: "12px 0 0", lineHeight: 1.5 }}>
                {error}
              </p>
            )}
          </div>
        )}

        {/* ── PREVIEW phase ─────────────────────────────────────────── */}
        {(phase === "preview" || phase === "importing") && parsed && (
          <div>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>
              {L(t, "previewTitle")}
            </div>

            {/* Editable name */}
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginTop: 10, marginBottom: 6 }}>
              {L(t, "className")}
            </label>
            <input
              value={editedName}
              onChange={(e) => { setEditedName(e.target.value); if (nameError) setNameError(""); }}
              placeholder={L(t, "classNamePlaceholder")}
              maxLength={120}
              disabled={phase === "importing"}
              style={{
                fontFamily: "'Outfit',sans-serif",
                background: C.bg,
                border: `1px solid ${nameError ? C.red : C.border}`,
                color: C.text,
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 14,
                width: "100%",
                outline: "none",
              }}
              autoFocus
            />
            {nameError && (
              <p style={{ fontSize: 11, color: C.red, marginTop: 5, marginBottom: 0 }}>{nameError}</p>
            )}

            {/* Read-only meta: subject · grade + counts */}
            <div style={{
              marginTop: 14,
              padding: "12px 14px",
              background: C.bgSoft,
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}>
              <div style={{ fontSize: 12, color: C.textSecondary }}>
                {parsed.class.subject} · {parsed.class.grade}
              </div>
              <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>
                {L(t, "willImport")}:&nbsp;
                <span style={{ color: C.textSecondary, fontWeight: 500 }}>
                  {L(t, "unitsCount").replace("{n}", String(parsed.units?.length || 0))}
                  &nbsp;·&nbsp;
                  {L(t, "decksCount").replace("{n}", String(parsed.decks?.length || 0))}
                </span>
              </div>
              {originalName && originalName !== editedName && (
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                  {L(t, "fromOriginal").replace("{name}", originalName)}
                </div>
              )}
            </div>

            {error && (
              <p style={{ fontSize: 12, color: C.red, margin: "12px 0 0", lineHeight: 1.5 }}>
                {error}
              </p>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button
                onClick={handleChangeFile}
                disabled={phase === "importing"}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  background: "transparent",
                  color: C.textMuted,
                  border: `1px solid ${C.border}`,
                  cursor: phase === "importing" ? "default" : "pointer",
                  fontFamily: "'Outfit',sans-serif",
                }}
              >
                {L(t, "changeFile")}
              </button>
              <button
                onClick={handleImport}
                disabled={phase === "importing" || !editedName.trim()}
                style={{
                  flex: 1,
                  padding: "10px 18px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  background: phase === "importing" || !editedName.trim()
                    ? C.bgSoft
                    : `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
                  color: phase === "importing" || !editedName.trim() ? C.textMuted : "#fff",
                  border: "none",
                  cursor: phase === "importing" || !editedName.trim() ? "default" : "pointer",
                  fontFamily: "'Outfit',sans-serif",
                }}
              >
                {phase === "importing" ? L(t, "importing") : L(t, "importButton")}
              </button>
            </div>
          </div>
        )}

        <style>{`
          @keyframes ns-fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
          .ns-fade { animation: ns-fadeIn .2s ease; }
        `}</style>
      </div>
    </div>
  );
}
