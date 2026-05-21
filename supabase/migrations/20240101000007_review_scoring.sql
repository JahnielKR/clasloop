-- ============================================
-- PHASE 4 MIGRATION — To Review system (per-question scoring + teacher review)
--
-- Adds richer scoring to `responses`:
--   points        — partial credit (e.g. 3 of 4 correct pairs in a Match)
--   max_points    — denominator (varies per question type / per question)
--   needs_review  — true for free-text / open answers awaiting teacher input
--   teacher_grade — 'correct' | 'partial' | 'incorrect' once the teacher
--                   reviews a free-text/open response
--   teacher_feedback — optional text comment from the teacher
--
-- DESIGN: keep `is_correct` untouched. Existing code (spaced-repetition,
-- live session UI, analytics) reads `is_correct`; rewriting all of those
-- in one shot is a recipe for regressions. New code reads `points` /
-- `max_points` for granular scoring; old code keeps reading `is_correct`.
-- Both stay in sync — when teacher_grade flips a free-text response to
-- 'correct', we also flip is_correct.
--
-- Backfill is intentionally imperfect for legacy rows:
--   is_correct=true  → points=1, max_points=1
--   is_correct=false → points=0, max_points=1
-- That undercounts old Match/Order rows (they should have been e.g.
-- 3/4 partials), but parsing every legacy answer JSONB to recompute
-- isn't worth the complexity. New rows from the deploy onward are
-- scored correctly per type.
-- ============================================

-- ── 1. New columns on responses ─────────────────────────────────────────
alter table public.responses
  add column if not exists points integer not null default 0;

alter table public.responses
  add column if not exists max_points integer not null default 1;

-- needs_review: true ONLY for question types that require a human
-- (free, open). Set at insert time by StudentJoin via evaluateAnswer.
alter table public.responses
  add column if not exists needs_review boolean not null default false;

-- Optional teacher grade for free-text / open responses.
-- 'correct' / 'partial' / 'incorrect' map to 2/1/0 of max_points=2.
alter table public.responses
  add column if not exists teacher_grade text
  check (teacher_grade in ('correct', 'partial', 'incorrect'));

alter table public.responses
  add column if not exists teacher_feedback text;

alter table public.responses
  add column if not exists graded_at timestamptz;

alter table public.responses
  add column if not exists graded_by uuid references public.profiles(id) on delete set null;

-- ── 2. Backfill legacy rows ─────────────────────────────────────────────
-- Only update rows where points is still at the default (0). New rows
-- inserted post-deploy will have correct values from the application
-- layer; this only normalizes pre-existing data.
update public.responses
set
  points = case when is_correct then 1 else 0 end,
  max_points = 1
where points = 0 and max_points = 1;

-- ── 3. Index for the teacher's "To review" queue ────────────────────────
-- The teacher's review page filters: "all rows where needs_review=true
-- AND teacher_grade IS NULL, joined to sessions/decks owned by them".
-- This partial index keeps that query fast even when the responses
-- table grows.
create index if not exists responses_pending_review_idx
  on public.responses(session_id, created_at desc)
  where needs_review = true and teacher_grade is null;

-- ── 4. Future-proof: column for review at the deck level ────────────────
-- (Not used in turn 1 — placeholder so we don't need a separate migration
-- when the teacher's review page lands.)
-- We'll add a dedicated `decks_aggregate_view` SQL view in a later turn
-- to power the "78% got Q5 right" dashboard.

-- ============================================
-- DONE
-- ============================================
