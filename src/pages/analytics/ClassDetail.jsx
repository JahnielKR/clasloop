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
import MostMissedList from "../../components/analytics/MostMissedList";
import RosterTable from "../../components/analytics/RosterTable";
import CompareToggle from "../../components/analytics/CompareToggle";
import { previousPeriod, percentileRank } from "../../lib/analytics/benchmark";
import { useDirector } from "../../hooks/useDirector";
import { buildRoute } from "../../routes";
import { useAnalyticsOverview } from "../../hooks/useAnalyticsOverview";
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
  const [compareMode, setCompareMode] = useState("off");
  const { from, to } = periodToRange(period);
  const compareRange =
    compareMode === "prev" ? previousPeriod(from, to) : { from: null, to: null };

  const analyticsQ = useClassAnalytics(classId, { from, to });
  const timeseriesQ = useClassTimeseries(classId, {
    metric,
    granularity: "day",
    from,
    to,
  });
  // F4: 2nd fetch for the previous period. Disabled when compareMode === 'off'
  // by passing null as classId — both hooks have `enabled: !!classId` gating.
  const compareAnalyticsQ = useClassAnalytics(
    compareMode === "prev" ? classId : null,
    { from: compareRange.from, to: compareRange.to },
  );
  const compareTimeseriesQ = useClassTimeseries(
    compareMode === "prev" ? classId : null,
    { metric, granularity: "day", from: compareRange.from, to: compareRange.to },
  );
  // F1: reuse the cached useDirector to get per-class students_snapshot.
  // React Query caches under DIRECTOR_KEY; si Director ya está cargado es gratis.
  // F2 introduces student_detail RPC y la tabla migra a su propio fetch.
  const directorQ = useDirector();
  const students = directorQ.data?.studentData?.[classId] ?? [];

  // F4: percentile rank de la retention_avg de la clase actual vs el resto
  // de las clases del docente. Computado client-side desde useAnalyticsOverview
  // (cache de F0, sin RPC nueva). Se muestra como chip "P78" en el tile
  // '% correcto' del KpiBand cuando NO hay compareMode activo.
  const overviewQ = useAnalyticsOverview();
  const overviewRows = overviewQ.data ?? [];
  const allRetentions = overviewRows.map((r) => Number(r.retention_avg));
  const thisRetention = overviewRows.find((r) => r.class_id === classId)?.retention_avg;
  const pctile = percentileRank(allRetentions, thisRetention != null ? Number(thisRetention) : null);

  useEffect(() => {
    if (!classId) navigate(ROUTES.SCHOOL, { replace: true });
  }, [classId, navigate]);

  if (!classId) return null;

  const a = analyticsQ.data;
  const ts = timeseriesQ.data ?? [];
  const loading = analyticsQ.isPending || timeseriesQ.isPending;
  const error = analyticsQ.error || timeseriesQ.error;

  return (
    <StudioShell
      view="class"
      title="Clase"
      period={period}
      onPeriodChange={setPeriod}
      toolbarExtras={<CompareToggle value={compareMode} onChange={setCompareMode} />}
    >
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
              compareKpis={
                compareMode === "prev"
                  ? compareAnalyticsQ.data?.kpis ?? null
                  : null
              }
              percentile={pctile}
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
                compareData={
                  compareMode === "prev" ? compareTimeseriesQ.data ?? null : null
                }
                loading={timeseriesQ.isPending}
              />
              <ResponseCompositionPanel kpis={a?.kpis ?? {}} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <TopicBarListPanel
                variant="dominated"
                topicMastery={a?.topic_mastery ?? []}
                onTopicClick={(item) =>
                  navigate(`${buildRoute.analyticsTopics(classId)}?topic=${encodeURIComponent(item.label)}`)
                }
              />
              <TopicBarListPanel
                variant="critical"
                topicMastery={a?.topic_mastery ?? []}
                onTopicClick={(item) =>
                  navigate(`${buildRoute.analyticsTopics(classId)}?topic=${encodeURIComponent(item.label)}`)
                }
              />
              <MostMissedList
                classId={classId}
                items={a?.most_missed ?? []}
                onItemClick={(it) => {
                  if (it.deck_id) navigate(buildRoute.deckResults(it.deck_id));
                }}
              />
            </div>
            <RosterTable
              students={students}
              onRowClick={(s) => navigate(buildRoute.analyticsStudent(classId, s.name))}
            />
          </>
        )}
      </div>
    </StudioShell>
  );
}
