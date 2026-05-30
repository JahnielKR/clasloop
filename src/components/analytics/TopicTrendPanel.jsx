// src/components/analytics/TopicTrendPanel.jsx
//
// F3 Analytics Studio: tendencia semanal del tema seleccionado en
// TopicMastery. Reusa TrendBarChart sobre topic_detail.weekly_trend.
// i18n: useT("topicMastery") + useT("studioCommon").

import { TrendBarChart } from "../charts";
import { formatPercent } from "../../lib/analytics/formatters";
import { forecastPoints } from "../../lib/analytics/forecast";
import { C } from "../tokens";
import { useLang } from "../../i18n/LanguageContext";
import { useT } from "../../i18n";

export default function TopicTrendPanel({
  topic,
  data = [],
  compareData = null,
  loading = false,
}) {
  const lang = useLang();
  const t = useT("topicMastery", lang);
  const c = useT("studioCommon", lang);
  const forecast = forecastPoints(data, 2, { clampMin: 0, clampMax: 100 });
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
        <b>{t.trendOf(topic)}</b>
        <span style={{ marginLeft: "auto", opacity: 0.65, fontSize: 11 }}>
          {c.pctCorrect}
        </span>
      </div>
      {loading ? (
        <div style={{ height: 180, opacity: 0.45, fontSize: 13, padding: 12 }}>{c.loading}</div>
      ) : data.length === 0 ? (
        <div style={{ height: 180, opacity: 0.45, fontSize: 13, padding: 12 }}>
          {t.noTopicData}
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
