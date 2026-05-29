// src/hooks/useStudentRisk.js
//
// F5 Analytics Studio: insumos at-risk por alumno de una clase.
// El score final se calcula en cliente con src/lib/analytics/risk.ts —
// el hook solo carga los inputs crudos via RPC student_risk (migration 071).

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export const studentRiskKey = (classId, windowDays) =>
  ["analytics", "studentRisk", classId, windowDays || 30];

export async function fetchStudentRisk(classId, windowDays) {
  const { data, error } = await supabase.rpc("student_risk", {
    p_class_id: classId,
    p_window_days: windowDays || 30,
  });
  if (error) throw error;
  return data;
}

export function useStudentRisk(classId, { windowDays } = {}) {
  return useQuery({
    queryKey: studentRiskKey(classId, windowDays),
    enabled: !!classId,
    queryFn: () => fetchStudentRisk(classId, windowDays),
  });
}
