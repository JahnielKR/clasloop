// Helpers to count and load active (non-dismissed) notifications. Used by
// both App.jsx (to paint the sidebar badge) and Notifications.jsx (to render
// the list). Source of truth for the dismissed set lives in localStorage so
// dismissals persist across reloads and sync between the two consumers.

import { supabase } from "./supabase";
import { getReviewSuggestions } from "./spaced-repetition";

const DISMISSED_KEY = "clasloop_notifs_dismissed";

export function loadDismissed() {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
}

export function saveDismissed(map) {
  try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(map)); } catch (_) {}
}

// Count of free-text responses pending teacher review across all sessions
// of a teacher. Powers the badge next to the "To review" sidebar item.
//
// Returns a number (0 if nothing pending or on error). RLS already restricts
// what responses the teacher can see so the COUNT here is naturally scoped.
// We use a HEAD-style count(*) via the supabase-js exact head pattern so
// no rows travel — just the total.
export async function countPendingReviewsForTeacher(teacherId) {
  if (!teacherId) return 0;
  try {
    // First fetch session ids of this teacher. Without that scoping the
    // count would have to traverse all responses RLS-allows, which is
    // already teacher-scoped but explicit is better here. We cap to a
    // generous limit since teachers rarely have thousands of sessions and
    // we only need ids.
    const { data: sessions, error: sErr } = await supabase
      .from("sessions")
      .select("id")
      .eq("teacher_id", teacherId);
    if (sErr || !sessions || sessions.length === 0) return 0;
    const sessionIds = sessions.map((s) => s.id);

    const { count, error } = await supabase
      .from("responses")
      .select("id", { count: "exact", head: true })
      .in("session_id", sessionIds)
      .eq("needs_review", true)
      .is("teacher_grade", null);

    if (error) return 0;
    return count || 0;
  } catch (_) {
    return 0;
  }
}

// Fetch graded free-text responses for a student, grouped by session.
// Used by Notifications.jsx to render "Tu sesión X tiene feedback nuevo"
// notifications. Returns an array of { sessionId, sessionTopic, classId,
// className, gradedCount, latestGradedAt }.
//
// Joining note: responses don't have a direct student_id — they link via
// participant_id → session_participants.student_id. We use an inner join
// on participants and filter on participant.student_id = the current
// user. RLS on responses already lets the student read their own rows
// (see phase4_turn2_responses_rls.sql), so this query is naturally
// scoped, but we add the filter for clarity.
//
// We keep this in lib (not Notifications.jsx) so the same shape can be
// reused later by other pages (e.g. /sessions/:id/my-results).
export async function fetchGradedSessionsForStudent(studentId) {
  if (!studentId) return [];
  try {
    const { data, error } = await supabase
      .from("responses")
      .select(`
        session_id,
        graded_at,
        participant:session_participants!inner ( student_id ),
        sessions ( id, topic, class_id, classes ( name ) )
      `)
      .eq("participant.student_id", studentId)
      .eq("needs_review", true)
      .not("teacher_grade", "is", null)
      .order("graded_at", { ascending: false });
    if (error || !data) return [];

    // Group by session_id, take latest graded_at and count rows.
    const bySession = new Map();
    for (const row of data) {
      const sid = row.session_id;
      if (!sid) continue;
      const existing = bySession.get(sid);
      if (existing) {
        existing.gradedCount += 1;
        // data is already ordered desc by graded_at, so the first hit
        // is already the latest — no need to update latestGradedAt.
      } else {
        bySession.set(sid, {
          sessionId: sid,
          sessionTopic: row.sessions?.topic || "",
          classId: row.sessions?.class_id || null,
          className: row.sessions?.classes?.name || "",
          gradedCount: 1,
          latestGradedAt: row.graded_at,
        });
      }
    }
    return Array.from(bySession.values());
  } catch (_) {
    return [];
  }
}

// Best-effort count of currently-visible notifications for a given profile.
// Mirrors the logic in Notifications.jsx but only returns ids — the page
// itself does the full enrichment for rendering. Returns the visible
// (non-dismissed) ids, so callers can `.length` for a badge or use the set
// for cross-checks.
export async function countVisibleNotifications(profile) {
  if (!profile) return 0;
  const dismissed = loadDismissed();
  const ids = [];

  if (profile.role === "teacher") {
    const { data: classes } = await supabase
      .from("classes")
      .select("id")
      .eq("teacher_id", profile.id);

    if (classes && classes.length > 0) {
      // Review suggestions per class (one notif per class with pending reviews)
      for (const cls of classes) {
        const sug = await getReviewSuggestions(cls.id);
        if (sug && sug.length > 0) ids.push(`review-${cls.id}`);
      }

      // Recent completed sessions
      const { data: recentSessions } = await supabase.from("sessions")
        .select("id")
        .eq("teacher_id", profile.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(5);
      if (recentSessions) {
        for (const s of recentSessions) ids.push(`session-${s.id}`);
      }
    } else {
      ids.push("welcome");
    }
  } else {
    // Student: lobby sessions + streak + graded sessions + welcome fallback
    const { data: activeSessions } = await supabase.from("sessions")
      .select("id")
      .eq("status", "lobby")
      .order("created_at", { ascending: false })
      .limit(3);
    if (activeSessions) {
      for (const s of activeSessions) ids.push(`join-${s.id}`);
    }
    if ((profile.streak || 0) > 0) ids.push("streak");
    // Sessions where the teacher has graded at least one of the student's
    // free-text answers. One notif per session, ids match what
    // Notifications.jsx generates so dismissal stays in sync.
    const graded = await fetchGradedSessionsForStudent(profile.id);
    for (const g of graded) ids.push(`graded-${g.sessionId}`);
    if (ids.length === 0) ids.push("welcome-student");
  }

  return ids.filter(id => !dismissed[id]).length;
}
