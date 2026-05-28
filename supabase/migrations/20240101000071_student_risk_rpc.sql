-- ─── Analytics Studio F5 · student_risk RPC ─────────────────────────────
-- Devuelve los INSUMOS CRUDOS de riesgo para cada alumno de una clase:
-- recent_pct_correct (últimos 30d), weekly_pct_correct (array de 4 semanas),
-- recent_participation (% sesiones), days_since_last_activity, last_activity.
--
-- El score final + razones se calcula en cliente con src/lib/analytics/risk.ts
-- (heurística testeable sin DB).
--
-- Mismo patrón SECURITY DEFINER + ownership guard que class_analytics (066).

CREATE OR REPLACE FUNCTION "public"."student_risk"(
  p_class_id uuid,
  p_window_days int DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owns boolean;
  v_from timestamptz;
  v_now timestamptz := now();
  v_total_sessions int;
  v_rows jsonb;
BEGIN
  -- Ownership guard
  SELECT EXISTS(
    SELECT 1 FROM public.classes
    WHERE id = p_class_id AND teacher_id = auth.uid()
  ) INTO v_owns;
  IF NOT v_owns THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  v_from := v_now - (p_window_days || ' days')::interval;

  -- Total de sesiones COMPLETADAS de la clase en la ventana — denominador
  -- para participación.
  SELECT COUNT(*) INTO v_total_sessions
  FROM public.sessions s
  WHERE s.class_id = p_class_id
    AND s.completed_at IS NOT NULL
    AND s.completed_at >= v_from AND s.completed_at <= v_now;

  -- Por alumno (student_name como identidad — student_id queda como hint
  -- para dual-lookup en F5+ del schema)
  WITH per_student AS (
    SELECT
      sp.student_name,
      MAX(r.created_at) AS last_activity,
      EXTRACT(EPOCH FROM (v_now - MAX(r.created_at))) / 86400.0 AS days_since_last_activity,
      -- recent pct correct (toda la ventana)
      CASE
        WHEN SUM(r.max_points) > 0
        THEN ROUND((SUM(r.points)::numeric / SUM(r.max_points)::numeric) * 100, 1)
        ELSE NULL
      END AS recent_pct_correct,
      -- participación: # sesiones únicas del alumno / total clase
      COUNT(DISTINCT r.session_id) AS sessions_joined
    FROM public.responses r
    JOIN public.session_participants sp ON sp.id = r.participant_id
    JOIN public.sessions s ON s.id = r.session_id
    WHERE s.class_id = p_class_id
      AND r.created_at >= v_from AND r.created_at <= v_now
    GROUP BY sp.student_name
  ),
  -- 4 semanas más recientes por alumno (pct_correct semanal — para slope
  -- en cliente con metrics.trendSlope).
  -- NOTA: el rango es FIJO 28 días, INDEPENDIENTE de p_window_days. La
  -- regresión lineal de risk.ts necesita ~4 puntos para un slope
  -- significativo; aunque el caller pase p_window_days=7 (vista corta),
  -- igual queremos las 4 semanas de historia para la detección de
  -- tendencias. recent_pct_correct (per_student arriba) sí honra v_from;
  -- este array es deliberadamente más ancho.
  weekly AS (
    SELECT
      sp.student_name,
      date_trunc('week', r.created_at)::date AS wk,
      CASE
        WHEN SUM(r.max_points) > 0
        THEN ROUND((SUM(r.points)::numeric / SUM(r.max_points)::numeric) * 100, 1)
        ELSE NULL
      END AS wk_pct
    FROM public.responses r
    JOIN public.session_participants sp ON sp.id = r.participant_id
    JOIN public.sessions s ON s.id = r.session_id
    WHERE s.class_id = p_class_id
      AND r.created_at >= (v_now - interval '28 days') AND r.created_at <= v_now
    GROUP BY sp.student_name, date_trunc('week', r.created_at)::date
  ),
  weekly_agg AS (
    SELECT
      student_name,
      COALESCE(
        jsonb_agg(wk_pct ORDER BY wk ASC) FILTER (WHERE wk_pct IS NOT NULL),
        '[]'::jsonb
      ) AS weekly_pct_correct
    FROM weekly
    GROUP BY student_name
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'student_name', ps.student_name,
    'last_activity', ps.last_activity,
    'days_since_last_activity', ROUND(ps.days_since_last_activity::numeric, 1),
    'recent_pct_correct', ps.recent_pct_correct,
    'recent_participation',
      CASE WHEN v_total_sessions > 0
        THEN ROUND((ps.sessions_joined::numeric / v_total_sessions) * 100, 1)
        ELSE NULL END,
    'sessions_joined', ps.sessions_joined,
    'weekly_pct_correct', COALESCE(w.weekly_pct_correct, '[]'::jsonb)
  ) ORDER BY ps.recent_pct_correct ASC NULLS LAST), '[]'::jsonb)
  INTO v_rows
  FROM per_student ps
  LEFT JOIN weekly_agg w ON w.student_name = ps.student_name;

  RETURN jsonb_build_object(
    'class_id', p_class_id,
    'window_days', p_window_days,
    'from', v_from,
    'to', v_now,
    'total_sessions', v_total_sessions,
    'students', v_rows
  );
END;
$$;

REVOKE ALL ON FUNCTION "public"."student_risk"(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."student_risk"(uuid, int) TO "authenticated";

COMMENT ON FUNCTION "public"."student_risk"(uuid, int) IS
  'Analytics Studio F5: insumos crudos de riesgo por alumno de una clase. Score final lo calcula el cliente con src/lib/analytics/risk.ts. SECURITY DEFINER + ownership guard.';
