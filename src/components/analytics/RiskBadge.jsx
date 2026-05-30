// src/components/analytics/RiskBadge.jsx
//
// F5 Analytics Studio: badge "Riesgo bajo/medio/alto" para roster + cards.
// Color sigue el patrón retention tier de scoring-thresholds.ts pero
// orientado a riesgo (verde = bajo, rojo = alto).

import { C } from "../tokens";
import { useLang } from "../../i18n/LanguageContext";
import { useT } from "../../i18n";

const COLOR_BY_LEVEL = {
  low:  { bg: C.greenSoft,  fg: C.green },
  med:  { bg: C.orangeSoft, fg: C.orange },
  high: { bg: C.redSoft,    fg: C.red },
};

export default function RiskBadge({ level = "low", score = null, compact = false }) {
  const tr = useT("studioCommon", useLang());
  const labelByLevel = { low: tr.riskLow, med: tr.riskMedium, high: tr.riskHigh };
  const fullByLevel = { low: tr.riskLevelLow, med: tr.riskLevelMedium, high: tr.riskLevelHigh };
  const c = COLOR_BY_LEVEL[level] || COLOR_BY_LEVEL.low;
  const label = labelByLevel[level] || labelByLevel.low;
  const fullLabel = fullByLevel[level] || fullByLevel.low;
  return (
    <span
      title={score != null ? tr.riskScoreTitle(score) : undefined}
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
      {compact ? label : fullLabel}
      {!compact && score != null && (
        <span style={{ opacity: 0.65, fontWeight: 400 }}>· {score}</span>
      )}
    </span>
  );
}
