-- ============================================
-- PR 14 — Fix: prevent duplicate responses per participant per question
--
-- Bug from production: a student left a session and rejoined. Her
-- participant row persisted (rejoin recovers it from localStorage),
-- but each new submitAnswer inserted a NEW row in responses. Result:
-- 8 MCQ questions → 16 response rows → leaderboard showed 16 points.
--
-- Fix: enforce uniqueness via a partial unique index on
-- (session_id, participant_id, question_index). The client uses
-- upsert(..., { onConflict: 'session_id,participant_id,question_index' })
-- so a re-answer UPDATES the existing row instead of inserting a new one.
--
-- The "deduplicate at write" approach is preferable to the alternatives:
-- - Constraint without upsert: would error on re-answer (bad UX)
-- - Dedupe at read time: lets DB fill with dead rows
-- This way data stays clean and re-answer is treated as a correction.
--
-- Run in Supabase SQL Editor BEFORE deploying the code changes.
-- ============================================

-- Step 1: clean up any existing duplicates that the production bug created.
-- For each (session_id, participant_id, question_index) tuple with >1 row,
-- keep only the MOST RECENT (highest created_at, breaks tie by id).
-- This is destructive but the duplicates are bug-data, not real data.
with duplicates as (
  select
    id,
    row_number() over (
      partition by session_id, participant_id, question_index
      order by created_at desc, id desc
    ) as rn
  from responses
)
delete from responses
where id in (select id from duplicates where rn > 1);

-- Step 2: enforce the constraint going forward
alter table responses
  add constraint responses_unique_per_question
  unique (session_id, participant_id, question_index);

-- Note: if you ever need to revert, drop the constraint with:
--   alter table responses drop constraint responses_unique_per_question;
-- The duplicate cleanup is one-way — deleted rows are not recoverable
-- (no backup is automatically taken). But they were duplicates of the
-- bug anyway, so no real teaching data is lost.
