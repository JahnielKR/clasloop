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
-- Prereq: pg_cron extension enabled. Enable via:
--   Supabase Dashboard → Database → Extensions → pg_cron → toggle ON
-- or run as superuser:
--   create extension if not exists pg_cron with schema extensions;
--
-- This migration checks for the extension before touching the cron schema,
-- so it's safe to run before pg_cron is enabled — it just no-ops with a
-- NOTICE. Re-run after enabling pg_cron to actually install the schedule.
-- ============================================

do $$
begin
  -- Bail out cleanly if pg_cron is not installed (don't even reference
  -- the cron schema, otherwise we get error 3F000 "schema does not exist").
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron extension not enabled — skipping schedule. Enable via Dashboard → Database → Extensions, then re-run this migration.';
    return;
  end if;

  -- Drop any prior schedule with the same name (idempotent)
  if exists (select 1 from cron.job where jobname = 'clasloop-close-zombie-sessions') then
    perform cron.unschedule('clasloop-close-zombie-sessions');
  end if;

  -- Schedule: every 5 minutes
  perform cron.schedule(
    'clasloop-close-zombie-sessions',
    '*/5 * * * *',
    $cron$ select public.close_zombie_sessions(); $cron$
  );

  raise notice 'pg_cron schedule installed: clasloop-close-zombie-sessions (every 5 min)';
end $$;

-- ============================================
-- VERIFICATION (run separately, only after pg_cron is enabled)
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
