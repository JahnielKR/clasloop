-- ============================================
-- PR 12 — AI close-unit narrative + suggested review
-- Run in Supabase SQL Editor.
--
-- Adds two columns to units:
--   1. closing_narrative jsonb — caches the AI-generated narrative
--      ({whatWorked: "...", whatDidnt: "..."}). When the teacher
--      reopens a closed unit's summary page, we read from this
--      column instead of re-generating, saving cost and giving a
--      stable view.
--   2. closing_narrative_generated_at timestamptz — tracks when
--      the narrative was generated, so a future "regenerate" button
--      can show "last generated 2 days ago" if we want.
--
-- Both nullable: existing closed units have no narrative, and that's
-- fine — the UI shows "generate insights" CTA in that case.
-- ============================================

alter table public.units
  add column if not exists closing_narrative jsonb,
  add column if not exists closing_narrative_generated_at timestamptz;

-- The narrative shape we expect:
--   {"whatWorked": "<paragraph>", "whatDidnt": "<paragraph>",
--    "version": 1, "model": "claude-sonnet-4-6"}
-- We don't enforce the shape with a check constraint — the column is
-- writable only by the API endpoint, which produces well-formed JSON.

-- For analytics: a partial index for closed units that have a narrative.
-- Helps the eventual "AI usage stats" admin view.
create index if not exists idx_units_closing_narrative_present
  on public.units (closed_at)
  where closing_narrative is not null;
