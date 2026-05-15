-- ============================================
-- PHASE 23.13.3 MIGRATION — allow 'cancelled' as session status
-- Run in Supabase SQL Editor.
--
-- BUG
--
-- The sessions.status column has a CHECK constraint that only allows
-- ('lobby', 'active', 'completed'). But the application has been
-- writing 'cancelled' from handleCancel for a long time (see
-- src/pages/SessionFlow.jsx line ~2604). Every cancel-session click
-- emitted a 400 from the database — frontend ignored the error
-- because handleCancel already does setSession(null) + navigate, so
-- the UI APPEARED to work. The session row just stayed in 'lobby' /
-- 'active' status in the DB.
--
-- This worked accidentally until PR 23.13's "Active session" sidebar
-- badge started polling. The polling found the un-cancelled session
-- still in 'lobby'/'active' and the badge wouldn't disappear after
-- cancel.
--
-- FIX
--
-- Add 'cancelled' to the CHECK constraint. The application code
-- already uses this value in two flow paths (handleCancel + the
-- hydration short-circuit at line 2297) so this brings schema and
-- code into alignment.
--
-- Also UPDATE any sessions currently stuck in lobby/active that
-- should have been cancelled — these are the ones from previous
-- failed cancellations. Match: sessions where status='lobby' or
-- 'active' and the teacher hasn't touched them in a long time and
-- they have no recent participants/responses. Conservative criteria
-- because we don't want to nuke a real live session by accident.
-- ============================================

-- 1. Add 'cancelled' to the CHECK constraint
alter table public.sessions
  drop constraint if exists sessions_status_check;

alter table public.sessions
  add constraint sessions_status_check
  check (status in ('lobby', 'active', 'completed', 'cancelled'));

-- 2. Clean up sessions that should have been cancelled but weren't
--    because of the previous bug. Criteria:
--      - status is lobby or active
--      - created more than 1 hour ago
--      - has zero responses (a real teacher would never leave an
--        in-progress quiz session for an hour)
--   These are almost certainly the result of failed cancellations.

update public.sessions s
set status = 'cancelled',
    completed_at = coalesce(completed_at, now())
where s.status in ('lobby', 'active')
  and s.created_at < now() - interval '1 hour'
  and not exists (
    select 1 from public.responses r where r.session_id = s.id
  );

-- ============================================
-- DONE
-- ============================================
