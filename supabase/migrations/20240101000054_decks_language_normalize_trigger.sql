-- ============================================
-- HOTFIX (post PR 107) — normalize decks.language instead of rejecting
-- ============================================
-- PR 107 added CHECK (language in ('en','es','ko')) on decks. But the
-- deck editor (CreateDeckEditor) sends `language: ""` by default when the
-- teacher doesn't pick a language explicitly. With the bare CHECK, that
-- insert fails with 23514 — i.e. teachers could not create decks at all.
--
-- Fix: a BEFORE INSERT/UPDATE trigger that normalizes any null/empty/
-- out-of-range language to 'en'. It runs before the CHECK, so the CHECK
-- still passes and the table only ever stores en/es/ko. This is more
-- robust than fixing only the editor, since any other insert path
-- (imports, copies, future clients) is covered too.
--
-- Discovered during Playwright QA of the deck-create flow on 2026-05-22.
-- ============================================

create or replace function public.normalize_deck_language()
returns trigger
language plpgsql
as $$
begin
  if NEW.language is null or NEW.language not in ('en', 'es', 'ko') then
    NEW.language := 'en';
  end if;
  return NEW;
end;
$$;

drop trigger if exists decks_normalize_language_trg on public.decks;
create trigger decks_normalize_language_trg
  before insert or update on public.decks
  for each row execute function public.normalize_deck_language();

-- ============================================
-- VERIFICATION
-- ============================================
-- 1. Trigger exists:
--      select tgname from pg_trigger where tgname = 'decks_normalize_language_trg';
--    Expected: 1 row.
--
-- 2. Insert with language='' normalizes to 'en' (does not error):
--      (exercised by the deck editor — confirmed via QA: a deck saved with
--       an empty language now shows "EN" in the library tile.)
-- ============================================
