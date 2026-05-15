-- ============================================
-- PHASE 28.7 MIGRATION — class_members realtime
-- Run in Supabase SQL Editor.
--
-- BACKGROUND
--
-- PR 28.7 adds a realtime subscription on class_members so students
-- see a toast + get redirected to /classes when their teacher
-- removes them from a class (instead of silently keeping a stale
-- cached view until they F5).
--
-- The subscription needs two things from Postgres that aren't on
-- by default for this table:
--
--   1. The table must be a member of the supabase_realtime
--      publication, otherwise Supabase Realtime doesn't even ship
--      the events. (schema.sql line 257-259 already adds sessions,
--      session_participants, and responses; class_members was
--      missing.)
--
--   2. REPLICA IDENTITY must be FULL, not DEFAULT.
--      - DEFAULT only ships the primary key (id) on DELETE.
--      - FULL ships every column.
--      We need student_id and class_id in `payload.old`:
--        - student_id so the realtime filter
--          `filter: "student_id=eq.<uid>"` can evaluate
--        - class_id so the client knows which class name to show
--      Without FULL, the filter sees a row with only `id` set and
--      drops every event as non-matching.
--
-- PERF / COST
--
-- REPLICA IDENTITY FULL writes the entire row image to the WAL on
-- every UPDATE/DELETE. For a tiny join table like class_members
-- (a handful of small columns, occasional writes), the overhead is
-- negligible — way under the noise floor of normal activity. Worth
-- it for the UX win.
-- ============================================

-- ── 1. Add table to the realtime publication ──────────────────────────
-- IF NOT EXISTS-style guard via DO block: ALTER PUBLICATION fails
-- noisily if the table is already a member, so we check pg_publication_tables
-- first. This makes the migration idempotent.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'class_members'
  ) then
    alter publication supabase_realtime add table public.class_members;
  end if;
end$$;

-- ── 2. Ship full row image on UPDATE/DELETE ────────────────────────────
-- Safe to run repeatedly — Postgres accepts setting the same identity
-- value as a no-op.
alter table public.class_members replica identity full;

-- ============================================
-- DONE
--
-- After this:
--   - Removing a student via StudentsModal (DELETE on class_members)
--     fires a realtime DELETE event with the full old row.
--   - The student's App.jsx subscription receives it (filter matches
--     on student_id), looks up the class name, shows the toast, and
--     navigates to /classes after 3 seconds.
-- ============================================
