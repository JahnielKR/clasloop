-- ============================================
-- PR 103 — pg_cron schedule for close_zombie_sessions (H18)
-- ============================================
-- Purpose: stop relying on the client to trigger zombie cleanup.
-- The function close_zombie_sessions() is defined in
-- 20240101000021_zombie_sessions.sql. This migration only adds the cron.
--
-- Frequency: every 5 minutes. The function is idempotent and cheap
-- (one UPDATE with a few WHERE clauses), so 5min is conservative.
--
-- Prereq: pg_cron extension enabled. Already enabled in clasloop prod
-- (used by scan-cleanup since pr57). If new project, run first:
--   create extension if not exists pg_cron with schema extensions;
-- ============================================

-- Drop any prior schedule with the same name (idempotent)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'clasloop-close-zombie-sessions') then
    perform cron.unschedule('clasloop-close-zombie-sessions');
  end if;
exception when undefined_table then
  raise notice 'pg_cron not available — skipping schedule (apply with pg_cron enabled)';
end $$;

-- Schedule: every 5 minutes
select cron.schedule(
  'clasloop-close-zombie-sessions',  -- jobname (unique)
  '*/5 * * * *',                     -- cron expression: every 5 min
  $$ select public.close_zombie_sessions(); $$
);

-- ============================================
-- VERIFICATION
-- ============================================
-- 1. Confirm the job exists:
--      select jobid, jobname, schedule, command, active
--      from cron.job where jobname = 'clasloop-close-zombie-sessions';
--    Expected: 1 row, active=true.
--
-- 2. After 5+ minutes, check execution history:
--      select runid, jobid, status, return_message, start_time
--      from cron.job_run_details
--      where jobid = (select jobid from cron.job
--                     where jobname = 'clasloop-close-zombie-sessions')
--      order by start_time desc limit 5;
--    Expected: status='succeeded'.
--
-- 3. Create a manual zombie (a session in 'active' from 1h ago, no responses):
--      update public.sessions
--      set status = 'active', started_at = now() - interval '1 hour'
--      where id = '<any-test-session-id>';
--    Wait 5 min. Confirm it was closed:
--      select status from public.sessions where id = '<id>';
--    Expected: 'completed'.
-- ============================================
