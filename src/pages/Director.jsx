// src/pages/Director.jsx
//
// Analytics Studio Área 3: el cockpit cross-clase del docente (/school).
// Orquestador delgado: fetch + compose. Toda la matemática cross-clase vive
// en src/lib/analytics/overview-aggregate.ts (pura, testeada). Métrica
// primaria = % correcto; la retención solo aparece en "temas críticos".

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  StudioShell, PulseStrip, ExportMenu, StatCardWithSparkline,
  StudioSkeleton, ClassTable, RiskOverviewList, CriticalTopicsList,
} from "../components/analytics";
import AnimatedNumber from "../components/analytics/AnimatedNumber";
import { buildOverviewReportModel } from "../lib/analytics/report-model";
import { globalKpis, classTrend, criticalTopics, topRiskStudents } from "../lib/analytics/overview-aggregate";
import { riskScore } from "../lib/analytics/risk";
import { formatPercent, formatNumber } from "../lib/analytics/formatters";
import { useAnalyticsOverview } from "../hooks/useAnalyticsOverview";
import { useOverviewTimeseries } from "../hooks/useOverviewTimeseries";
import { useRiskOverview } from "../hooks/useRiskOverview";
import { generateClassReviewQuestions, saveClassReviewDeck } from "../lib/close-unit-ai";
import { buildRoute } from "../routes";
import { C } from "../components/tokens";
import { useT } from "../i18n";

// 7d/30d/90d → from/to ISO. Memoized by caller so the queryKey is stable
// (lección del bug del loop: nunca derivar from/to en el render sin memo).
function periodToRange(period) {
  const now = new Date();
  const ms = (d) => d * 24 * 60 * 60 * 1000;
  if (period === "d7") return { from: new Date(now.getTime() - ms(7)).toISOString(), to: now.toISOString() };
  if (period === "d90") return { from: new Date(now.getTime() - ms(90)).toISOString(), to: now.toISOString() };
  if (period === "custom") return { from: null, to: null };
  return { from: new Date(now.getTime() - ms(30)).toISOString(), to: now.toISOString() };
}

export default function Director({ profile = null, lang: pageLang = "en" }) {
  const navigate = useNavigate();
  const t = useT("director", pageLang);
  const [period, setPeriod] = useState("d30");
  const { from, to } = useMemo(() => periodToRange(period), [period]);
  const [genKey, setGenKey] = useState(null);

  const overviewQ = useAnalyticsOverview();
  const tsQ = useOverviewTimeseries({ from, to, granularity: "day" });
  const overview = overviewQ.data ?? [];
  const ts = tsQ.data ?? [];

  const classesForRisk = useMemo(
    () => overview.map((r) => ({ id: r.class_id, name: r.class_name })),
    [overview],
  );
  const riskResults = useRiskOverview(classesForRisk);

  const kpis = useMemo(() => globalKpis(ts, overview), [ts, overview]);
  const trends = useMemo(() => classTrend(ts), [ts]);
  const critical = useMemo(() => criticalTopics(overview, 40), [overview]);

  const perClassRisk = useMemo(() => riskResults.map((r) => ({
    classId: r.classId, className: r.className,
    students: (r.data?.students ?? []).map((s) => ({
      name: s.student_name,
      risk: riskScore({
        recentPctCorrect: s.recent_pct_correct,
        weeklyPctCorrect: Array.isArray(s.weekly_pct_correct) ? s.weekly_pct_correct : [],
        recentParticipation: s.recent_participation,
        daysSinceLastActivity: s.days_since_last_activity,
      }),
    })),
  })), [riskResults]);
  const topRisk = useMemo(() => topRiskStudents(perClassRisk, 5), [perClassRisk]);
  const riskLoading = riskResults.some((r) => r.isPending);

  const classRows = useMemo(() => overview.map((r) => ({
    ...r,
    pctCorrect: trends[r.class_id]?.avg ?? null,
    trend: trends[r.class_id] ?? { points: [], avg: null, delta: null, trend: "new" },
  })), [overview, trends]);

  async function handleGenerateReview(topic) {
    const key = `${topic.classId}-${topic.topic}`;
    if (genKey) return;
    setGenKey(key);
    const row = overview.find((r) => r.class_id === topic.classId);
    const classObj = row
      ? { id: row.class_id, name: row.class_name || "", subject: row.class_subject || "", grade: row.class_grade || "" }
      : { id: topic.classId, name: topic.className, subject: "", grade: "" };
    const gen = await generateClassReviewQuestions({ classObj, weakTopics: [topic.topic], lang: "es" });
    if (!gen.ok) { setGenKey(null); return; }
    const save = await saveClassReviewDeck({ classObj, questions: gen.questions, lang: gen.inferredLang || "es", authorId: profile?.id ?? null });
    setGenKey(null);
    if (save.ok) navigate(buildRoute.deckEdit(save.deckId));
  }

  const loading = overviewQ.isPending;

  return (
    <StudioShell
      view="overview"
      title="Analytics"
      period={period}
      onPeriodChange={setPeriod}
      toolbarExtras={
        <ExportMenu
          baseName="reporte-general"
          disabled={overview.length === 0}
          buildModel={() => buildOverviewReportModel({
            period,
            stats: { avgRetention: kpis.pctCorrect ?? 0, classes: kpis.classesActive, students: kpis.totalStudents, sessions: kpis.totalSessions },
            perClass: overview.map((c) => ({ name: c.class_name, retention: Math.round(Number(c.retention_avg) || 0) })),
          })}
        />
      }
    >
      <div style={{ padding: 18, background: C.bgSoft, minHeight: "100%" }}>
        {loading && overview.length === 0 ? (
          <StudioSkeleton variant="class" />
        ) : overview.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, color: C.textMuted }}>{t.noClasses}</div>
        ) : (
          <>
            {/* Banda KPI — % correcto del período + totales */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginBottom: 12 }}>
              <StatCardWithSparkline label="% correcto" value={<AnimatedNumber value={kpis.pctCorrect} format={formatPercent} />} />
              <StatCardWithSparkline label="Clases" value={<AnimatedNumber value={kpis.classesActive} format={formatNumber} />} />
              <StatCardWithSparkline label="Alumnos" value={<AnimatedNumber value={kpis.totalStudents} format={formatNumber} />} />
              <StatCardWithSparkline label="Sesiones" value={<AnimatedNumber value={kpis.totalSessions} format={formatNumber} />} />
            </div>

            {/* Centro de acción */}
            <PulseStrip />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10, margin: "12px 0" }}>
              <RiskOverviewList
                items={topRisk}
                loading={riskLoading}
                onStudentClick={(s) => navigate(buildRoute.analyticsStudent(s.classId, s.name))}
              />
              <CriticalTopicsList
                items={critical}
                generatingKey={genKey}
                onTopicClick={(tp) => navigate(`${buildRoute.analyticsTopics(tp.classId)}?topic=${encodeURIComponent(tp.topic)}`)}
                onGenerateReview={handleGenerateReview}
              />
            </div>

            {/* Tabla de clases */}
            <ClassTable rows={classRows} onRowClick={(r) => navigate(buildRoute.analyticsClass(r.class_id))} />
          </>
        )}
      </div>
    </StudioShell>
  );
}
