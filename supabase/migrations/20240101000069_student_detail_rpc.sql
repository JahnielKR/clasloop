-- ─── Analytics Studio F2 · student_detail RPC ─────────────────────────
-- Devuelve el payload completo del Perfil de Estudiante en UNA llamada.
-- Identifica al alumno por nombre (student_name) — `student_id` queda
-- como hint para F5+ (resolución dual). Guard: la clase debe ser del
-- docente autenticado. Mismo patrón que class_analytics (066).

CREATE OR REPLACE FUNCTION "public"."student_detail"(
  p_class_id uuid,
  p_student_ref text,
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
  v_trajectory jsonb;
  v_topics jsonb;
  v_sessions jsonb;
  v_failed jsonb;
  v_class_avg numeric;
BEGIN
  -- Ownership guard
  SELECT EXISTS(
    SELECT 1 FROM public.classes
    WHERE id = p_class_id AND teacher_id = auth.uid()
  ) INTO v_owns;
  IF NOT v_owns THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  -- KPIs del alumno sobre la ventana — responses joineado a
  -- session_participants donde el nombre coincide.
  SELECT jsonb_build_object(
    'responses_total', COALESCE(COUNT(*), 0),
    'responses_correct', COALESCE(SUM(CASE WHEN r.is_correct THEN 1 ELSE 0 END), 0),
    'pct_correct', CASE
      WHEN COALESCE(SUM(r.max_points), 0) > 0
        THEN ROUND((SUM(r.points)::numeric / SUM(r.max_points)::numeric) * 100, 1)
      ELSE NULL END,
    'avg_time_ms', COALESCE(ROUND(AVG(r.time_taken_ms))::int, 0),
    'session_count', COUNT(DISTINCT r.session_id)
  ) INTO v_kpis
  FROM public.responses r
  JOIN public.session_participants sp ON sp.id = r.participant_id
  JOIN public.sessions s ON s.id = r.session_id
  WHERE s.class_id = p_class_id
    AND sp.student_name = p_student_ref
    AND r.created_at >= v_from AND r.created_at <= v_to;

  -- Trayectoria semanal: pct_correct por semana.
  SELECT COALESCE(jsonb_agg(t ORDER BY t.bucket), '[]'::jsonb) INTO v_trajectory
  FROM (
    SELECT
      (date_trunc('week', r.created_at))::date AS bucket,
      COUNT(*)::int AS responses_total,
      SUM(CASE WHEN r.is_correct THEN 1 ELSE 0 END)::int AS responses_correct,
      CASE WHEN SUM(r.max_points) > 0
        THEN ROUND((SUM(r.points)::numeric / SUM(r.max_points)::numeric) * 100, 1)
        ELSE NULL END AS value
    FROM public.responses r
    JOIN public.session_participants sp ON sp.id = r.participant_id
    JOIN public.sessions s ON s.id = r.session_id
    WHERE s.class_id = p_class_id
      AND sp.student_name = p_student_ref
      AND r.created_at >= v_from AND r.created_at <= v_to
    GROUP BY (date_trunc('week', r.created_at))::date
  ) t;

  -- Dominio por tema del alumno (snapshot).
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'topic', stp.topic,
    'retention_score', stp.retention_score,
    'total_questions', stp.total_questions,
    'correct_answers', stp.correct_answers,
    'last_reviewed_at', stp.last_reviewed_at
  ) ORDER BY stp.retention_score ASC), '[]'::jsonb) INTO v_topics
  FROM public.student_topic_progress stp
  WHERE stp.class_id = p_class_id
    AND stp.student_name = p_student_ref;

  -- Historial por sesión (top 20 más recientes).
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.session_completed_at DESC), '[]'::jsonb)
  INTO v_sessions
  FROM (
    SELECT
      s.id AS session_id,
      s.topic AS session_topic,
      s.deck_id,
      s.session_type,
      s.completed_at AS session_completed_at,
      sp.joined_at,
      sp.completed_at AS participant_completed_at,
      COUNT(r.id)::int AS responses_total,
      SUM(CASE WHEN r.is_correct THEN 1 ELSE 0 END)::int AS responses_correct,
      CASE WHEN SUM(r.max_points) > 0
        THEN ROUND((SUM(r.points)::numeric / SUM(r.max_points)::numeric) * 100, 1)
        ELSE NULL END AS pct_correct,
      COALESCE(ROUND(AVG(r.time_taken_ms))::int, 0) AS avg_time_ms
    FROM public.sessions s
    JOIN public.session_participants sp ON sp.session_id = s.id
    LEFT JOIN public.responses r ON r.participant_id = sp.id
    WHERE s.class_id = p_class_id
      AND sp.student_name = p_student_ref
      AND s.completed_at IS NOT NULL
      AND s.completed_at >= v_from AND s.completed_at <= v_to
    GROUP BY s.id, s.topic, s.deck_id, s.session_type, s.completed_at, sp.joined_at, sp.completed_at
    ORDER BY s.completed_at DESC
    LIMIT 20
  ) t;

  -- Más falladas del alumno (top 10 por error_rate, >= 2 intentos).
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.error_rate DESC), '[]'::jsonb)
  INTO v_failed
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
    JOIN public.session_participants sp ON sp.id = r.participant_id
    JOIN public.sessions s ON s.id = r.session_id
    WHERE s.class_id = p_class_id
      AND sp.student_name = p_student_ref
      AND r.created_at >= v_from AND r.created_at <= v_to
    GROUP BY r.question_index, s.deck_id, s.topic
    HAVING COUNT(*) >= 2
    ORDER BY error_rate DESC NULLS LAST
    LIMIT 10
  ) t;

  -- Promedio de retención de la clase entera (para comparar con la del alumno).
  SELECT AVG(stp.retention_score)::numeric INTO v_class_avg
  FROM public.student_topic_progress stp
  WHERE stp.class_id = p_class_id;

  RETURN jsonb_build_object(
    'class_id', p_class_id,
    'student_ref', p_student_ref,
    'from', v_from,
    'to', v_to,
    'kpis', COALESCE(v_kpis, '{}'::jsonb),
    'trajectory', v_trajectory,
    'topic_mastery', v_topics,
    'session_history', v_sessions,
    'most_failed', v_failed,
    'class_avg_retention', COALESCE(v_class_avg, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION "public"."student_detail"(uuid, text, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."student_detail"(uuid, text, timestamptz, timestamptz) TO "authenticated";

COMMENT ON FUNCTION "public"."student_detail"(uuid, text, timestamptz, timestamptz) IS
  'Analytics Studio F2: Student profile payload (KPIs + trayectoria + topic mastery + session history + most-failed + class avg) en UNA llamada. SECURITY DEFINER + ownership guard.';
