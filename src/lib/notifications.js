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
    // Student: lobby sessions + streak + welcome fallback
    const { data: activeSessions } = await supabase.from("sessions")
      .select("id")
      .eq("status", "lobby")
      .order("created_at", { ascending: false })
      .limit(3);
    if (activeSessions) {
      for (const s of activeSessions) ids.push(`join-${s.id}`);
    }
    if ((profile.streak || 0) > 0) ids.push("streak");
    if (ids.length === 0) ids.push("welcome-student");
  }

  return ids.filter(id => !dismissed[id]).length;
}
