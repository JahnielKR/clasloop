// src/components/analytics/StudentKpiBand.jsx
//
// F2 Analytics Studio: banda de stat cards del Student Profile.
// 5 tiles: % correcto · Sesiones · Tiempo medio · Retención media · Δ vs media de clase.

import StatCardWithSparkline from "./StatCardWithSparkline";
import {
  formatPercent,
  formatNumber,
  formatDurationShort,
  formatDelta,
} from "../../lib/analytics/formatters";
import { pctChangeOrNull } from "../../lib/analytics/benchmark";

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
  compareKpis = null,
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

  // F4: derive delta chip per tile from compareKpis (period-prev fetch).
  // Polarity nit: avg_time_ms "more = worse" but F4 keeps "more = good"
  // universally — documented as out of scope in the plan.
  function deltaProps(field) {
    if (compareKpis == null) return null;
    const pct = pctChangeOrNull(compareKpis[field], kpis[field]);
    if (pct == null) return null;
    const rounded = Math.round(pct);
    return {
      label: formatDelta(rounded),
      tone: rounded > 0 ? "good" : rounded < 0 ? "bad" : "neutral",
    };
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
      <StatCardWithSparkline
        label="% correcto"
        value={formatPercent(kpis.pct_correct)}
        sparkPoints={pctSpark}
        delta={deltaProps("pct_correct")}
      />
      <StatCardWithSparkline
        label="Sesiones"
        value={formatNumber(kpis.session_count)}
        delta={deltaProps("session_count")}
      />
      <StatCardWithSparkline
        label="Tiempo medio"
        value={formatDurationShort(kpis.avg_time_ms)}
        delta={deltaProps("avg_time_ms")}
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
