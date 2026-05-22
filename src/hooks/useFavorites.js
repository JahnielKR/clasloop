// PR 170 (M1): React Query data layer for the student's Favorites page.
//
// `useFavorites(profileId)` wraps the old loadFavorites — the user's saved_decks
// joined to the deck + class + author, mapped to the deck shape the page renders.
// The query data IS the savedDecks array. `useFavoritesCache()` exposes
// `patchSavedDecks` so the un-star / unsave handlers keep their optimistic
// list updates.
//
// Untyped supabase client (no generated Database type — see PR 134).

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export const favoritesKey = (profileId) => ["favorites", profileId];

async function fetchFavorites(profileId) {
  // Fetches ALL saved_decks rows (the page filters favorites + search in
  // memory so a star toggle disappears immediately).
  const { data } = await supabase
    .from("saved_decks")
    .select("deck_id, saved_at, is_favorite, decks(*, classes(name, profiles:teacher_id(full_name)))")
    .eq("student_id", profileId)
    .order("saved_at", { ascending: false });

  return (data || [])
    .filter((s) => s.decks)
    .map((s) => ({ ...s.decks, _isFavorite: s.is_favorite || false }));
}

export function useFavorites(profileId) {
  return useQuery({
    queryKey: favoritesKey(profileId),
    queryFn: () => fetchFavorites(profileId),
    enabled: !!profileId,
  });
}

export function useFavoritesCache(profileId) {
  const queryClient = useQueryClient();
  // The query data is the savedDecks array; patch it (value or updater).
  const patchSavedDecks = (next) =>
    queryClient.setQueryData(favoritesKey(profileId), (prev) => {
      if (!prev) return prev;
      return typeof next === "function" ? next(prev) : next;
    });
  return { patchSavedDecks };
}
