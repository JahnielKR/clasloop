-- ============================================
-- Fix: anon could UPDATE any guest participant row
-- ============================================
-- `session_participants_guest_self_update` (FOR UPDATE USING (is_guest = true),
-- no WITH CHECK, no token binding) was added via the Supabase dashboard and
-- never captured as a migration. It only checks the TARGET row is a guest — not
-- that the caller owns it — so any anonymous client could
-- PATCH /rest/v1/session_participants?is_guest=eq.true and mutate ANY guest in
-- ANY session: rename/impersonate on the leaderboard, un-kick themselves, forge
-- completed_at, or rotate another guest's guest_token and then read that guest's
-- answers via get_guest_responses. This re-opened the hole 20240101000042 closed.
--
-- RLS cannot securely validate a client-supplied guest_token, so the one thing
-- guests legitimately did through this policy — marking their own row's
-- completed_at — moves to a SECURITY DEFINER RPC that binds to the token (same
-- pattern as update_my_guest_name / submit_response). Authenticated students
-- keep marking completion via the existing "student updates own row" policy.
-- ============================================

create or replace function public.mark_guest_completed(
  p_participant_id uuid,
  p_guest_token uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Idempotently mark a GUEST participant completed, only when the supplied
  -- token matches the row. No-ops (no error) otherwise — preserves the prior
  -- soft-fail behavior of the direct update this replaces.
  update public.session_participants
     set completed_at = now()
   where id = p_participant_id
     and completed_at is null
     and student_id is null
     and guest_token = p_guest_token;
end;
$$;

grant execute on function public.mark_guest_completed(uuid, uuid) to anon, authenticated;

-- Remove the over-permissive policy. Guests now complete via the RPC above;
-- authenticated students via "Session teacher updates participants, student
-- updates own row".
drop policy if exists "session_participants_guest_self_update" on public.session_participants;
