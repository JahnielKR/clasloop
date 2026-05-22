// ─── /api/session-insight — read + dismiss ─────────────────────────────
//
// GET: returns the session insight (status, weak_points, dismissed_at)
//      for the given sessionId. If no row exists yet (the webhook hasn't
//      created one), returns { status: 'pending' } so the frontend keeps
//      polling.
//
// PATCH: marks the insight as dismissed. The frontend hides the bar
//        immediately and won't render it on reload.
//
// We do NOT generate insights here — that's the Edge Function's job.
// This endpoint is purely the read/dismiss path.

import { requireAuth } from "./_lib/auth.js";

export default async function handler(req, res) {
  // PR 142b: JWT validation via api/_lib/auth.js (SERVICE_KEY client +
  // getUser). This endpoint is teacher-by-ownership (checked below via
  // session→deck→class), not by profile.role, so it uses requireAuth.
  const auth = await requireAuth(req, res);
  if (!auth) return; // error response already sent
  const supabaseAdmin = auth.supabase;
  const userId = auth.user.id;

  // ── Extract sessionId ──
  const sessionId = req.query.sessionId || req.query.session_id;
  if (!sessionId) {
    return res.status(400).json({ error: "missing_session_id" });
  }

  // ── Verify the teacher owns this session ──
  // (Going through deck → class → teacher_id.)
  const { data: sess } = await supabaseAdmin
    .from("sessions")
    .select("id, deck_id")
    .eq("id", sessionId)
    .single();
  if (!sess) {
    return res.status(404).json({ error: "session_not_found" });
  }
  const { data: deck } = await supabaseAdmin
    .from("decks")
    .select("id, class_id")
    .eq("id", sess.deck_id)
    .single();
  if (!deck) {
    return res.status(404).json({ error: "deck_not_found" });
  }
  const { data: cls } = await supabaseAdmin
    .from("classes")
    .select("teacher_id")
    .eq("id", deck.class_id)
    .single();
  if (!cls || cls.teacher_id !== userId) {
    return res.status(403).json({ error: "not_authorized" });
  }

  // ── GET ──
  if (req.method === "GET") {
    const { data: insight } = await supabaseAdmin
      .from("session_insights")
      .select("status, weak_points, dismissed_at, generated_at, error_message")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (!insight) {
      // Row not yet created — webhook is in flight. Tell the client
      // to keep polling.
      return res.status(200).json({ status: "pending" });
    }

    return res.status(200).json(insight);
  }

  // ── PATCH (dismiss) ──
  if (req.method === "PATCH") {
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    if (!body?.dismiss) {
      return res.status(400).json({ error: "missing_dismiss_field" });
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("session_insights")
      .update({ dismissed_at: new Date().toISOString() })
      .eq("session_id", sessionId)
      .select("status, weak_points, dismissed_at")
      .single();

    if (updateErr) {
      return res.status(500).json({ error: "update_failed", detail: updateErr.message });
    }

    return res.status(200).json(updated);
  }

  return res.status(405).json({ error: "method_not_allowed" });
}
