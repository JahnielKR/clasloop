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

const TONE_BG = {
  good: "#dcfce7",
  bad: "#fee2e2",
  neutral: "#f4f4f5",
};
const TONE_COLOR = {
  good: "#15803d",
  bad: "#b91c1c",
  neutral: "#52525b",
};

export default function StatCardWithSparkline({
  label,
  value,
  delta = null,
  sparkPoints,
  sparkTrend,
  tone = "default",
}) {
  return (
    <div
      style={{
        flex: 1,
        background: "#fff",
        border:
          tone === "danger"
            ? "1px solid #fecaca"
            : "1px solid #e4e4e7",
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
        <span style={{ fontSize: 24, fontWeight: 700 }}>{value}</span>
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
