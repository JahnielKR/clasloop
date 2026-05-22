// PR 170 (M1): React Query data layer for the student's My Classes page.
//
// `useStudentClasses(profileId, membershipTick)` wraps the old loadAll: the
// classes the student belongs to (enriched with deck count / reviews-due / avg
// retention) + their saved decks. The membershipTick (App-level, bumped when
// the student joins/leaves a class) is part of the query key, so a membership
// change refetches — same as the old effect dep. `useStudentClassesCache()`
// exposes `patchSavedDecks` (un-star optimistic update) + `invalidate` (the
// join handler calls it to refresh after joining).
//
// `useClassDetail(classId, profileId)` wraps the class-detail load (the class's
// decks + the student's topic progress). Read-only.
//
// Untyped supabase client (no generated Database type — see PR 134).

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export const studentClassesKey = (profileId, tick) => ["studentClasses", profileId, tick];

async function fetchStudentClasses(profileId) {
  // 1. Classes the student belongs to (via class_members).
  const { data: members } = await supabase
    .from("class_members")
    .select("class_id, classes(*, profiles:teacher_id(full_name, avatar_url, avatar_id, id))")
    .eq("student_id", profileId);
  const list = (members || []).map((m) => m.classes).filter(Boolean);

  // 2. Enrich each class with deck count + reviews-due + avg retention.
  const classes = await Promise.all(
    list.map(async (cls) => {
      const { count: deckCount } = await supabase
        .from("decks")
        .select("*", { count: "exact", head: true })
        .eq("class_id", cls.id);
      const { data: progress } = await supabase
        .from("student_topic_progress")
        .select("retention_score, last_reviewed_at")
        .eq("student_id", profileId)
        .eq("class_id", cls.id);
      const reviewsDue = (progress || []).filter((p) => (p.retention_score ?? 100) < 65).length;
      const avgRetention =
        progress && progress.length > 0
          ? Math.round(progress.reduce((s, p) => s + (p.retention_score || 0), 0) / progress.length)
          : null;
      return { ...cls, deckCount: deckCount || 0, reviewsDue, avgRetention };
    })
  );

  // 3. Saved decks from community.
  const { data: saved } = await supabase
    .from("saved_decks")
    .select("deck_id, saved_at, is_favorite, decks(*, classes(name, profiles:teacher_id(full_name)))")
    .eq("student_id", profileId)
    .order("saved_at", { ascending: false });
  const savedDecks = (saved || [])
    .filter((s) => s.decks)
    .map((s) => ({ ...s.decks, _isFavorite: s.is_favorite || false }));

  return { classes, savedDecks };
}

export function useStudentClasses(profileId, membershipTick) {
  return useQuery({
    queryKey: studentClassesKey(profileId, membershipTick),
    queryFn: () => fetchStudentClasses(profileId),
    enabled: !!profileId,
  });
}

export function useStudentClassesCache(profileId, membershipTick) {
  const queryClient = useQueryClient();
  const patchSavedDecks = (next) =>
    queryClient.setQueryData(studentClassesKey(profileId, membershipTick), (prev) => {
      if (!prev) return prev;
      const savedDecks = typeof next === "function" ? next(prev.savedDecks) : next;
      return { ...prev, savedDecks };
    });
  // Prefix match (no tick) so it invalidates whatever the current key is.
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["studentClasses", profileId] });
  return { patchSavedDecks, invalidate };
}

// ─── ClassDetail (one class: decks + the student's progress) ─────────────────

export const classDetailKey = (classId, profileId) => ["classDetail", classId, profileId];

async function fetchClassDetail(classId, profileId) {
  const [{ data: decksData }, { data: progressData }] = await Promise.all([
    supabase.from("decks").select("*").eq("class_id", classId).order("created_at", { ascending: false }),
    supabase
      .from("student_topic_progress")
      .select("*")
      .eq("student_id", profileId)
      .eq("class_id", classId),
  ]);
  return { decks: decksData || [], progress: progressData || [] };
}

export function useClassDetail(classId, profileId) {
  return useQuery({
    queryKey: classDetailKey(classId, profileId),
    queryFn: () => fetchClassDetail(classId, profileId),
    enabled: !!classId && !!profileId,
  });
}
