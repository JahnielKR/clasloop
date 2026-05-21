-- ============================================
-- PR 107 — CHECK constraint on decks.language (M12)
-- ============================================
-- Aligns decks.language with profiles.language (already has the same check).
-- decks.language already DEFAULT 'en' NOT NULL in prod, just missing the CHECK.
--
-- Step 1: normalize any out-of-range values to 'en' (default).
-- Step 2: add the CHECK if not present.
-- Step 3: ensure DEFAULT 'en' (no-op in prod, useful for fresh setups).
--
-- BEFORE APPLYING (recommended audit):
--   select language, count(*) from public.decks group by language order by count desc;
-- If anything other than en/es/ko appears with non-trivial count, investigate
-- whether it's a UI bug producing weird locales before normalizing.
-- ============================================

-- Step 1: normalize (idempotent).
update public.decks
set language = 'en'
where language not in ('en', 'es', 'ko');

-- Step 2: add the CHECK if not present.
do $$
begin
  if not exists (
    select 1 from information_schema.check_constraints
    where constraint_schema = 'public'
      and constraint_name = 'decks_language_check'
  ) then
    alter table public.decks
      add constraint decks_language_check
      check (language in ('en', 'es', 'ko'));
  end if;
end $$;

-- Step 3: default to 'en' (no-op in prod, already set).
alter table public.decks alter column language set default 'en';

-- ============================================
-- VERIFICATION
-- ============================================
-- 1. Constraint exists:
--      select constraint_name, check_clause
--      from information_schema.check_constraints
--      where constraint_schema = 'public'
--        and constraint_name = 'decks_language_check';
--    Expected: 1 row.
--
-- 2. Insert with bad language fails (use a sandbox class_id / author_id):
--      insert into public.decks (title, class_id, author_id, language, section)
--      values ('test', '<valid class_id>', '<valid uuid>', 'pt', 'general_review');
--    Expected: ERROR check constraint "decks_language_check" violated.
--
-- 3. Insert with valid language passes:
--      insert into public.decks (...) values (..., 'es', ...);
--    Expected: 1 row inserted.
-- ============================================
