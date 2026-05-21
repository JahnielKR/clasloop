-- ============================================
-- PR 104 — FK indexes for RLS + join paths (H19)
-- ============================================
-- All CREATE INDEX use IF NOT EXISTS — safe to re-run.
--
-- NOT using CONCURRENTLY: Supabase SQL Editor wraps the script in a
-- single transaction, which is incompatible with CREATE INDEX
-- CONCURRENTLY (error 25001). Clasloop tables are small enough that
-- the brief ACCESS EXCLUSIVE lock during a regular CREATE INDEX is
-- not a meaningful blocker. If applying on a much larger dataset
-- later, run each statement individually via psql with --no-transaction.
-- ============================================

-- 1. class_members.student_id — RLS condition: student_id = auth.uid()
create index if not exists idx_class_members_student
  on public.class_members(student_id);

-- 2. session_participants.student_id — RLS + reverse lookup by student
create index if not exists idx_session_participants_student
  on public.session_participants(student_id);

-- 3. session_participants.session_id — primary join axis
--    (the unique constraint on (session_id, student_id) usually
--    provides this, but explicit makes intent clear)
create index if not exists idx_session_participants_session
  on public.session_participants(session_id);

-- 4. responses.participant_id — join from session_participants
create index if not exists idx_responses_participant
  on public.responses(participant_id);

-- 5. student_topic_progress.student_id — dashboard reads
create index if not exists idx_student_topic_progress_student
  on public.student_topic_progress(student_id);

-- 6. sessions(teacher_id, status) — teacher dashboard
--    "show me my active+lobby sessions" — composite covers both filter
--    by teacher and order by status.
create index if not exists idx_sessions_teacher_status
  on public.sessions(teacher_id, status);

-- 7. sessions.pin partial — only sessions currently joinable
--    Partial index keeps it small (most sessions are 'completed').
create index if not exists idx_sessions_pin_active
  on public.sessions(pin) where status in ('lobby', 'active');

-- ============================================
-- VERIFICATION
-- ============================================
-- 1. Confirm all indexes exist:
--      select indexname, tablename
--      from pg_indexes
--      where schemaname = 'public'
--        and indexname like 'idx_%'
--      order by indexname;
--
-- 2. Sample EXPLAIN to confirm usage:
--      explain analyze
--      select * from public.session_participants
--      where session_id = (select id from public.sessions limit 1);
--    Look for "Index Scan using idx_session_participants_session" (NOT Seq Scan).
--
-- 3. Size check after backfill:
--      select indexname, pg_size_pretty(pg_relation_size(indexrelid)) as size
--      from pg_stat_user_indexes
--      where indexname like 'idx_%'
--      order by pg_relation_size(indexrelid) desc;
--
-- OPTIONAL: After all CREATE INDEX statements finish, run ANALYZE on the
-- affected tables so the planner picks up the new indexes immediately
-- (Supabase auto-vacuum will do this eventually, but ANALYZE is fast):
--      analyze public.class_members;
--      analyze public.session_participants;
--      analyze public.responses;
--      analyze public.student_topic_progress;
--      analyze public.sessions;
-- ============================================
