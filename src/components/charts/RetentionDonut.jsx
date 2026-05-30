// ─── RetentionDonut ──────────────────────────────────────────────────────────
// A small donut (Recharts pie) of a class's topic-retention distribution —
// green (strong) / orange (needs review) / red (weak). Reusable across report
// surfaces. Animation off so it renders instantly and prints cleanly.
// No user-facing text of its own — the center label/sub come from props (already
// localized by the caller), so this component needs no i18n.
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { C } from "../tokens";

export default function RetentionDonut({ dist, centerLabel, centerSub, size = 132 }) {
  const total = (dist?.green || 0) + (dist?.orange || 0) + (dist?.red || 0);
  const segments = [
    { key: "green", value: dist?.green || 0, color: C.green },
    { key: "orange", value: dist?.orange || 0, color: C.orange },
    { key: "red", value: dist?.red || 0, color: C.red },
  ].filter((s) => s.value > 0);
  // When there's no data, draw a single muted ring so the shape still reads.
  const data = total > 0 ? segments : [{ key: "empty", value: 1, color: C.bgSoft }];

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius="62%"
            outerRadius="100%"
            stroke="none"
            startAngle={90}
            endAngle={-270}
            isAnimationActive={false}
          >
            {data.map((s) => <Cell key={s.key} fill={s.color} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center", pointerEvents: "none" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text, lineHeight: 1 }}>{centerLabel}</div>
          {centerSub ? <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{centerSub}</div> : null}
        </div>
      </div>
    </div>
  );
}
