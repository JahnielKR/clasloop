-- ─── Analytics Studio F7 · analytics_reports table ─────────────────────
-- Reportes guardados del docente (composer de /school/reports). El "model"
-- jsonb guarda {scope, period, sections[]} — forward-compatible con un
-- drag-drop builder futuro sin migración. RLS estándar por teacher_id
-- (no SECURITY DEFINER: es CRUD directo del dueño).

CREATE TABLE IF NOT EXISTS "public"."analytics_reports" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  scope text NOT NULL DEFAULT 'class',
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  period text,
  model jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "public"."analytics_reports" ENABLE ROW LEVEL SECURITY;

-- El docente sólo ve / maneja sus propios reportes.
CREATE POLICY "analytics_reports_select_own"
  ON "public"."analytics_reports" FOR SELECT
  USING (teacher_id = auth.uid());

CREATE POLICY "analytics_reports_insert_own"
  ON "public"."analytics_reports" FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "analytics_reports_update_own"
  ON "public"."analytics_reports" FOR UPDATE
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "analytics_reports_delete_own"
  ON "public"."analytics_reports" FOR DELETE
  USING (teacher_id = auth.uid());

CREATE INDEX IF NOT EXISTS analytics_reports_teacher_idx
  ON "public"."analytics_reports" (teacher_id, created_at DESC);

COMMENT ON TABLE "public"."analytics_reports" IS
  'Analytics Studio F7: reportes guardados del docente. model jsonb = {scope, period, sections[]}. RLS por teacher_id.';
