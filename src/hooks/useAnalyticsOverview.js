// src/hooks/useAnalyticsOverview.js
//
// F0 Analytics Studio: cross-class snapshot del docente autenticado.
// Reemplaza el N+1 de useDirector (que en task 9 se refactoriza para
// delegar acá). Mismo patrón RQ que useDecks/useClasses.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export const ANALYTICS_OVERVIEW_KEY = ["analytics", "overview"];

async function fetchAnalyticsOverview() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.rpc("analytics_overview");
  if (error) throw error;
  return data || [];
}

export function useAnalyticsOverview() {
  return useQuery({
    queryKey: ANALYTICS_OVERVIEW_KEY,
    queryFn: fetchAnalyticsOverview,
  });
}
