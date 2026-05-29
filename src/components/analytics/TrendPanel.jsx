// src/components/analytics/TrendPanel.jsx
//
// F1 Analytics Studio: tendencia temporal del Class Detail.
// F4: compare overlay.
// F5: forecast band — proyección Cleo de los próximos 3 buckets.

import { TrendBarChart } from "../charts";
import {
  formatPercent,
  formatNumber,
  formatDurationShort,
} from "../../lib/analytics/formatters";
import { forecastPoints } from "../../lib/analytics/forecast";
import { C } from "../tokens";

const METRICS = [
  { id: "pct_correct", label: "% correcto", formatter: (v) => formatPercent(v), clampMin: 0, clampMax: 100 },
  { id: "avg_time", label: "Tiempo medio", formatter: (v) => formatDurationShort(v), clampMin: 0 },
  { id: "participation", label: "Participación", formatter: (v) => formatNumber(v), clampMin: 0 },
];

export default function TrendPanel({
  metric = "pct_correct",
  onMetricChange,
  data = [],
  compareData = null,
  loading = false,
}) {
  const def = METRICS.find((m) => m.id === metric) || METRICS[0];
  // F5: forecast los próximos 3 días (mismo granularity que el chart).
  // Se omite cuando hay <3 puntos (forecastPoints devuelve []).
  const forecast = forecastPoints(data, 3, {
    clampMin: def.clampMin,
    clampMax: def.clampMax,
  });

  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
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
                borderBottom: active ? `2px solid ${C.accent}` : "2px solid transparent",
                fontWeight: active ? 700 : 400,
                opacity: active ? 1 : 0.55,
                cursor: "pointer",
              }}
            >
              {m.label}
            </button>
          );
        })}
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
          forecast={forecast}
          yLabel={def.label}
          yFormatter={def.formatter}
        />
      )}
    </div>
  );
}
