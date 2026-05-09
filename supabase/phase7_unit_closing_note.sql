-- ============================================
-- PHASE 7 MIGRATION — closing notes on units
-- Run in Supabase SQL Editor.
--
-- Adds a free-form text column where teachers can write a 1-2 sentence
-- reflection at unit-close time: "what did you want them to learn?".
-- The value is visible later when the teacher revisits the closed unit
-- (in Past tab → click → Plan view shows the closed unit's recap).
--
-- Optional and nullable. The close-unit flow doesn't require it.
-- ============================================

alter table public.units
  add column if not exists closing_note text;

-- ============================================
-- DONE
-- ============================================
