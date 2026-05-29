// src/components/analytics/StatCardWithSparkline.jsx
//
// F1 Analytics Studio: una stat card del look Semrush.
// label + número grande + chip de delta opcional + spark line opcional.
//
// Props:
//   label: string ("Retención", "Participación", …)
//   value: string (ya pre-formateado: "78%", "27/30", "14", "—")
//   delta: { sign: "▲"|"▼"|"→"|null, label: string, tone: "good"|"bad"|"neutral" } | null
//   sparkPoints: number[] | undefined
//   sparkTrend: "up"|"down"|"flat"|"new" | undefined
//   tone: "default" | "danger" (cambia el borde de la card)

import { SparklineCell } from "../charts";
import { C } from "../tokens";

const TONE_BG = {
  good: C.greenSoft,
  bad: C.redSoft,
  neutral: C.bgSoft,
};
const TONE_COLOR = {
  good: C.green,
  bad: C.red,
  neutral: C.textSecondary,
};

export default function StatCardWithSparkline({
  label,
  value,
  delta = null,
  sparkPoints,
  sparkTrend,
  tone = "default",
  hint = null,
}) {
  return (
    <div
      style={{
        flex: 1,
        background: C.bg,
        border:
          tone === "danger"
            ? `1px solid ${C.red}`
            : `1px solid ${C.border}`,
        borderRadius: 8,
        padding: 14,
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          opacity: 0.55,
          letterSpacing: ".05em",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
        <span style={{ fontSize: 24, fontWeight: 700 }} title={hint || undefined}>{value}</span>
        {delta && (
          <span
            style={{
              background: TONE_BG[delta.tone] || TONE_BG.neutral,
              color: TONE_COLOR[delta.tone] || TONE_COLOR.neutral,
              padding: "1px 6px",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {delta.label}
          </span>
        )}
      </div>
      {sparkPoints && sparkPoints.length > 1 && (
        <div style={{ marginTop: 6 }}>
          <SparklineCell
            points={sparkPoints}
            trend={sparkTrend}
            width={140}
            height={22}
          />
        </div>
      )}
    </div>
  );
}
