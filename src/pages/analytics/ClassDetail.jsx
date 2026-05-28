// src/pages/analytics/ClassDetail.jsx
//
// F1 Analytics Studio: Class Detail page — el dashboard estrella.
// Ruta /school/class/:classId. Fetches via useClassAnalytics +
// useClassTimeseries (RPCs de F0). Compone los bloques presentacionales
// definidos en src/components/analytics/.

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { StudioShell } from "../../components/analytics";
import KpiBand from "../../components/analytics/KpiBand";
import CleoStrip from "../../components/analytics/CleoStrip";
import TrendPanel from "../../components/analytics/TrendPanel";
import ResponseCompositionPanel from "../../components/analytics/ResponseCompositionPanel";
import TopicBarListPanel from "../../components/analytics/TopicBarListPanel";
import { useClassAnalytics } from "../../hooks/useClassAnalytics";
import { useClassTimeseries } from "../../hooks/useClassTimeseries";
import { ROUTES } from "../../routes";

// Map period chip → from/to timestamps. F1 keeps it simple; Custom no-ops.
function periodToRange(period) {
  const now = new Date();
  const ms = (d) => d * 24 * 60 * 60 * 1000;
  switch (period) {
    case "d7":
      return { from: new Date(now.getTime() - ms(7)).toISOString(), to: now.toISOString() };
    case "d90":
      return { from: new Date(now.getTime() - ms(90)).toISOString(), to: now.toISOString() };
    case "custom":
      return { from: null, to: null }; // F1 stub
    case "d30":
    default:
      return { from: new Date(now.getTime() - ms(30)).toISOString(), to: now.toISOString() };
  }
}

export default function ClassDetail() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Pull :classId from /school/class/:classId
  const match = /^\/school\/class\/([^/]+)\/?$/.exec(pathname);
  const classId = match ? decodeURIComponent(match[1]) : null;

  const [period, setPeriod] = useState("d30");
  const [metric, setMetric] = useState("pct_correct");
  const { from, to } = periodToRange(period);

  const analyticsQ = useClassAnalytics(classId, { from, to });
  const timeseriesQ = useClassTimeseries(classId, {
    metric,
    granularity: "day",
    from,
    to,
  });

  useEffect(() => {
    if (!classId) navigate(ROUTES.SCHOOL, { replace: true });
  }, [classId, navigate]);

  if (!classId) return null;

  const a = analyticsQ.data;
  const ts = timeseriesQ.data ?? [];
  const loading = analyticsQ.isPending || timeseriesQ.isPending;
  const error = analyticsQ.error || timeseriesQ.error;

  return (
    <StudioShell view="class" title="Clase" period={period} onPeriodChange={setPeriod}>
      <div style={{ padding: 18, background: "#fafafa", minHeight: "100%" }}>
        {error && (
          <div
            role="alert"
            style={{
              background: "#fee2e2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              padding: 12,
              borderRadius: 8,
              marginBottom: 12,
              fontSize: 14,
            }}
          >
            Error cargando la clase: {String(error.message || error)}
          </div>
        )}

        {loading && !a ? (
          <div style={{ opacity: 0.55, fontSize: 14 }}>Cargando análisis de la clase…</div>
        ) : (
          <>
            {/* Bloques reales se enchufan en tasks 6-11. En F1 task 5 el
                shell + data fetch + slots están listos. */}
            <KpiBand
              kpis={a?.kpis ?? {}}
              timeseries={ts}
              topicMastery={a?.topic_mastery ?? []}
            />
            <CleoStrip
              classId={classId}
              weakTopics={(a?.topic_mastery ?? [])
                .filter((t) => (t.retention_score ?? 0) < 40)
                .slice(0, 3)
                .map((t) => t.topic)}
            />
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
              <TrendPanel
                metric={metric}
                onMetricChange={setMetric}
                data={ts}
                loading={timeseriesQ.isPending}
              />
              <ResponseCompositionPanel kpis={a?.kpis ?? {}} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <TopicBarListPanel variant="dominated" topicMastery={a?.topic_mastery ?? []} />
              <TopicBarListPanel variant="critical" topicMastery={a?.topic_mastery ?? []} />
              <div data-block="MostMissedList" />
            </div>
            <div data-block="RosterTable" />
          </>
        )}
      </div>
    </StudioShell>
  );
}
