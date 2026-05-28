// src/components/analytics/TopicTrendPanel.jsx
//
// F3 Analytics Studio: tendencia semanal del tema seleccionado en
// TopicMastery. Reusa TrendBarChart sobre topic_detail.weekly_trend.

import { TrendBarChart } from "../charts";
import { formatPercent } from "../../lib/analytics/formatters";

export default function TopicTrendPanel({ topic, data = [], loading = false }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e4e4e7",
        borderRadius: 8,
        padding: 12,
        margin: "10px 0",
      }}
    >
      <div style={{ display: "flex", gap: 12, fontSize: 13, marginBottom: 8 }}>
        <b>Tendencia semanal · {topic}</b>
        <span style={{ marginLeft: "auto", opacity: 0.65, fontSize: 11 }}>
          % correcto · pronóstico/comparar en F4-F5
        </span>
      </div>
      {loading ? (
        <div style={{ height: 180, opacity: 0.45, fontSize: 13, padding: 12 }}>Cargando…</div>
      ) : data.length === 0 ? (
        <div style={{ height: 180, opacity: 0.45, fontSize: 13, padding: 12 }}>
          Sin datos semanales para este tema en la ventana.
        </div>
      ) : (
        <TrendBarChart
          data={data}
          yLabel="% correcto"
          yFormatter={(v) => formatPercent(v)}
        />
      )}
    </div>
  );
}
