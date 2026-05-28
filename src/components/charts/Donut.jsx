// src/components/charts/Donut.jsx
//
// F1 Analytics Studio: donut chart primitivo genérico (estilo Semrush).
//
// Props:
//   data: [{ name: string, value: number, color: string }]
//   centerLabel: string opcional para el texto principal del centro
//   centerSubLabel: string opcional para el texto secundario del centro
//   height: number (default 160)

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

export default function Donut({
  data = [],
  centerLabel,
  centerSubLabel,
  height = 160,
}) {
  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="90%"
            startAngle={90}
            endAngle={-270}
            paddingAngle={1}
            stroke="none"
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              border: "1px solid #e4e4e7",
              borderRadius: 6,
              fontSize: 12,
              padding: "6px 10px",
            }}
            formatter={(value, name) => [value, name]}
          />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerSubLabel) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          {centerLabel && (
            <div style={{ fontSize: 22, fontWeight: 700 }}>{centerLabel}</div>
          )}
          {centerSubLabel && (
            <div style={{ fontSize: 11, opacity: 0.55 }}>{centerSubLabel}</div>
          )}
        </div>
      )}
    </div>
  );
}
