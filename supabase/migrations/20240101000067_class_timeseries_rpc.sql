-- ─── Analytics Studio F0 · class_timeseries RPC ───────────────────────
-- Serie temporal sobre mv_class_daily. Soporta granularidad day|week.
-- Metric: pct_correct | avg_time | participation.
-- 'retention' como serie temporal requiere histórico (no existe en F0)
-- y se rechaza con un mensaje claro hasta que F2/F3 lo agreguen.

CREATE OR REPLACE FUNCTION "public"."class_timeseries"(
  p_class_id uuid,
  p_metric text DEFAULT 'pct_correct',
  p_granularity text DEFAULT 'day',
  p_from timestamptz DEFAULT NULL,
  p_to   timestamptz DEFAULT NULL
)
RETURNS TABLE(
  bucket date,
  value numeric,
  responses_total integer,
  unique_participants integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owns boolean;
  v_from timestamptz := COALESCE(p_from, now() - interval '90 days');
  v_to   timestamptz := COALESCE(p_to, now());
BEGIN
  IF p_granularity NOT IN ('day','week') THEN
    RAISE EXCEPTION 'invalid granularity (allowed: day, week)' USING ERRCODE = '22023';
  END IF;
  IF p_metric NOT IN ('pct_correct','avg_time','participation') THEN
    RAISE EXCEPTION 'invalid metric (allowed: pct_correct, avg_time, participation; retention TS llega en una fase posterior)' USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.classes
    WHERE id = p_class_id AND teacher_id = auth.uid()
  ) INTO v_owns;
  IF NOT v_owns THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH src AS (
    SELECT
      CASE WHEN p_granularity = 'week'
        THEN (date_trunc('week', day))::date
        ELSE day END AS bucket,
      SUM(responses_total)::int AS responses_total,
      SUM(responses_correct)::int AS responses_correct,
      SUM(points_sum)::int AS points_sum,
      SUM(max_points_sum)::int AS max_points_sum,
      AVG(avg_time_ms)::int AS avg_time_ms,
      SUM(unique_participants)::int AS unique_participants
    FROM public.mv_class_daily
    WHERE class_id = p_class_id
      AND day >= v_from::date AND day <= v_to::date
    GROUP BY 1
  )
  SELECT
    src.bucket,
    CASE p_metric
      WHEN 'pct_correct' THEN CASE
        WHEN src.max_points_sum > 0
          THEN ROUND((src.points_sum::numeric / src.max_points_sum::numeric) * 100, 1)
        ELSE NULL END
      WHEN 'avg_time'      THEN src.avg_time_ms::numeric
      WHEN 'participation' THEN src.unique_participants::numeric
    END AS value,
    src.responses_total,
    src.unique_participants
  FROM src
  ORDER BY src.bucket;
END;
$$;

REVOKE ALL ON FUNCTION "public"."class_timeseries"(uuid, text, text, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."class_timeseries"(uuid, text, text, timestamptz, timestamptz) TO "authenticated";

COMMENT ON FUNCTION "public"."class_timeseries"(uuid, text, text, timestamptz, timestamptz) IS
  'Analytics Studio F0: time-series of pct_correct/avg_time/participation per class. Reads mv_class_daily. SECURITY DEFINER + ownership guard.';
