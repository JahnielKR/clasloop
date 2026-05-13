-- ============================================
-- PR 20.2.3 — Denormalize section + lobby_theme onto sessions
--
-- Bug: student-side queries to the decks table were failing with 406
-- because RLS doesn't permit guest/anonymous students to read the deck
-- row directly. This is a pre-existing issue — the legacy code already
-- failed silently on a SELECT section FROM decks query, but it didn't
-- block anything because section tinting was a nice-to-have.
--
-- Now the themed quiz render depends on knowing the theme, so the data
-- needs to live where the student CAN read it: on the session row.
--
-- Fix: denormalize the two fields the student needs onto sessions:
--   - section            (already on decks, copied at launch time)
--   - lobby_theme        (resolved via cascade at launch time:
--                         deck.lobby_theme_override > class.lobby_theme > 'calm')
--
-- This matches the pattern Clasloop already uses for sessions.questions:
-- a frozen copy of the deck's content taken at launch. Same justification:
-- once the session is live, changes to the source deck/class shouldn't
-- mutate the student's experience mid-quiz.
--
-- Run in Supabase SQL Editor.
-- ============================================

-- 1. Add the columns (defaults so existing in-flight sessions stay valid).
alter table sessions
  add column if not exists section text;

alter table sessions
  add column if not exists lobby_theme text not null default 'calm';

-- 2. Check constraint so the same theme-id whitelist applies.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sessions_lobby_theme_valid') then
    alter table sessions
      add constraint sessions_lobby_theme_valid
      check (lobby_theme in ('calm', 'ocean', 'pop', 'mono'));
  end if;
end $$;

-- 3. Backfill existing sessions. For lobby_theme we walk the same
--    cascade the code uses at launch time:
--        deck.lobby_theme_override > class.lobby_theme > 'calm'
--    For section we copy directly from the deck.
update sessions s
set
  section = d.section,
  lobby_theme = coalesce(d.lobby_theme_override, c.lobby_theme, 'calm')
from decks d
left join classes c on c.id = d.class_id
where s.deck_id = d.id
  and (s.section is null or s.lobby_theme = 'calm');
  -- The OR clause is intentional — re-running this migration shouldn't
  -- overwrite session rows that were already populated correctly. The
  -- 'calm' default is the marker for "never been touched".

-- No new RLS needed: sessions already has its own RLS allowing the
-- student (via session join code / participant link) to read the
-- relevant rows.
