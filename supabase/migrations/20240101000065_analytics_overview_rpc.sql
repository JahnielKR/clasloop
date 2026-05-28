-- ─── Analytics Studio F0 · analytics_overview RPC ──────────────────────
-- Reemplaza el N+1 de useDirector.js (4-6 queries por clase) con UNA
-- llamada. Devuelve un row por clase del docente con:
--   KPIs (member_count, session_count, retention_avg, participation, last_activity)
--   + topics_snapshot (jsonb array)   — para el tab de retención
--   + students_snapshot (jsonb array) — para el tab de estudiantes
-- Mismo patrón SECURITY DEFINER + auth.uid() que class_decks_summary().

CREATE OR REPLACE FUNCTION "public"."analytics_overview"()
RETURNS TABLE(
  class_id uuid,
  class_name text,
  class_grade text,
  class_subject text,
  class_code text,
  retention_avg numeric,
  participation_pct numeric,
  session_count integer,
  member_count integer,
  unique_students integer,
  last_activity_at timestamptz,
  topics_snapshot jsonb,
  students_snapshot jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH owned_classes AS (
    SELECT id, name, grade, subject, class_code
    FROM public.classes
    WHERE teacher_id = auth.uid()
  ),
  ret AS (
    SELECT
      tr.class_id,
      AVG(tr.retention_score)::numeric AS retention_avg,
      jsonb_agg(jsonb_build_object(
        'topic', tr.topic,
        'retention_score', tr.retention_score,
        'total_questions', tr.total_questions,
        'correct_answers', tr.correct_answers,
        'session_count', tr.session_count,
        'last_reviewed_at', tr.last_reviewed_at,
        'next_review_at', tr.next_review_at,
        'snoozed_until', tr.snoozed_until,
        'dismissed', tr.dismissed,
        'deck_id', tr.deck_id
      ) ORDER BY tr.retention_score ASC) AS topics_snapshot
    FROM public.topic_retention tr
    WHERE tr.class_id IN (SELECT id FROM owned_classes)
    GROUP BY tr.class_id
  ),
  sess AS (
    SELECT class_id, COUNT(*)::int AS session_count, MAX(completed_at) AS last_activity_at
    FROM public.sessions
    WHERE class_id IN (SELECT id FROM owned_classes)
    GROUP BY class_id
  ),
  mem AS (
    SELECT class_id, COUNT(*)::int AS member_count
    FROM public.class_members
    WHERE class_id IN (SELECT id FROM owned_classes)
    GROUP BY class_id
  ),
  parts AS (
    SELECT s.class_id, COUNT(DISTINCT sp.student_name)::int AS unique_students
    FROM public.session_participants sp
    JOIN public.sessions s ON s.id = sp.session_id
    WHERE s.class_id IN (SELECT id FROM owned_classes)
    GROUP BY s.class_id
  ),
  students AS (
    SELECT
      stp.class_id,
      jsonb_agg(jsonb_build_object(
        'student_id', stp.student_id,
        'student_name', stp.student_name,
        'topic', stp.topic,
        'retention_score', stp.retention_score,
        'total_questions', stp.total_questions,
        'correct_answers', stp.correct_answers,
        'last_reviewed_at', stp.last_reviewed_at
      ) ORDER BY stp.last_reviewed_at DESC NULLS LAST) AS students_snapshot
    FROM public.student_topic_progress stp
    WHERE stp.class_id IN (SELECT id FROM owned_classes)
    GROUP BY stp.class_id
  )
  SELECT
    c.id AS class_id,
    c.name AS class_name,
    c.grade AS class_grade,
    c.subject AS class_subject,
    c.class_code AS class_code,
    COALESCE(ret.retention_avg, 0)::numeric AS retention_avg,
    CASE
      WHEN COALESCE(mem.member_count, 0) > 0
        THEN ROUND((COALESCE(parts.unique_students, 0)::numeric / mem.member_count::numeric) * 100, 1)
      ELSE 0
    END AS participation_pct,
    COALESCE(sess.session_count, 0) AS session_count,
    COALESCE(mem.member_count, 0) AS member_count,
    COALESCE(parts.unique_students, 0) AS unique_students,
    sess.last_activity_at,
    COALESCE(ret.topics_snapshot, '[]'::jsonb) AS topics_snapshot,
    COALESCE(students.students_snapshot, '[]'::jsonb) AS students_snapshot
  FROM owned_classes c
  LEFT JOIN ret ON ret.class_id = c.id
  LEFT JOIN sess ON sess.class_id = c.id
  LEFT JOIN mem ON mem.class_id = c.id
  LEFT JOIN parts ON parts.class_id = c.id
  LEFT JOIN students ON students.class_id = c.id
  ORDER BY c.name;
$$;

REVOKE ALL ON FUNCTION "public"."analytics_overview"() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."analytics_overview"() TO "authenticated";

COMMENT ON FUNCTION "public"."analytics_overview"() IS
  'Analytics Studio F0: cross-class snapshot for the authenticated teacher. Replaces the N+1 in useDirector.js. SECURITY DEFINER + teacher_id = auth.uid() implicit via owned_classes CTE.';
