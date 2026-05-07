-- ============================================
-- PHASE 3 MIGRATION — Fix deck RLS for class members
--
-- Bug: a private deck (is_public=false) inside a class is invisible to the
-- students of that class because the SELECT policy only matches
-- (is_public OR author=me). Students aren't the author, so the deck stays
-- hidden even though they're enrolled in the class it belongs to.
--
-- Fix: extend the SELECT policy with a third arm — let anyone listed in
-- class_members(class_id = decks.class_id) read the deck. The Community
-- exposure stays unchanged: a deck is only listed publicly if is_public=true,
-- and class membership doesn't grant access to OTHER classes' decks.
--
-- We DROP and recreate rather than ADD so there's a single SELECT policy
-- (multiple permissive policies OR together but become harder to reason
-- about).
-- ============================================

drop policy if exists "Public decks are readable" on public.decks;

create policy "Decks are readable by author, public, or class member"
  on public.decks for select using (
    is_public = true
    or auth.uid() = author_id
    or (
      class_id is not null and exists (
        select 1 from public.class_members cm
        where cm.class_id = decks.class_id
          and cm.student_id = auth.uid()
      )
    )
  );

-- ============================================
-- DONE
-- ============================================
