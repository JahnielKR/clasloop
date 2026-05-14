-- ============================================
-- PHASE 28 MIGRATION — delete_my_account RPC
-- Run in Supabase SQL Editor.
--
-- WHY AN RPC AND NOT A CLIENT-SIDE DELETE
--
-- The auth.users row needs to be deleted to fully remove an account
-- (otherwise sign-out + re-login resurrects it, and email is taken).
-- auth.users isn't directly mutable from the client — supabase-js'
-- admin endpoints require the service role key, which must never
-- ship to the browser.
--
-- Solution: a SECURITY DEFINER function that runs with the postgres
-- owner's privileges and can touch auth.users. The function:
--   1. Verifies the caller's auth.uid() exists (defense — RLS would
--      already block unauthenticated calls but explicit is better).
--   2. Deletes EVERYTHING owned by this user (class_members where
--      student_id matches, achievements, etc.) — explicit deletes
--      because the schema mixes ON DELETE CASCADE and ON DELETE SET
--      NULL, and we want a true full-wipe regardless of FK direction.
--   3. Deletes the profile row. This triggers cascading deletes on
--      every table that has `references profiles(id) on delete cascade`
--      (classes, units, decks, sessions, responses, etc., plus any
--      teacher-owned data for teacher accounts).
--   4. Deletes the auth.users row.
--
-- The function returns void on success. On failure it raises an
-- exception that the client catches and surfaces in the UI.
--
-- SECURITY DEFINER LIMITATIONS
--
-- The function explicitly uses auth.uid() inside, so it can ONLY
-- delete the calling user's own data. It does NOT accept a user_id
-- parameter from the client. A malicious caller can't pass another
-- user's id and weaponize this against them.
-- ============================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid;
begin
  -- 1. Identify the caller. auth.uid() returns the authenticated
  --    user's id; null if the request isn't authenticated.
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- 2. Wipe student-side data that doesn't cascade automatically.
  --    class_members.student_id is `on delete set null` (so the
  --    teacher's roster preserves history when a student leaves),
  --    but for account deletion we want the rows GONE.
  delete from public.class_members where student_id = uid;

  -- Achievements are referenced via student_id with cascade, but be
  -- explicit so we don't depend on FK definitions surviving future
  -- migrations.
  delete from public.achievements where student_id = uid;

  -- session_participants: student_id is set null on cascade, similar
  -- reasoning. Force-delete to drop the participant row entirely.
  delete from public.session_participants where student_id = uid;

  -- responses table references participants, which cascade-delete
  -- when participants go. Belt-and-suspenders explicit delete in case
  -- a student row exists without a participant link.
  delete from public.responses where student_id = uid;

  -- student_topic_progress same pattern (set null on profile delete)
  delete from public.student_topic_progress where student_id = uid;

  -- 3. Delete the profile row. This is the linchpin: every
  --    teacher-owned table (classes, units, decks, sessions, etc.)
  --    references profiles(id) ON DELETE CASCADE, so deleting the
  --    profile wipes the teacher's entire owned tree in one shot.
  delete from public.profiles where id = uid;

  -- 4. Delete the auth.users row. Without this, the email stays
  --    taken and the user could "log back in" (but with no profile,
  --    they'd be a ghost).
  delete from auth.users where id = uid;
end;
$$;

-- Grant execute to authenticated users only. Anon/public are
-- explicitly excluded — you must be logged in to delete the account
-- you're logged in as.
grant execute on function public.delete_my_account() to authenticated;

-- ============================================
-- DONE
--
-- Client call:
--   const { error } = await supabase.rpc('delete_my_account');
--   if (!error) await supabase.auth.signOut();   // clear local session
-- ============================================
