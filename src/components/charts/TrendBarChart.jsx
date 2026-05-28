// src/components/charts/TrendBarChart.jsx
//
// F1 Analytics Studio: bar chart de tendencia (estilo Semrush).
// Recibe datos de useClassTimeseries: [{ bucket, value, responses_total, unique_participants }].
//
// Props:
//   data: array as above
//   yLabel: string para tooltip (ej. "% correcto")
//   yFormatter: (value:number)=>string para tooltip + eje (default: x => `${x}`)
//
// Forecast band, compare overlay y brush quedan para fases posteriores (F4/F5).

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const ACCENT = "#2563eb";
const AXIS_COLOR = "#94a3b8";

function defaultFormatter(v) {
  return typeof v === "number" ? `${v}` : v;
}

export default function TrendBarChart({
  data = [],
  yLabel = "valor",
  yFormatter = defaultFormatter,
  height = 180,
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 4, left: 0 }}>
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
            formatter={(value) => [yFormatter(value), yLabel]}
            labelFormatter={(label) => `${label}`}
          />
          <Bar dataKey="value" fill={ACCENT} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
