// ─── RetentionDonut ──────────────────────────────────────────────────────────
// A donut chart showing the proportion of strong/medium/weak topics. Reuses
// the same color tiers as the rest of the app. Recharts under the hood.
// i18n: segment names (shown in the Recharts tooltip) via useT("studioCommon").
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { C } from "../tokens";
import { useLang } from "../../i18n/LanguageContext";
import { useT } from "../../i18n";

const COLORS = { green: C.green, orange: C.orange, red: C.red };

// `dist` is { green, orange, red } counts. `centerLabel`/`centerSub` are the big
// number + small caption shown in the donut hole.
export default function RetentionDonut({ dist, centerLabel, centerSub }) {
  const t = useT("studioCommon", useLang());
  const data = [
    { key: "green", name: t.tierStrongName, value: dist.green || 0 },
    { key: "orange", name: t.tierMediumName, value: dist.orange || 0 },
    { key: "red", name: t.tierWeakName, value: dist.red || 0 },
  ];

  return (
    <div style={{ width: 150, height: 150, position: "relative" }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={62} paddingAngle={2}>
            {data.map((d) => (
              <Cell key={d.key} fill={COLORS[d.key]} />
            ))}
          </Pie>
          <Tooltip />
          <Cell />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{centerLabel}</div>
        <div style={{ fontSize: 11, color: C.textMuted }}>{centerSub}</div>
      </div>
    </div>
  );
}
