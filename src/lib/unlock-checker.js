// ─── Avatar Unlock Checker ──────────────────────────────────────────────────
// Evaluates each unlockable avatar's condition against the student's actual
// progress and grants any newly-met unlocks by inserting into student_unlocks.
//
// Designed to be called after each completed session, but safe to call any
// time (it's idempotent — already-unlocked avatars are skipped).
//
// Returns the list of NEWLY unlocked avatar objects so the UI can celebrate.
import { supabase } from "./supabase";
import { AVATARS } from "../components/Avatars";

// ─── Compute student stats ─────────────────────────────────────────────────
// Pulls everything we need to evaluate every unlock condition in one place.
// Returns null if the student has no participation yet.
export async function getStudentStats(studentId) {
  if (!studentId) return null;

  // Sessions the student joined (with their dates so we can compute streaks).
  const { data: parts } = await supabase
    .from("session_participants")
    .select("session_id, joined_at")
    .eq("student_id", studentId);

  const sessions = parts || [];
  const sessionsCount = sessions.length;

  // All responses for those participations.
  const partIds = sessions.map(p => p.session_id ? `(${p.session_id})` : null).filter(Boolean);
  let answersCorrect = 0;
  let perfectSessions = 0;
  if (sessions.length > 0) {
    // Aggregate per session: pull responses keyed by participant_id (we need
    // participant_id to link back, which `session_participants` doesn't hold
    // directly, so fetch by session_id + student_name OR by joining via id).
    const sessionIds = sessions.map(p => p.session_id);
    const { data: responses } = await supabase
      .from("responses")
      .select("session_id, participant_id, is_correct")
      .in("session_id", sessionIds);

    // Re-pull participants WITH ids to know which participant rows belong to us.
    const { data: myParts } = await supabase
      .from("session_participants")
      .select("id, session_id")
      .eq("student_id", studentId);

    const myPartIds = new Set((myParts || []).map(p => p.id));
    const myResponses = (responses || []).filter(r => myPartIds.has(r.participant_id));
    answersCorrect = myResponses.filter(r => r.is_correct === true).length;

    // Per-session perfect: every response is correct AND there's at least one.
    const bySession = {};
    for (const r of myResponses) {
      if (!bySession[r.session_id]) bySession[r.session_id] = { total: 0, correct: 0 };
      bySession[r.session_id].total++;
      if (r.is_correct === true) bySession[r.session_id].correct++;
    }
    perfectSessions = Object.values(bySession).filter(s => s.total > 0 && s.correct === s.total).length;
  }

  // Topic mastery — count topics with retention >= 70 in student_topic_progress.
  const { data: progress } = await supabase
    .from("student_topic_progress")
    .select("retention_score")
    .eq("student_id", studentId);

  const topicsMastered = (progress || []).filter(p => (p.retention_score || 0) >= 70).length;

  const avgRetention = (progress && progress.length > 0)
    ? Math.round(progress.reduce((s, p) => s + (p.retention_score || 0), 0) / progress.length)
    : 0;

  // Streak — consecutive days with at least one participation, ending today (or yesterday).
  const streakDays = computeStreakDays(sessions);

  // Comeback — biggest gap (in days) between any two consecutive sessions where
  // the LATEST session is recent (within 24h). Lets us reward someone who just
  // came back after a long break.
  const comebackDays = computeComebackDays(sessions);

  return {
    sessionsCount,
    streakDays,
    perfectSessions,
    answersCorrect,
    topicsMastered,
    avgRetention,
    comebackDays,
  };
}

// ─── Streak logic ──────────────────────────────────────────────────────────
// Counts consecutive calendar days (in the student's local time) ending on
// today OR yesterday (to be lenient — finishing late on day N still counts
// when checked on day N+1 morning). Returns 0 if the most recent session is
// older than yesterday.
function computeStreakDays(sessions) {
  if (!sessions || sessions.length === 0) return 0;

  // Reduce to a set of unique YYYY-MM-DD strings.
  const days = new Set(
    sessions
      .map(s => s.joined_at ? new Date(s.joined_at).toISOString().slice(0, 10) : null)
      .filter(Boolean)
  );
  if (days.size === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  // The streak must end today or yesterday — otherwise it's broken.
  let cursor;
  if (days.has(todayStr)) cursor = today;
  else if (days.has(yesterdayStr)) cursor = yesterday;
  else return 0;

  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// Returns the largest gap (days) between adjacent participations IF the most
// recent is within the last 24h. Otherwise 0 (the student isn't actually back).
function computeComebackDays(sessions) {
  if (!sessions || sessions.length < 2) return 0;
  const sorted = [...sessions]
    .map(s => s.joined_at ? new Date(s.joined_at) : null)
    .filter(Boolean)
    .sort((a, b) => a - b);
  if (sorted.length < 2) return 0;

  const last = sorted[sorted.length - 1];
  const now = new Date();
  if ((now - last) > 24 * 60 * 60 * 1000) return 0; // not actually back

  // Gap before the latest session.
  const prev = sorted[sorted.length - 2];
  return Math.floor((last - prev) / (1000 * 60 * 60 * 24));
}

// ─── Evaluate all conditions and grant unlocks ────────────────────────────
// Returns array of NEWLY unlocked avatar objects (the catalog entries).
export async function checkAndGrantUnlocks(studentId) {
  if (!studentId) return [];

  const stats = await getStudentStats(studentId);
  if (!stats) return [];

  // Already unlocked → skip.
  const { data: existing } = await supabase
    .from("student_unlocks")
    .select("avatar_id")
    .eq("student_id", studentId);
  const alreadyUnlocked = new Set((existing || []).map(u => u.avatar_id));

  const newlyUnlocked = [];

  for (const av of AVATARS) {
    if (av.starter) continue;        // always available
    if (!av.unlock) continue;        // no condition defined
    if (alreadyUnlocked.has(av.id)) continue;
    if (meetsCondition(av.unlock, stats)) {
      newlyUnlocked.push(av);
    }
  }

  if (newlyUnlocked.length === 0) return [];

  // Insert all new unlocks. Use upsert-like ignore-conflicts behaviour by
  // catching unique-constraint errors per row.
  const rows = newlyUnlocked.map(av => ({
    student_id: studentId,
    avatar_id: av.id,
  }));
  const { error } = await supabase.from("student_unlocks").insert(rows);
  if (error) {
    // If batch fails, try one by one (could be a single duplicate causing it).
    const succeeded = [];
    for (const row of rows) {
      const { error: e } = await supabase.from("student_unlocks").insert(row);
      if (!e) succeeded.push(row.avatar_id);
    }
    return newlyUnlocked.filter(av => succeeded.includes(av.id));
  }

  return newlyUnlocked;
}

function meetsCondition(unlock, stats) {
  switch (unlock.type) {
    case "sessions":  return stats.sessionsCount   >= unlock.count;
    case "streak":    return stats.streakDays      >= unlock.days;
    case "perfect":   return stats.perfectSessions >= unlock.count;
    case "answers":   return stats.answersCorrect  >= unlock.count;
    case "topics":    return stats.topicsMastered  >= unlock.count;
    case "comeback":  return stats.comebackDays    >= unlock.days;
    case "retention": return stats.avgRetention    >= unlock.min;
    default: return false;
  }
}

// ─── Convenience for UI: list all unlocked ids for a student ──────────────
export async function getUnlockedIds(studentId) {
  if (!studentId) return [];
  const { data } = await supabase
    .from("student_unlocks")
    .select("avatar_id")
    .eq("student_id", studentId);
  return (data || []).map(u => u.avatar_id);
}
