// src/components/analytics/PeriodChips.jsx
//
// F0 Analytics Studio: chips de período al estilo Semrush (7d / 30d / 90d / Custom).
// Controlado por el padre via { value, onChange }. value es 'd7'|'d30'|'d90'|'custom'.
//
// Custom abre un date-range picker en una fase posterior (F4 cuando se
// active el toggle Comparar con períodos arbitrarios). En F0 solo dispara
// onChange('custom') y el padre puede ignorarlo.
// i18n: el label "Custom" y el aria-label salen de useT("studioCommon").

import { C } from "../tokens";
import { useLang } from "../../i18n/LanguageContext";
import { useT } from "../../i18n";

export default function PeriodChips({ value = "d30", onChange }) {
  const t = useT("studioCommon", useLang());
  const PERIODS = [
    { id: "d7", label: "7d" },
    { id: "d30", label: "30d" },
    { id: "d90", label: "90d" },
    { id: "custom", label: t.periodCustom },
  ];
  return (
    <div
      role="tablist"
      aria-label={t.periodRangeLabel}
      style={{
        display: "inline-flex",
        gap: 4,
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: 3,
      }}
    >
      {PERIODS.map((p) => {
        const active = p.id === value;
        return (
          <button
            key={p.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(p.id)}
            style={{
              padding: "4px 11px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: active ? 600 : 400,
              background: active ? C.accent : "transparent",
              color: active ? "#fff" : "inherit",
              border: "none",
              cursor: "pointer",
            }}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
