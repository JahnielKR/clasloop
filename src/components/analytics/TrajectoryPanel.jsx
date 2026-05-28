// src/components/analytics/TrajectoryPanel.jsx
//
// F2 Analytics Studio: trayectoria temporal del Student Profile.
// Bar chart semanal del % correcto. F5 agrega forecast + comparar.

import { TrendBarChart } from "../charts";
import { formatPercent } from "../../lib/analytics/formatters";
import { forecastPoints } from "../../lib/analytics/forecast";

export default function TrajectoryPanel({
  data = [],
  compareData = null,
  loading = false,
}) {
  const forecast = forecastPoints(data, 3, { clampMin: 0, clampMax: 100 });
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
        <b>Trayectoria · % correcto semanal</b>
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
          yLabel="% correcto"
          yFormatter={(v) => formatPercent(v)}
        />
      )}
    </div>
  );
}
