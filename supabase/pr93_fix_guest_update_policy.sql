-- ============================================
-- PR 93.B — Remove permissive guest UPDATE branches
--
-- BUG (auditoría 2026-05-21):
--   pr33_rls_security_fix.sql:92-105 — UPDATE policy de session_participants:
--     OR (guest_token IS NOT NULL AND auth.uid() IS NULL)
--   No ata al caller al guest_token específico. Cualquier anon puede
--   UPDATE cualquier fila guest (hijack de leaderboards, rename de
--   guests, rotate del token).
--
--   pr33_rls_security_fix.sql:181-189 — UPDATE policy de
--   student_topic_progress tiene el mismo bug:
--     OR (student_id IS NULL AND auth.uid() IS NULL)
--
-- FIX:
--   Reemplazar las policies sin el branch guest. Los renames/updates
--   legítimos de guest van a pasar por RPC (ver pr93_guest_rpcs.sql).
--   Si no se quiere mantener la feature de rename, los guests no
--   pueden modificar nada post-join — pueden seguir submittiendo
--   responses porque la INSERT policy permite anon.
-- ============================================

-- ── session_participants ──────────────────────────────────────────
drop policy if exists "Session teacher updates participants, student updates own row"
  on public.session_participants;

create policy "Session teacher updates participants, student updates own row"
on public.session_participants
for update
using (
  session_id IN (
    select id from public.sessions where teacher_id = auth.uid()
  )
  OR student_id = auth.uid()
);

-- ── student_topic_progress ────────────────────────────────────────
drop policy if exists "Class teacher or own student updates progress"
  on public.student_topic_progress;

create policy "Class teacher or own student updates progress"
on public.student_topic_progress
for update
using (
  class_id IN (
    select id from public.classes where teacher_id = auth.uid()
  )
  OR student_id = auth.uid()
);

-- ============================================
-- VERIFICACIÓN
--
--   select policyname, qual from pg_policies
--   where tablename in ('session_participants','student_topic_progress')
--     and cmd = 'UPDATE';
--
-- En ambos `qual` NO debería aparecer "auth.uid() IS NULL" ni
-- "guest_token IS NOT NULL AND auth.uid() IS NULL".
-- ============================================
