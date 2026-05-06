-- ─── Bloque 7: agregar flag is_admin a profiles ───────────
-- Correr UNA VEZ en el SQL Editor de Supabase. Idempotente.
--
-- Para acceder al dashboard /admin/ai-stats el user necesita is_admin=true.
-- Después de correr este SQL, ejecuta MANUALMENTE en SQL Editor:
--
--   update public.profiles set is_admin = true where id = '<TU-USER-ID>';
--
-- Para encontrar tu user-id, ejecuta:
--   select id, full_name from public.profiles where role = 'teacher';
--
-- (O en el browser, en una tab logueada como tú: console → window.localStorage,
-- buscar el access_token, decodificarlo en jwt.io para ver el sub.)

alter table public.profiles
  add column if not exists is_admin boolean default false not null;

-- Índice para chequeo rápido (raro de filtrar pero por las dudas).
create index if not exists profiles_is_admin_idx
  on public.profiles (is_admin)
  where is_admin = true;

-- ─── Función helper: ¿el caller actual es admin? ──────────
-- Hacer esto vía función SECURITY DEFINER evita el problema clásico de
-- recursión infinita cuando una política sobre `profiles` consulta
-- `profiles` (y dispara su propia política).
-- La función queda como `auth.is_admin()` para mantenerse al lado de
-- auth.uid() y otros helpers de Supabase.
create or replace function public.current_user_is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ─── RLS: admins pueden leer TODAS las ai_generations ──────
-- Los teachers normales solo leen las suyas (política "Teachers read own
-- generations" del SQL original). Esta política adicional permite que
-- alguien con is_admin=true vea todas — necesario para el dashboard
-- /admin/ai-stats.
drop policy if exists "Admins read all generations" on public.ai_generations;
create policy "Admins read all generations"
  on public.ai_generations
  for select
  using (public.current_user_is_admin());

-- ─── RLS: admins pueden leer TODOS los profiles ────────────
-- Por defecto cada user lee solo el suyo. El dashboard necesita el
-- full_name de los teachers que generaron, así que damos read all a admins.
-- Usamos la función helper para evitar recursión.
drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles"
  on public.profiles
  for select
  using (public.current_user_is_admin());
