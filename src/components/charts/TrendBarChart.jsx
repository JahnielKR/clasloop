// src/components/charts/TrendBarChart.jsx
//
// F1 Analytics Studio: bar chart de tendencia (estilo Semrush).
// Recibe datos de useClassTimeseries: [{ bucket, value, responses_total, unique_participants }].
//
// F4: opcional compareData (mismo shape) → segunda serie translúcida overlay
// del período comparado. Tooltip + Legend etiqueta la serie como
// "Período anterior". Back-compat: si compareData es null, comportamiento
// idéntico a F1.

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

const ACCENT = "#2563eb";
const COMPARE = "#bfdbfe"; // azul translúcido para el período comparado
const AXIS_COLOR = "#94a3b8";

function defaultFormatter(v) {
  return typeof v === "number" ? `${v}` : v;
}

export default function TrendBarChart({
  data = [],
  compareData = null,
  yLabel = "valor",
  yFormatter = defaultFormatter,
  height = 180,
}) {
  // Merge by index para que recharts comparta el eje x. Si compareData
  // no está, renderiza solo la serie principal (back-compat con F1/F3).
  const merged = compareData
    ? data.map((d, i) => ({
        ...d,
        compare_value: compareData[i]?.value ?? null,
      }))
    : data;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={merged} margin={{ top: 8, right: 4, bottom: 4, left: 0 }}>
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
            contentStyle={{
              border: "1px solid #e4e4e7",
              borderRadius: 6,
              fontSize: 12,
              padding: "6px 10px",
            }}
            formatter={(value, name) => {
              if (name === "compare_value") return [yFormatter(value), "Período anterior"];
              return [yFormatter(value), yLabel];
            }}
            labelFormatter={(label) => `${label}`}
          />
          {compareData && <Bar dataKey="compare_value" fill={COMPARE} radius={[2, 2, 0, 0]} />}
          <Bar dataKey="value" fill={ACCENT} radius={[3, 3, 0, 0]} />
          {compareData && (
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
              formatter={(value) => (value === "compare_value" ? "Período anterior" : yLabel)}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
