// ─── Edit Class Modal ───────────────────────────────────────────────────
// Three zones in one modal:
//   1. Edit form  — name / subject / grade (color stays in its own popover
//                   on the ClassPage header for live preview)
//   2. Export     — download class as JSON (clase + units + decks). Useful
//                   as backup before destructive actions, or for moving
//                   content between accounts.
//   3. Danger     — delete class. CASCADE behavior (decks, units, members
//                   all gone). Confirmation by typing the class name.
//
// Only the class owner reaches this modal (gated by ClassPage), but the
// Supabase calls also hit RLS so there's defense in depth.
//
// Required i18n keys are exhaustive — see DEFAULT_LABELS at the bottom for
// the contract. The hosting page passes its own dictionary; if a key is
// missing, the English default kicks in so UI never shows raw keys.

import { useState, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { CIcon } from "./Icons";
import { C } from "./tokens";

const SUBJECTS = ["Math", "Science", "History", "Language", "Geography", "Art", "Music", "Other"];

const inp = {
  fontFamily: "'Outfit',sans-serif",
  background: C.bg,
  border: `1px solid ${C.border}`,
  color: C.text,
  padding: "10px 14px",
  borderRadius: 8,
  fontSize: 14,
  width: "100%",
  outline: "none",
};

const sel = {
  ...inp,
  cursor: "pointer",
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%239B9B9B' stroke-width='1.5'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  paddingRight: 32,
};

// ─── Helper: build the export payload ──────────────────────────────────
// Pulls the class + its units + its decks from Supabase and produces the
// JSON the user downloads. Excludes IDs (regenerated on import), class_code
// (regenerated), class_members (don't migrate), and any session/progress
// data (operational, not content). Schema version is included so future
// imports can reject incompatible files cleanly.
async function buildExportJson(classId) {
  const [classRes, unitsRes, decksRes] = await Promise.all([
    supabase.from("classes").select("*").eq("id", classId).maybeSingle(),
    supabase.from("units").select("*").eq("class_id", classId).order("position", { ascending: true }),
    supabase.from("decks").select("*").eq("class_id", classId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false }),
  ]);
  if (classRes.error || !classRes.data) {
    throw new Error(classRes.error?.message || "Class not found");
  }
  const cls = classRes.data;
  const units = unitsRes.data || [];
  const decks = decksRes.data || [];

  // Re-map unit ids to a stable index so the import side can rebuild the
  // FK relationships without relying on the original UUIDs.
  const unitIdx = new Map(units.map((u, i) => [u.id, i]));

  return {
    schema: "clasloop.class.v1",
    exportedAt: new Date().toISOString(),
    class: {
      name: cls.name,
      subject: cls.subject,
      grade: cls.grade,
      color_id: cls.color_id || "auto",
    },
    units: units.map(u => ({
      idx: unitIdx.get(u.id),     // reference handle for decks
      name: u.name,
      section: u.section,
      position: u.position,
    })),
    decks: decks.map(d => ({
      title: d.title,
      description: d.description,
      subject: d.subject,
      grade: d.grade,
      language: d.language,
      tags: d.tags || [],
      questions: d.questions || [],
      section: d.section || "general_review",
      unit_idx: d.unit_id != null && unitIdx.has(d.unit_id) ? unitIdx.get(d.unit_id) : null,
      position: d.position || 0,
      cover_color: d.cover_color || null,
      cover_icon: d.cover_icon || null,
      cover_image_url: d.cover_image_url || null,
      is_public: !!d.is_public,
      is_adapted: !!d.is_adapted,
    })),
  };
}

// Slugify a class name for the download filename. Strips non-alphanumeric
// to avoid OS-level filename issues, lowercases, dashes for spaces.
function slugify(name) {
  return (name || "class")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 40) || "class";
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Free the blob URL after the click handler completes.
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// ─── Default English labels (fallback when caller omits a key) ─────────
const DEFAULT_LABELS = {
  title: "Edit class",
  className: "Class name",
  classNamePlaceholder: "e.g. Math 6th Grade",
  classSubject: "Subject",
  classGrade: "Grade",
  classGradePlaceholder: "e.g. 6th, 7th–9th, Mixed",
  save: "Save",
  saving: "Saving...",
  saved: "Saved",
  cancel: "Cancel",
  close: "Close",
  exportTitle: "Export",
  exportHelp: "Download a JSON backup of this class — its units and decks. Useful before deleting, or to move content elsewhere.",
  exportButton: "Download as JSON",
  exporting: "Preparing...",
  exportFailed: "Export failed",
  dangerTitle: "Danger zone",
  deleteButton: "Delete class",
  deleteWarningTitle: "This is permanent",
  deleteWarningBody: "This will delete the class, its {units} units, and its {decks} decks. Students will lose access immediately. Download a JSON backup first if you might want this content later.",
  deleteConfirmLabel: "Type the class name to confirm",
  deleteConfirm: "Delete forever",
  deleting: "Deleting...",
  deleteCancel: "Cancel",
  // errors
  errorEmptyName: "Class name can't be empty.",
  errorSaveFailed: "Could not save changes",
  errorDeleteFailed: "Could not delete class",
  errorTypeMismatch: "Class name doesn't match.",
};

const L = (t, key) => (t && t[key]) || DEFAULT_LABELS[key] || key;

// ─── Main component ────────────────────────────────────────────────────
export default function EditClassModal({
  classObj,            // {id, name, subject, grade, color_id, ...} — required
  unitsCount = 0,      // for the delete warning copy
  decksCount = 0,      // for the delete warning copy
  t,                   // i18n dict from caller; missing keys fall back to DEFAULT_LABELS
  onClose,
  onSaved,             // (updatedClass) => void   — after successful save
  onDeleted,           // () => void               — after successful delete
}) {
  const [name, setName] = useState(classObj?.name || "");
  const [subject, setSubject] = useState(classObj?.subject || "Math");
  const [grade, setGrade] = useState(classObj?.grade || "");
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [error, setError] = useState("");

  // Delete flow has its own confirm sub-state to avoid accidental clicks.
  // 'idle'    → just the red "Delete class" button
  // 'confirm' → expanded warning + typing input + final destructive button
  // 'busy'    → DB call in flight
  const [deletePhase, setDeletePhase] = useState("idle");
  const [deleteTyped, setDeleteTyped] = useState("");
  const [deleteError, setDeleteError] = useState("");

  // True when the form differs from the original — gates the Save button so
  // we don't issue UPDATEs for noop edits.
  const dirty = useMemo(() => {
    if (!classObj) return false;
    return (
      name.trim() !== (classObj.name || "") ||
      subject !== (classObj.subject || "Math") ||
      grade.trim() !== (classObj.grade || "")
    );
  }, [classObj, name, subject, grade]);

  // ── Save handler ──────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!classObj) return;
    if (!name.trim()) { setError(L(t, "errorEmptyName")); return; }
    if (!dirty) return;
    setError("");
    setSaving(true);
    const payload = {
      name: name.trim(),
      subject,
      grade: grade.trim() || classObj.grade,  // schema may have NOT NULL on grade
    };
    const { data, error: err } = await supabase
      .from("classes")
      .update(payload)
      .eq("id", classObj.id)
      .select()
      .single();
    setSaving(false);
    if (err || !data) {
      setError(err?.message || L(t, "errorSaveFailed"));
      return;
    }
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
    onSaved && onSaved(data);
  };

  // ── Export handler ────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!classObj) return;
    setExportError("");
    setExporting(true);
    try {
      const payload = await buildExportJson(classObj.id);
      const today = new Date().toISOString().slice(0, 10);
      const filename = `clasloop-${slugify(classObj.name)}-${today}.json`;
      downloadJson(filename, payload);
    } catch (e) {
      setExportError(e?.message || L(t, "exportFailed"));
    } finally {
      setExporting(false);
    }
  };

  // ── Delete handler ────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!classObj) return;
    if (deleteTyped.trim() !== (classObj.name || "").trim()) {
      setDeleteError(L(t, "errorTypeMismatch"));
      return;
    }
    setDeleteError("");
    setDeletePhase("busy");
    const { error: err } = await supabase
      .from("classes")
      .delete()
      .eq("id", classObj.id);
    if (err) {
      setDeletePhase("confirm");
      setDeleteError(err.message || L(t, "errorDeleteFailed"));
      return;
    }
    onDeleted && onDeleted();
  };

  // Disable the close button while a destructive operation is in flight so
  // the teacher can't dismiss mid-delete and end up in an inconsistent UI.
  const closeDisabled = deletePhase === "busy";

  // Substitute counts into the warning copy.
  const warningBody = useMemo(() => {
    return L(t, "deleteWarningBody")
      .replace("{units}", String(unitsCount))
      .replace("{decks}", String(decksCount));
  }, [t, unitsCount, decksCount]);

  return (
    <div
      onClick={closeDisabled ? undefined : onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        zIndex: 100, padding: 20, overflowY: "auto",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="ns-fade"
        style={{
          background: C.bg,
          borderRadius: 14,
          padding: 24,
          maxWidth: 520,
          width: "100%",
          marginTop: 40,
          marginBottom: 40,
          boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
          fontFamily: "'Outfit',sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8, color: C.text }}>
            <CIcon name="school" size={20} inline /> {L(t, "title")}
          </h3>
          {!closeDisabled && (
            <button
              onClick={onClose}
              aria-label={L(t, "close")}
              style={{
                width: 30, height: 30, borderRadius: 8,
                background: "transparent",
                border: `1px solid ${C.border}`,
                cursor: "pointer",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                color: C.textMuted,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* ── Edit form ───────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 6 }}>
              {L(t, "className")}
            </label>
            <input
              value={name}
              onChange={e => { setName(e.target.value); if (error) setError(""); }}
              placeholder={L(t, "classNamePlaceholder")}
              style={inp}
              maxLength={120}
              autoFocus
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 6 }}>
                {L(t, "classSubject")}
              </label>
              <select value={subject} onChange={e => setSubject(e.target.value)} style={sel}>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 6 }}>
                {L(t, "classGrade")}
              </label>
              <input
                value={grade}
                onChange={e => setGrade(e.target.value)}
                placeholder={L(t, "classGradePlaceholder")}
                style={inp}
                maxLength={40}
              />
            </div>
          </div>

          {error && <p style={{ fontSize: 12, color: C.red, margin: 0 }}>{error}</p>}

          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              style={{
                flex: 1,
                padding: "10px 18px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                background: (!dirty || saving)
                  ? C.bgSoft
                  : `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
                color: (!dirty || saving) ? C.textMuted : "#fff",
                border: "none",
                cursor: (!dirty || saving) ? "default" : "pointer",
                fontFamily: "'Outfit',sans-serif",
              }}
            >
              {saving ? L(t, "saving") : (savedFlash ? `✓ ${L(t, "saved")}` : L(t, "save"))}
            </button>
          </div>
        </div>

        {/* ── Export section ──────────────────────────────────────────── */}
        <div style={{
          marginTop: 26,
          paddingTop: 20,
          borderTop: `1px solid ${C.border}`,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>
            {L(t, "exportTitle")}
          </div>
          <p style={{ fontSize: 12, color: C.textSecondary, margin: "0 0 10px", lineHeight: 1.5 }}>
            {L(t, "exportHelp")}
          </p>
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              background: C.bgSoft,
              color: C.text,
              border: `1px solid ${C.border}`,
              cursor: exporting ? "default" : "pointer",
              fontFamily: "'Outfit',sans-serif",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {exporting ? L(t, "exporting") : L(t, "exportButton")}
          </button>
          {exportError && (
            <p style={{ fontSize: 11, color: C.red, marginTop: 6, marginBottom: 0 }}>{exportError}</p>
          )}
        </div>

        {/* ── Danger zone ─────────────────────────────────────────────── */}
        <div style={{
          marginTop: 22,
          paddingTop: 20,
          borderTop: `1px solid ${C.border}`,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.textSecondary, marginBottom: 10, letterSpacing: ".02em" }}>
            {L(t, "dangerTitle")}
          </div>

          {deletePhase === "idle" && (
            <button
              onClick={() => { setDeletePhase("confirm"); setDeleteTyped(""); setDeleteError(""); }}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                background: "transparent",
                color: C.red,
                border: `1px solid ${C.red}55`,
                cursor: "pointer",
                fontFamily: "'Outfit',sans-serif",
              }}
            >
              {L(t, "deleteButton")}
            </button>
          )}

          {(deletePhase === "confirm" || deletePhase === "busy") && (
            <div
              className="ns-fade"
              style={{
                background: C.bg,
                border: `1px solid ${C.red}66`,
                borderRadius: 10,
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.red, marginBottom: 4 }}>
                  ⚠ {L(t, "deleteWarningTitle")}
                </div>
                <p style={{ fontSize: 12, color: C.text, margin: 0, lineHeight: 1.5 }}>
                  {warningBody}
                </p>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.textSecondary, marginBottom: 5 }}>
                  {L(t, "deleteConfirmLabel")} <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, color: C.text }}>"{classObj?.name}"</span>
                </label>
                <input
                  value={deleteTyped}
                  onChange={e => { setDeleteTyped(e.target.value); if (deleteError) setDeleteError(""); }}
                  disabled={deletePhase === "busy"}
                  placeholder={classObj?.name || ""}
                  style={{
                    ...inp,
                    padding: "8px 12px",
                    fontSize: 13,
                    borderColor: deleteError ? C.red : C.border,
                  }}
                />
                {deleteError && (
                  <p style={{ fontSize: 11, color: C.red, marginTop: 5, marginBottom: 0 }}>{deleteError}</p>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => { setDeletePhase("idle"); setDeleteTyped(""); setDeleteError(""); }}
                  disabled={deletePhase === "busy"}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 500,
                    background: "transparent",
                    color: C.textMuted,
                    border: `1px solid ${C.border}`,
                    cursor: deletePhase === "busy" ? "default" : "pointer",
                    fontFamily: "'Outfit',sans-serif",
                  }}
                >
                  {L(t, "deleteCancel")}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deletePhase === "busy" || deleteTyped.trim() !== (classObj?.name || "").trim()}
                  style={{
                    flex: 1,
                    padding: "8px 14px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    background:
                      deletePhase === "busy" || deleteTyped.trim() !== (classObj?.name || "").trim()
                        ? C.bgSoft
                        : C.red,
                    color:
                      deletePhase === "busy" || deleteTyped.trim() !== (classObj?.name || "").trim()
                        ? C.textMuted
                        : "#fff",
                    border: "none",
                    cursor:
                      deletePhase === "busy" || deleteTyped.trim() !== (classObj?.name || "").trim()
                        ? "default"
                        : "pointer",
                    fontFamily: "'Outfit',sans-serif",
                  }}
                >
                  {deletePhase === "busy" ? L(t, "deleting") : L(t, "deleteConfirm")}
                </button>
              </div>
            </div>
          )}
        </div>

        <style>{`
          @keyframes ns-fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
          .ns-fade { animation: ns-fadeIn .2s ease; }
        `}</style>
      </div>
    </div>
  );
}
