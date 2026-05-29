// ─── api/analytics-digest.js ────────────────────────────────────────────
// F7 Analytics Studio: digest semanal por email. Lo dispara Vercel Cron
// (vercel.json crons → lunes 8am UTC). NO tiene auth de usuario — corre
// como cron, así que:
//   1. Se protege con CRON_SECRET (header Authorization: Bearer <secret>).
//   2. Usa SERVICE_KEY para leer todos los docentes con weekly_digest=true
//      y armar el resumen de cada uno con queries directas (sin RPCs, que
//      dependen de auth.uid()).
//   3. Envía vía Resend (HTTP API directa, sin SDK).
//
// Env requeridas en Vercel:
//   SUPABASE_URL (o VITE_SUPABASE_URL), SUPABASE_SERVICE_KEY (o
//   SUPABASE_SERVICE_ROLE_KEY) — mismo fallback que api/_lib/auth.js,
//   RESEND_API_KEY (NUEVA), CRON_SECRET (NUEVA),
//   DIGEST_FROM_EMAIL (opcional; default onboarding@resend.dev).
//
// El email del docente vive en auth.users (profiles NO tiene email —
// verificado en prod), así que se obtiene con auth.admin.getUserById.
//
// Las dos funciones de agregación + render están INLINE acá (no importadas
// de src/) porque los Vercel functions no resuelven imports .ts de src/.
// La fuente de verdad testeada es src/lib/analytics/weekly-digest.ts —
// si cambia la lógica, sincronizar ambas.

import { createClient } from "@supabase/supabase-js";

// ── Inline de weekly-digest.ts (ver nota en el header) ──
function computeWeeklyDigest({ sessions = [], responses = [], classes = [] }) {
  let sumPoints = 0;
  let sumMax = 0;
  const byClass = new Map();
  for (const r of responses) {
    if (Number.isFinite(Number(r?.points))) sumPoints += Number(r.points);
    if (Number.isFinite(Number(r?.max_points))) sumMax += Number(r.max_points);
    if (r?.class_id) byClass.set(r.class_id, (byClass.get(r.class_id) || 0) + 1);
  }
  const pct = sumMax > 0 ? Math.round((sumPoints / sumMax) * 100) : null;

  let topClass = null;
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

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c),
  );
}

function renderDigestHtml({ teacherName, digest }) {
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

export default async function handler(req, res) {
  // 1. Auth gate — Vercel Cron manda Authorization: Bearer <CRON_SECRET>.
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || req.headers.Authorization || "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY || !RESEND_API_KEY) {
    return res.status(500).json({ error: "server_misconfigured" });
  }
  const fromEmail = process.env.DIGEST_FROM_EMAIL || "Clasloop <onboarding@resend.dev>";

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    // 2. Docentes que optaron por el digest.
    const { data: optedIn, error: nsErr } = await supabase
      .from("notification_settings")
      .select("user_id")
      .eq("weekly_digest", true);
    if (nsErr) throw nsErr;
    if (!optedIn || optedIn.length === 0) {
      return res.status(200).json({ sent: 0, note: "no opted-in teachers" });
    }
    const ids = optedIn.map((r) => r.user_id);

    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("id", ids)
      .eq("role", "teacher");
    if (pErr) throw pErr;

    let sent = 0;
    const failures = [];

    for (const prof of profiles || []) {
      try {
        // El email vive en auth.users — lo traemos con el admin API.
        const { data: authUser, error: auErr } = await supabase.auth.admin.getUserById(prof.id);
        const email = authUser?.user?.email;
        if (auErr || !email) {
          failures.push({ id: prof.id, error: "no_email" });
          continue;
        }

        // Sessions de la semana del docente.
        const { data: sessions } = await supabase
          .from("sessions")
          .select("id, class_id, status, created_at")
          .eq("teacher_id", prof.id)
          .gte("created_at", weekAgo);

        const sessionIds = (sessions || []).map((s) => s.id);
        let responses = [];
        if (sessionIds.length > 0) {
          const { data: rs } = await supabase
            .from("responses")
            .select("session_id, points, max_points, is_correct, created_at")
            .in("session_id", sessionIds)
            .gte("created_at", weekAgo);
          const byId = new Map((sessions || []).map((s) => [s.id, s]));
          responses = (rs || []).map((r) => ({
            ...r,
            class_id: byId.get(r.session_id)?.class_id || null,
          }));
        }

        const { data: classes } = await supabase
          .from("classes")
          .select("id, name")
          .eq("teacher_id", prof.id);

        const digest = computeWeeklyDigest({
          sessions: sessions || [],
          responses,
          classes: classes || [],
        });
        const html = renderDigestHtml({ teacherName: prof.full_name || "", digest });

        // 3. Enviar vía Resend (HTTP directa).
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: email,
            subject: "Tu semana en Clasloop",
            html,
          }),
        });
        if (resp.ok) sent += 1;
        else failures.push({ id: prof.id, status: resp.status });
      } catch (e) {
        failures.push({ id: prof.id, error: String(e?.message || e) });
      }
    }

    return res.status(200).json({ sent, failures: failures.length, detail: failures.slice(0, 5) });
  } catch (err) {
    console.error("[analytics-digest] failed:", err);
    return res.status(500).json({ error: "digest_failed" });
  }
}
