-- ============================================
-- PHASE 23.11 MIGRATION — zombie session cleanup
-- Run in Supabase SQL Editor.
--
-- PROBLEM
--
-- Sessions are marked `status='active'` while live. To transition to
-- `completed` the teacher must click "End test". If the teacher closes
-- the tab, loses the browser, or navigates away without clicking End,
-- the session stays `active` in the DB forever. Effects:
--   - Students see stale sessions in their UI
--   - PR 23.10's quiz-rehydration restores students into yesterday's
--     ghost session when they click "Join session"
--   - Listing/aggregations show wrong counts
--
-- FIX
--
-- Two pieces:
--   1. A new column `pending_close_at timestamptz` on sessions. The
--      client sets this in a beforeunload handler when the teacher
--      navigates away. If they come back, the client clears it.
--   2. An RPC `close_zombie_sessions()` that students/teachers call
--      lazily at key moments (mounting StudentJoin, launching a new
--      session). It transitions to `completed` any session that has
--      pending_close_at set AND it's been >2 minutes AND no responses
--      in the last 60 seconds.
--
-- The RPC is SECURITY DEFINER (so it can update sessions regardless
-- of the calling user's role) but takes no parameters from the
-- client — it only acts on `pending_close_at` rows, never on
-- arbitrary sessions.
-- ============================================

-- ── 1. Add pending_close_at column ──
alter table public.sessions
  add column if not exists pending_close_at timestamptz;

-- Index for the cleanup RPC to find candidates efficiently
create index if not exists idx_sessions_pending_close
  on public.sessions (pending_close_at)
  where pending_close_at is not null and status = 'active';

-- ── 2. RPC: close zombie sessions ──
--
-- A session is a zombie iff:
--   - status = 'active'
--   - pending_close_at IS NOT NULL
--   - pending_close_at < now() - INTERVAL '2 minutes'
--   - No row in responses for this session in the last 60 seconds
--
-- For each match, set status='completed', completed_at=now(),
-- and clear pending_close_at.

create or replace function public.close_zombie_sessions()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.sessions s
  set status = 'completed',
      completed_at = now(),
      pending_close_at = null
  where s.status = 'active'
    and s.pending_close_at is not null
    and s.pending_close_at < now() - interval '2 minutes'
    and not exists (
      select 1 from public.responses r
      where r.session_id = s.id
        and r.created_at > now() - interval '60 seconds'
    );
end;
$$;

grant execute on function public.close_zombie_sessions() to authenticated;

-- ── 3. RPC: force-close teacher's other pending sessions ──
--
-- Called by SessionFlow when a teacher launches a new session. Any
-- of THEIR OWN sessions that have pending_close_at set get closed
-- immediately, regardless of timing. Rationale: the teacher
-- explicitly chose to start something new — their previous "I'm
-- about to leave" is now a definite "I left".
--
-- Uses auth.uid() internally so a teacher can only close their
-- own sessions.

create or replace function public.force_close_my_pending_sessions()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;

  update public.sessions s
  set status = 'completed',
      completed_at = now(),
      pending_close_at = null
  where s.status = 'active'
    and s.teacher_id = uid
    and s.pending_close_at is not null;
end;
$$;

grant execute on function public.force_close_my_pending_sessions() to authenticated;

-- ============================================
-- DONE
--
-- Client usage:
--   - SessionFlow beforeunload: UPDATE sessions SET pending_close_at = now()
--     WHERE id = sess.id AND teacher_id = auth.uid() AND status = 'active'
--   - SessionFlow on mount of an active session owned by this teacher:
--     UPDATE … SET pending_close_at = NULL  (cancel the pending close)
--   - StudentJoin on mount + before rehydration: rpc('close_zombie_sessions')
--   - SessionFlow on launching a new session:
--     rpc('force_close_my_pending_sessions') first
-- ============================================
