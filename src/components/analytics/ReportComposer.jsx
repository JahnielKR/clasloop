// src/components/analytics/ReportComposer.jsx
//
// Ola B: report composer with the design system. Sections are selectable cards
// (label + description + ✓) that can be reordered with ↑/↓; period is segmented
// chips. Lightly controlled — emits the draft on every change for the live
// preview. i18n: useT("reports").

import { useEffect, useMemo, useState } from "react";
import { C } from "../tokens";
import { FieldLabel } from "../forms/FieldLabel";
import { inputStyle, selectStyle } from "../forms/field-styles";
import { selectableCard, selectableChip, selectedCheckStyle } from "../ui/selectable";
import Button from "../ui/Button";
import { REPORT_SECTIONS, moveSection } from "../../lib/analytics/report-sections";
import { useLang } from "../../i18n/LanguageContext";
import { useT } from "../../i18n";

const PERIODS = ["d7", "d30", "d90"];

const arrowBtn = (disabled) => ({
  width: 24, height: 24, borderRadius: 6, border: `1px solid ${C.border}`,
  background: C.bg, color: disabled ? C.textMuted : C.textSecondary,
  cursor: disabled ? "not-allowed" : "pointer", fontSize: 12, lineHeight: 1,
});

export default function ReportComposer({ classes = [], onSave, saving = false, onDraftChange }) {
  const t = useT("reports", useLang());
  const [name, setName] = useState("");
  const [classId, setClassId] = useState(classes[0]?.class_id || "");
  const [period, setPeriod] = useState("d30");
  // sections = ordered array of included ids; starts with all 3 in catalog order.
  const [sections, setSections] = useState(REPORT_SECTIONS.map((s) => s.id));

  const periodLabel = useMemo(
    () => ({ d7: t.periodD7, d30: t.periodD30, d90: t.periodD90 }),
    [t],
  );

  const draft = useMemo(
    () => ({ name: name.trim(), classId, period, sections }),
    [name, classId, period, sections],
  );

  // Emit the draft whenever it changes so the preview can follow.
  useEffect(() => {
    onDraftChange?.(draft);
  }, [draft, onDraftChange]);

  function toggle(id) {
    setSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }
  function move(id, dir) {
    setSections((prev) => moveSection(prev, id, dir));
  }

  const valid = name.trim() && classId && sections.length > 0;

  // Render the cards in the current section order; excluded ids go after,
  // in catalog order, so they remain reachable to re-add.
  const excluded = REPORT_SECTIONS.map((s) => s.id).filter((id) => !sections.includes(id));
  const renderOrder = [...sections, ...excluded];
  const meta = (id) => REPORT_SECTIONS.find((s) => s.id === id);

  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{t.newReport}</div>

      <FieldLabel>{t.name}</FieldLabel>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t.namePlaceholder}
        style={{ ...inputStyle, marginBottom: 12 }}
      />

      <FieldLabel>{t.classLabel}</FieldLabel>
      <select value={classId} onChange={(e) => setClassId(e.target.value)} style={{ ...selectStyle, marginBottom: 12 }}>
        {classes.map((c) => (
          <option key={c.class_id} value={c.class_id}>{c.class_name || c.class_id}</option>
        ))}
      </select>

      <FieldLabel>{t.period}</FieldLabel>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            className="cl-selectable"
            onClick={() => setPeriod(p)}
            aria-pressed={period === p}
            style={{ padding: "4px 11px", borderRadius: 6, fontSize: 13, cursor: "pointer", ...selectableChip(period === p) }}
          >
            {periodLabel[p]}
          </button>
        ))}
      </div>

      <FieldLabel>{t.sections}</FieldLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {renderOrder.map((id) => {
          const m = meta(id);
          const included = sections.includes(id);
          const pos = sections.indexOf(id);
          return (
            <div
              key={id}
              className="cl-selectable"
              onClick={() => toggle(id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(id); } }}
              style={{ position: "relative", borderRadius: 8, padding: "10px 12px", cursor: "pointer", ...selectableCard(included) }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{t[m.labelKey]}</div>
                  <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>{t[m.descKey]}</div>
                </div>
                {included && (
                  <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button" aria-label={t.moveUp} title={t.moveUp}
                      disabled={pos <= 0}
                      onClick={() => move(id, "up")}
                      style={arrowBtn(pos <= 0)}
                    >↑</button>
                    <button
                      type="button" aria-label={t.moveDown} title={t.moveDown}
                      disabled={pos >= sections.length - 1}
                      onClick={() => move(id, "down")}
                      style={arrowBtn(pos >= sections.length - 1)}
                    >↓</button>
                  </div>
                )}
                {included && (
                  <span style={{ ...selectedCheckStyle(), width: 18, height: 18, fontSize: 12, flexShrink: 0 }}>✓</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Button onClick={() => valid && onSave?.(draft)} disabled={!valid || saving}>
        {saving ? t.saving : t.save}
      </Button>
    </div>
  );
}
