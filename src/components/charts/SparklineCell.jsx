// src/components/charts/SparklineCell.jsx
//
// F1 Analytics Studio: spark mini-chart inline para filas de tabla.
// SVG polyline simple, sin recharts (más liviano para muchas filas).
//
// Props:
//   points: number[]    valores en orden cronológico (any range — se escala al min/max).
//   color: string       línea (default azul de marca)
//   width / height: ints
//   "trend"?: "up"|"down"|"flat"|"new" — si se pasa, ignora 'color' y pinta verde/rojo/gris.

import { C } from "../tokens";

const TREND_COLORS = {
  up: C.green,
  down: C.red,
  flat: C.textMuted,
  new: C.textMuted,
};

export default function SparklineCell({
  points = [],
  color = C.accent,
  trend,
  width = 80,
  height = 18,
}) {
  if (points.length < 2) {
    return (
      <span style={{ display: "inline-block", width, height, opacity: 0.4, fontSize: 11 }}>
        —
      </span>
    );
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stride = width / (points.length - 1);
  const coords = points
    .map((p, i) => {
      const x = i * stride;
      const y = height - ((p - min) / range) * (height - 2) - 1;
      return `${x},${y}`;
    })
    .join(" ");
  const strokeColor = trend ? TREND_COLORS[trend] || color : color;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width, height, display: "inline-block", verticalAlign: "middle" }}
      aria-hidden
    >
      <polyline
        points={coords}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
