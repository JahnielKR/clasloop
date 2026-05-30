// src/hooks/useCleoUsage.js
//
// "Tu uso de Cleo" Studio view: the current teacher's own ai_generations over a
// date window. RLS ("Teachers read own generations" → auth.uid() = teacher_id)
// scopes the rows to the signed-in teacher, so a plain select is safe and no
// teacher_id filter is needed. We fetch only the small columns — never the big
// output_raw/output_final jsonb. Aggregation is pure: src/lib/analytics/cleo-usage.ts.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export const cleoUsageKey = (from, to) =>
  ["analytics", "cleoUsage", from || null, to || null];

const COLUMNS =
  "id, created_at, activity_type, model_used, input_type, num_questions, " +
  "accepted_count, edited_count, regenerated_count, time_to_publish_ms";

async function fetchCleoUsage(from, to) {
  let query = supabase
    .from("ai_generations")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export function useCleoUsage({ from, to } = {}) {
  return useQuery({
    queryKey: cleoUsageKey(from, to),
    queryFn: () => fetchCleoUsage(from, to),
  });
}
