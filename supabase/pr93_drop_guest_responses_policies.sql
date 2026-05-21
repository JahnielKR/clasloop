-- ============================================
-- PR 93.A — Drop redundant SELECT policies on `responses`
--
-- BUG (auditoría 2026-05-21):
--   phase4_turn2_responses_rls.sql:55-64 creó la policy
--     "Guests can read their own responses"
--   con `using` que solo verifica una invariante referencial
--   (responses.guest_token = session_participants.guest_token para
--   la misma participant_id). NUNCA compara el token contra algo que
--   el caller posea. Como las policies se ORean, cualquier cliente
--   anónimo lee TODAS las respuestas donde guest_token IS NOT NULL.
--
--   PR 33 (pr33_rls_security_fix.sql:107-120) creó
--     "Session teacher reads responses, student reads own"
--   con `using (teacher_id = auth.uid() OR student_id IN ...)` — esa
--   es la policy que queremos mantener. Pero PR 33 nunca dropeó las
--   3 policies de phase4_turn2.
--
-- FIX:
--   Dropear las tres policies de phase4_turn2 (teacher, student, guest).
--   La policy de PR 33 cubre los casos legítimos. Para guests, ver
--   pr93_guest_rpcs.sql (Opción A) o aceptar que guests no readback
--   sus respuestas post-sesión (Opción B).
-- ============================================

drop policy if exists "Teachers can read their session responses" on public.responses;
drop policy if exists "Students can read their own responses" on public.responses;
drop policy if exists "Guests can read their own responses" on public.responses;

-- ============================================
-- VERIFICACIÓN
--
--   select policyname from pg_policies
--   where tablename = 'responses' and cmd = 'SELECT';
--
-- Esperado: una sola fila "Session teacher reads responses, student
-- reads own". Si aparece otra, dropearla también.
-- ============================================
