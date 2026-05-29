// src/pages/analytics/StudentProfile.jsx
//
// F2 Analytics Studio: Student Profile page — la página que HOY NO existe.
// Ruta /school/student/:classId/:studentRef. Fetches via useStudentDetail.

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { StudioShell, StudioSkeleton } from "../../components/analytics";
import StudentKpiBand from "../../components/analytics/StudentKpiBand";
import CleoStudentStrip from "../../components/analytics/CleoStudentStrip";
import TrajectoryPanel from "../../components/analytics/TrajectoryPanel";
import TopicBarListPanel from "../../components/analytics/TopicBarListPanel";
import StudentMostFailedList from "../../components/analytics/StudentMostFailedList";
import SessionHistoryTable from "../../components/analytics/SessionHistoryTable";
import CompareToggle from "../../components/analytics/CompareToggle";
import { previousPeriod } from "../../lib/analytics/benchmark";
import { useStudentDetail } from "../../hooks/useStudentDetail";
import StudentRiskCard from "../../components/analytics/StudentRiskCard";
import { useStudentRisk } from "../../hooks/useStudentRisk";
import { useAnalyticsOverview } from "../../hooks/useAnalyticsOverview";
import { generateStudentReviewQuestions, saveClassReviewDeck } from "../../lib/close-unit-ai";
import { ROUTES, buildRoute } from "../../routes";
import { C } from "../../components/tokens";

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

export default function StudentProfile({ profile = null }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const match = /^\/school\/student\/([^/]+)\/([^/]+)\/?$/.exec(pathname);
  const classId = match ? decodeURIComponent(match[1]) : null;
  const studentRef = match ? decodeURIComponent(match[2]) : null;

  const [period, setPeriod] = useState("d90");
  const [compareMode, setCompareMode] = useState("off");
  // Hotfix: memoize so from/to stay STABLE across renders. periodToRange()
  // calls new Date() every render → unstable from/to → the React Query
  // queryKey changes each render → infinite refetch loop. Recompute on period only.
  const { from, to } = useMemo(() => periodToRange(period), [period]);
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

  const riskQ = useStudentRisk(classId);
  const myRisk = (riskQ.data?.students ?? []).find((s) => s.student_name === studentRef);
  const riskInputs = myRisk
    ? {
        recentPctCorrect: myRisk.recent_pct_correct,
        weeklyPctCorrect: Array.isArray(myRisk.weekly_pct_correct) ? myRisk.weekly_pct_correct : [],
        recentParticipation: myRisk.recent_participation,
        daysSinceLastActivity: myRisk.days_since_last_activity,
      }
    : null;

  const overviewQ = useAnalyticsOverview();
  const classRow = (overviewQ.data ?? []).find((c) => c.class_id === classId) || null;

  const [generatingReview, setGeneratingReview] = useState(false);

  useEffect(() => {
    if (!classId || !studentRef) navigate(ROUTES.SCHOOL, { replace: true });
  }, [classId, studentRef, navigate]);

  if (!classId || !studentRef) return null;

  const d = detailQ.data;

  // F5: classObj resolved from overview (has subject + grade for generator)
  const classObj = classRow
    ? {
        id: classRow.class_id,
        name: classRow.class_name || "",
        subject: classRow.class_subject || "",
        grade: classRow.class_grade || "",
      }
    : { id: classId, name: "", subject: "", grade: "" };

  const topicMastery = d?.topic_mastery ?? [];
  const studentAvg =
    topicMastery.length > 0
      ? topicMastery.reduce((s, t) => s + (Number(t.retention_score) || 0), 0) /
        topicMastery.length
      : null;
  const classAvg =
    d?.class_avg_retention != null ? Number(d.class_avg_retention) : null;
  const deltaVsClass =
    studentAvg != null && classAvg != null ? Math.round(studentAvg - classAvg) : null;
  const weakTopics = topicMastery
    .filter((t) => (t.retention_score ?? 0) < 40)
    .slice(0, 3)
    .map((t) => t.topic);

  async function handleAssignStudentReview() {
    if (generatingReview) return;
    setGeneratingReview(true);
    const gen = await generateStudentReviewQuestions({
      classObj,
      studentName: studentRef,
      weakTopics,
      mostFailed: d?.most_failed || [],
      lang: "es",
    });
    if (!gen.ok) { setGeneratingReview(false); return; }
    const save = await saveClassReviewDeck({
      classObj,
      questions: gen.questions,
      lang: gen.inferredLang || "es",
      authorId: profile?.id ?? null,
      studentName: studentRef,
    });
    setGeneratingReview(false);
    if (save.ok) navigate(buildRoute.deckEdit(save.deckId));
  }
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
      <div style={{ padding: 18, background: C.bgSoft, minHeight: "100%" }}>
        {error && (
          <div
            role="alert"
            style={{
              background: C.redSoft,
              border: `1px solid ${C.red}`,
              color: C.red,
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
          <StudioSkeleton variant="student" />
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
            <StudentRiskCard inputs={riskInputs} loading={riskQ.isPending && !riskQ.data} studentName={studentRef} />
            <CleoStudentStrip
              studentRef={studentRef}
              weakTopics={weakTopics}
              deltaVsClass={deltaVsClass}
              detail={d}
              classObj={classObj}
              profile={profile}
              lang="es"
              onReviewCreated={(deckId) => navigate(buildRoute.deckEdit(deckId))}
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
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
                onAssignReview={handleAssignStudentReview}
                generating={generatingReview}
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
