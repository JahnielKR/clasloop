-- ============================================
-- PHASE 28.14.3 MIGRATION — saved_decks update policy
-- Run in Supabase SQL Editor.
--
-- BACKGROUND
--
-- Jota reported that favoriting a deck never persisted: the UI
-- would flip the star on optimistically, but a tab switch or
-- refresh would revert it. PR 28.14.2 added diagnostics that
-- printed `error: null, count: 0` from the UPDATE — the textbook
-- signature of a Postgres UPDATE silently filtered out by RLS
-- (the WHERE matched zero rows because no policy permits the
-- write).
--
-- Background on saved_decks: the table is NOT in this repo's
-- schema.sql. It was created out-of-band at some point in the
-- past, almost certainly via the Supabase UI's "+ New Table"
-- flow which auto-enables RLS but does NOT create a default
-- update policy. So:
--
--   - SELECT policy exists (Jota sees the rows)
--   - INSERT policy exists (Jota can save new decks)
--   - UPDATE policy does NOT exist → silent failure
--
-- This migration adds the missing UPDATE policy. It also
-- defensively ensures the is_favorite column exists, in case
-- the original out-of-band creation predated the favorites
-- feature.
--
-- IDEMPOTENT — safe to run repeatedly.
-- ============================================

-- ── 1. Ensure is_favorite column exists ───────────────────────────────
-- This is a safety net. If the column already exists (the most
-- likely case, since the UPDATE didn't return a 42703 "column not
-- found" error), this is a no-op.
alter table public.saved_decks
  add column if not exists is_favorite boolean not null default false;

-- ── 2. Add the missing UPDATE policy ──────────────────────────────────
-- A student can update rows in saved_decks where they are the
-- owner (student_id = auth.uid()). They can't touch other
-- students' favorites.
--
-- `drop policy if exists` first so this migration is idempotent
-- AND so we can safely re-run it after iterating on the policy
-- text in development.
drop policy if exists "Students can update own saved_decks"
  on public.saved_decks;

create policy "Students can update own saved_decks"
  on public.saved_decks
  for update
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ── 3. Defensive: ensure RLS is on ────────────────────────────────────
-- If somehow it isn't, this enables it. Harmless no-op if already on.
alter table public.saved_decks enable row level security;

-- ============================================
-- DONE
--
-- After this migration:
--   - Calling supabase.from("saved_decks").update({is_favorite: true})
--     .eq("student_id", profile.id).eq("deck_id", deckId)
--     will actually match the row and return count: 1.
--   - The optimistic UI flip in MyClasses + Favorites will persist
--     across refresh/tab-switch.
--   - PR 28.14.2's diagnostic console.warn should stop firing.
-- ============================================
