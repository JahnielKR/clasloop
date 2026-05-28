// src/pages/analytics/StudentProfile.jsx
//
// F2 Analytics Studio: Student Profile page — la página que HOY NO existe.
// Ruta /school/student/:classId/:studentRef. Fetches via useStudentDetail.

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { StudioShell } from "../../components/analytics";
import StudentKpiBand from "../../components/analytics/StudentKpiBand";
import CleoStudentStrip from "../../components/analytics/CleoStudentStrip";
import TrajectoryPanel from "../../components/analytics/TrajectoryPanel";
import TopicBarListPanel from "../../components/analytics/TopicBarListPanel";
import StudentMostFailedList from "../../components/analytics/StudentMostFailedList";
import SessionHistoryTable from "../../components/analytics/SessionHistoryTable";
import CompareToggle from "../../components/analytics/CompareToggle";
import { previousPeriod } from "../../lib/analytics/benchmark";
import { useStudentDetail } from "../../hooks/useStudentDetail";
import { ROUTES, buildRoute } from "../../routes";

function periodToRange(period) {
  const now = new Date();
  const ms = (d) => d * 24 * 60 * 60 * 1000;
  switch (period) {
    case "d7":
      return { from: new Date(now.getTime() - ms(7)).toISOString(), to: now.toISOString() };
    case "d30":
      return { from: new Date(now.getTime() - ms(30)).toISOString(), to: now.toISOString() };
    case "custom":
      return { from: null, to: null };
    case "d90":
    default:
      return { from: new Date(now.getTime() - ms(90)).toISOString(), to: now.toISOString() };
  }
}

export default function StudentProfile() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const match = /^\/school\/student\/([^/]+)\/([^/]+)\/?$/.exec(pathname);
  const classId = match ? decodeURIComponent(match[1]) : null;
  const studentRef = match ? decodeURIComponent(match[2]) : null;

  const [period, setPeriod] = useState("d90");
  const [compareMode, setCompareMode] = useState("off");
  const { from, to } = periodToRange(period);
  const compareRange =
    compareMode === "prev" ? previousPeriod(from, to) : { from: null, to: null };

  const detailQ = useStudentDetail(classId, studentRef, { from, to });
  // F4: 2nd fetch shifted to previous period. `enabled: !!classId && !!studentRef`
  // gating means passing null disables the query entirely when compareMode === 'off'.
  const compareDetailQ = useStudentDetail(
    compareMode === "prev" ? classId : null,
    compareMode === "prev" ? studentRef : null,
    { from: compareRange.from, to: compareRange.to },
  );

  useEffect(() => {
    if (!classId || !studentRef) navigate(ROUTES.SCHOOL, { replace: true });
  }, [classId, studentRef, navigate]);

  if (!classId || !studentRef) return null;

  const d = detailQ.data;
  const loading = detailQ.isPending;
  const error = detailQ.error;

  return (
    <StudioShell
      view="student"
      title={`Estudiante: ${studentRef}`}
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
            Error cargando el perfil: {String(error.message || error)}
          </div>
        )}

        {loading && !d ? (
          <div style={{ opacity: 0.55, fontSize: 14 }}>Cargando perfil del estudiante…</div>
        ) : (
          <>
            {/* Bloques reales se enchufan en tasks 5-8. */}
            <StudentKpiBand
              kpis={d?.kpis ?? {}}
              trajectory={d?.trajectory ?? []}
              topicMastery={d?.topic_mastery ?? []}
              classAvgRetention={d?.class_avg_retention ?? 0}
              compareKpis={
                compareMode === "prev"
                  ? compareDetailQ.data?.kpis ?? null
                  : null
              }
            />
            <CleoStudentStrip
              studentRef={studentRef}
              weakTopics={(d?.topic_mastery ?? [])
                .filter((t) => (t.retention_score ?? 0) < 40)
                .slice(0, 3)
                .map((t) => t.topic)}
              deltaVsClass={
                (d?.topic_mastery ?? []).length > 0
                  ? Math.round(
                      d.topic_mastery.reduce(
                        (s, t) => s + (Number(t.retention_score) || 0),
                        0,
                      ) /
                        d.topic_mastery.length -
                        Number(d?.class_avg_retention ?? 0),
                    )
                  : null
              }
            />
            <TrajectoryPanel
              data={d?.trajectory ?? []}
              compareData={
                compareMode === "prev"
                  ? compareDetailQ.data?.trajectory ?? null
                  : null
              }
              loading={loading && !d}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <TopicBarListPanel
                variant="critical"
                topicMastery={d?.topic_mastery ?? []}
              />
              <StudentMostFailedList
                classId={classId}
                studentRef={studentRef}
                items={d?.most_failed ?? []}
                onItemClick={(it) => {
                  if (it.deck_id) navigate(buildRoute.deckResults(it.deck_id));
                }}
              />
            </div>
            <SessionHistoryTable
              items={d?.session_history ?? []}
              onRowClick={(it) => {
                if (it.deck_id) navigate(buildRoute.deckResults(it.deck_id));
              }}
            />
          </>
        )}
      </div>
    </StudioShell>
  );
}
