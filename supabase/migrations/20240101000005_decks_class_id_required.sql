-- ============================================
-- PASO 0 — CORRER ESTO EN SUPABASE
-- ============================================
--
-- MIGRATION: decks.class_id is now REQUIRED
--
-- Decision context: the user asked to remove the possibility of having
-- decks without a class. Reasoning: orphan decks created bugs in the
-- launcher flow (no class to pick, can't create session, etc.) and the
-- usage pattern of "deck without a class" is rare in practice. Easier
-- to require it than to keep handling the edge case everywhere.
--
-- This migration:
--   1. Deletes all existing decks where class_id IS NULL. (User confirmed
--      they only had 1 test deck orphaned, no real data loss.)
--   2. Adds NOT NULL constraint to decks.class_id so future inserts
--      without a class fail at the DB level.
--
-- After this, the app code is also updated to:
--   - Require class selection in deck create/edit forms.
--   - Pre-select the deck's class in the session launcher (locked, not
--     editable). The "No class" option is removed from the picker.
--
-- The CASCADE FK from the previous migration means deleting a class
-- now cleans up its decks automatically — combined with NOT NULL on
-- class_id, the model is consistent: every deck always belongs to
-- exactly one class, and dies with it.
-- ============================================

-- 1. Hard-delete orphan decks. CASCADE will handle dependent rows
-- (sessions, responses, etc.) thanks to the FK constraints already in
-- place. If for some reason a dependent row blocks the delete, the
-- migration will fail loudly — better than a silent partial state.
delete from public.decks where class_id is null;

-- 2. Make class_id NOT NULL. After step 1 there should be zero rows
-- violating this; if any survive (e.g. inserted between steps 1 and 2
-- somehow), the alter will fail and we can investigate.
alter table public.decks
  alter column class_id set not null;

-- ============================================
-- DONE
-- ============================================
