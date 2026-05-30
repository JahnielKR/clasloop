// ─── Create Class Modal ─────────────────────────────────────────────────
// Shared modal for creating a new class. Used by:
//   - MyClassesTeacher (primary entry point — "+ New class" button)
//   - SessionFlow (legacy ?createClass=1 URL handler)
//
// On success calls onCreated(newClass) with the inserted row. The class_code
// is generated server-side via the public.generate_class_code(p_subject, p_grade)
// SQL RPC, which produces friendly codes like "MATH-8B" and guarantees
// uniqueness across all classes.

import { useState } from "react";
import { createClass } from "../lib/classes";
import { CIcon } from "./Icons";
import { C, SCRIM } from "./tokens";
import Button from "./ui/Button";
import { SUBJECTS } from "../lib/constants";
import Modal from "./Modal";

import { inputStyle as inp, selectStyle as sel } from "./forms/field-styles";
import { FieldLabel } from "./forms/FieldLabel";

// i18n is passed in by the caller (each parent already has its own dictionary).
// Required keys: createClass, className, classNamePlaceholder, classSubject,
// classGrade, classGradePlaceholder, cancel, classCreate, creating.
export default function CreateClassModal({ userId, t, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("Math");
  const [grade, setGrade] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim() || !grade.trim()) { setError(t.classNamePlaceholder); return; }
    setError("");
    setCreating(true);
    const { class: created, error: err } = await createClass({
      teacherId: userId,
      name,
      subject,
      grade,
    });
    setCreating(false);
    if (err || !created) { setError(err || "Could not create class"); return; }
    onCreated(created);
  };

  return (
    <Modal
      open
      onClose={onClose}
      role="dialog"
      ariaLabelledBy="create-class-title"
      backdropStyle={{
        position: "fixed", inset: 0, background: SCRIM,
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100, padding: 20,
      }}
      dialogClassName="ns-fade"
      dialogStyle={{ background: C.bg, borderRadius: 14, padding: 24, maxWidth: 460, width: "100%", boxShadow: "0 12px 40px rgba(0,0,0,0.15)" }}
    >
      <h3 id="create-class-title" style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, fontFamily: "'Outfit',sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
        <CIcon name="school" size={20} inline /> {t.createClass}
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <FieldLabel>{t.className}</FieldLabel>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t.classNamePlaceholder}
            autoFocus
            style={inp}
            onKeyDown={e => { if (e.key === "Enter" && !creating) handleCreate(); }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
          <div>
            <FieldLabel>{t.classSubject}</FieldLabel>
            <select value={subject} onChange={e => setSubject(e.target.value)} style={sel}>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>{t.classGrade}</FieldLabel>
            <input
              value={grade}
              onChange={e => setGrade(e.target.value)}
              placeholder={t.classGradePlaceholder}
              style={inp}
              onKeyDown={e => { if (e.key === "Enter" && !creating) handleCreate(); }}
            />
          </div>
        </div>

        {error && <p style={{ fontSize: 12, color: C.red, margin: 0 }}>{error}</p>}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <Button variant="secondary" onClick={onClose}>{t.cancel}</Button>
        <Button variant="gradient" onClick={handleCreate} loading={creating} style={{ flex: 1 }}>
          {t.classCreate}
        </Button>
      </div>
    </Modal>
  );
}
