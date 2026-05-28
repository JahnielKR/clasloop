// src/hooks/useClassAnalytics.js
//
// F0 Analytics Studio: KPIs + topic mastery + most-missed para una clase
// sobre una ventana de fechas. Consumido por ClassDetail en F1.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export const classAnalyticsKey = (classId, from, to) =>
  ["analytics", "class", classId, from || null, to || null];

async function fetchClassAnalytics(classId, from, to) {
  const { data, error } = await supabase.rpc("class_analytics", {
    p_class_id: classId,
    p_from: from || null,
    p_to: to || null,
  });
  if (error) throw error;
  return data;
}

export function useClassAnalytics(classId, { from, to } = {}) {
  return useQuery({
    queryKey: classAnalyticsKey(classId, from, to),
    enabled: !!classId,
    queryFn: () => fetchClassAnalytics(classId, from, to),
  });
}
