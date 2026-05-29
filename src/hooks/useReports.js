// src/hooks/useReports.js
//
// F7 Analytics Studio: CRUD sobre analytics_reports (tabla con RLS por
// teacher_id). React Query: lista + create + delete con invalidación.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export const reportsKey = ["analytics", "reports"];

async function fetchReports() {
  const { data, error } = await supabase
    .from("analytics_reports")
    .select("id, name, scope, class_id, period, model, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export function useReports() {
  return useQuery({ queryKey: reportsKey, queryFn: fetchReports });
}

export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (report) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("not_authenticated");
      const { data, error } = await supabase
        .from("analytics_reports")
        .insert({
          teacher_id: user.id,
          name: report.name,
          scope: report.scope || "class",
          class_id: report.class_id || null,
          period: report.period || null,
          model: report.model || {},
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: reportsKey }),
  });
}

export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from("analytics_reports")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: reportsKey }),
  });
}
