// src/components/analytics/ReportComposer.jsx
//
// F7 Analytics Studio: el "composer" de reportes. NO es un drag-drop canvas
// (ver plan §out-of-scope) — es selección: clase + período + qué secciones
// incluir + nombre. Al guardar, persiste el model en analytics_reports.

import { useState } from "react";
import { SECTION_TYPES } from "../../lib/analytics/report-model";

const PERIODS = [
  { id: "d7", label: "7 días" },
  { id: "d30", label: "30 días" },
  { id: "d90", label: "90 días" },
];

export default function ReportComposer({ classes = [], onSave, saving = false }) {
  const [name, setName] = useState("");
  const [classId, setClassId] = useState(classes[0]?.class_id || "");
  const [period, setPeriod] = useState("d30");
  const [sections, setSections] = useState(SECTION_TYPES.map((s) => s.id));

  function toggleSection(id) {
    setSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function handleSave() {
    if (!name.trim() || !classId || sections.length === 0) return;
    onSave?.({ name: name.trim(), classId, period, sections });
  }

  const valid = name.trim() && classId && sections.length > 0;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e4e4e7",
        borderRadius: 8,
        padding: 16,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
        Nuevo reporte
      </div>

      <label style={labelStyle}>Nombre</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ej: Reporte mensual 5to A"
        style={inputStyle}
      />

      <label style={labelStyle}>Clase</label>
      <select
        value={classId}
        onChange={(e) => setClassId(e.target.value)}
        style={inputStyle}
      >
        {classes.map((c) => (
          <option key={c.class_id} value={c.class_id}>
            {c.class_name || c.class_id}
          </option>
        ))}
      </select>

      <label style={labelStyle}>Período</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            style={{
              padding: "4px 11px",
              borderRadius: 6,
              fontSize: 13,
              border: "1px solid #e4e4e7",
              background: period === p.id ? "#2563eb" : "#fff",
              color: period === p.id ? "#fff" : "inherit",
              cursor: "pointer",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <label style={labelStyle}>Secciones</label>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          marginBottom: 14,
        }}
      >
        {SECTION_TYPES.map((s) => (
          <label
            key={s.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={sections.includes(s.id)}
              onChange={() => toggleSection(s.id)}
            />
            {s.label}
          </label>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={!valid || saving}
        style={{
          padding: "8px 16px",
          borderRadius: 8,
          border: "none",
          background: valid ? "#2563eb" : "#e4e4e7",
          color: valid ? "#fff" : "#a1a1aa",
          fontSize: 14,
          fontWeight: 600,
          cursor: valid && !saving ? "pointer" : "not-allowed",
        }}
      >
        {saving ? "Guardando…" : "Guardar reporte"}
      </button>
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#71717a",
  marginBottom: 4,
  marginTop: 8,
};
const inputStyle = {
  width: "100%",
  padding: "6px 10px",
  fontSize: 13,
  borderRadius: 6,
  border: "1px solid #e4e4e7",
  marginBottom: 8,
  boxSizing: "border-box",
};
