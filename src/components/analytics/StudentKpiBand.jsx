// src/components/analytics/StudentKpiBand.jsx
//
// F2 Analytics Studio: banda de stat cards del Student Profile.
// 5 tiles: % correcto · Sesiones · Tiempo medio · Retención media · Δ vs media de clase.

import StatCardWithSparkline from "./StatCardWithSparkline";
import {
  formatPercent,
  formatNumber,
  formatDurationShort,
} from "../../lib/analytics/formatters";

function tone(delta) {
  if (delta == null) return "neutral";
  if (delta > 0) return "good";
  if (delta < 0) return "bad";
  return "neutral";
}

export default function StudentKpiBand({
  kpis = {},
  trajectory = [],
  topicMastery = [],
  classAvgRetention = 0,
}) {
  const studentAvgRetention =
    topicMastery.length > 0
      ? Math.round(
          topicMastery.reduce((s, t) => s + (Number(t.retention_score) || 0), 0)
            / topicMastery.length,
        )
      : 0;
  const deltaVsClass =
    topicMastery.length > 0
      ? Math.round(studentAvgRetention - Number(classAvgRetention))
      : null;

  const pctSpark = trajectory.map((t) => Number(t.value) || 0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
      <StatCardWithSparkline
        label="% correcto"
        value={formatPercent(kpis.pct_correct)}
        sparkPoints={pctSpark}
      />
      <StatCardWithSparkline
        label="Sesiones"
        value={formatNumber(kpis.session_count)}
      />
      <StatCardWithSparkline
        label="Tiempo medio"
        value={formatDurationShort(kpis.avg_time_ms)}
      />
      <StatCardWithSparkline
        label="Retención media"
        value={`${studentAvgRetention}%`}
      />
      <StatCardWithSparkline
        label="Δ vs clase"
        value={
          deltaVsClass == null
            ? "—"
            : `${deltaVsClass > 0 ? "+" : ""}${deltaVsClass}%`
        }
        delta={
          deltaVsClass == null
            ? null
            : {
                label:
                  deltaVsClass > 0
                    ? `▲ ${deltaVsClass}%`
                    : deltaVsClass < 0
                      ? `▼ ${Math.abs(deltaVsClass)}%`
                      : "→ 0%",
                tone: tone(deltaVsClass),
              }
        }
      />
    </div>
  );
}
