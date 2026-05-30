// src/components/analytics/TrajectoryPanel.jsx
//
// F2 Analytics Studio: trayectoria temporal del Student Profile.
// Bar chart semanal del % correcto. F5 agrega forecast + comparar.

import { TrendBarChart } from "../charts";
import { formatPercent } from "../../lib/analytics/formatters";
import { forecastPoints } from "../../lib/analytics/forecast";
import { C } from "../tokens";
import { useLang } from "../../i18n/LanguageContext";
import { useT } from "../../i18n";

export default function TrajectoryPanel({
  data = [],
  compareData = null,
  loading = false,
}) {
  const lang = useLang();
  const t = useT("studentProfile", lang);
  const c = useT("studioCommon", lang);
  const forecast = forecastPoints(data, 3, { clampMin: 0, clampMax: 100 });
  return (
    <div
      style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: 12,
        margin: "10px 0",
      }}
    >
      <div style={{ display: "flex", gap: 12, fontSize: 13, marginBottom: 8 }}>
        <b>{t.trajectoryWeekly}</b>
      </div>
      {loading ? (
        <div style={{ height: 180, opacity: 0.45, fontSize: 13, padding: 12 }}>
          {c.loading}
        </div>
      ) : data.length === 0 ? (
        <div style={{ height: 180, opacity: 0.45, fontSize: 13, padding: 12 }}>
          {t.noDataWindow}
        </div>
      ) : (
        <TrendBarChart
          data={data}
          compareData={compareData}
          forecast={forecast}
          yLabel={c.pctCorrect}
          yFormatter={(v) => formatPercent(v)}
        />
      )}
    </div>
  );
}
