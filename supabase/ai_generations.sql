-- ─── ai_generations: log de cada generación de AI ───────────
-- Sirve para:
--   1. Rate limit (50 generaciones/profe/24h, queryeado en api/generate.js)
--   2. Métricas de Bloque 7: acceptance rate, edit rate, time to publish
--
-- Correr este SQL UNA VEZ en el SQL Editor de Supabase.
-- Idempotente: usa "if not exists" donde aplica.

-- 1. Tabla principal
create table if not exists public.ai_generations (
  id uuid default uuid_generate_v4() primary key,
  teacher_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,

  -- Lo que pidió el profe
  activity_type text not null,                -- 'mcq' | 'tf' | 'fill' | 'order' | 'match' | 'poll'
  num_questions integer not null,
  model_used text not null,                   -- 'claude-haiku-4-5-20251001', 'claude-sonnet-4-5-20250929', etc.
  input_type text,                            -- 'text' | 'pdf' | 'image' | 'docx' | 'pptx'
  input_size_chars integer,                   -- chars de texto, o bytes para binarios

  -- Output del modelo (Bloque 1 solo guarda raw; Bloques 7-8 llenan el resto)
  output_raw jsonb,                           -- preguntas crudas tal cual salieron del modelo
  output_final jsonb,                         -- preguntas tras edición del profe (relleno en publish)
  accepted_count integer,                     -- cuántas pasó sin editar
  edited_count integer,
  regenerated_count integer,
  time_to_publish_ms integer
);

-- 2. Índice para que la query del rate limit sea instantánea
create index if not exists ai_generations_teacher_recent_idx
  on public.ai_generations (teacher_id, created_at desc);

-- 3. RLS — el profe solo lee sus propias generaciones
alter table public.ai_generations enable row level security;

-- "if not exists" en políticas no es soportado en todas las versiones, así que
-- droppeamos primero (no-op si no existe) y recreamos. Idempotente.
drop policy if exists "Teachers read own generations" on public.ai_generations;
create policy "Teachers read own generations"
  on public.ai_generations
  for select
  using (auth.uid() = teacher_id);

-- 4. INSERT y UPDATE solo desde el backend (service_role bypassea RLS,
--    así que NO definimos política de insert para clientes — los clients
--    nunca deberían escribir aquí directamente).
