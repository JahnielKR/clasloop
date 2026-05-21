-- ============================================
-- PHASE 29 — Fix: delete_my_account referenced non-existent column
--
-- BUG (encontrado en auditoría 2026-05-21):
--   phase28_delete_my_account.sql:72 hace
--     `delete from public.responses where student_id = uid;`
--   pero `responses` no tiene columna `student_id` — solo `participant_id`.
--   Cuando un usuario con respuestas borraba su cuenta, Postgres lanzaba
--   42703 column "student_id" does not exist y la función abortaba,
--   dejando auth.users en pie. Usuario zombie + email taken.
--
-- FIX:
--   Eliminamos la línea bug. El delete de `session_participants where
--   student_id = uid` (un par de líneas arriba) hace cascade-delete a
--   responses vía la FK `responses.participant_id references
--   session_participants(id) on delete cascade` — entonces las respuestas
--   ya se borran correctamente sin necesidad de el delete explícito (que
--   intentaba referenciar una columna inexistente).
--
-- IDEMPOTENCIA: `create or replace function` reemplaza la definición
-- vieja sin error si ya existía.
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

  -- session_participants: student_id is set null on cascade. Force-delete
  -- to drop the participant row entirely.
  -- IMPORTANT: this cascade-deletes `responses` via the FK
  --   responses.participant_id references session_participants(id) on delete cascade
  -- so we DO NOT need a separate `delete from responses` (which is what
  -- the original buggy version tried and failed at).
  delete from public.session_participants where student_id = uid;

  -- student_topic_progress same pattern (set null on profile delete)
  delete from public.student_topic_progress where student_id = uid;

  -- 3. Delete the profile row. Every teacher-owned table (classes,
  --    units, decks, sessions, etc.) references profiles(id) ON DELETE
  --    CASCADE, so deleting the profile wipes the teacher's entire
  --    owned tree in one shot.
  delete from public.profiles where id = uid;

  -- 4. Delete the auth.users row. Without this, the email stays
  --    taken and the user could "log back in" (but with no profile,
  --    they'd be a ghost).
  delete from auth.users where id = uid;
end;
$$;

-- Grant execute to authenticated users only.
grant execute on function public.delete_my_account() to authenticated;

-- ============================================
-- VERIFICACIÓN
--
-- Confirmar que el delete de responses con student_id ya NO está:
--   select pg_get_functiondef('public.delete_my_account'::regproc);
--
-- Test funcional: crear un user de prueba, generar al menos 1 response,
-- llamar select public.delete_my_account() impersonando ese user, y
-- verificar que NO tira error y que el user + sus rows desaparecen.
-- ============================================
