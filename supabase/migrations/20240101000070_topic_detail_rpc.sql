-- ─── Analytics Studio F3 · topic_detail RPC ───────────────────────────
-- Payload del Topic Mastery view en UNA llamada:
--   - KPIs del tema (responses_total/correct, pct_correct, avg_time, unique_students)
--   - Tendencia semanal (sobre mv_class_topic_weekly de F0)
--   - Top-N preguntas más falladas del tema con answer_distribution +
--     el `question` jsonb del deck (para que MisconceptionPanel highlight
--     la opción correcta en MCQ/TF).
-- SECURITY DEFINER + ownership guard. Mismo patrón que class_analytics
-- (066), class_timeseries (067), student_detail (069).

CREATE OR REPLACE FUNCTION "public"."topic_detail"(
  p_class_id uuid,
  p_topic text,
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
  v_from timestamptz := COALESCE(p_from, now() - interval '90 days');
  v_to   timestamptz := COALESCE(p_to, now());
  v_kpis jsonb;
  v_weekly jsonb;
  v_questions jsonb;
BEGIN
  -- Ownership guard
  SELECT EXISTS(
    SELECT 1 FROM public.classes
    WHERE id = p_class_id AND teacher_id = auth.uid()
  ) INTO v_owns;
  IF NOT v_owns THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  -- KPIs del tema sobre la ventana
  SELECT jsonb_build_object(
    'responses_total', COALESCE(COUNT(*), 0),
    'responses_correct', COALESCE(SUM(CASE WHEN r.is_correct THEN 1 ELSE 0 END), 0),
    'pct_correct', CASE
      WHEN COALESCE(SUM(r.max_points), 0) > 0
        THEN ROUND((SUM(r.points)::numeric / SUM(r.max_points)::numeric) * 100, 1)
      ELSE NULL END,
    'avg_time_ms', COALESCE(ROUND(AVG(r.time_taken_ms))::int, 0),
    'unique_students', COUNT(DISTINCT sp.student_name)
  ) INTO v_kpis
  FROM public.responses r
  JOIN public.sessions s ON s.id = r.session_id
  LEFT JOIN public.session_participants sp ON sp.id = r.participant_id
  WHERE s.class_id = p_class_id
    AND s.topic = p_topic
    AND r.created_at >= v_from AND r.created_at <= v_to;

  -- Tendencia semanal — lee mv_class_topic_weekly (F0 migración 064).
  SELECT COALESCE(jsonb_agg(t ORDER BY t.bucket), '[]'::jsonb) INTO v_weekly
  FROM (
    SELECT
      week AS bucket,
      responses_total,
      responses_correct,
      CASE WHEN max_points_sum > 0
        THEN ROUND((points_sum::numeric / max_points_sum::numeric) * 100, 1)
        ELSE NULL END AS value
    FROM public.mv_class_topic_weekly
    WHERE class_id = p_class_id
      AND topic = p_topic
      AND week >= v_from::date AND week <= v_to::date
  ) t;

  -- Por-pregunta agregado con answer_distribution + el question jsonb del deck.
  WITH src AS (
    SELECT s.deck_id, r.question_index, r.is_correct, r.points, r.max_points, r.answer
    FROM public.responses r
    JOIN public.sessions s ON s.id = r.session_id
    WHERE s.class_id = p_class_id
      AND s.topic = p_topic
      AND r.created_at >= v_from AND r.created_at <= v_to
  ),
  base AS (
    SELECT
      deck_id,
      question_index,
      COUNT(*)::int AS total_responses,
      SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)::int AS correct_count,
      SUM(CASE WHEN NOT is_correct THEN 1 ELSE 0 END)::int AS incorrect_count,
      CASE WHEN COUNT(*) > 0
        THEN ROUND((SUM(CASE WHEN NOT is_correct THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 1)
        ELSE NULL END AS error_rate
    FROM src
    GROUP BY deck_id, question_index
    HAVING COUNT(*) >= 2
  ),
  dist AS (
    SELECT deck_id, question_index, jsonb_object_agg(answer_key, cnt) AS answer_distribution
    FROM (
      SELECT
        deck_id,
        question_index,
        CASE
          WHEN answer IS NULL THEN 'null'
          WHEN jsonb_typeof(answer) = 'string' THEN trim('"' from answer::text)
          ELSE answer::text
        END AS answer_key,
        COUNT(*) AS cnt
      FROM src
      GROUP BY deck_id, question_index, answer_key
    ) sub
    GROUP BY deck_id, question_index
  )
  SELECT COALESCE(jsonb_agg(q ORDER BY q.error_rate DESC NULLS LAST), '[]'::jsonb)
  INTO v_questions
  FROM (
    SELECT
      b.deck_id,
      b.question_index,
      b.total_responses,
      b.correct_count,
      b.incorrect_count,
      b.error_rate,
      COALESCE(d.answer_distribution, '{}'::jsonb) AS answer_distribution,
      (dk.questions->b.question_index) AS question
    FROM base b
    LEFT JOIN dist d USING (deck_id, question_index)
    LEFT JOIN public.decks dk ON dk.id = b.deck_id
    ORDER BY b.error_rate DESC NULLS LAST
    LIMIT 15
  ) q;

  RETURN jsonb_build_object(
    'class_id', p_class_id,
    'topic', p_topic,
    'from', v_from,
    'to', v_to,
    'kpis', COALESCE(v_kpis, '{}'::jsonb),
    'weekly_trend', v_weekly,
    'questions', v_questions
  );
END;
$$;

REVOKE ALL ON FUNCTION "public"."topic_detail"(uuid, text, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."topic_detail"(uuid, text, timestamptz, timestamptz) TO "authenticated";

COMMENT ON FUNCTION "public"."topic_detail"(uuid, text, timestamptz, timestamptz) IS
  'Analytics Studio F3: Topic Mastery payload (KPIs + weekly trend + top-N misses con answer_distribution + question jsonb) en UNA llamada. SECURITY DEFINER + ownership guard.';
