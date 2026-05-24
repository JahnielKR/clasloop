// ─── PR 25.1: DayDateModal ──────────────────────────────────────────────
//
// Modal that asks the teacher to assign (or change) a calendar date
// to a specific day of a unit. Used in two flows:
//
//   1. Pre-creation flow: teacher clicked "+ Add Day N" in PlanView but
//      the day has no date yet. The modal opens FIRST; once the date
//      is saved, control flows back to the caller which then opens
//      the existing AddToSlotModal.
//
//   2. Edit flow: teacher clicked the date chip in a day header.
//      The modal opens prefilled with the current date.
//
// Auto-suggest: when there's no current date but other days in the
// unit already have dates, the picker defaults to "latest existing
// date + 1, skipping weekends". Falls back to today otherwise.
//
// i18n: PR 73 movió las strings a src/i18n/ (namespace "dayDateModal").

import { useEffect, useState, useMemo } from "react";
import { C } from "./tokens";
import Modal from "./Modal";
import { setDayDate, getDayDate, suggestNextDayDate } from "../lib/class-hierarchy";
// PR 73: i18n centralizado
import { useT } from "../i18n";

// PR 73: el bloque i18n local fue movido a src/i18n/{en,es,ko}.js
// bajo el namespace "dayDateModal". Se accede vía useT() en el componente.

// Convert a Date to "YYYY-MM-DD" string in local TZ (NOT UTC).
// The native <input type="date"> expects this exact format.
function toLocalDateInputValue(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Parse "YYYY-MM-DD" into a Date at local midnight (NOT UTC).
// Using new Date("2026-05-26") would create a UTC date which can
// shift by a day in negative timezones — building from parts avoids
// that.
function fromLocalDateInputValue(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export default function DayDateModal({
  open,
  unit,         // the unit being edited
  dayNumber,    // 1-based
  lang = "en",
  onClose,
  onSaved,      // called after save with the new Date
}) {
  const t = useT("dayDateModal", lang);

  // Determine current date + suggested default
  const existingDate = useMemo(() => {
    if (!unit || !dayNumber) return null;
    return getDayDate(unit, dayNumber);
  }, [unit, dayNumber]);

  const suggestedDate = useMemo(() => {
    if (existingDate) return existingDate;
    if (!unit) return new Date();
    const sug = suggestNextDayDate(unit);
    return sug || new Date();
  }, [unit, existingDate]);

  const [dateStr, setDateStr] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Reset state every time the modal opens for a different day
  useEffect(() => {
    if (!open) return;
    setDateStr(toLocalDateInputValue(suggestedDate));
    setError("");
    setSaving(false);
  }, [open, suggestedDate]);

  if (!open) return null;

  const isEdit = !!existingDate;
  const title = (isEdit ? t.titleEdit : t.titleAssign).replace("{n}", dayNumber);
  const body = isEdit ? t.bodyEdit : t.bodyAssign;

  // Quick-pick helpers
  const setToday = () => setDateStr(toLocalDateInputValue(new Date()));
  const setTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setDateStr(toLocalDateInputValue(d));
  };
  const setNextWeek = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setDateStr(toLocalDateInputValue(d));
  };

  const handleSave = async () => {
    const parsed = fromLocalDateInputValue(dateStr);
    if (!parsed) { setError(t.errorGeneric); return; }
    setSaving(true);
    setError("");
    const { error: err } = await setDayDate(unit.id, dayNumber, parsed);
    if (err) {
      setError(t.errorGeneric);
      setSaving(false);
      console.error("[clasloop] setDayDate failed:", err);
      return;
    }
    setSaving(false);
    onSaved && onSaved(parsed);
  };

  return (
    <Modal
      open
      onClose={onClose}
      canClose={!saving}
      ariaLabelledBy="daydate-title"
      backdropStyle={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      dialogStyle={{
        background: C.bg,
        borderRadius: 14,
        width: "100%",
        maxWidth: 420,
        padding: "24px 24px 20px",
        boxShadow: "0 18px 60px rgba(0,0,0,0.25)",
        fontFamily: "'Outfit', sans-serif",
      }}
    >
        <h2 id="daydate-title" style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 19, fontWeight: 700,
          margin: "0 0 6px",
          color: C.text,
          letterSpacing: "-0.01em",
        }}>
          {title}
        </h2>
        <p style={{
          fontSize: 13.5, lineHeight: 1.45,
          color: C.textSecondary,
          margin: "0 0 18px",
        }}>
          {body}
        </p>

        {/* Date input — uses native <input type="date"> for best
            cross-browser support and built-in calendar UI. */}
        <input
          type="date"
          value={dateStr}
          onChange={(e) => setDateStr(e.target.value)}
          disabled={saving}
          autoFocus
          style={{
            width: "100%",
            padding: "12px 14px",
            fontSize: 16,
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 600,
            color: C.text,
            background: C.bg,
            border: `1.5px solid ${C.border}`,
            borderRadius: 10,
            outline: "none",
            colorScheme: "light",
          }}
        />

        {/* Quick-pick buttons */}
        <div style={{
          display: "flex",
          gap: 6,
          marginTop: 10,
          flexWrap: "wrap",
        }}>
          {[
            { label: t.quickToday, fn: setToday },
            { label: t.quickTomorrow, fn: setTomorrow },
            { label: t.quickNextWeek, fn: setNextWeek },
          ].map(({ label, fn }) => (
            <button
              key={label}
              type="button"
              onClick={fn}
              disabled={saving}
              style={{
                padding: "6px 12px",
                background: "transparent",
                border: `1px solid ${C.border}`,
                borderRadius: 7,
                fontFamily: "'Outfit', sans-serif",
                fontSize: 12.5,
                fontWeight: 500,
                color: C.textSecondary,
                cursor: "pointer",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.bgSoft; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div style={{
            marginTop: 12,
            padding: "8px 12px",
            background: C.redSoft,
            color: C.red,
            borderRadius: 8,
            fontSize: 13,
          }}>
            {error}
          </div>
        )}

        <div style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          marginTop: 22,
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: "9px 16px",
              background: "transparent",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              fontFamily: "'Outfit', sans-serif",
              fontSize: 14,
              fontWeight: 500,
              color: C.textSecondary,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dateStr}
            style={{
              padding: "9px 20px",
              background: C.accent,
              border: "none",
              borderRadius: 8,
              fontFamily: "'Outfit', sans-serif",
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              cursor: saving ? "wait" : "pointer",
              opacity: (!dateStr || saving) ? 0.6 : 1,
            }}
          >
            {saving ? t.saving : t.save}
          </button>
        </div>
    </Modal>
  );
}
