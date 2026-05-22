// PR 170c (M1): React Query data layer for the Community deck browser.
//
// `useCommunity(isStudent)` wraps the old loadData (current user + their saved
// set + — for teachers — their classes for the "save to my decks" picker + the
// public deck list) in one cached query. `useCommunityCache()` exposes
// `patchSaved` so the favorite toggle keeps its optimistic update on the cache.
//
// Untyped supabase client (no generated Database type — see PR 134).

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export const COMMUNITY_KEY = ["community"];

async function fetchCommunity(isStudent) {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? null;
  const saved = {};
  let userClasses = [];

  if (user) {
    // Both teachers and students have favorites in the same saved_decks table.
    const { data: savedRows } = await supabase
      .from("saved_decks")
      .select("deck_id")
      .eq("student_id", user.id);
    (savedRows || []).forEach((r) => {
      saved[r.deck_id] = true;
    });

    // Teachers also need their classes for the "Save to my decks" picker.
    if (!isStudent) {
      const { data: cls } = await supabase
        .from("classes")
        .select("*")
        .eq("teacher_id", user.id)
        .order("position", { ascending: true })
        .order("created_at", { ascending: false });
      userClasses = cls || [];
    }
  }

  // Public decks + author + (if a copy) original author for "Adapted from X".
  const { data } = await supabase
    .from("decks")
    .select("*, profiles(full_name), originals:copied_from_id(id, author_id, profiles(full_name))")
    .eq("is_public", true)
    .order("uses_count", { ascending: false });

  return { userId, saved, userClasses, decks: data || [] };
}

export function useCommunity(isStudent) {
  return useQuery({
    queryKey: COMMUNITY_KEY,
    queryFn: () => fetchCommunity(isStudent),
  });
}

export function useCommunityCache() {
  const queryClient = useQueryClient();
  // The favorite toggle patches the `saved` map (value or updater).
  const patchSaved = (next) =>
    queryClient.setQueryData(COMMUNITY_KEY, (prev) => {
      if (!prev) return prev;
      const saved = typeof next === "function" ? next(prev.saved) : next;
      return { ...prev, saved };
    });
  return { patchSaved };
}
