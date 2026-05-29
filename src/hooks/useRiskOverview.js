// src/hooks/useRiskOverview.js
//
// Analytics Studio Área 3: at-risk students across ALL the teacher's classes.
// Dynamic N queries (one student_risk per class) via React Query's useQueries
// — no new RPC. Each query is cached under the same key as useStudentRisk, so
// visiting a class' ClassDetail reuses the cockpit's fetch and vice-versa.

import { useQueries } from "@tanstack/react-query";
import { studentRiskKey, fetchStudentRisk } from "./useStudentRisk";

// classes: [{ id, name }] — returns [{ classId, className, data, isPending, error }]
export function useRiskOverview(classes = []) {
  const results = useQueries({
    queries: classes.map((c) => ({
      queryKey: studentRiskKey(c.id, 30),
      queryFn: () => fetchStudentRisk(c.id, 30),
      enabled: !!c.id,
    })),
  });
  return results.map((r, i) => ({
    classId: classes[i].id,
    className: classes[i].name,
    data: r.data,
    isPending: r.isPending,
    error: r.error,
  }));
}
