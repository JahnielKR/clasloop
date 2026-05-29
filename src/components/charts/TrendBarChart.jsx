// src/components/charts/TrendBarChart.jsx
//
// F1 Analytics Studio: bar chart de tendencia (estilo Semrush).
// Recibe datos de useClassTimeseries: [{ bucket, value, responses_total, unique_participants }].
//
// F4: opcional compareData (mismo shape) → segunda serie translúcida overlay
// del período comparado.
// F5: opcional forecast (mismo shape) → puntos futuros (línea punteada al
// final). Internamente migra a ComposedChart para mezclar Bar + Line.
//
// Back-compat: si forecast y compareData son null, comportamiento idéntico a F1.

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

const ACCENT = "#2563eb";
const COMPARE = "#bfdbfe";       // azul translúcido para el período comparado
const FORECAST = "#7c3aed";      // violeta Cleo para el pronóstico
const AXIS_COLOR = "#94a3b8";

function defaultFormatter(v) {
  return typeof v === "number" ? `${v}` : v;
}

// F8: tooltip rico — valor + delta vs el bucket anterior de la misma serie.
function RichTooltip({ active, payload, label, yFormatter, yLabel, rows }) {
  if (!active || !payload || payload.length === 0) return null;
  const idx = rows.findIndex((r) => r.bucket === label);
  const cur = rows[idx];
  const prev = idx > 0 ? rows[idx - 1] : null;
  const mainEntry = payload.find((p) => p.dataKey === "value") || payload[0];
  const v = mainEntry?.value;
  let deltaNode = null;
  if (cur && prev && typeof cur.value === "number" && typeof prev.value === "number") {
    const d = Math.round((cur.value - prev.value) * 10) / 10;
    const tone = d > 0 ? "#15803d" : d < 0 ? "#b91c1c" : "#71717a";
    const sign = d > 0 ? "▲ +" : d < 0 ? "▼ " : "→ ";
    deltaNode = (
      <div style={{ color: tone, fontSize: 11, marginTop: 2 }}>
        {sign}{Math.abs(d)} vs bucket anterior
      </div>
    );
  }
  const compareEntry = payload.find((p) => p.dataKey === "compare_value");
  return (
    <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 6, fontSize: 12, padding: "6px 10px" }}>
      <div style={{ fontWeight: 600 }}>{label}</div>
      <div>{yLabel}: <b>{yFormatter(v)}</b></div>
      {compareEntry && (
        <div style={{ color: "#2563eb", fontSize: 11 }}>
          Período anterior: {yFormatter(compareEntry.value)}
        </div>
      )}
      {deltaNode}
    </div>
  );
}

export default function TrendBarChart({
  data = [],
  compareData = null,
  forecast = null,
  yLabel = "valor",
  yFormatter = defaultFormatter,
  height = 180,
}) {
  // Construir un dataset combinado para que recharts comparta el eje X.
  //  - Filas históricas: value + compare_value (si aplica).
  //  - Filas de pronóstico (al final): solo forecast_value.
  // Cada fila lleva una bandera para que tooltip/legend filtren correctamente.
  const baseRows = data.map((d, i) => {
    const row = { ...d };
    if (compareData) row.compare_value = compareData[i]?.value ?? null;
    return row;
  });
  const forecastRows = (forecast ?? []).map((f) => ({
    bucket: f.bucket,
    forecast_value: f.value,
  }));
  const merged = [...baseRows, ...forecastRows];

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={merged} margin={{ top: 8, right: 4, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
          <XAxis
            dataKey="bucket"
            tick={{ fill: AXIS_COLOR, fontSize: 11 }}
            axisLine={{ stroke: "#e4e4e7" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={yFormatter}
            tick={{ fill: AXIS_COLOR, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={42}
          />
          <Tooltip
            cursor={{ fill: "#eff6ff" }}
            content={(props) => (
              <RichTooltip {...props} yFormatter={yFormatter} yLabel={yLabel} rows={merged} />
            )}
          />
          {compareData && <Bar dataKey="compare_value" fill={COMPARE} radius={[2, 2, 0, 0]} />}
          <Bar dataKey="value" fill={ACCENT} radius={[3, 3, 0, 0]} />
          {forecast && forecast.length > 0 && (
            <Line
              type="monotone"
              dataKey="forecast_value"
              stroke={FORECAST}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{ r: 3, fill: FORECAST, strokeWidth: 0 }}
              isAnimationActive={false}
              connectNulls
            />
          )}
          {(compareData || (forecast && forecast.length > 0)) && (
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
              formatter={(value) => {
                if (value === "compare_value") return "Período anterior";
                if (value === "forecast_value") return "Pronóstico Cleo";
                return yLabel;
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
