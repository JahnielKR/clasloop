// ─── RetentionBars ───────────────────────────────────────────────────────────
// Horizontal bar chart (Recharts) for a ranked list of retention values —
// hardest topics, students who need help, etc. Each bar is colored by its
// retention tier (green/orange/red). Reusable across report surfaces.
// Animation off so it renders instantly and prints cleanly.
import { BarChart, Bar, XAxis, YAxis, Cell, LabelList, ResponsiveContainer } from "recharts";
import { C } from "../tokens";
import { retentionTier } from "../../lib/scoring-thresholds";

const tierColor = (v) => {
  const t = retentionTier(v);
  return t === "green" ? C.green : t === "orange" ? C.orange : C.red;
};

// Keep long topic/student names from overflowing the Y axis gutter.
const truncate = (s) => (typeof s === "string" && s.length > 22 ? `${s.slice(0, 21)}…` : s);

// data: [{ label, value }]  (value = 0..100)
export default function RetentionBars({ data, rowHeight = 40 }) {
  if (!data || data.length === 0) return null;
  const height = data.length * rowHeight + 8;
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={data} margin={{ top: 2, right: 46, bottom: 2, left: 0 }} barCategoryGap={9}>
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis
            type="category"
            dataKey="label"
            width={150}
            tick={{ fontSize: 12, fill: C.text }}
            tickFormatter={truncate}
            axisLine={false}
            tickLine={false}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false} background={{ fill: C.bgSoft, radius: 4 }}>
            {data.map((d, i) => <Cell key={i} fill={tierColor(d.value)} />)}
            <LabelList dataKey="value" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 12, fontWeight: 700, fill: C.text }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
