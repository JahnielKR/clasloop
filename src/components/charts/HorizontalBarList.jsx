// src/components/charts/HorizontalBarList.jsx
//
// F1 Analytics Studio: Top-N de barras horizontales (estilo Semrush).
// F8: keyboard (tabIndex + Enter/Space), title rico en hover, y soporte
// de crossfilter (activeLabel resalta una barra y atenúa el resto).
//
// Props:
//   items, max, valueFormatter, onItemClick (igual que F1)
//   activeLabel?: string  — la barra cuyo label coincide se resalta; si hay
//                           activeLabel, las demás se atenúan.
//   titleFormatter?: (item) => string  — texto del title nativo en hover.

export default function HorizontalBarList({
  items = [],
  max,
  valueFormatter = (n) => `${n}%`,
  onItemClick,
  activeLabel = null,
  titleFormatter,
}) {
  const cap = max ?? Math.max(1, ...items.map((i) => i.value || 0));
  return (
    <div style={{ fontSize: 13, lineHeight: 1.7 }}>
      {items.map((item, idx) => {
        const pct = Math.min(100, ((item.value || 0) / cap) * 100);
        const color = item.color || "#dbeafe";
        const clickable = !!onItemClick;
        const isActive = activeLabel != null && item.label === activeLabel;
        const dimmed = activeLabel != null && !isActive;
        const drill = clickable ? () => onItemClick(item) : undefined;
        return (
          <div
            key={item.label + idx}
            onClick={drill}
            onKeyDown={
              clickable
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      drill();
                    }
                  }
                : undefined
            }
            tabIndex={clickable ? 0 : undefined}
            role={clickable ? "button" : undefined}
            title={titleFormatter ? titleFormatter(item) : `${item.label}: ${valueFormatter(item.value)}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "2px 0",
              cursor: clickable ? "pointer" : "default",
              opacity: dimmed ? 0.4 : 1,
              fontWeight: isActive ? 700 : 400,
              transition: "opacity .15s ease",
            }}
          >
            <span style={{ flex: "0 0 90px", color: "#111" }}>{item.label}</span>
            <span aria-hidden style={{ flex: 1, height: 6, background: "#f4f4f5", borderRadius: 3, overflow: "hidden" }}>
              <span style={{ display: "block", height: "100%", width: `${pct}%`, background: color, borderRadius: 3 }} />
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
