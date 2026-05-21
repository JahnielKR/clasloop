-- ============================================
-- PASO 0 — CORRER ESTO EN SUPABASE PRIMERO
-- ============================================
--
-- BUG FIX: decks.class_id should CASCADE on class delete
--
-- The Edit Class modal warns "this will delete the class, its X units,
-- and its Y decks. Students will lose access immediately." But the FK
-- on decks.class_id was set to ON DELETE SET NULL, so decks survive
-- with class_id=NULL after the parent class is deleted. They appear in
-- /decks under "Sin clase" — surprising the teacher who expected them
-- gone.
--
-- We swap the FK constraint to ON DELETE CASCADE to match the warning.
-- The teacher confirmed this is the desired behavior; the JSON export
-- in the same modal gives them an out if they want a backup before
-- deleting.
--
-- Decks ya huérfanos (con class_id=NULL hoy) NO se tocan — quedan donde
-- están, el profe los borra manualmente desde /decks si quiere.
-- ============================================

alter table public.decks
  drop constraint decks_class_id_fkey;

alter table public.decks
  add constraint decks_class_id_fkey
  foreign key (class_id) references public.classes(id) on delete cascade;

-- ============================================
-- DONE
-- ============================================
