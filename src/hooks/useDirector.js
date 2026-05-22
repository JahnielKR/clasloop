// PR 170 (M1): React Query data layer for the Director ("school analysis") page.
//
// `useDirector()` wraps the old loadData: the teacher's classes + per-class
// retention / student progress / session & unique-student counts. Read-only
// (no mutations) — analytics dashboard.
//
// NOTE vs the old loadData: it did incremental setState inside the per-class
// loop (the UI filled in class-by-class); the query builds the full maps then
// returns once (loads all-at-once). Also DROPPED a dead query — the old code
// fetched `session_participants` by `session_id = class_id` into `parts` and
// never used it (the unique-student count comes from `allParts` below).
//
// Untyped supabase client (no generated Database type — see PR 134).

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { getClassRetentionOverview, getStudentProgress } from "../lib/spaced-repetition";

export const DIRECTOR_KEY = ["director"];

async function fetchDirector() {
  const empty = {
    classes: [],
    retentionData: {},
    studentData: {},
    sessionCounts: {},
    memberCounts: {},
  };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return empty;

  const { data: cls } = await supabase
    .from("classes")
    .select("*")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });
  const classes = cls || [];

  const retentionData = {};
  const studentData = {};
  const sessionCounts = {};
  const memberCounts = {};

  for (const c of classes) {
    retentionData[c.id] = await getClassRetentionOverview(c.id);
    studentData[c.id] = await getStudentProgress(c.id);

    const { count } = await supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .eq("class_id", c.id);
    sessionCounts[c.id] = count || 0;

    const { count: mc } = await supabase
      .from("class_members")
      .select("*", { count: "exact", head: true })
      .eq("class_id", c.id);
    const { data: sessIds } = await supabase.from("sessions").select("id").eq("class_id", c.id);
    let uniqueStudents = mc || 0;
    if (sessIds && sessIds.length > 0) {
      const { data: allParts } = await supabase
        .from("session_participants")
        .select("student_name")
        .in("session_id", sessIds.map((s) => s.id));
      if (allParts) {
        const unique = new Set(allParts.map((p) => p.student_name));
        uniqueStudents = Math.max(uniqueStudents, unique.size);
      }
    }
    memberCounts[c.id] = uniqueStudents;
  }

  return { classes, retentionData, studentData, sessionCounts, memberCounts };
}

export function useDirector() {
  return useQuery({ queryKey: DIRECTOR_KEY, queryFn: fetchDirector });
}
