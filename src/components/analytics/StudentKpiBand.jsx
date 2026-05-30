// src/components/analytics/StudentKpiBand.jsx
//
// F2 Analytics Studio: banda de stat cards del Student Profile.
// 5 tiles: % correcto · Sesiones · Tiempo medio · Retención media · Δ vs media de clase.
// i18n: labels via useT("studioCommon") + useT("studentProfile").

import StatCardWithSparkline from "./StatCardWithSparkline";
import AnimatedNumber from "./AnimatedNumber";
import {
  formatPercent,
  formatNumber,
  formatDurationShort,
  formatDelta,
} from "../../lib/analytics/formatters";
import { pctChangeOrNull } from "../../lib/analytics/benchmark";
import { useLang } from "../../i18n/LanguageContext";
import { useT } from "../../i18n";

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
  const lang = useLang();
  const c = useT("studioCommon", lang);
  const t = useT("studentProfile", lang);

  const studentAvgRetention =
    topicMastery.length > 0
      ? Math.round(
          topicMastery.reduce((s, tp) => s + (Number(tp.retention_score) || 0), 0)
            / topicMastery.length,
        )
      : 0;
  const deltaVsClass =
    topicMastery.length > 0
      ? Math.round(studentAvgRetention - Number(classAvgRetention))
      : null;

  const pctSpark = trajectory.map((p) => Number(p.value) || 0);

  // F4: derive delta chip per tile from compareKpis (period-prev fetch).
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
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))", gap: 8 }}>
      <StatCardWithSparkline
        label={c.pctCorrect}
        value={<AnimatedNumber value={kpis.pct_correct} format={formatPercent} />}
        sparkPoints={pctSpark}
        delta={deltaProps("pct_correct")}
      />
      <StatCardWithSparkline
        label={c.sessions}
        value={<AnimatedNumber value={kpis.session_count} format={formatNumber} />}
        delta={deltaProps("session_count")}
      />
      <StatCardWithSparkline
        label={c.avgTime}
        value={<AnimatedNumber value={kpis.avg_time_ms} format={formatDurationShort} />}
        delta={deltaProps("avg_time_ms")}
      />
      <StatCardWithSparkline
        label={t.avgRetention}
        value={<AnimatedNumber value={studentAvgRetention} format={(n) => `${n}%`} />}
      />
      <StatCardWithSparkline
        label={t.deltaVsClass}
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
