// src/components/charts/HorizontalBarList.jsx
//
// F1 Analytics Studio: Top-N de barras horizontales (estilo Semrush).
// Sin recharts — un map de divs con width % es más fluido para esto.
//
// Props:
//   items: [{ label: string, value: number, color?: string }]
//   max: number opcional (si no, usa el mayor value del array)
//   valueFormatter: (n)=>string para el texto del valor (default: "${n}%")
//   onItemClick?: (item) => void  — opcional, click drill-down

export default function HorizontalBarList({
  items = [],
  max,
  valueFormatter = (n) => `${n}%`,
  onItemClick,
}) {
  const cap = max ?? Math.max(1, ...items.map((i) => i.value || 0));
  return (
    <div style={{ fontSize: 13, lineHeight: 1.7 }}>
      {items.map((item, idx) => {
        const pct = Math.min(100, ((item.value || 0) / cap) * 100);
        const color = item.color || "#dbeafe";
        const clickable = !!onItemClick;
        return (
          <div
            key={item.label + idx}
            onClick={clickable ? () => onItemClick(item) : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "2px 0",
              cursor: clickable ? "pointer" : "default",
            }}
          >
            <span style={{ flex: "0 0 90px", color: "#111" }}>{item.label}</span>
            <span
              aria-hidden
              style={{
                flex: 1,
                height: 6,
                background: "#f4f4f5",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  display: "block",
                  height: "100%",
                  width: `${pct}%`,
                  background: color,
                  borderRadius: 3,
                }}
              />
            </span>
            <span style={{ flex: "0 0 48px", textAlign: "right", fontWeight: 600 }}>
              {valueFormatter(item.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
