-- ============================================
-- PHASE 28.9 MIGRATION — profiles.default_deck_visibility
-- Run in Supabase SQL Editor.
--
-- BACKGROUND
--
-- Today the deck creation flow (CreateDeckEditor.jsx) hardcodes
-- new decks to is_public=false. Teachers who want every new deck
-- to be public have to toggle it manually each time.
--
-- This adds a per-teacher default: when set to 'public', new decks
-- created via CreateDeckEditor start out with is_public=true. The
-- teacher can still flip it off on a per-deck basis. When set to
-- 'private' (the existing behavior and the safe default), new decks
-- start private — same as today.
--
-- ─────────────────────────────────────────────────────────────────
-- SCOPE
-- ─────────────────────────────────────────────────────────────────
--
-- This setting ONLY affects the initial `is_public` value of
-- *newly created* decks via the editor. It does NOT:
--   - retroactively re-flag existing decks (a Private → Public flip
--     would silently expose past material — never do this implicitly)
--   - affect deck COPIES (AddToSlotModal cross-class copies,
--     class-import bulk copies). Those stay is_public=false by
--     policy; copying a public deck shouldn't auto-publish the copy.
--   - affect AI-generated review decks (close-unit-ai). Those are
--     internal tooling output, kept private.
--
-- Only the manual "create new deck" path reads this setting.
-- ─────────────────────────────────────────────────────────────────

-- ── 1. Add the column with safe default ───────────────────────────────
-- 'private' default matches today's behavior, so the migration is a
-- pure no-op for existing teachers until they explicitly opt in.
--
-- text + CHECK constraint instead of boolean because future-proofing:
-- if we ever add a third tier ("class-only", "school-only", etc.)
-- it's an ALTER on the check instead of a column-type migration.
alter table public.profiles
  add column if not exists default_deck_visibility text
    not null
    default 'private'
    check (default_deck_visibility in ('private', 'public'));

-- ── 2. No GRANTs needed ───────────────────────────────────────────────
-- profiles already has the standard RLS / SELECT / UPDATE policies
-- in schema.sql (line ~152 onward). The existing
--   "Users can update own profile" on public.profiles for update
--    using (auth.uid() = id)
-- already permits the teacher to write this column. We don't need to
-- add anything new.

-- ============================================
-- DONE
--
-- Frontend flow after this migration:
--   1. Settings.jsx reads profile.default_deck_visibility and shows
--      a toggle in the Profile tab (teachers only).
--   2. Toggling writes the new value back to profiles via update.
--   3. CreateDeckEditor.jsx, when opening a NEW deck (not editing),
--      seeds the local `makePublic` state from
--      profile.default_deck_visibility === 'public'.
--   4. Editing an existing deck still respects its current is_public
--      value — the default only applies on first creation.
-- ============================================
