-- ============================================
-- PHASE 27 MIGRATION — class_members DELETE policy ownership
-- Run in Supabase SQL Editor.
--
-- POLICY MODEL CHANGE
--
-- PR 26.3 added "Students can leave their own classes" so the Leave
-- button worked. Product decision in PR 27: students don't control
-- membership — the teacher does. The class is the teacher's, the
-- teacher decides who's in.
--
-- This migration:
--   1. Drops the student self-delete policy (the Leave button is
--      gone in the UI; the policy isn't doing anything useful and
--      removing it ensures even a tech-savvy student can't bypass
--      via direct SQL/console).
--   2. Adds a teacher policy: a teacher can delete class_members
--      rows for classes they own.
--
-- The teacher check goes through classes.teacher_id rather than a
-- direct field on class_members because class_members has no
-- teacher_id column (it'd be derived data, redundant with class_id).
-- The subquery is cheap: classes has a unique pk on id.
-- ============================================

-- ── 1. Remove student self-delete (PR 26.3 added it; PR 27 retires it)
drop policy if exists "Students can leave their own classes"
  on public.class_members;

-- ── 2. Add teacher remove-student policy
drop policy if exists "Teachers can remove students from their classes"
  on public.class_members;

create policy "Teachers can remove students from their classes"
  on public.class_members
  for delete
  using (
    exists (
      select 1
      from public.classes c
      where c.id = class_members.class_id
        and c.teacher_id = auth.uid()
    )
  );

-- ============================================
-- DONE
--
-- After this migration:
--   - Teacher A deletes class_members for class A.id  → works
--   - Teacher A deletes class_members for class B.id  → 0 rows
--   - Student deletes their own membership           → 0 rows (blocked)
--   - Unauthenticated DELETE                          → 0 rows (auth.uid null)
-- ============================================
