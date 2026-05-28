// src/components/analytics/TrendPanel.jsx
//
// F1 Analytics Studio: tendencia temporal del Class Detail.
// Tabs de métrica (pct_correct | avg_time | participation), bar chart
// con tooltips ricos. Forecast band + compare overlay quedan para F4/F5.
//
// Props:
//   metric, onMetricChange — controlado por el padre (que también
//   re-fetches via useClassTimeseries con el nuevo metric).
//   data: array del hook, [{ bucket, value, responses_total, unique_participants }]
//   loading: boolean

import { TrendBarChart } from "../charts";
// Import explícito: el barrel `../../lib/analytics` choca con
// `src/lib/analytics.ts` (PostHog wrapper, PR 69). Ver KpiBand.jsx.
import {
  formatPercent,
  formatNumber,
  formatDurationShort,
} from "../../lib/analytics/formatters";

const METRICS = [
  { id: "pct_correct", label: "% correcto", formatter: (v) => formatPercent(v) },
  { id: "avg_time", label: "Tiempo medio", formatter: (v) => formatDurationShort(v) },
  { id: "participation", label: "Participación", formatter: (v) => formatNumber(v) },
];

export default function TrendPanel({
  metric = "pct_correct",
  onMetricChange,
  data = [],
  compareData = null,
  loading = false,
}) {
  const def = METRICS.find((m) => m.id === metric) || METRICS[0];
  return (
    <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 12 }}>
      <div style={{ display: "flex", gap: 12, fontSize: 13, marginBottom: 8 }}>
        {METRICS.map((m) => {
          const active = m.id === metric;
          return (
            <button
              key={m.id}
              onClick={() => onMetricChange?.(m.id)}
              style={{
                background: "transparent",
                border: "none",
                padding: "2px 0",
                borderBottom: active ? "2px solid #2563eb" : "2px solid transparent",
                fontWeight: active ? 700 : 400,
                opacity: active ? 1 : 0.55,
                cursor: "pointer",
              }}
            >
              {m.label}
            </button>
          );
        })}
        <span style={{ marginLeft: "auto", opacity: 0.65, fontSize: 11 }}>
          — pronóstico llega en F5
        </span>
      </div>
      {loading ? (
        <div style={{ height: 180, opacity: 0.45, fontSize: 13, padding: 12 }}>
          Cargando…
        </div>
      ) : data.length === 0 ? (
        <div style={{ height: 180, opacity: 0.45, fontSize: 13, padding: 12 }}>
          Sin datos en esta ventana.
        </div>
      ) : (
        <TrendBarChart
          data={data}
          compareData={compareData}
          yLabel={def.label}
          yFormatter={def.formatter}
        />
      )}
    </div>
  );
}
