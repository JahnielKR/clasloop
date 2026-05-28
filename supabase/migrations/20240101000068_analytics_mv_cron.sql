-- ─── Analytics Studio F0 · pg_cron MV refresh ─────────────────────────
-- Refresca las MVs de Analytics cada 30 min sin bloquear lecturas.
-- Requiere pg_cron. Si pg_cron no está habilitado, no-op con NOTICE
-- (mismo patrón que 20240101000050_zombie_sessions_cron.sql, para
-- evitar el error 3F000 "schema does not exist" en entornos sin pg_cron).

do $$
begin
  -- Bail cleanly if pg_cron isn't installed.
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron extension not enabled — skipping analytics_mv_refresh schedule. Enable via Dashboard → Database → Extensions, then re-run this migration.';
    return;
  end if;

  -- Drop any prior schedule with the same name (idempotente).
  if exists (select 1 from cron.job where jobname = 'analytics_mv_refresh') then
    perform cron.unschedule('analytics_mv_refresh');
  end if;

  -- CONCURRENTLY requiere el UNIQUE INDEX en cada MV (creados en 064).
  perform cron.schedule(
    'analytics_mv_refresh',
    '*/30 * * * *',
    $cron$
      REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_class_daily;
      REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_class_topic_weekly;
    $cron$
  );

  raise notice 'pg_cron schedule installed: analytics_mv_refresh (every 30 min)';
end $$;
