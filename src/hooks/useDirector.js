// PR 170 (M1) → F0 Analytics Studio (2026-05-28):
// Reemplazado el for-loop N+1 (4-6 queries por clase) por una sola
// llamada a la RPC analytics_overview. Forma de retorno preservada
// (classes, retentionData, studentData, sessionCounts, memberCounts)
// para que Director.jsx no cambie.
//
// El adapter REPRODUCE los campos derivados que el código viejo
// calculaba JS-side en getClassRetentionOverview / getStudentProgress
// (average, status, trend, current_retention, weakTopics, strongTopics,
// avgRetention…). Director.jsx los lee directamente, así que si el
// adapter no los entrega la página renderiza con NaN/undefined.
//
// Pragmatismo F0: usamos retention_score (snapshot del SR) como
// current_retention, sin recalcular decay JS-side. F1 reescribe el
// Director como ClassDetail y retira este shim.
//
// El hook nuevo y "limpio" es useAnalyticsOverview (mismo dato, forma
// nativa). Este shim solo existe para mantener la página vieja viva
// durante la transición.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export const DIRECTOR_KEY = ["director"];

// ─── Enrichment helpers ─────────────────────────────────────────────────
// Replican el shape que producían getClassRetentionOverview +
// getStudentProgress en src/lib/spaced-repetition.ts. Mantener
// idénticos los nombres de campos que lee Director.jsx.

function enrichTopic(t) {
  const score = t.retention_score ?? 0;
  const status = score >= 70 ? "strong" : score >= 40 ? "medium" : "weak";
  // F0 no tiene histórico de retención → trend "stable" si hubo varias
  // sesiones, "new" si es la primera. F1 lo afila con un MV de history.
  const trend = (t.session_count ?? 0) > 1 ? "stable" : "new";
  const daysSince = t.last_reviewed_at
    ? Math.round(
        (Date.now() - new Date(t.last_reviewed_at).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 999;
  return {
    ...t,
    current_retention: score, // F0: snapshot directo, sin decay calc
    days_since_review: daysSince,
    status,
    trend,
  };
}

function buildClassRetention(topicsSnapshot) {
  const enriched = (topicsSnapshot || []).map(enrichTopic);
  if (enriched.length === 0) {
    return { average: 0, topics: [], strong: 0, medium: 0, weak: 0 };
  }
  const average = Math.round(
    enriched.reduce((s, t) => s + t.current_retention, 0) / enriched.length,
  );
  const strong = enriched.filter((t) => t.status === "strong").length;
  const medium = enriched.filter((t) => t.status === "medium").length;
  const weak = enriched.filter((t) => t.status === "weak").length;
  return { average, topics: enriched, strong, medium, weak };
}

function buildStudentList(studentsSnapshot) {
  // Agrupar las filas (student × topic) por student_name — mismo patrón
  // que getStudentProgress en src/lib/spaced-repetition.ts:641.
  const byStudent = {};
  for (const row of studentsSnapshot || []) {
    const name = row.student_name;
    if (!byStudent[name]) {
      byStudent[name] = {
        name,
        topics: [],
        totalCorrect: 0,
        totalQuestions: 0,
      };
    }
    byStudent[name].topics.push(row);
    byStudent[name].totalCorrect += row.correct_answers || 0;
    byStudent[name].totalQuestions += row.total_questions || 0;
  }
  return Object.values(byStudent)
    .map((s) => ({
      ...s,
      avgRetention:
        s.totalQuestions > 0
          ? Math.round((s.totalCorrect / s.totalQuestions) * 100)
          : 0,
      weakTopics: s.topics.filter((t) => (t.retention_score ?? 0) < 40).length,
      strongTopics: s.topics.filter((t) => (t.retention_score ?? 0) >= 70).length,
    }))
    .sort((a, b) => b.avgRetention - a.avgRetention);
}

function adaptRowsToDirectorShape(rows) {
  const classes = rows.map((r) => ({
    id: r.class_id,
    teacher_id: null, // Director no lo usa.
    name: r.class_name,
    grade: r.class_grade,
    subject: r.class_subject,
    class_code: r.class_code,
  }));

  const retentionData = {};
  const studentData = {};
  const sessionCounts = {};
  const memberCounts = {};

  for (const r of rows) {
    retentionData[r.class_id] = buildClassRetention(r.topics_snapshot);
    studentData[r.class_id] = buildStudentList(r.students_snapshot);
    sessionCounts[r.class_id] = r.session_count || 0;
    // memberCounts viejo: max(class_members, unique_participants).
    memberCounts[r.class_id] = Math.max(
      r.member_count || 0,
      r.unique_students || 0,
    );
  }

  return { classes, retentionData, studentData, sessionCounts, memberCounts };
}

async function fetchDirector() {
  const empty = {
    classes: [],
    retentionData: {},
    studentData: {},
    sessionCounts: {},
    memberCounts: {},
  };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return empty;

  const { data, error } = await supabase.rpc("analytics_overview");
  if (error) throw error;
  return adaptRowsToDirectorShape(data || []);
}

export function useDirector() {
  return useQuery({ queryKey: DIRECTOR_KEY, queryFn: fetchDirector });
}
