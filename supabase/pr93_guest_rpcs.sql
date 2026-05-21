-- ============================================
-- PR 93.C — RPCs SECURITY DEFINER para guests (Opción A)
--
-- Solo aplicar si tu app mantiene el flow "guest ve sus respuestas
-- después de la sesión" o "guest renombra su display name".
--
-- Si no usás esos flows, saltear este archivo. La feature legítima
-- de "joinear por PIN" sigue intacta (pr34_hardening_rpcs.sql).
--
-- Por qué RPCs en vez de RLS:
--   RLS no puede validar tokens que el cliente provee (no hay forma
--   de pasar un "secret" del cliente a RLS sin que sea inseguro). Las
--   RPCs SECURITY DEFINER sí pueden recibir argumentos y validarlos
--   server-side antes de ejecutar el SQL.
-- ============================================

-- ── 1. get_guest_responses ────────────────────────────────────────
-- Devuelve las respuestas del guest si y solo si el guest_token
-- matchea el de la participant row en la session dada.
-- Filtra teacher_grade y teacher_feedback (privacidad: el guest no
-- ve la grade hasta que el teacher la libere — política de producto).

create or replace function public.get_guest_responses(
  p_session_id uuid,
  p_guest_token uuid
)
returns table (
  id uuid,
  question_index integer,
  answer jsonb,
  is_correct boolean,
  time_taken_ms integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Validar que el token matchea un participant real de esta session.
  if not exists (
    select 1 from public.session_participants
    where session_id = p_session_id
      and guest_token = p_guest_token
  ) then
    raise exception 'invalid guest token for session';
  end if;

  return query
  select r.id, r.question_index, r.answer, r.is_correct,
         r.time_taken_ms, r.created_at
  from public.responses r
  join public.session_participants p on p.id = r.participant_id
  where r.session_id = p_session_id
    and p.guest_token = p_guest_token;
end;
$$;

-- Solo `anon` y `authenticated`. (Por defecto en Supabase ya están
-- granteados para functions creadas en public schema, pero explícito.)
grant execute on function public.get_guest_responses(uuid, uuid) to anon, authenticated;

-- ── 2. update_my_guest_name ───────────────────────────────────────
-- Permite a un guest renombrar su display name si el token matchea.

create or replace function public.update_my_guest_name(
  p_session_id uuid,
  p_guest_token uuid,
  p_new_name text
)
returns public.session_participants
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.session_participants;
  trimmed_name text;
begin
  -- Validar nombre (no vacío, longitud sensata)
  trimmed_name := nullif(trim(coalesce(p_new_name, '')), '');
  if trimmed_name is null then
    raise exception 'name required';
  end if;
  if length(trimmed_name) > 60 then
    raise exception 'name too long';
  end if;

  -- Validar y actualizar
  update public.session_participants
  set student_name = trimmed_name
  where session_id = p_session_id
    and guest_token = p_guest_token
    and student_id is null  -- defensive: solo guests, no usuarios logueados
  returning * into updated;

  if updated is null then
    raise exception 'invalid guest token for session';
  end if;

  return updated;
end;
$$;

grant execute on function public.update_my_guest_name(uuid, uuid, text) to anon, authenticated;

-- ============================================
-- VERIFICACIÓN
--
-- 1. Las RPCs existen:
--      select proname from pg_proc where pronamespace = 'public'::regnamespace
--      and proname in ('get_guest_responses','update_my_guest_name');
--
-- 2. Test desde cliente anon (no logueado):
--      const { data, error } = await supabase.rpc('get_guest_responses', {
--        p_session_id: '<id>', p_guest_token: '<token>'
--      });
--    Con token correcto: data lista de responses.
--    Con token incorrecto: error "invalid guest token for session".
--
-- 3. Confirmar que SELECT directo NO funciona:
--      const r = await supabase.from('responses').select().is('guest_token','not.null');
--      console.log(r.data.length); // → 0 (la policy nueva no permite)
-- ============================================
