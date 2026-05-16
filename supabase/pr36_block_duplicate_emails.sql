-- ═══════════════════════════════════════════════════════════════════════
-- PR 36: Block duplicate email accounts
-- ═══════════════════════════════════════════════════════════════════════
--
-- Jota: "con un mismo gmail tengo cuenta de estudiante y cuenta de
-- profesor cuando no deberia de ser posible."
--
-- Root cause: Supabase Auth allows multiple auth.users rows with the
-- same email when sessions don't link (e.g. signing out and back in
-- with Google can create a fresh row instead of reusing the existing
-- one, depending on provider settings). We end up with 2 distinct
-- auth.users → 2 profiles → effectively 2 accounts with the same email.
--
-- Product decision: one email = one role. No exceptions.
--
-- This RPC lets the client check, server-side, whether the current
-- user is a DUPLICATE — i.e. whether some OTHER auth.users row shares
-- their email. If so, the client signs them out and shows an error.
--
-- The auth.users table is not readable from the client directly (RLS
-- doesn't apply, but the table is in the auth schema which is
-- restricted). A security definer function gives controlled access:
-- it returns only a boolean, never leaks rows or details.
-- ═══════════════════════════════════════════════════════════════════════

create or replace function public.email_already_registered()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_my_email text;
  v_other_count integer;
begin
  -- Get the current authenticated user's email
  select email into v_my_email
  from auth.users
  where id = auth.uid();

  if v_my_email is null then
    -- Not authenticated; nothing to check
    return false;
  end if;

  -- Count OTHER auth.users with the same email (case-insensitive)
  -- We deliberately exclude the current user from the count — they're
  -- the legit row that should stay.
  select count(*) into v_other_count
  from auth.users
  where lower(email) = lower(v_my_email)
    and id <> auth.uid();

  return v_other_count > 0;
end;
$$;

grant execute on function public.email_already_registered() to authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- END
-- ═══════════════════════════════════════════════════════════════════════
