// ─── src/lib/analytics/cleo-analytics.ts ───────────────────────────────
// Pure-ish payload builder: toma la salida de class_analytics /
// student_detail (objetos JSON que ya vienen del RPC) y arma un objeto
// COMPACTO que el endpoint de narrativa (api/analytics-narrative.js) o
// la vista Analista Cleo (/school/ask) pasan a Gemini como contexto.
//
// Sin React, sin Supabase. Testeable. La regla "compacto": <2 KB de JSON
// para no inflar el system prompt.

export interface ClassNarrativeContext {
  scope: "class";
  lang: string;
  className: string;
  kpis: Record<string, number | null>;
  weakTopics: { topic: string; retention_score: number }[];
  strongTopics: { topic: string; retention_score: number }[];
  mostMissed: { question_index: number; topic: string; error_rate: number }[];
  recentTrend: { bucket: string; value: number }[];
}

export interface StudentNarrativeContext {
  scope: "student";
  lang: string;
  studentName: string;
  kpis: Record<string, number | null>;
  weakTopics: { topic: string; retention_score: number }[];
  mostFailed: { question_index: number; topic: string; error_rate: number }[];
  recentTrajectory: { bucket: string; value: number }[];
  deltaVsClass: number | null;
}

function pickWeakTopics(arr: any[], k = 3) {
  return [...(arr || [])]
    .filter((t) => t.retention_score != null)
    .sort((a, b) => Number(a.retention_score) - Number(b.retention_score))
    .slice(0, k)
    .map((t) => ({ topic: t.topic, retention_score: Number(t.retention_score) }));
}

function pickStrongTopics(arr: any[], k = 3) {
  return [...(arr || [])]
    .filter((t) => t.retention_score != null)
    .sort((a, b) => Number(b.retention_score) - Number(a.retention_score))
    .slice(0, k)
    .map((t) => ({ topic: t.topic, retention_score: Number(t.retention_score) }));
}

function pickMissed(arr: any[], k = 3) {
  return [...(arr || [])]
    .slice(0, k)
    .map((m) => ({
      question_index: Number(m.question_index),
      topic: m.topic || "",
      error_rate: Number(m.error_rate),
    }));
}

function tailTrend(arr: any[], k = 4) {
  return (arr || [])
    .slice(-k)
    .map((d) => ({ bucket: String(d.bucket), value: Number(d.value) }));
}

export function buildClassNarrativeContext(args: {
  className: string;
  classAnalytics: any;
  timeseries: any[];
  lang: string;
}): ClassNarrativeContext {
  const ca = args.classAnalytics || {};
  return {
    scope: "class",
    lang: args.lang || "es",
    className: args.className || "",
    kpis: {
      pct_correct: ca.kpis?.pct_correct ?? null,
      unique_participants: ca.kpis?.unique_participants ?? null,
      responses_total: ca.kpis?.responses_total ?? null,
      avg_time_ms: ca.kpis?.avg_time_ms ?? null,
    },
    weakTopics: pickWeakTopics(ca.topic_mastery, 3),
    strongTopics: pickStrongTopics(ca.topic_mastery, 3),
    mostMissed: pickMissed(ca.most_missed, 3),
    recentTrend: tailTrend(args.timeseries || [], 4),
  };
}

export function buildStudentNarrativeContext(args: {
  studentName: string;
  detail: any;
  lang: string;
}): StudentNarrativeContext {
  const d = args.detail || {};
  const topics = d.topic_mastery || [];
  const studentAvg =
    topics.length > 0
      ? topics.reduce((s: number, t: any) => s + (Number(t.retention_score) || 0), 0) /
        topics.length
      : null;
  const classAvg = d.class_avg_retention != null ? Number(d.class_avg_retention) : null;
  const delta =
    studentAvg != null && classAvg != null ? Math.round(studentAvg - classAvg) : null;

  return {
    scope: "student",
    lang: args.lang || "es",
    studentName: args.studentName || "",
    kpis: {
      pct_correct: d.kpis?.pct_correct ?? null,
      session_count: d.kpis?.session_count ?? null,
      avg_time_ms: d.kpis?.avg_time_ms ?? null,
    },
    weakTopics: pickWeakTopics(topics, 3),
    mostFailed: pickMissed(d.most_failed, 3),
    recentTrajectory: tailTrend(d.trajectory || [], 3),
    deltaVsClass: delta,
  };
}
