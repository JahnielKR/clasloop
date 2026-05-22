// PR 170a (M1): React Query data layer for the Decks (Library) page.
//
// `useDecksPage` replaces the old hand-rolled `loadData` in Decks.jsx: it runs
// the exact same four reads (classes → decks → units → favorites) inside a
// single cached query, so React Query owns the loading state and the cache.
//
// `useDecksCache` exposes `patchMyDecks` / `patchFavorites` so the page's
// mutation handlers keep doing the SAME optimistic list updates they did with
// `setMyDecks` / `setFavoriteDecks` — only now they patch the query cache, so
// the change survives a background refetch and is the single source of truth.
//
// Untyped supabase client (no generated Database type — see PR 134), so the
// rows are plain objects, same as the original .jsx code.

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export const DECKS_PAGE_KEY = ["decksPage"];

const EMPTY = { userId: null, userClasses: [], myDecks: [], allUnits: [], favoriteDecks: [] };

async function fetchDecksPage() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return EMPTY;

  // Classes the teacher owns, in their chosen order (position, then created_at).
  const { data: cls } = await supabase
    .from("classes")
    .select("*")
    .eq("teacher_id", user.id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });
  const userClasses = cls || [];

  // My decks: created by the user (not saved from community).
  const { data: mine } = await supabase
    .from("decks")
    .select("*, originals:copied_from_id(id, author_id, profiles(full_name))")
    .eq("author_id", user.id)
    .order("created_at", { ascending: false });
  const myDecks = mine || [];

  // All units across the teacher's classes — used to group decks in Library.
  let allUnits = [];
  if (userClasses.length > 0) {
    const classIds = userClasses.map((c) => c.id);
    const { data: us } = await supabase
      .from("units")
      .select("*")
      .in("class_id", classIds)
      .order("position", { ascending: true });
    allUnits = us || [];
  }

  // Favorites: decks saved from Community (saved_decks keyed by student_id,
  // which holds any user's id), joined to the deck + author profile.
  const { data: savedRows } = await supabase
    .from("saved_decks")
    .select("deck_id, decks(*, profiles(full_name))")
    .eq("student_id", user.id);
  const favoriteDecks = (savedRows || []).map((r) => r.decks).filter(Boolean);

  return { userId: user.id, userClasses, myDecks, allUnits, favoriteDecks };
}

export function useDecksPage() {
  return useQuery({ queryKey: DECKS_PAGE_KEY, queryFn: fetchDecksPage });
}

export function useDecksCache() {
  const queryClient = useQueryClient();
  const patchMyDecks = (updater) =>
    queryClient.setQueryData(DECKS_PAGE_KEY, (prev) =>
      prev ? { ...prev, myDecks: updater(prev.myDecks) } : prev
    );
  const patchFavorites = (updater) =>
    queryClient.setQueryData(DECKS_PAGE_KEY, (prev) =>
      prev ? { ...prev, favoriteDecks: updater(prev.favoriteDecks) } : prev
    );
  return { patchMyDecks, patchFavorites };
}
