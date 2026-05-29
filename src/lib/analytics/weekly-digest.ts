// ─── src/lib/analytics/weekly-digest.ts ────────────────────────────────
// Agregación pura para el email digest semanal + render del HTML.
// El endpoint api/analytics-digest la llama con datos traídos por
// service-role (sin auth.uid() en un cron). Sin React, sin Supabase.
//
// NOTA: reusa el espíritu de pulse-of-today pero para la ventana semanal
// y agrega el render de HTML (el email es Spanish-only en F7).

export interface DigestInputs {
  sessions: any[];
  responses: any[];
  classes: any[];
}

export interface WeeklyDigest {
  sessions_count: number;
  responses_count: number;
  pct_correct: number | null;
  top_class: { name: string; response_count: number } | null;
  has_activity: boolean;
}

export function computeWeeklyDigest(inputs: DigestInputs): WeeklyDigest {
  const sessions = inputs.sessions || [];
  const responses = inputs.responses || [];
  const classes = inputs.classes || [];

  let sumPoints = 0;
  let sumMax = 0;
  const byClass = new Map<string, number>();
  for (const r of responses) {
    if (Number.isFinite(Number(r?.points))) sumPoints += Number(r.points);
    if (Number.isFinite(Number(r?.max_points))) sumMax += Number(r.max_points);
    if (r?.class_id) byClass.set(r.class_id, (byClass.get(r.class_id) || 0) + 1);
  }
  const pct = sumMax > 0 ? Math.round((sumPoints / sumMax) * 100) : null;

  let topClass: WeeklyDigest["top_class"] = null;
  if (byClass.size > 0) {
    const [id, count] = [...byClass.entries()].sort((a, b) => b[1] - a[1])[0];
    const cls = classes.find((c) => c.id === id);
    topClass = { name: cls?.name || id, response_count: count };
  }

  return {
    sessions_count: sessions.length,
    responses_count: responses.length,
    pct_correct: pct,
    top_class: topClass,
    has_activity: sessions.length > 0 || responses.length > 0,
  };
}

function esc(s: any): string {
  return String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c),
  );
}

export function renderDigestHtml(args: { teacherName: string; digest: WeeklyDigest }): string {
  const { teacherName, digest } = args;
  const name = esc(teacherName || "");

  if (!digest.has_activity) {
    return `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
  <h2 style="color:#7c3aed;margin:0 0 12px">Tu semana en Clasloop</h2>
  <p>Hola ${name}, esta semana sin actividad en tus clases. Cuando lances una sesión, acá te resumimos cómo le fue a tus estudiantes.</p>
  <p style="color:#71717a;font-size:13px;margin-top:20px">— Cleo, tu analista en Clasloop</p>
</div>`;
  }

  const rows = [
    ["Sesiones", String(digest.sessions_count)],
    ["Respuestas", String(digest.responses_count)],
    ["% correcto", digest.pct_correct != null ? `${digest.pct_correct}%` : "—"],
    ["Clase más activa", digest.top_class ? esc(digest.top_class.name) : "—"],
  ];
  const rowsHtml = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 0;color:#71717a">${k}</td><td style="padding:6px 0;font-weight:700;text-align:right">${v}</td></tr>`,
    )
    .join("");

  return `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
  <h2 style="color:#7c3aed;margin:0 0 4px">Tu semana en Clasloop</h2>
  <p style="margin:0 0 16px;color:#52525b">Hola ${name}, esto pasó en tus clases esta semana:</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px">${rowsHtml}</table>
  <p style="color:#71717a;font-size:13px;margin-top:20px">— Cleo, tu analista en Clasloop</p>
</div>`;
}
