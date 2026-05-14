-- ============================================
-- PHASE 26.3 MIGRATION — class_members DELETE policy
-- Run in Supabase SQL Editor.
--
-- BUG FIX
--
-- The schema enables RLS on public.class_members and creates policies
-- for SELECT and INSERT only:
--
--   create policy "Anyone can read class members"
--     on public.class_members for select using (true);
--   create policy "Anyone can join classes"
--     on public.class_members for insert with check (true);
--
-- There is no DELETE policy. With RLS enabled and no matching policy,
-- DELETE statements silently affect 0 rows — the request "succeeds"
-- from the client's perspective (no error), but nothing happens in
-- the DB. This is why "Leave class" appeared to do nothing for the
-- student: the DELETE was rejected by RLS.
--
-- FIX
--
-- Add a policy allowing students to delete their own membership rows.
-- The check is "the row's student_id equals the calling user's auth
-- id". This is restrictive enough that:
--   - Students can leave their own classes only (not someone else's).
--   - Teachers cannot use this to kick students (that would need a
--     separate, opt-in policy — out of scope here).
--   - Unauthenticated users (auth.uid() is null) cannot delete anything.
--
-- Idempotent: drop-if-exists then create.
-- ============================================

drop policy if exists "Students can leave their own classes"
  on public.class_members;

create policy "Students can leave their own classes"
  on public.class_members
  for delete
  using (auth.uid() = student_id);

-- ============================================
-- DONE
--
-- After this migration:
--   - DELETE from class_members WHERE student_id = auth.uid()  → works
--   - DELETE from class_members WHERE student_id = <other id>  → 0 rows
-- ============================================
