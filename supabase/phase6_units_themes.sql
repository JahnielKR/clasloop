-- ============================================
-- PHASE 6 MIGRATION — units as themes (section-agnostic) +
--                     general_review decks live outside units
-- Run in Supabase SQL Editor.
--
-- Conceptual change (per teacher feedback in PR 4 review):
--   A "unit" is a teaching THEME — e.g. "Verbo hacer", "Subjunctive
--   mood". It contains the daily plan: warmups + exit tickets.
--   General reviews are NOT part of the daily plan — they're standalone
--   content (a 15-minute pre-exam recap, an end-of-month wrap-up). They
--   shouldn't compete with warmups/exits inside a unit. They live as
--   "extra content" alongside the unit-organized content.
--
-- This migration:
--   1. Makes units.section nullable (units no longer belong to one section).
--   2. Sets section=null on all existing units so they become theme-units.
--   3. Detaches all general_review decks from any unit (unit_id=null).
--      Decks themselves are untouched — they keep their data, sessions,
--      retention scores. They just stop being inside a unit.
--
-- Reversibility: this migration only NULLs columns; it doesn't drop
-- anything. To revert:
--   alter table public.units alter column section set not null;  -- if you backed up
--   -- (you'd need the original section values from a backup to fully revert)
-- General-review decks' previous unit_id values are NOT preserved — if
-- you need them, restore from a Supabase point-in-time backup.
-- ============================================

-- ── 1. Make units.section nullable ────────────────────────────────────────
-- The check constraint stays: if a section IS provided, it must be one of
-- the valid values. Null is now the canonical state for a theme-unit.
alter table public.units
  alter column section drop not null;

-- ── 2. Null out section on all existing units ─────────────────────────────
-- Every existing unit becomes a theme-unit. The section value is no
-- longer meaningful at the unit level. (The decks inside the unit still
-- have their own section — that hasn't changed.)
update public.units
   set section = null;

-- ── 3. Detach general_review decks from units ────────────────────────────
-- General reviews are standalone in the new model. We null their unit_id
-- so they don't appear inside Plan view's day stack. The deck rows
-- themselves are untouched (title, questions, retention history, all
-- preserved). The teacher will see them in the new "General Reviews"
-- section of the class page, separate from the unit content.
update public.decks
   set unit_id = null
 where section = 'general_review'
   and unit_id is not null;

-- ============================================
-- DONE
--
-- After running this:
--   - units.section is nullable; all existing rows have section=null
--   - All general_review decks have unit_id=null (their old unit
--     assignment is lost — by design, since they no longer "belong" to a
--     unit conceptually)
--   - Application code can now create units without specifying section,
--     and Plan view can ignore unit.section entirely
-- ============================================
