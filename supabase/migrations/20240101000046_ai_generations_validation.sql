-- ─── Bloque 4: Agregar columnas de validación a ai_generations ─────────────
-- Correr UNA VEZ en el SQL Editor de Supabase (idempotente).
--
-- Estas columnas las usa el endpoint para guardar:
--   - output_filtered: las preguntas que pasaron el filtro de Haiku
--   - validation_dropped_count: cuántas se filtraron en este pase
--
-- Nota: la columna `output_raw` ya existía desde Bloque 1 — las preguntas
-- crudas que escupió Sonnet, antes del filtro. Comparar raw vs filtered
-- da la métrica de "calidad inicial del modelo principal".

alter table public.ai_generations
  add column if not exists output_filtered jsonb;

alter table public.ai_generations
  add column if not exists validation_dropped_count integer default 0;

-- Si quisieras métricas rápidas en queries, este índice ayuda a filtrar
-- generaciones que tuvieron drops (poco frecuente, así que el índice
-- parcial es eficiente).
create index if not exists ai_generations_with_drops_idx
  on public.ai_generations (created_at desc, validation_dropped_count)
  where validation_dropped_count > 0;
