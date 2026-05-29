-- ─── Analytics Studio F7 · notification_settings table ─────────────────
-- Persiste las preferencias de notificación del docente que hoy viven
-- sólo en local state de Settings.jsx ("stored locally for now"). El
-- toggle `weekly` controla si recibe el digest semanal (api/analytics-digest).
-- RLS por teacher_id. Una fila por usuario (PK = user id).

CREATE TABLE IF NOT EXISTS "public"."notification_settings" (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifs boolean NOT NULL DEFAULT true,
  push_notifs boolean NOT NULL DEFAULT true,
  weekly_digest boolean NOT NULL DEFAULT true,
  study_reminders boolean NOT NULL DEFAULT true,
  streak_reminders boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "public"."notification_settings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_settings_select_own"
  ON "public"."notification_settings" FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notification_settings_insert_own"
  ON "public"."notification_settings" FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notification_settings_update_own"
  ON "public"."notification_settings" FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE "public"."notification_settings" IS
  'Analytics Studio F7: preferencias de notificación del docente. weekly_digest gobierna el email semanal (api/analytics-digest, leído server-side con service-role). RLS por user_id.';
