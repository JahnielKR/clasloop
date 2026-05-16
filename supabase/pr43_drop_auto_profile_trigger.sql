-- ═══════════════════════════════════════════════════════════════════════
-- PR 43: Auth flow redesign — drop handle_new_user trigger
-- ═══════════════════════════════════════════════════════════════════════
--
-- Context: la lógica vieja del cliente (PRs 36-42) intentaba pelearse
-- con el trigger handle_new_user que crea automáticamente un profile
-- con role default cuando se crea un auth.users. El trigger corría más
-- rápido que el cliente y nuestra lógica tenía que "actualizar" después,
-- causando todos los bugs de role-flipping que perseguimos por horas.
--
-- Solución: dropear el trigger. El cliente se encarga de crear el
-- profile DESPUÉS de que el user elige su rol en una pantalla de
-- onboarding obligatoria post-signup/signin.
--
-- Efecto:
--   - auth.users se crea normalmente (signup/oauth)
--   - profile NO se crea automáticamente
--   - cliente detecta "auth.users existe pero no hay profile" → muestra
--     onboarding screen → user elige rol → cliente crea profile
--
-- Esto elimina toda la lógica de "is fresh session", "did trigger pick
-- the wrong role", etc. El profile se crea con el rol correcto desde el
-- inicio, una sola vez, por el cliente.
--
-- ═══════════════════════════════════════════════════════════════════════
-- ROLLBACK
-- ═══════════════════════════════════════════════════════════════════════
-- Para revertir esta migration y volver al trigger viejo:
--   ver schema.sql, sección "Auto-create profile on signup"
-- ═══════════════════════════════════════════════════════════════════════

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════════
-- END
-- ═══════════════════════════════════════════════════════════════════════
