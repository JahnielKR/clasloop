// src/hooks/useActiveSession.js
//
// F6: cuál es la sesión activa más reciente del docente (si hay alguna).
// Reusa la lógica que App.jsx ya tiene (sidebar shortcut "Active session"),
// pero como hook independiente para que LiveCommandCenter no dependa de
// App-level state. SELECT simple, RLS por teacher_id.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export const activeSessionKey = ["analytics", "activeSession"];

async function fetchActiveSession() {
  // Sesiones < 24h en lobby o active (mismo pattern que App.jsx para
  // descartar zombies).
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("sessions")
    .select("id, status, topic, deck_id, class_id, created_at")
    .in("status", ["lobby", "active"])
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] || null;
}

export function useActiveSession() {
  return useQuery({
    queryKey: activeSessionKey,
    queryFn: fetchActiveSession,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
