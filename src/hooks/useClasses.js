// PR 170b (M1): React Query data layer for the teacher's Classes list.
//
// `useTeacherClasses(userId)` wraps the old inline load in MyClassesTeacher.jsx
// (classes + per-class deck/student counts) in one cached query.
// `useTeacherClassesCache(userId)` exposes `patchClasses` so the page's
// create/import/reorder/theme handlers keep their exact optimistic updates,
// now patching the query cache instead of local state.
//
// Untyped supabase client (no generated Database type — see PR 134).

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export const teacherClassesKey = (userId) => ["teacherClasses", userId];

async function fetchTeacherClasses(userId) {
  // Classes the teacher owns, in their drag-ordered arrangement (position,
  // then created_at as a stable tiebreaker).
  const { data: cls } = await supabase
    .from("classes")
    .select("*")
    .eq("teacher_id", userId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });
  const classes = cls || [];

  // Per-class deck + student counts (simple count queries, fine for small N).
  const deckCounts = {};
  const studentCounts = {};
  if (classes.length > 0) {
    const ids = classes.map((c) => c.id);
    const [decksRes, membersRes] = await Promise.all([
      supabase.from("decks").select("class_id").in("class_id", ids),
      supabase.from("class_members").select("class_id").in("class_id", ids),
    ]);
    (decksRes.data || []).forEach((d) => {
      deckCounts[d.class_id] = (deckCounts[d.class_id] || 0) + 1;
    });
    (membersRes.data || []).forEach((m) => {
      studentCounts[m.class_id] = (studentCounts[m.class_id] || 0) + 1;
    });
  }

  return { classes, deckCounts, studentCounts };
}

export function useTeacherClasses(userId) {
  return useQuery({
    queryKey: teacherClassesKey(userId),
    queryFn: () => fetchTeacherClasses(userId),
    enabled: !!userId,
  });
}

export function useTeacherClassesCache(userId) {
  const queryClient = useQueryClient();
  // Accepts a new array OR an updater fn, mirroring the old setClasses(...).
  const patchClasses = (next) =>
    queryClient.setQueryData(teacherClassesKey(userId), (prev) => {
      if (!prev) return prev;
      const classes = typeof next === "function" ? next(prev.classes) : next;
      return { ...prev, classes };
    });
  return { patchClasses };
}
