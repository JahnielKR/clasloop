-- ============================================
-- PHASE 5 MIGRATION — units.status
-- Run in Supabase SQL Editor.
--
-- Adds an explicit status column to the units table:
--   'planned'  → unit created, no decks launched yet
--   'active'   → unit currently being taught (most recent in this class)
--   'closed'   → unit finished; decks stay searchable but the unit
--                doesn't show up in Plan view by default
--
-- Why now (vs PR 3 where we derived "active" heuristically):
--   1. The derivation in spaced-repetition.js#getTodayPlan is expensive
--      (3 chained queries) and gets called on every Today render.
--      A direct column read is one query.
--   2. PR 6 (Close unit narrative) needs an explicit "closed" state
--      that cannot be derived from session activity alone — a unit can
--      be deliberately closed with no further activity OR be inactive
--      because it's old and abandoned. Different semantics.
--   3. Adding the column late and migrating existing rows is harder
--      than adding it now. The semantics get clearer with the column
--      in place.
--
-- Backfill strategy: every existing unit becomes 'active'. That's the
-- safe default — no unit suddenly disappears from any view, and the
-- teacher can manually close units later when they want to. The
-- ClassPage Plan view will pick the most-recently-active one if there
-- are several 'active' units in a class (matching pre-migration behavior
-- where activity ordering decided which unit was "current").
-- ============================================

-- ── 1. Add the status column with the constraint ──────────────────────────
-- Default 'active' so the backfill is implicit. After this migration,
-- new units created without a status will also default to 'active' —
-- the application code is free to override (e.g. create a 'planned'
-- unit ahead of time and only flip to 'active' when the teacher starts
-- using it).
alter table public.units
  add column if not exists status text not null default 'active'
  check (status in ('planned', 'active', 'closed'));

-- ── 2. Add an index for status filters ────────────────────────────────────
-- Queries like "fetch all active units in class X" are core to the Plan
-- view. The index covers (class_id, status) which is the typical filter
-- combination, with section as a secondary key for grouping.
create index if not exists units_class_status_idx
  on public.units(class_id, status);

-- ── 3. Add closed_at timestamp ────────────────────────────────────────────
-- When a unit is closed, we want to remember WHEN it was closed for the
-- closing-summary view (PR 6) — what was launched between unit start
-- and unit close, retention trends in that window, etc. Nullable because
-- only matters for closed units.
alter table public.units
  add column if not exists closed_at timestamptz;

-- ============================================
-- DONE
--
-- After running this:
--   - All existing units → status='active', closed_at=null
--   - The application code can read units.status directly instead of
--     deriving it from session activity. spaced-repetition.js#getTodayPlan
--     will be updated to use the column in a follow-up.
-- ============================================
