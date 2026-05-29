// src/hooks/useOverviewTimeseries.js
//
// Analytics Studio Área 3: per-class % correct series for the /school cockpit
// sparklines. One RPC call (overview_timeseries over mv_class_daily) for all
// classes. Mismo patrón que useClassTimeseries; el caller memoiza from/to.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export const overviewTimeseriesKey = (granularity, from, to) =>
  ["analytics", "overviewTimeseries", granularity, from || null, to || null];

async function fetchOverviewTimeseries(from, to, granularity) {
  const { data, error } = await supabase.rpc("overview_timeseries", {
    p_from: from || null,
    p_to: to || null,
    p_granularity: granularity,
  });
  if (error) throw error;
  return data || [];
}

export function useOverviewTimeseries({ from, to, granularity = "day" } = {}) {
  return useQuery({
    queryKey: overviewTimeseriesKey(granularity, from, to),
    queryFn: () => fetchOverviewTimeseries(from, to, granularity),
  });
}
