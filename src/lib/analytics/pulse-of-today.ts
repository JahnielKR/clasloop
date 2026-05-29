// ─── src/lib/analytics/pulse-of-today.ts ───────────────────────────────
// Pure selectors para la franja "Pulso de hoy" + Live Command Center.
// Toma las filas crudas de sessions + responses + classes (lo que el hook
// useTodayPulse devuelve) y produce el resumen agregado del día. Sin
// React, sin Supabase. Testeable.

export interface PulseInputs {
  sessions: any[];
  responses: any[];
  classes: any[];
}

export interface TopClass {
  id: string;
  name: string;
  response_count: number;
}

export interface TopStudent {
  name: string;
  pct_correct: number;
  response_count: number;
}

export interface TodayPulse {
  completed_sessions: number;
  active_sessions: number;
  responses_total: number;
  pct_correct_today: number | null;
  top_class: TopClass | null;
  top_student: TopStudent | null;
  has_active: boolean;
  /** Most-recent active session id (or null) — drives the /school/live drill-down. */
  active_session_id: string | null;
}

/** Top class by total responses today. */
export function topClassByActivity(
  responses: readonly any[],
  classes: readonly any[],
): TopClass | null {
  if (!responses || responses.length === 0) return null;
  const byId = new Map<string, number>();
  for (const r of responses) {
    if (!r?.class_id) continue;
    byId.set(r.class_id, (byId.get(r.class_id) || 0) + 1);
  }
  if (byId.size === 0) return null;
  const top = [...byId.entries()].sort((a, b) => b[1] - a[1])[0];
  const [id, count] = top;
  const cls = (classes || []).find((c) => c.id === id);
  return { id, name: cls?.name || id, response_count: count };
}

/**
 * Top student by % correct today. Requires at least 3 responses to filter out
 * noise from students who answered 1-2 things perfectly.
 */
export function topStudentByPctCorrect(
  responses: readonly any[],
  minResponses = 3,
): TopStudent | null {
  if (!responses || responses.length === 0) return null;
  const acc = new Map<string, { correct: number; total: number }>();
  for (const r of responses) {
    if (!r?.student_name) continue;
    const cur = acc.get(r.student_name) || { correct: 0, total: 0 };
    cur.total += 1;
    if (r.is_correct) cur.correct += 1;
    acc.set(r.student_name, cur);
  }
  const eligible = [...acc.entries()].filter(([, v]) => v.total >= minResponses);
  if (eligible.length === 0) return null;
  eligible.sort((a, b) => b[1].correct / b[1].total - a[1].correct / a[1].total);
  const [name, { correct, total }] = eligible[0];
  return {
    name,
    pct_correct: Math.round((correct / total) * 100),
    response_count: total,
  };
}

export function computeTodayPulse(inputs: PulseInputs): TodayPulse {
  const sessions = inputs.sessions || [];
  const responses = inputs.responses || [];
  const classes = inputs.classes || [];

  const completed = sessions.filter((s) => s?.status === "completed").length;
  const active = sessions.filter(
    (s) => s?.status === "active" || s?.status === "lobby",
  );
  const totalResponses = responses.length;

  let pctCorrect: number | null = null;
  let sumPoints = 0;
  let sumMax = 0;
  for (const r of responses) {
    if (Number.isFinite(Number(r?.points))) sumPoints += Number(r.points);
    if (Number.isFinite(Number(r?.max_points))) sumMax += Number(r.max_points);
  }
  if (sumMax > 0) pctCorrect = Math.round((sumPoints / sumMax) * 100);

  // Most recent active session id (sorts active sessions by created_at desc)
  const activeSorted = [...active].sort((a, b) => {
    const ta = a?.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b?.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  });
  const activeSessionId = activeSorted[0]?.id || null;

  return {
    completed_sessions: completed,
    active_sessions: active.length,
    responses_total: totalResponses,
    pct_correct_today: pctCorrect,
    top_class: topClassByActivity(responses, classes),
    top_student: topStudentByPctCorrect(responses),
    has_active: active.length > 0,
    active_session_id: activeSessionId,
  };
}
