-- ─── Analytics Studio Área 3 · overview_timeseries RPC ─────────────────
-- Serie de % correcto por clase para los sparklines del cockpit /school.
-- Lee mv_class_daily (NO crea MV nueva). Una llamada → todas las clases.
-- Columnas de la MV CUALIFICADAS con alias `d` (lección del 42702 de
-- class_timeseries). SECURITY DEFINER + filtro por teacher_id = auth.uid().

CREATE OR REPLACE FUNCTION "public"."overview_timeseries"(
  p_from timestamptz DEFAULT NULL,
  p_to   timestamptz DEFAULT NULL,
  p_granularity text DEFAULT 'day'
)
RETURNS TABLE(
  class_id uuid,
  bucket date,
  value numeric,
  responses_total integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from timestamptz := COALESCE(p_from, now() - interval '30 days');
  v_to   timestamptz := COALESCE(p_to, now());
BEGIN
  IF p_granularity NOT IN ('day','week') THEN
    RAISE EXCEPTION 'invalid granularity (allowed: day, week)' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH src AS (
    SELECT
      d.class_id AS class_id,
      CASE WHEN p_granularity = 'week'
        THEN (date_trunc('week', d.day))::date
        ELSE d.day END AS bucket,
      SUM(d.points_sum)::int     AS points_sum,
      SUM(d.max_points_sum)::int AS max_points_sum,
      SUM(d.responses_total)::int AS responses_total
    FROM public.mv_class_daily d
    WHERE d.class_id IN (SELECT id FROM public.classes WHERE teacher_id = auth.uid())
      AND d.day >= v_from::date AND d.day <= v_to::date
    GROUP BY d.class_id, 2
  )
  SELECT
    src.class_id,
    src.bucket,
    CASE WHEN src.max_points_sum > 0
      THEN ROUND((src.points_sum::numeric / src.max_points_sum::numeric) * 100, 1)
      ELSE NULL END AS value,
    src.responses_total
  FROM src
  ORDER BY src.class_id, src.bucket;
END;
$$;

REVOKE ALL ON FUNCTION "public"."overview_timeseries"(timestamptz, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."overview_timeseries"(timestamptz, timestamptz, text) TO "authenticated";

COMMENT ON FUNCTION "public"."overview_timeseries"(timestamptz, timestamptz, text) IS
  'Analytics Studio Área 3: per-class % correct time-series over mv_class_daily for the /school cockpit sparklines. SECURITY DEFINER + teacher_id guard.';
