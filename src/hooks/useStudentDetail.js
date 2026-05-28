// src/hooks/useStudentDetail.js
//
// F2 Analytics Studio: payload completo del Perfil de Estudiante.
// Una llamada → KPIs + trayectoria + topic mastery + historial por sesión
// + más falladas + class avg. Mismo patrón RQ que useClassAnalytics.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export const studentDetailKey = (classId, studentRef, from, to) =>
  ["analytics", "student", classId, studentRef, from || null, to || null];

async function fetchStudentDetail(classId, studentRef, from, to) {
  const { data, error } = await supabase.rpc("student_detail", {
    p_class_id: classId,
    p_student_ref: studentRef,
    p_from: from || null,
    p_to: to || null,
  });
  if (error) throw error;
  return data;
}

export function useStudentDetail(classId, studentRef, { from, to } = {}) {
  return useQuery({
    queryKey: studentDetailKey(classId, studentRef, from, to),
    enabled: !!classId && !!studentRef,
    queryFn: () => fetchStudentDetail(classId, studentRef, from, to),
  });
}
