// src/components/analytics/ReportPreview.jsx
//
// Ola B: live, data-backed preview of the report being composed. Fetches real
// class_analytics for the draft's class+period and renders the selected sections
// IN ORDER, reusing the existing charts. States: no-class / loading / empty.
// i18n: useT("reports"). Memoize from/to by period (render-loop lesson — never
// derive new Date() into a queryKey in the render body).

import { useMemo } from "react";
import { C } from "../tokens";
import { RetentionBars } from "../charts";
import { useClassAnalytics } from "../../hooks/useClassAnalytics";
import { formatPercent, formatNumber, formatDurationShort } from "../../lib/analytics/formatters";
import { REPORT_SECTIONS } from "../../lib/analytics/report-sections";
import { useLang } from "../../i18n/LanguageContext";
import { useT } from "../../i18n";

function periodToRange(period) {
  const now = new Date();
  const ms = (d) => d * 24 * 60 * 60 * 1000;
  const days = period === "d7" ? 7 : period === "d90" ? 90 : 30;
  return { from: new Date(now.getTime() - ms(days)).toISOString(), to: now.toISOString() };
}

const card = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14, marginBottom: 12 };
const sectionTitle = { fontSize: 13, fontWeight: 700, marginBottom: 10, color: C.text };

export default function ReportPreview({ draft, className }) {
  const t = useT("reports", useLang());
  const { classId, period, sections } = draft || {};
  const { from, to } = useMemo(() => periodToRange(period || "d30"), [period]);
  const q = useClassAnalytics(classId || null, { from, to });

  if (!classId) {
    return <div style={{ ...card, color: C.textMuted, fontSize: 13 }}>{t.previewNoClass}</div>;
  }
  if (q.isPending) {
    return <div style={{ ...card, color: C.textMuted, fontSize: 13 }}>{t.previewLoading}</div>;
  }

  const a = q.data || {};
  const kpis = a.kpis || {};
  const topics = a.topic_mastery || [];
  const missed = a.most_missed || [];
  const empty = !kpis.responses_total && topics.length === 0 && missed.length === 0;
  if (empty) {
    return <div style={{ ...card, color: C.textMuted, fontSize: 13 }}>{t.previewEmpty}</div>;
  }

  const renderSection = (id) => {
    if (id === "kpis") {
      const items = [
        [t.kpiPctCorrect, formatPercent(kpis.pct_correct)],
        [t.kpiParticipants, formatNumber(kpis.unique_participants)],
        [t.kpiResponses, formatNumber(kpis.responses_total)],
        [t.kpiAvgTime, formatDurationShort(kpis.avg_time_ms)],
      ];
      return (
        <div key={id} style={card}>
          <div style={sectionTitle}>{t.secKpis}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8 }}>
            {items.map(([label, val]) => (
              <div key={label} style={{ background: C.bgSoft, borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{val}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (id === "topics") {
      const data = topics
        .filter((tp) => tp.retention_score != null)
        .map((tp) => ({ label: tp.topic, value: Math.round(Number(tp.retention_score)) }));
      return (
        <div key={id} style={card}>
          <div style={sectionTitle}>{t.secTopics}</div>
          {data.length === 0 ? <div style={{ fontSize: 13, color: C.textMuted }}>—</div> : <RetentionBars data={data} />}
        </div>
      );
    }
    if (id === "most_missed") {
      return (
        <div key={id} style={card}>
          <div style={sectionTitle}>{t.secMostMissed}</div>
          {missed.length === 0 ? (
            <div style={{ fontSize: 13, color: C.textMuted }}>—</div>
          ) : (
            <div style={{ fontSize: 13, lineHeight: 1.7 }}>
              {missed.slice(0, 5).map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.mostMissedQ(Number(m.question_index) + 1)}{m.topic ? ` · ${m.topic}` : ""}
                  </span>
                  <b style={{ color: m.error_rate >= 60 ? C.red : m.error_rate >= 40 ? C.orange : C.green }}>
                    {t.errSuffix(Math.round(Number(m.error_rate)))}
                  </b>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: C.textSecondary }}>
        {t.previewTitle}{className ? ` — ${className}` : ""}
      </div>
      {(sections || []).filter((id) => REPORT_SECTIONS.some((s) => s.id === id)).map(renderSection)}
    </div>
  );
}
