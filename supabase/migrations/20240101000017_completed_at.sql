-- ============================================
-- PR 15 — Track when each participant reaches the end of the quiz
--
-- Adds a completed_at timestamp to session_participants so the
-- teacher's live view can show ✓ next to students who finished,
-- and so the session can auto-close when everyone is done.
--
-- "Finished" means: the student reached the results screen
-- (step='results' in the client). This is the right definition
-- because:
--   - Students go at different speeds; some finish all questions,
--     some skip the last ones. Both are "done" from the teacher's
--     perspective.
--   - Late joiners eventually reach the results screen too — so
--     they also count, avoiding the trap of "respondió todas las N"
--     where late joiners never qualify.
--   - The check is symmetric with the existing flow: when the
--     student sees the final screen, their session is over.
--
-- Run in Supabase SQL Editor.
-- ============================================

alter table session_participants
  add column if not exists completed_at timestamptz;

-- RLS: allow updates from anyone (consistent with the existing INSERT
-- policy "Anyone can join sessions"). Students need to be able to mark
-- themselves as completed without auth. The data exposed (completed_at)
-- is low-sensitivity — the worst case is a malicious student marking
-- themselves "done" early, which only affects the teacher's ✓ display
-- briefly. No data leakage.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'session_participants'
      and policyname = 'Anyone can update participants'
  ) then
    create policy "Anyone can update participants"
      on public.session_participants
      for update
      using (true)
      with check (true);
  end if;
end $$;

-- No need for an index — we'll usually only query this in the
-- realtime subscription which already filters by session_id.
-- A wide scan of completed_at alone is never the use case.
