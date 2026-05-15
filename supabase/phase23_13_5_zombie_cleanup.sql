-- ============================================
-- PHASE 23.13.5 MIGRATION — clean up old zombie sessions
-- Run in Supabase SQL Editor.
--
-- BACKGROUND
--
-- Pre-PR 23.13.3, the cancel-session button silently failed because
-- the schema CHECK didn't allow 'cancelled'. Teachers' canceled
-- sessions stayed in 'lobby'/'active' forever in DB.
--
-- PR 23.13.3's migration cleaned up rows older than 1h WITH NO
-- responses. But many of these zombies DO have responses (the
-- teacher canceled while students were halfway through). Those
-- rows weren't touched.
--
-- This migration finishes the cleanup: any session more than
-- 24 hours old that's still in 'lobby' or 'active' is closed and
-- marked completed. 24h is well past any plausible real quiz
-- duration; if it's still "active" after a day, the teacher
-- abandoned it and it's safe to close.
--
-- We use 'completed' (not 'cancelled') for these because:
--   - The students DID participate. Their responses exist.
--   - 'completed' is a more honest reflection of the data state.
--   - SessionRecap and analytics treat 'completed' as the success
--     terminal state. Insights, leaderboards, etc. show normally.
-- ============================================

update public.sessions
set status = 'completed',
    completed_at = coalesce(completed_at, created_at + interval '1 hour'),
    pending_close_at = null
where status in ('lobby', 'active')
  and created_at < now() - interval '24 hours';

-- ============================================
-- DONE
--
-- After running, verify with:
--   select count(*) from sessions where status in ('lobby', 'active');
-- The number should be small (only sessions started in the last 24h).
-- ============================================
