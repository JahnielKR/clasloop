// src/components/analytics/CompareToggle.jsx
//
// F4 Analytics Studio: toggle "Comparar" en la toolbar de las páginas
// de detalle (ClassDetail / StudentProfile / TopicMastery).
//
// Props:
//   value: 'off' | 'prev'  — 'off' = sin comparar; 'prev' = vs período anterior
//   onChange: (next) => void
//
// Future modes ('class-vs-class', 'student-vs-class-avg') quedan para
// iteraciones posteriores.

import { C } from "../tokens";
import { useLang } from "../../i18n/LanguageContext";
import { useT } from "../../i18n";

export default function CompareToggle({ value = "off", onChange }) {
  const t = useT("classDetail", useLang());
  const active = value === "prev";
  return (
    <button
      onClick={() => onChange?.(active ? "off" : "prev")}
      aria-pressed={active}
      style={{
        padding: "4px 11px",
        borderRadius: 6,
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        background: active ? C.accent : C.bg,
        color: active ? "#fff" : "inherit",
        border: `1px solid ${C.border}`,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span aria-hidden style={{ fontSize: 11 }}>{active ? "✓" : "▦"}</span>
      {t.compare}
    </button>
  );
}
