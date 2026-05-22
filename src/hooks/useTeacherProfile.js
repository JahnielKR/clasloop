// PR 170 (M1): React Query data layer for a teacher's public profile page.
//
// `useTeacherProfile(teacherId, viewerId, viewerRole)` wraps the old load:
// the viewed teacher's profile + their public decks + the VIEWER's saved set
// (for the star state) + (teacher viewers) their own classes for the "save to
// my decks" picker. Keyed on teacherId+viewerId so navigating between profiles
// refetches. `useTeacherProfileCache()` exposes `patchSaved` for the favorite
// toggle.
//
// Untyped supabase client (no generated Database type — see PR 134).

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export const teacherProfileKey = (teacherId, viewerId) => ["teacherProfile", teacherId, viewerId];

async function fetchTeacherProfile(teacherId, viewerId, viewerRole) {
  const { data: p } = await supabase
    .from("profiles")
    .select("id, full_name, role, avatar_url, avatar_id")
    .eq("id", teacherId)
    .maybeSingle();

  if (!p || p.role !== "teacher") {
    return { notAvailable: true, profile: null, decks: [], saved: {}, userClasses: [] };
  }

  const { data: dks } = await supabase
    .from("decks")
    .select("*")
    .eq("author_id", teacherId)
    .eq("is_public", true)
    .order("uses_count", { ascending: false });

  // The viewer's saved set (to show filled/empty stars).
  const saved = {};
  if (viewerId) {
    const { data: savedRows } = await supabase
      .from("saved_decks")
      .select("deck_id")
      .eq("student_id", viewerId);
    (savedRows || []).forEach((r) => {
      saved[r.deck_id] = true;
    });
  }

  // Teacher viewers also need their own classes for the "save to my decks" modal.
  let userClasses = [];
  if (viewerRole === "teacher" && viewerId) {
    const { data: cls } = await supabase
      .from("classes")
      .select("*")
      .eq("teacher_id", viewerId)
      .order("created_at", { ascending: false });
    userClasses = cls || [];
  }

  return { notAvailable: false, profile: p, decks: dks || [], saved, userClasses };
}

export function useTeacherProfile(teacherId, viewerId, viewerRole) {
  return useQuery({
    queryKey: teacherProfileKey(teacherId, viewerId),
    queryFn: () => fetchTeacherProfile(teacherId, viewerId, viewerRole),
    enabled: !!teacherId,
  });
}

export function useTeacherProfileCache(teacherId, viewerId) {
  const queryClient = useQueryClient();
  const patchSaved = (next) =>
    queryClient.setQueryData(teacherProfileKey(teacherId, viewerId), (prev) => {
      if (!prev) return prev;
      const saved = typeof next === "function" ? next(prev.saved) : next;
      return { ...prev, saved };
    });
  return { patchSaved };
}
