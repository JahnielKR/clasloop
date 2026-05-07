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
    // Generate friendly code via Supabase RPC (e.g. "MATH-8B").
    const { data: rpcCode, error: rpcErr } = await supabase.rpc("generate_class_code", {
      p_subject: subject,
      p_grade: grade.trim(),
    });
    if (rpcErr || !rpcCode) {
      setCreating(false);
      setError(rpcErr?.message || "Could not generate class code");
      return;
    }
    const { data, error: err } = await supabase.from("classes").insert({
      teacher_id: userId,
      name: name.trim(),
      subject,
      grade: grade.trim(),
      class_code: rpcCode,
    }).select().single();
    setCreating(false);
    if (err) { setError(err.message); return; }
    onCreated(data);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100, padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="ns-fade"
        style={{ background: C.bg, borderRadius: 14, padding: 24, maxWidth: 460, width: "100%", boxShadow: "0 12px 40px rgba(0,0,0,0.15)" }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, fontFamily: "'Outfit',sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
          <CIcon name="school" size={20} inline /> {t.createClass}
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 6 }}>{t.className}</label>
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
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 6 }}>{t.classSubject}</label>
              <select value={subject} onChange={e => setSubject(e.target.value)} style={sel}>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 6 }}>{t.classGrade}</label>
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
          <button
            onClick={onClose}
            style={{
              padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: "transparent", color: C.textMuted,
              border: `1px solid ${C.border}`, cursor: "pointer",
              fontFamily: "'Outfit',sans-serif",
            }}
          >{t.cancel}</button>
          <button
            onClick={handleCreate}
            disabled={creating}
            style={{
              flex: 1,
              padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: creating ? C.bgSoft : `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
              color: creating ? C.textMuted : "#fff",
              border: "none", cursor: creating ? "default" : "pointer",
              fontFamily: "'Outfit',sans-serif",
            }}
          >{creating ? t.creating : t.classCreate}</button>
        </div>
      </div>
    </div>
  );
}
