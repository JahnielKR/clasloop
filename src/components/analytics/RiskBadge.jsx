// src/components/analytics/RiskBadge.jsx
//
// F5 Analytics Studio: badge "Riesgo bajo/medio/alto" para roster + cards.
// Color sigue el patrón retention tier de scoring-thresholds.ts pero
// orientado a riesgo (verde = bajo, rojo = alto).

import { C } from "../tokens";

const COLOR_BY_LEVEL = {
  low:  { bg: C.greenSoft,  fg: C.green,  label: "Bajo" },
  med:  { bg: C.orangeSoft, fg: C.orange, label: "Medio" },
  high: { bg: C.redSoft,    fg: C.red,    label: "Alto" },
};

export default function RiskBadge({ level = "low", score = null, compact = false }) {
  const c = COLOR_BY_LEVEL[level] || COLOR_BY_LEVEL.low;
  return (
    <span
      title={score != null ? `Score: ${score}/100` : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: c.bg,
        color: c.fg,
        padding: compact ? "1px 6px" : "2px 8px",
        borderRadius: 999,
        fontSize: compact ? 11 : 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {compact ? c.label : `Riesgo ${c.label.toLowerCase()}`}
      {!compact && score != null && (
        <span style={{ opacity: 0.65, fontWeight: 400 }}>· {score}</span>
      )}
    </span>
  );
}
