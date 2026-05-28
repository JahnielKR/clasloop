-- ─── Analytics Studio F0 · class_analytics RPC ────────────────────────
-- KPIs + topic mastery + most-missed para UNA clase, sobre una ventana.
-- Lo consume el ClassDetail view (F1). En F0 está listo y testeable.

CREATE OR REPLACE FUNCTION "public"."class_analytics"(
  p_class_id uuid,
  p_from timestamptz DEFAULT NULL,
  p_to   timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owns boolean;
  v_from timestamptz := COALESCE(p_from, now() - interval '30 days');
  v_to   timestamptz := COALESCE(p_to, now());
  v_kpis jsonb;
  v_topics jsonb;
  v_missed jsonb;
BEGIN
  -- Ownership guard
  SELECT EXISTS(
    SELECT 1 FROM public.classes
    WHERE id = p_class_id AND teacher_id = auth.uid()
  ) INTO v_owns;
  IF NOT v_owns THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  -- KPIs from mv_class_daily over the window
  SELECT jsonb_build_object(
    'responses_total', COALESCE(SUM(responses_total), 0),
    'responses_correct', COALESCE(SUM(responses_correct), 0),
    'pct_correct', CASE
      WHEN COALESCE(SUM(max_points_sum), 0) > 0
        THEN ROUND((SUM(points_sum)::numeric / SUM(max_points_sum)::numeric) * 100, 1)
      ELSE NULL END,
    'avg_time_ms', COALESCE(ROUND(AVG(avg_time_ms))::int, 0),
    'unique_participants', COALESCE(SUM(unique_participants), 0)
  ) INTO v_kpis
  FROM public.mv_class_daily
  WHERE class_id = p_class_id
    AND day >= v_from::date AND day <= v_to::date;

  -- Topic mastery (current snapshot — F0 doesn't add history)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'topic', topic,
    'retention_score', retention_score,
    'session_count', session_count,
    'last_reviewed_at', last_reviewed_at,
    'next_review_at', next_review_at
  ) ORDER BY retention_score ASC), '[]'::jsonb) INTO v_topics
  FROM public.topic_retention
  WHERE class_id = p_class_id;

  -- Most-missed questions in the window (>= 3 responses to avoid noise)
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.error_rate DESC), '[]'::jsonb)
  INTO v_missed
  FROM (
    SELECT
      r.question_index,
      s.deck_id,
      s.topic,
      COUNT(*)::int AS total_responses,
      SUM(CASE WHEN NOT r.is_correct THEN 1 ELSE 0 END)::int AS incorrect_count,
      ROUND(
        (SUM(CASE WHEN NOT r.is_correct THEN 1 ELSE 0 END)::numeric
         / NULLIF(COUNT(*), 0)) * 100, 1
      ) AS error_rate
    FROM public.responses r
    JOIN public.sessions s ON s.id = r.session_id
    WHERE s.class_id = p_class_id
      AND r.created_at >= v_from AND r.created_at <= v_to
    GROUP BY r.question_index, s.deck_id, s.topic
    HAVING COUNT(*) >= 3
    ORDER BY error_rate DESC NULLS LAST
    LIMIT 10
  ) t;

  RETURN jsonb_build_object(
    'class_id', p_class_id,
    'from', v_from,
    'to', v_to,
    'kpis', COALESCE(v_kpis, '{}'::jsonb),
    'topic_mastery', v_topics,
    'most_missed', v_missed
  );
END;
$$;

REVOKE ALL ON FUNCTION "public"."class_analytics"(uuid, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."class_analytics"(uuid, timestamptz, timestamptz) TO "authenticated";

COMMENT ON FUNCTION "public"."class_analytics"(uuid, timestamptz, timestamptz) IS
  'Analytics Studio F0: per-class KPIs + topic mastery + most-missed over a window. SECURITY DEFINER + ownership guard. Used by ClassDetail (F1).';
