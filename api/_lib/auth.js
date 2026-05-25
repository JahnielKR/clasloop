// ─── api/_lib/auth.js ────────────────────────────────────────────────────
//
// PR 142b (M8): shared auth + rate-limit helpers for the serverless endpoints.
// The `_lib/` prefix keeps Vercel from publishing this as a route.
//
// Preserves the exact pattern the three endpoints already used:
//   - SERVICE_KEY admin client (bypasses RLS — the endpoints' ownership
//     queries depend on it), validated via supabase.auth.getUser(token).
//   - profile.role === 'teacher' gate.
//   - DB-based daily rate limit on ai_generations (fail-open).
// Error envelopes are snake_case (unified in PR 142).

import { createClient } from "@supabase/supabase-js";

function jsonError(res, status, code, extra = {}) {
  return res.status(status).json({ error: code, ...extra });
}

/**
 * Validate the Bearer JWT. Returns { user, supabase } (a SERVICE_KEY admin
 * client the caller reuses) on success; on failure sends the error response
 * and returns null.
 */
export async function requireAuth(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    jsonError(res, 500, "server_misconfigured");
    return null;
  }

  const authHeader = req.headers.authorization || req.headers.Authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    jsonError(res, 401, "missing_auth");
    return null;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    jsonError(res, 401, "invalid_auth");
    return null;
  }
  return { user: data.user, supabase };
}

/**
 * requireAuth + profile.role === 'teacher'.
 * Returns { user, supabase, profile } or null (response already sent).
 */
export async function requireTeacher(req, res) {
  const auth = await requireAuth(req, res);
  if (!auth) return null;

  const { data: profile, error } = await auth.supabase
    .from("profiles")
    .select("id, role")
    .eq("id", auth.user.id)
    .single();
  if (error || !profile) {
    jsonError(res, 401, "profile_not_found");
    return null;
  }
  if (profile.role !== "teacher") {
    jsonError(res, 403, "teacher_required");
    return null;
  }
  return { ...auth, profile };
}

/**
 * DB-based per-teacher daily rate limit on ai_generations.
 * Fail-open: if the count query errors, allow (don't block the user on our own
 * infra hiccup). Returns true if OK, false if limited (and sends 429).
 * `message` is passed through so each endpoint keeps its own user-facing text.
 *
 * `opts` scopes which rows count toward the limit. Each AI feature gets its own
 * budget instead of sharing one pool:
 *   - activityType:        count ONLY rows with this activity_type (the image
 *                          endpoint uses 'image_generation').
 *   - excludeActivityType: count every row EXCEPT this activity_type (question
 *                          generation excludes 'image_generation' so a deck's
 *                          AI images don't eat into its question quota).
 * Omitting both preserves the original "count all rows" behavior.
 */
export async function requireDailyRateLimit(res, supabase, userId, limitPerDay, message, opts = {}) {
  const { activityType, excludeActivityType } = opts;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let query = supabase
    .from("ai_generations")
    .select("id", { count: "exact", head: true })
    .eq("teacher_id", userId)
    .gte("created_at", since);
  if (activityType) query = query.eq("activity_type", activityType);
  if (excludeActivityType) query = query.neq("activity_type", excludeActivityType);

  const { count, error } = await query;

  if (error) {
    console.error("Rate limit query failed:", error);
    return true; // fail-open
  }
  if ((count ?? 0) >= limitPerDay) {
    jsonError(res, 429, "rate_limited", { message });
    return false;
  }
  return true;
}
