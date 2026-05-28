// PR 170 (M1) → F0 Analytics Studio (2026-05-28):
// Reemplazado el for-loop N+1 (4-6 queries por clase) por una sola
// llamada a la RPC analytics_overview. Misma forma de retorno
// (classes, retentionData, studentData, sessionCounts, memberCounts)
// para que Director.jsx no cambie.
//
// El hook nuevo y "limpio" es useAnalyticsOverview (mismo dato, forma
// nativa). Cuando F1 reescriba el Director como ClassDetail, useDirector
// se retira; este shim solo existe para mantener la página vieja viva
// durante la transición.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export const DIRECTOR_KEY = ["director"];

function adaptRowsToDirectorShape(rows) {
  const classes = rows.map((r) => ({
    id: r.class_id,
    teacher_id: null, // Director no lo usa; lo dejamos null para no traerlo.
    name: r.class_name,
    grade: r.class_grade,
    subject: r.class_subject,
    class_code: r.class_code,
    // created_at no es necesario para Director; lo dejamos undefined.
  }));

  const retentionData = {};
  const studentData = {};
  const sessionCounts = {};
  const memberCounts = {};

  for (const r of rows) {
    // getClassRetentionOverview devolvía { topics: [...] }; replicamos.
    retentionData[r.class_id] = { topics: r.topics_snapshot || [] };
    studentData[r.class_id] = r.students_snapshot || [];
    sessionCounts[r.class_id] = r.session_count || 0;
    // memberCounts en el código viejo era max(class_members, unique_participants).
    memberCounts[r.class_id] = Math.max(r.member_count || 0, r.unique_students || 0);
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
