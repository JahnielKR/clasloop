-- ─── Analytics Studio F0 · Materialized Views ──────────────────────────
-- Pre-aggregate `responses` to make the time-series RPC affordable.
-- IMPORTANT: NO RLS. Never expose these MVs directly to clients.
-- They are read ONLY via SECURITY DEFINER RPCs (see migrations 65/66/67).

-- mv_class_daily — clase × día
-- Powers: class_timeseries(p_granularity='day'|'week') + analytics_overview KPIs.
CREATE MATERIALIZED VIEW IF NOT EXISTS "public"."mv_class_daily" AS
SELECT
  s.class_id,
  s.teacher_id,
  (date_trunc('day', r.created_at))::date AS day,
  COUNT(*)::int AS responses_total,
  SUM(CASE WHEN r.is_correct THEN 1 ELSE 0 END)::int AS responses_correct,
  SUM(r.points)::int AS points_sum,
  SUM(r.max_points)::int AS max_points_sum,
  COALESCE(AVG(r.time_taken_ms)::int, 0) AS avg_time_ms,
  COUNT(DISTINCT r.participant_id)::int AS unique_participants
FROM "public"."responses" r
JOIN "public"."sessions" s ON s.id = r.session_id
GROUP BY s.class_id, s.teacher_id, (date_trunc('day', r.created_at))::date;

-- UNIQUE index is REQUIRED for REFRESH MATERIALIZED VIEW CONCURRENTLY.
CREATE UNIQUE INDEX IF NOT EXISTS "mv_class_daily_uniq"
  ON "public"."mv_class_daily" (class_id, day);

-- Lookup index for the common per-class window query.
CREATE INDEX IF NOT EXISTS "mv_class_daily_teacher_day"
  ON "public"."mv_class_daily" (teacher_id, day DESC);

-- Lock down direct access. Authenticated users have no role here;
-- they go through SECURITY DEFINER RPCs.
REVOKE ALL ON "public"."mv_class_daily" FROM PUBLIC;
REVOKE ALL ON "public"."mv_class_daily" FROM "authenticated";
REVOKE ALL ON "public"."mv_class_daily" FROM "anon";

-- ─────────────────────────────────────────────────────────────────────

-- mv_class_topic_weekly — clase × tema × semana
-- Powers: per-topic mini-trends (F2/F3). Built in F0 because the schema
-- is set and the cron job from migration 68 refreshes both MVs together.
CREATE MATERIALIZED VIEW IF NOT EXISTS "public"."mv_class_topic_weekly" AS
SELECT
  s.class_id,
  s.teacher_id,
  s.topic,
  (date_trunc('week', r.created_at))::date AS week,
  COUNT(*)::int AS responses_total,
  SUM(CASE WHEN r.is_correct THEN 1 ELSE 0 END)::int AS responses_correct,
  SUM(r.points)::int AS points_sum,
  SUM(r.max_points)::int AS max_points_sum
FROM "public"."responses" r
JOIN "public"."sessions" s ON s.id = r.session_id
GROUP BY s.class_id, s.teacher_id, s.topic, (date_trunc('week', r.created_at))::date;

CREATE UNIQUE INDEX IF NOT EXISTS "mv_class_topic_weekly_uniq"
  ON "public"."mv_class_topic_weekly" (class_id, topic, week);

CREATE INDEX IF NOT EXISTS "mv_class_topic_weekly_teacher_week"
  ON "public"."mv_class_topic_weekly" (teacher_id, week DESC);

REVOKE ALL ON "public"."mv_class_topic_weekly" FROM PUBLIC;
REVOKE ALL ON "public"."mv_class_topic_weekly" FROM "authenticated";
REVOKE ALL ON "public"."mv_class_topic_weekly" FROM "anon";
