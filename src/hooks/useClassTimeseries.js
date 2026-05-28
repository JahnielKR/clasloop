// src/hooks/useClassTimeseries.js
//
// F0 Analytics Studio: serie temporal pct_correct|avg_time|participation
// por clase, granularidad day|week, ventana de fechas. Consumido por
// TrendPanel en F1.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export const classTimeseriesKey = (classId, metric, granularity, from, to) =>
  ["analytics", "class", classId, "timeseries", metric, granularity, from || null, to || null];

async function fetchClassTimeseries(classId, metric, granularity, from, to) {
  const { data, error } = await supabase.rpc("class_timeseries", {
    p_class_id: classId,
    p_metric: metric,
    p_granularity: granularity,
    p_from: from || null,
    p_to: to || null,
  });
  if (error) throw error;
  return data || [];
}

export function useClassTimeseries(
  classId,
  { metric = "pct_correct", granularity = "day", from, to } = {},
) {
  return useQuery({
    queryKey: classTimeseriesKey(classId, metric, granularity, from, to),
    enabled: !!classId,
    queryFn: () => fetchClassTimeseries(classId, metric, granularity, from, to),
  });
}
