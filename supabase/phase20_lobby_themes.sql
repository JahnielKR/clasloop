-- ============================================
-- PR 20 — Lobby & Live Themes
--
-- Adds visual theme selection to classes (and optional override per deck).
-- The actual theme catalog (colors, fonts, patterns) lives in code at
-- src/lib/themes.js — these columns just store the teacher's chosen
-- theme id ('calm', 'ocean', 'pop', 'mono').
--
-- Validation is application-side via check constraints below. When new
-- themes are added in the future, drop and re-add these constraints
-- with the updated theme id list.
--
-- The cascade at runtime (in resolveDeckTheme):
--   deck.lobby_theme_override (if set) > class.lobby_theme > 'calm' fallback
--
-- Run in Supabase SQL Editor before deploying the code.
-- ============================================

-- 1. classes.lobby_theme: required, default 'calm'
alter table classes
  add column if not exists lobby_theme text not null default 'calm';

-- 2. decks.lobby_theme_override: nullable, default null (= inherit from class)
alter table decks
  add column if not exists lobby_theme_override text;

-- 3. Check constraints to prevent invalid theme ids in the DB
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'classes_lobby_theme_valid') then
    alter table classes
      add constraint classes_lobby_theme_valid
      check (lobby_theme in ('calm', 'ocean', 'pop', 'mono'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'decks_lobby_theme_override_valid') then
    alter table decks
      add constraint decks_lobby_theme_override_valid
      check (
        lobby_theme_override is null
        or lobby_theme_override in ('calm', 'ocean', 'pop', 'mono')
      );
  end if;
end $$;

-- No new RLS needed: these are columns on existing tables with RLS already
-- inherited from the parent. The existing class/deck UPDATE policies
-- already permit writing to any column of their respective row.
