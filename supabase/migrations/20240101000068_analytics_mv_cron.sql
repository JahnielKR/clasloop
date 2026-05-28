-- ─── Analytics Studio F0 · pg_cron MV refresh ─────────────────────────
-- Refresca las MVs de Analytics cada 30 min sin bloquear lecturas.
-- Requiere pg_cron (asumido disponible — precedente: zombie sessions cron).

-- Limpia un schedule previo con el mismo nombre por si esta migration
-- se re-aplica (idempotente).
SELECT cron.unschedule('analytics_mv_refresh')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'analytics_mv_refresh'
);

-- Programa el job. CONCURRENTLY requiere el UNIQUE INDEX en cada MV
-- (creados en migration 064).
SELECT cron.schedule(
  'analytics_mv_refresh',
  '*/30 * * * *',
  $$
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_class_daily;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_class_topic_weekly;
  $$
);
