-- ============================================
-- PR 92 — profiles.is_admin / role lockdown
--
-- BUG (auditoría 2026-05-21):
--   La policy "Users can update own profile" usa `using (auth.uid() = id)`
--   sin `with check` columna por columna. Cualquier user autenticado puede:
--
--     await supabase.from('profiles')
--       .update({ is_admin: true, role: 'teacher' })
--       .eq('id', user.id);
--
--   …y auto-promoverse a admin (lee ai_generations + profiles de todos)
--   o a teacher (gana acceso a /api/generate y RPCs teacher-only).
--
--   La policy INSERT tiene el mismo agujero — un signup nuevo puede
--   mandar is_admin: true en el primer insert.
--
-- FIX:
--   1. Revocar UPDATE e INSERT directos a `authenticated`.
--   2. Crear RPC SECURITY DEFINER `update_my_profile(p_updates jsonb)`
--      con API JSONB: el caller pasa un objeto con las keys que quiere
--      cambiar. Match exacto con semántica de supabase-js update():
--        - key presente con valor → set ese valor (incluso null = clear)
--        - key ausente → no tocar la columna
--      Solo whitelisted columns. is_admin, role, xp, level, streak NO
--      están whitelisted — quedan completamente fuera del alcance.
--   3. Crear RPC `create_my_profile` para RoleOnboarding (insert).
--   4. Triggers BEFORE INSERT/UPDATE defensivos (belt and suspenders).
--
-- ANTES DE APLICAR:
--   1. Auditar usuarios elevados:
--        select id, full_name from profiles where is_admin = true;
--   2. Confirmar que todos los call sites están migrados (cero output):
--        grep -rzn "from(.profiles.)" src/
--
-- DEPLOY:
--   El SQL + el cambio en RoleOnboarding.jsx + Settings.jsx + AvatarOnboarding.jsx
--   deben ir juntos. SQL primero, frontend después.
-- ============================================

-- ── 1. Revocar UPDATE / INSERT directos ──────────────────────────────
revoke insert, update on public.profiles from authenticated;
revoke insert, update on public.profiles from anon;

drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;

-- ── 2. RPC: update_my_profile con API JSONB ──────────────────────────
-- API:
--   await supabase.rpc('update_my_profile', { p_updates: { full_name: 'X', avatar_url: null } })
--
-- Semántica:
--   - p_updates ? 'key'    → la columna se setea al valor de p_updates->'key'
--                            (incluso null → clear)
--   - !(p_updates ? 'key') → la columna no se toca
--
-- Whitelist de columnas:
--   full_name, avatar_id, frame_id, school, language, daily_goal,
--   avatar_url, default_deck_visibility
--
-- Cualquier otra key en p_updates es SILENCIOSAMENTE IGNORADA. Esto
-- incluye is_admin, role, xp, level, streak. Es deliberado: cliente
-- puede pasar lo que quiera, server solo lee lo que reconoce.

create or replace function public.update_my_profile(
  p_updates jsonb
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  updated public.profiles;
  v_lang text;
  v_visibility text;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if p_updates is null or jsonb_typeof(p_updates) <> 'object' then
    raise exception 'p_updates must be an object';
  end if;

  -- Validaciones de valores enumerados (mejor mensaje que CHECK violation)
  if p_updates ? 'language' then
    v_lang := p_updates->>'language';
    if v_lang is not null and v_lang not in ('en','es','ko') then
      raise exception 'invalid language: %', v_lang;
    end if;
  end if;
  if p_updates ? 'default_deck_visibility' then
    v_visibility := p_updates->>'default_deck_visibility';
    if v_visibility is not null and v_visibility not in ('private','public') then
      raise exception 'invalid default_deck_visibility: %', v_visibility;
    end if;
  end if;

  -- UPDATE con CASE per-columna. Pattern:
  --   col = case when p_updates ? 'col' then (p_updates->>'col') else col end
  -- Key presente con null → clear. Key ausente → no tocar.
  update public.profiles
  set
    full_name = case when p_updates ? 'full_name'
                     then p_updates->>'full_name'
                     else full_name end,
    avatar_id = case when p_updates ? 'avatar_id'
                     then p_updates->>'avatar_id'
                     else avatar_id end,
    frame_id  = case when p_updates ? 'frame_id'
                     then p_updates->>'frame_id'
                     else frame_id end,
    school    = case when p_updates ? 'school'
                     then p_updates->>'school'
                     else school end,
    language  = case when p_updates ? 'language'
                     then p_updates->>'language'
                     else language end,
    daily_goal = case when p_updates ? 'daily_goal'
                     then (p_updates->>'daily_goal')::int
                     else daily_goal end,
    avatar_url = case when p_updates ? 'avatar_url'
                     then p_updates->>'avatar_url'
                     else avatar_url end,
    default_deck_visibility = case when p_updates ? 'default_deck_visibility'
                     then p_updates->>'default_deck_visibility'
                     else default_deck_visibility end
  where id = uid
  returning * into updated;

  if not found then
    raise exception 'profile not found for user %', uid;
  end if;

  return updated;
end;
$$;

grant execute on function public.update_my_profile(jsonb) to authenticated;

-- ── 3. RPC: create_my_profile (para RoleOnboarding) ──────────────────
create or replace function public.create_my_profile(
  p_role text,
  p_full_name text,
  p_avatar_url text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  inserted public.profiles;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if p_role not in ('teacher','student') then
    raise exception 'invalid role: %', p_role;
  end if;

  insert into public.profiles (id, role, full_name, avatar_url, is_admin)
  values (uid, p_role, p_full_name, p_avatar_url, false)
  on conflict (id) do nothing
  returning * into inserted;

  if inserted is null then
    -- Ya existía un profile (idempotency). Devolver el existente.
    select * into inserted from public.profiles where id = uid;
  end if;

  return inserted;
end;
$$;

grant execute on function public.create_my_profile(text, text, text)
  to authenticated;

-- ── 4. Trigger defensivo BEFORE INSERT ───────────────────────────────
create or replace function public.profiles_enforce_safe_insert()
returns trigger
language plpgsql
as $$
begin
  new.is_admin := false;
  if new.role is null or new.role not in ('teacher','student') then
    new.role := 'teacher';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_enforce_safe_insert_trg on public.profiles;
create trigger profiles_enforce_safe_insert_trg
  before insert on public.profiles
  for each row execute function public.profiles_enforce_safe_insert();

-- ── 5. Trigger defensivo BEFORE UPDATE ───────────────────────────────
create or replace function public.profiles_block_sensitive_update()
returns trigger
language plpgsql
as $$
begin
  if (select coalesce(current_setting('request.jwt.claim.role', true), '')) = 'authenticated' then
    if new.is_admin is distinct from old.is_admin then
      raise exception 'cannot modify is_admin from client';
    end if;
    if new.role is distinct from old.role then
      raise exception 'cannot modify role from client';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_block_sensitive_update_trg on public.profiles;
create trigger profiles_block_sensitive_update_trg
  before update on public.profiles
  for each row execute function public.profiles_block_sensitive_update();

-- ============================================
-- VERIFICACIÓN
--
-- 1) Confirmar revocaciones (debería NO aparecer UPDATE/INSERT):
--      select privilege_type from information_schema.table_privileges
--      where table_name = 'profiles' and grantee = 'authenticated';
--
-- 2) Confirmar las RPCs:
--      select proname, pg_get_function_arguments(oid)
--      from pg_proc where pronamespace = 'public'::regnamespace
--      and proname in ('update_my_profile', 'create_my_profile');
--
-- 3) Test de escalada (debería fallar):
--      const r = await supabase.from('profiles').update({ is_admin: true }).eq('id', user.id);
--      console.log(r);  // → error: permission denied
--
-- 4) Test de update legítimo:
--      const r = await supabase.rpc('update_my_profile', { p_updates: { language: 'es' } });
--      console.log(r);  // → data: