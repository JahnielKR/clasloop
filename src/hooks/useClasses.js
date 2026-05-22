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

// ─── ClassPage (teacher class detail) ───────────────────────────────────────
// PR 170b: replaces the old load + `refreshTick` refetch counter in
// ClassPage.jsx. One cached query fetches class + decks + units + the "used"
// deck ids (decks with a non-cancelled session, locked in place). The page's
// refreshTick bumps become `invalidate()`; its optimistic mutations become
// patch* helpers (each accepts a value OR an updater, like the old setState).

export const classPageKey = (classId) => ["classPage", classId];

async function fetchClassPage(classId, userId) {
  const [classRes, decksRes, unitsRes, usedRes] = await Promise.all([
    supabase.from("classes").select("*").eq("id", classId).maybeSingle(),
    supabase
      .from("decks")
      .select("*")
      .eq("class_id", classId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("units")
      .select("*")
      .eq("class_id", classId)
      .order("position", { ascending: true }),
    supabase
      .from("sessions")
      .select("deck_id")
      .eq("class_id", classId)
      .in("status", ["lobby", "active", "completed"])
      .not("deck_id", "is", null),
  ]);

  // Not found, or a teacher peeking at a class they don't own → bounce visually
  // (RLS still blocks mutations; this stops the URL from acting as a peek).
  if (!classRes.data || classRes.data.teacher_id !== userId) {
    return { notFound: true, classObj: null, decks: [], units: [], usedDeckIds: new Set() };
  }

  const usedDeckIds = new Set();
  (usedRes?.data || []).forEach((s) => {
    if (s?.deck_id) usedDeckIds.add(s.deck_id);
  });

  return {
    notFound: false,
    classObj: classRes.data,
    decks: decksRes.data || [],
    units: unitsRes.data || [],
    usedDeckIds,
  };
}

export function useClassPage(classId, userId) {
  return useQuery({
    queryKey: classPageKey(classId),
    queryFn: () => fetchClassPage(classId, userId),
    enabled: !!classId && !!userId,
  });
}

export function useClassPageCache(classId) {
  const queryClient = useQueryClient();
  const makePatch = (field) => (next) =>
    queryClient.setQueryData(classPageKey(classId), (prev) => {
      if (!prev) return prev;
      const value = typeof next === "function" ? next(prev[field]) : next;
      return { ...prev, [field]: value };
    });
  return {
    patchClassObj: makePatch("classObj"),
    patchDecks: makePatch("decks"),
    patchUnits: makePatch("units"),
    invalidate: () => queryClient.invalidateQueries({ queryKey: classPageKey(classId) }),
  };
}
