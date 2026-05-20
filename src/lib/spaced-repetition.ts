// ─── SM-2 Spaced Repetition Algorithm for Clasloop ──────────────────────
//
// Based on the SuperMemo SM-2 algorithm, adapted for classroom use
// https://en.wikipedia.org/wiki/SuperMemo#Algorithm_SM-2
//
// Key difference from traditional SM-2:
// - We track per-TOPIC retention, not per-flashcard
// - A "review" is a session (warmup/exit ticket) with multiple questions
// - The score is based on % correct across all questions in that topic
// - Works at both class-level and individual student level
//
// PR 84: migrado a TypeScript. Lógica intacta — solo agregamos tipos.

import { supabase } from "./supabase";
import { pickActiveUnit } from "./class-hierarchy";
import type {
  ClassRow,
  UnitRow,
  DeckRow,
  DeckSection,
  SessionRow,
  SessionParticipantRow,
  ResponseRow,
  TopicRetentionRow,
  StudentTopicProgressRow,
} from "./db-types";

// ─── Types ──────────────────────────────────────────────────────────────

/** Quality rating used by the SM-2 algorithm. 0 = total fail, 5 = perfect recall. */
type SM2Quality = 0 | 1 | 2 | 3 | 4 | 5;

/** Inputs for the SM-2 update. All optional except quality. */
interface SM2Inputs {
  easeFactor?: number;
  interval?: number;
  repetition?: number;
  quality: SM2Quality | number;
}

/** Result of running calculateSM2. */
interface SM2Result {
  easeFactor: number;
  interval: number;
  repetition: number;
}

// ─── SM-2 Core Algorithm ────────────────────────────────────────────────
// quality: 0-5 rating of how well the topic was recalled
//   5 = 90-100% correct (perfect)
//   4 = 80-89% correct (good)
//   3 = 70-79% correct (acceptable)
//   2 = 50-69% correct (difficult, needs review)
//   1 = 30-49% correct (poor)
//   0 = 0-29% correct (complete failure)

function percentToQuality(percent: number): SM2Quality {
  if (percent >= 90) return 5;
  if (percent >= 80) return 4;
  if (percent >= 70) return 3;
  if (percent >= 50) return 2;
  if (percent >= 30) return 1;
  return 0;
}

function calculateSM2({
  easeFactor = 2.5,
  interval = 1,
  repetition = 0,
  quality,
}: SM2Inputs): SM2Result {
  let newEF = easeFactor;
  let newInterval = interval;
  let newRep = repetition;

  if (quality >= 3) {
    // Correct response — increase interval
    if (newRep === 0) {
      newInterval = 1;
    } else if (newRep === 1) {
      newInterval = 3;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
    newRep = repetition + 1;
  } else {
    // Incorrect response — reset
    newRep = 0;
    newInterval = 1;
  }

  // Update ease factor
  newEF = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // Ease factor minimum is 1.3
  if (newEF < 1.3) newEF = 1.3;

  // Cap interval at 180 days (6 months)
  if (newInterval > 180) newInterval = 180;

  return {
    easeFactor: Math.round(newEF * 100) / 100,
    interval: newInterval,
    repetition: newRep,
  };
}

// ─── Calculate retention score ──────────────────────────────────────────
// Estimated retention based on time since last review and interval
function calculateRetention(
  lastReviewedAt: string | Date | null | undefined,
  intervalDays: number,
  correctRate: number,
): number {
  if (!lastReviewedAt) return 0;

  const now = new Date();
  const lastReview = new Date(lastReviewedAt);
  const daysSince = Math.max(
    0,
    (now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Forgetting curve: retention = e^(-t/S) where S is stability (interval)
  // Modified to also factor in the last correct rate
  const stability = Math.max(intervalDays, 1);
  const forgettingFactor = Math.exp(-daysSince / stability);
  const baseRetention = correctRate * 100;
  const currentRetention = baseRetention * forgettingFactor;

  return Math.round(Math.max(0, Math.min(100, currentRetention)));
}

// ─── Update topic retention after a session ─────────────────────────────
// PR 28.16: internal — only used inside this file by processSessionResults.

interface UpdateTopicRetentionInput {
  classId: string;
  topic: string;
  subject: string | null;
  totalQuestions: number;
  correctAnswers: number;
  deckId?: string | null;
}

async function updateTopicRetention({
  classId,
  topic,
  subject,
  totalQuestions,
  correctAnswers,
  deckId = null,
}: UpdateTopicRetentionInput): Promise<void> {
  if (totalQuestions === 0) return;

  const correctRate = correctAnswers / totalQuestions;
  const percent = Math.round(correctRate * 100);
  const quality = percentToQuality(percent);

  // Get existing retention data — match by deck_id when available (more reliable),
  // otherwise fall back to topic string for legacy data.
  let existing: TopicRetentionRow | null = null;
  if (deckId) {
    const { data } = await supabase
      .from("topic_retention")
      .select("*")
      .eq("class_id", classId)
      .eq("deck_id", deckId)
      .maybeSingle();
    existing = data as TopicRetentionRow | null;
  }
  if (!existing) {
    const { data } = await supabase
      .from("topic_retention")
      .select("*")
      .eq("class_id", classId)
      .eq("topic", topic)
      .is("deck_id", null)
      .maybeSingle();
    existing = data as TopicRetentionRow | null;
  }

  const now = new Date().toISOString();

  if (existing) {
    // Update existing topic
    const sm2 = calculateSM2({
      easeFactor: existing.ease_factor || 2.5,
      interval: existing.interval_days || 1,
      repetition: existing.session_count || 0,
      quality,
    });

    const newTotal = (existing.total_questions || 0) + totalQuestions;
    const newCorrect = (existing.correct_answers || 0) + correctAnswers;
    const retentionScore = calculateRetention(
      now,
      sm2.interval,
      newCorrect / newTotal,
    );

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + sm2.interval);

    const updates: Record<string, unknown> = {
      retention_score: retentionScore,
      total_questions: newTotal,
      correct_answers: newCorrect,
      session_count: (existing.session_count || 0) + 1,
      last_reviewed_at: now,
      next_review_at: nextReview.toISOString(),
      ease_factor: sm2.easeFactor,
      interval_days: sm2.interval,
    };
    // Backfill deck_id if missing in existing row
    if (deckId && !existing.deck_id) updates.deck_id = deckId;

    await supabase.from("topic_retention").update(updates).eq("id", existing.id);
  } else {
    // Create new topic retention entry
    const sm2 = calculateSM2({ quality });
    const retentionScore = percent;

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + sm2.interval);

    await supabase.from("topic_retention").insert({
      class_id: classId,
      deck_id: deckId,
      topic,
      subject,
      retention_score: retentionScore,
      total_questions: totalQuestions,
      correct_answers: correctAnswers,
      session_count: 1,
      last_reviewed_at: now,
      next_review_at: nextReview.toISOString(),
      ease_factor: sm2.easeFactor,
      interval_days: sm2.interval,
    });
  }
}

// ─── Update student-level retention ─────────────────────────────────────
//
// PR 72: ahora usa el RPC upsert_student_progress en lugar de leer/escribir
// student_topic_progress directo. El RPC valida server-side que el caller
// (auth.uid()) es el profe de la clase.

interface UpdateStudentRetentionInput {
  classId: string;
  studentName: string;
  studentId: string | null;
  topic: string;
  totalQuestions: number;
  correctAnswers: number;
}

export async function updateStudentRetention({
  classId,
  studentName,
  studentId,
  topic,
  totalQuestions,
  correctAnswers,
}: UpdateStudentRetentionInput): Promise<void> {
  if (totalQuestions === 0) return;

  const correctRate = correctAnswers / totalQuestions;
  // const percent = Math.round(correctRate * 100); // antes se usaba en una rama eliminada

  // Pre-compute retention score in JS (same as antes). El RPC lo persiste
  // tal cual; toda la lógica de smoothing/curve queda acá donde es testeable.
  const now = new Date().toISOString();
  const retentionScore = calculateRetention(now, 3, correctRate);

  const { error } = await supabase.rpc("upsert_student_progress", {
    p_class_id: classId,
    p_student_name: studentName,
    p_student_id: studentId,
    p_topic: topic,
    p_total_questions: totalQuestions,
    p_correct_answers: correctAnswers,
    p_retention_score: retentionScore,
  });

  if (error) {
    console.warn(
      "[spaced-repetition] upsert_student_progress failed:",
      error.message,
    );
  }
}

// ─── Process all results after a session ends ───────────────────────────

export async function processSessionResults(session: SessionRow): Promise<void> {
  // Skip retention tracking entirely for sessions without a class
  if (!session.class_id) return;

  const { data: participants } = await supabase
    .from("session_participants")
    .select("*")
    .eq("session_id", session.id);

  const { data: responses } = await supabase
    .from("responses")
    .select("*")
    .eq("session_id", session.id);

  if (!participants || !responses) return;

  // Only count responses from non-guest, non-kicked participants
  const eligibleParticipants = (participants as SessionParticipantRow[]).filter(
    (p) => !p.is_guest && !p.is_kicked && p.student_id,
  );
  const eligibleParticipantIds = new Set(eligibleParticipants.map((p) => p.id));
  const eligibleResponses = (responses as ResponseRow[]).filter((r) =>
    eligibleParticipantIds.has(r.participant_id),
  );

  // If everyone was a guest, skip retention update (deck uses_count is bumped elsewhere).
  if (eligibleResponses.length === 0) return;

  // 1. Update class-level topic retention
  const totalQ = eligibleResponses.length;
  const totalCorrect = eligibleResponses.filter((r) => r.is_correct).length;

  await updateTopicRetention({
    classId: session.class_id,
    deckId: session.deck_id || null,
    topic: session.topic || "",
    subject: null,
    totalQuestions: totalQ,
    correctAnswers: totalCorrect,
  });

  // 2. Update per-student retention (only for eligible participants)
  for (const participant of eligibleParticipants) {
    const studentResponses = eligibleResponses.filter(
      (r) => r.participant_id === participant.id,
    );
    const stuTotal = studentResponses.length;
    const stuCorrect = studentResponses.filter((r) => r.is_correct).length;

    if (stuTotal > 0) {
      await updateStudentRetention({
        classId: session.class_id,
        studentName: participant.student_name,
        studentId: participant.student_id,
        topic: session.topic || "",
        totalQuestions: stuTotal,
        correctAnswers: stuCorrect,
      });
    }
  }
}

// ─── Get review suggestions for one class (legacy, used by Notifications) ──

interface ReviewSuggestion extends TopicRetentionRow {
  current_retention: number;
  is_overdue: boolean;
  days_since_review: number;
  urgency: number;
}

export async function getReviewSuggestions(
  classId: string,
): Promise<ReviewSuggestion[]> {
  const { data: topics } = await supabase
    .from("topic_retention")
    .select("*")
    .eq("class_id", classId)
    .order("retention_score", { ascending: true });

  if (!topics) return [];

  const now = new Date();
  const withCurrentRetention: ReviewSuggestion[] = (topics as TopicRetentionRow[]).map(
    (t) => {
      const currentRetention = calculateRetention(
        t.last_reviewed_at,
        t.interval_days || 1,
        (t.total_questions ?? 0) > 0
          ? (t.correct_answers ?? 0) / (t.total_questions ?? 1)
          : 0,
      );
      const nextReview = t.next_review_at ? new Date(t.next_review_at) : now;
      const isOverdue = nextReview <= now;
      const daysSinceReview = t.last_reviewed_at
        ? Math.round(
            (now.getTime() - new Date(t.last_reviewed_at).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 999;
      return {
        ...t,
        current_retention: currentRetention,
        is_overdue: isOverdue,
        days_since_review: daysSinceReview,
        urgency: isOverdue ? 100 - currentRetention + daysSinceReview : 0,
      };
    },
  );

  return withCurrentRetention
    .filter((t) => t.is_overdue || t.current_retention < 70)
    .sort((a, b) => b.urgency - a.urgency);
}

// ─── Get suggested decks for today (across all teacher's classes) ───────

export interface SuggestedDeckItem {
  class: ClassRow;
  deck: DeckRow;
  retention_score: number;
  days_since_review: number;
  days_overdue: number;
  is_overdue: boolean;
  urgency: number;
}

export async function getSuggestedDecksForToday(
  teacherId: string | null | undefined,
): Promise<SuggestedDeckItem[]> {
  if (!teacherId) return [];

  // 1. Get all the teacher's classes
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, subject, grade")
    .eq("teacher_id", teacherId);
  if (!classes || classes.length === 0) return [];

  const classRows = classes as ClassRow[];
  const classIds = classRows.map((c) => c.id);
  const classMap: Record<string, ClassRow> = Object.fromEntries(
    classRows.map((c) => [c.id, c]),
  );

  // 2. Get all topic_retention rows that have a deck_id, across these classes
  const { data: rows } = await supabase
    .from("topic_retention")
    .select("*")
    .in("class_id", classIds)
    .not("deck_id", "is", null);
  if (!rows || rows.length === 0) return [];
  const retentionRows = rows as TopicRetentionRow[];

  // 3. Get the actual deck rows
  const deckIds = Array.from(new Set(retentionRows.map((r) => r.deck_id))).filter(
    (id): id is string => id !== null,
  );
  const { data: decks } = await supabase
    .from("decks")
    .select("*")
    .in("id", deckIds);
  const deckMap: Record<string, DeckRow> = Object.fromEntries(
    ((decks as DeckRow[]) || []).map((d) => [d.id, d]),
  );

  // 4. Compute current retention + urgency for each row, keep only urgent
  //    AND not aged-out
  const now = new Date();
  const items: SuggestedDeckItem[] = [];
  for (const r of retentionRows) {
    if (!r.deck_id) continue;
    const deck = deckMap[r.deck_id];
    if (!deck) continue; // deck was deleted

    const correctRate =
      (r.total_questions ?? 0) > 0
        ? (r.correct_answers ?? 0) / (r.total_questions ?? 1)
        : 0;
    const currentRetention = calculateRetention(
      r.last_reviewed_at,
      r.interval_days || 1,
      correctRate,
    );

    const nextReview = r.next_review_at ? new Date(r.next_review_at) : now;
    const isOverdue = nextReview <= now;
    const daysSinceReview = r.last_reviewed_at
      ? Math.round(
          (now.getTime() - new Date(r.last_reviewed_at).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 999;
    const daysOverdue = isOverdue
      ? Math.max(
          0,
          Math.round((now.getTime() - nextReview.getTime()) / (1000 * 60 * 60 * 24)),
        )
      : 0;

    // Show as urgent if overdue OR retention dropped below 70%.
    const isUrgent = isOverdue || currentRetention < 70;
    if (!isUrgent) continue;

    // Aging cap: 14 days overdue is the cutoff.
    if (daysOverdue > 14) continue;

    const urgency = isOverdue
      ? 100 - currentRetention + daysOverdue
      : 70 - currentRetention;

    items.push({
      class: classMap[r.class_id],
      deck,
      retention_score: Math.round(currentRetention),
      days_since_review: daysSinceReview,
      days_overdue: daysOverdue,
      is_overdue: isOverdue,
      urgency,
    });
  }

  // 5. Sort by urgency descending
  items.sort((a, b) => b.urgency - a.urgency);

  // 6. Forced distribution: round-robin by class first, then fill by urgency
  const CAP = 9;
  if (items.length <= CAP) return items;

  const byClass = new Map<string, SuggestedDeckItem[]>();
  for (const it of items) {
    const cid = it.class?.id || "_";
    if (!byClass.has(cid)) byClass.set(cid, []);
    byClass.get(cid)!.push(it);
  }

  const result: SuggestedDeckItem[] = [];
  while (result.length < CAP && byClass.size > 0) {
    for (const [cid, queue] of Array.from(byClass.entries())) {
      if (result.length >= CAP) break;
      const next = queue.shift();
      if (next) result.push(next);
      if (queue.length === 0) byClass.delete(cid);
    }
  }
  return result;
}

// ─── Get class retention overview ───────────────────────────────────────

type RetentionStatus = "strong" | "medium" | "weak";
type RetentionTrend = "up" | "down" | "stable" | "new";

export interface EnrichedTopic extends TopicRetentionRow {
  current_retention: number;
  days_since_review: number;
  status: RetentionStatus;
  trend: RetentionTrend;
}

export interface ClassRetentionOverview {
  average: number;
  topics: EnrichedTopic[];
  strong: number;
  medium: number;
  weak: number;
}

export async function getClassRetentionOverview(
  classId: string,
): Promise<ClassRetentionOverview> {
  const { data: topics } = await supabase
    .from("topic_retention")
    .select("*")
    .eq("class_id", classId)
    .order("last_reviewed_at", { ascending: false });

  if (!topics || topics.length === 0) {
    return { average: 0, topics: [], strong: 0, medium: 0, weak: 0 };
  }

  const now = new Date();

  const enriched: EnrichedTopic[] = (topics as TopicRetentionRow[]).map((t) => {
    const currentRetention = calculateRetention(
      t.last_reviewed_at,
      t.interval_days || 1,
      (t.total_questions ?? 0) > 0
        ? (t.correct_answers ?? 0) / (t.total_questions ?? 1)
        : 0,
    );

    const daysSince = t.last_reviewed_at
      ? Math.round(
          (now.getTime() - new Date(t.last_reviewed_at).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 999;

    const status: RetentionStatus =
      currentRetention >= 70 ? "strong" : currentRetention >= 40 ? "medium" : "weak";
    const trend: RetentionTrend =
      (t.session_count ?? 0) > 1
        ? currentRetention > t.retention_score
          ? "up"
          : currentRetention < t.retention_score
            ? "down"
            : "stable"
        : "new";

    return {
      ...t,
      current_retention: currentRetention,
      days_since_review: daysSince,
      status,
      trend,
    };
  });

  const average = Math.round(
    enriched.reduce((s, t) => s + t.current_retention, 0) / enriched.length,
  );
  const strong = enriched.filter((t) => t.status === "strong").length;
  const medium = enriched.filter((t) => t.status === "medium").length;
  const weak = enriched.filter((t) => t.status === "weak").length;

  return { average, topics: enriched, strong, medium, weak };
}

// ─── Get student progress for a class ───────────────────────────────────

interface StudentTopicAccum {
  name: string;
  topics: StudentTopicProgressRow[];
  totalCorrect: number;
  totalQuestions: number;
}

export interface StudentProgressItem extends StudentTopicAccum {
  avgRetention: number;
  weakTopics: number;
  strongTopics: number;
}

export async function getStudentProgress(
  classId: string,
): Promise<StudentProgressItem[]> {
  const { data } = await supabase
    .from("student_topic_progress")
    .select("*")
    .eq("class_id", classId);

  if (!data) return [];

  // Group by student
  const byStudent: Record<string, StudentTopicAccum> = {};
  (data as StudentTopicProgressRow[]).forEach((row) => {
    if (!byStudent[row.student_name]) {
      byStudent[row.student_name] = {
        name: row.student_name,
        topics: [],
        totalCorrect: 0,
        totalQuestions: 0,
      };
    }
    byStudent[row.student_name].topics.push(row);
    byStudent[row.student_name].totalCorrect += row.correct_answers || 0;
    byStudent[row.student_name].totalQuestions += row.total_questions || 0;
  });

  return Object.values(byStudent)
    .map((s) => ({
      ...s,
      avgRetention:
        s.totalQuestions > 0
          ? Math.round((s.totalCorrect / s.totalQuestions) * 100)
          : 0,
      weakTopics: s.topics.filter((t) => t.retention_score < 40).length,
      strongTopics: s.topics.filter((t) => t.retention_score >= 70).length,
    }))
    .sort((a, b) => b.avgRetention - a.avgRetention);
}

// ─── Get the teacher's plan for today ───────────────────────────────────

export type TodayItemStatus = "pending" | "launched_today";

export interface TodayPlanItem {
  deck: DeckRow;
  class: ClassRow;
  unit: UnitRow | null;
  status: TodayItemStatus;
  lastLaunchedAt: string | null;
}

export async function getTodayPlan(
  teacherId: string | null | undefined,
): Promise<TodayPlanItem[]> {
  if (!teacherId) return [];

  // 1. Get all the teacher's classes
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, subject, grade, color_id")
    .eq("teacher_id", teacherId)
    .order("name", { ascending: true });
  if (!classes || classes.length === 0) return [];
  const classRows = classes as ClassRow[];

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // 2. Pull all units for these classes in one query.
  const classIds = classRows.map((c) => c.id);
  const { data: allUnits } = await supabase
    .from("units")
    .select("id, class_id, section, name, position, status, created_at")
    .in("class_id", classIds);
  const unitsByClass: Record<string, UnitRow[]> = {};
  ((allUnits as UnitRow[]) || []).forEach((u) => {
    if (!unitsByClass[u.class_id]) unitsByClass[u.class_id] = [];
    unitsByClass[u.class_id].push(u);
  });

  // 3. Pull recent sessions for these classes
  const { data: recentSessions } = await supabase
    .from("sessions")
    .select("id, deck_id, class_id, created_at, status")
    .in("class_id", classIds)
    .in("status", ["lobby", "active", "completed"])
    .not("deck_id", "is", null)
    .gte("created_at", fourteenDaysAgo.toISOString())
    .order("created_at", { ascending: false });
  const recentSessionRows = (recentSessions as SessionRow[]) || [];

  // Index sessions by deck — for each deck, what's the most recent session?
  const lastSessionByDeck = new Map<string, SessionRow>();
  recentSessionRows.forEach((s) => {
    if (s.deck_id && !lastSessionByDeck.has(s.deck_id)) {
      lastSessionByDeck.set(s.deck_id, s);
    }
  });

  // 4. For each class, determine the active unit using pickActiveUnit.
  const activeUnitByClass: Record<string, UnitRow> = {};
  for (const cls of classRows) {
    const classUnits = unitsByClass[cls.id] || [];
    const active = pickActiveUnit(classUnits) as UnitRow | null;
    if (active) {
      activeUnitByClass[cls.id] = active;
    }
  }

  // 5. For each class, fetch the decks of its active unit (or recent-fallback)
  const out: TodayPlanItem[] = [];
  for (const cls of classRows) {
    const activeUnit = activeUnitByClass[cls.id];

    let decks: DeckRow[] = [];
    if (activeUnit) {
      const { data: unitDecks } = await supabase
        .from("decks")
        .select("*")
        .eq("class_id", cls.id)
        .eq("unit_id", activeUnit.id)
        .order("position", { ascending: true });
      decks = (unitDecks as DeckRow[]) || [];
    } else {
      // Fallback path
      const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
      const recentSessionsInClass = recentSessionRows.filter(
        (s) =>
          s.class_id === cls.id && new Date(s.created_at) >= yesterdayStart,
      );
      const recentDeckIds = Array.from(
        new Set(recentSessionsInClass.map((s) => s.deck_id).filter((id): id is string => !!id)),
      );
      if (recentDeckIds.length === 0) continue;
      const { data: recentDecks } = await supabase
        .from("decks")
        .select("*")
        .in("id", recentDeckIds);
      decks = (recentDecks as DeckRow[]) || [];
    }

    // 6. For each deck, classify its status and decide whether to include
    for (const deck of decks) {
      const lastSession = lastSessionByDeck.get(deck.id);
      const lastLaunchedAt = lastSession ? new Date(lastSession.created_at) : null;
      const launchedToday = lastLaunchedAt && lastLaunchedAt >= todayStart;

      let status: TodayItemStatus;
      if (activeUnit) {
        if (launchedToday) {
          status = "launched_today";
        } else if (
          deck.section === "warmup" ||
          deck.section === "exit_ticket"
        ) {
          status = "pending";
        } else {
          continue; // general_review and not launched today → skip
        }
      } else {
        status = launchedToday ? "launched_today" : "pending";
      }

      out.push({
        deck,
        class: cls,
        unit: activeUnit || null,
        status,
        lastLaunchedAt: lastSession?.created_at || null,
      });
    }
  }

  // 7. Sort: pending first, then launched_today.
  const sectionRank: Record<string, number> = {
    warmup: 0,
    exit_ticket: 1,
    general_review: 2,
  };
  out.sort((a, b) => {
    const statusRank = (it: TodayPlanItem) => (it.status === "pending" ? 0 : 1);
    const sr = statusRank(a) - statusRank(b);
    if (sr !== 0) return sr;
    const cr = (a.class.name || "").localeCompare(b.class.name || "");
    if (cr !== 0) return cr;
    return (
      (sectionRank[a.deck.section as string] ?? 9) -
      (sectionRank[b.deck.section as string] ?? 9)
    );
  });

  return out;
}

// ─── Get unit retention summary (PR 6: Close unit narrative) ────────────

export interface UnitDeckSummary {
  deck: Pick<DeckRow, "id" | "title" | "section" | "position">;
  sessionCount: number;
  retention: number | null;
  status: RetentionStatus | "new";
}

export interface UnitRetentionSummary {
  unit: UnitRow;
  decks: UnitDeckSummary[];
  dayCount: number;
  daysLaunched: number;
  averageRetention: number | null;
  strongest: UnitDeckSummary | null;
  weakest: UnitDeckSummary | null;
  totalSessions: number;
  // PR6.2 additions
  warmupSessionCount?: number;
  exitSessionCount?: number;
  totalResponses?: number;
  strongTopics?: number;
  mediumTopics?: number;
  weakTopics?: number;
}

export async function getUnitRetentionSummary(
  unitId: string | null | undefined,
): Promise<UnitRetentionSummary | null> {
  if (!unitId) return null;

  // 1. Fetch the unit and its decks
  const { data: unit } = await supabase
    .from("units")
    .select("*")
    .eq("id", unitId)
    .maybeSingle();
  if (!unit) return null;
  const unitRow = unit as UnitRow;

  const { data: unitDecks } = await supabase
    .from("decks")
    .select("id, title, section, position")
    .eq("unit_id", unitId)
    .order("position", { ascending: true });
  const decks = (unitDecks as Array<
    Pick<DeckRow, "id" | "title" | "section" | "position">
  >) || [];

  if (decks.length === 0) {
    return {
      unit: unitRow,
      decks: [],
      dayCount: 0,
      daysLaunched: 0,
      averageRetention: null,
      strongest: null,
      weakest: null,
      totalSessions: 0,
    };
  }

  const deckIds = decks.map((d) => d.id);

  // 2. Fetch retention rows + session counts in parallel
  const [retRes, sessRes] = await Promise.all([
    supabase
      .from("topic_retention")
      .select(
        "deck_id, retention_score, total_questions, correct_answers, last_reviewed_at, interval_days, session_count",
      )
      .in("deck_id", deckIds),
    supabase
      .from("sessions")
      .select("id, deck_id, status")
      .in("deck_id", deckIds)
      .in("status", ["active", "completed"]),
  ]);

  const retentionRows = (retRes.data as TopicRetentionRow[]) || [];
  const sessions = (sessRes.data as SessionRow[]) || [];

  // Index sessions by deck
  const sessionsByDeck = new Map<string, number>();
  sessions.forEach((s) => {
    if (s.deck_id) {
      sessionsByDeck.set(s.deck_id, (sessionsByDeck.get(s.deck_id) || 0) + 1);
    }
  });

  // For each deck, compute its CURRENT retention from its retention rows.
  const enrichedDecks: UnitDeckSummary[] = decks.map((deck) => {
    const retsForDeck = retentionRows.filter((r) => r.deck_id === deck.id);
    let retention: number | null = null;
    if (retsForDeck.length > 0) {
      const currents = retsForDeck.map((r) =>
        calculateRetention(
          r.last_reviewed_at,
          r.interval_days || 1,
          (r.total_questions ?? 0) > 0
            ? (r.correct_answers ?? 0) / (r.total_questions ?? 1)
            : 0,
        ),
      );
      retention = Math.round(
        currents.reduce((s, x) => s + x, 0) / currents.length,
      );
    }
    const sessCount = sessionsByDeck.get(deck.id) || 0;
    const status: UnitDeckSummary["status"] =
      retention === null
        ? "new"
        : retention >= 70
          ? "strong"
          : retention >= 40
            ? "medium"
            : "weak";
    return { deck, sessionCount: sessCount, retention, status };
  });

  // Day count: max of warmup count and exit count (same as PlanView)
  const warmupCount = decks.filter((d) => d.section === "warmup").length;
  const exitCount = decks.filter((d) => d.section === "exit_ticket").length;
  const dayCount = Math.max(warmupCount, exitCount);

  // Days launched: a "day" counts as launched if its warmup OR exit ticket
  // (or both) had at least one session.
  const warmupsByPos = new Map<number, string>();
  const exitsByPos = new Map<number, string>();
  decks.forEach((d) => {
    const pos = d.position ?? -1;
    if (d.section === "warmup") warmupsByPos.set(pos, d.id);
    else if (d.section === "exit_ticket") exitsByPos.set(pos, d.id);
  });
  let daysLaunched = 0;
  for (let i = 0; i < dayCount; i++) {
    const pos = i;
    const w = warmupsByPos.get(pos);
    const e = exitsByPos.get(pos);
    const wLaunched = w ? (sessionsByDeck.get(w) || 0) > 0 : false;
    const eLaunched = e ? (sessionsByDeck.get(e) || 0) > 0 : false;
    if (wLaunched || eLaunched) daysLaunched++;
  }

  // Average retention across all decks that have a retention score
  const decksWithScore = enrichedDecks.filter(
    (d): d is UnitDeckSummary & { retention: number } => d.retention !== null,
  );
  const averageRetention =
    decksWithScore.length === 0
      ? null
      : Math.round(
          decksWithScore.reduce((s, d) => s + d.retention, 0) /
            decksWithScore.length,
        );

  // Strongest and weakest — null when no decks have retention yet
  let strongest: UnitDeckSummary | null = null;
  let weakest: UnitDeckSummary | null = null;
  if (decksWithScore.length > 0) {
    strongest = decksWithScore.reduce(
      (best, d) => (d.retention > (best.retention ?? -1) ? d : best),
      decksWithScore[0] as UnitDeckSummary,
    );
    weakest = decksWithScore.reduce(
      (worst, d) =>
        d.retention < (worst.retention ?? Number.POSITIVE_INFINITY) ? d : worst,
      decksWithScore[0] as UnitDeckSummary,
    );
  }

  const totalSessions = sessions.length;

  // PR6.2: extra counts for the closing-summary header.
  const warmupSessionCount = sessions.filter((s) => {
    const d = decks.find((x) => x.id === s.deck_id);
    return d && d.section === "warmup";
  }).length;
  const exitSessionCount = sessions.filter((s) => {
    const d = decks.find((x) => x.id === s.deck_id);
    return d && d.section === "exit_ticket";
  }).length;

  // Count student responses across all this unit's sessions.
  let totalResponses = 0;
  if (sessions.length > 0) {
    const sessionIds = sessions.map((s) => s.id);
    const { count } = await supabase
      .from("responses")
      .select("id", { count: "exact", head: true })
      .in("session_id", sessionIds);
    totalResponses = count || 0;
  }

  const strongTopics = enrichedDecks.filter((d) => d.status === "strong").length;
  const mediumTopics = enrichedDecks.filter((d) => d.status === "medium").length;
  const weakTopics = enrichedDecks.filter((d) => d.status === "weak").length;

  return {
    unit: unitRow,
    decks: enrichedDecks,
    dayCount,
    daysLaunched,
    averageRetention,
    strongest,
    weakest,
    totalSessions,
    warmupSessionCount,
    exitSessionCount,
    totalResponses,
    strongTopics,
    mediumTopics,
    weakTopics,
  };
}

// ─── PR 25.2 / 28.2: scheduled plan helpers ─────────────────────────────

/**
 * Decks that belong to "Day N" of a unit.
 * Mirrors buildDayRows() in PlanView.jsx: separate by section, sort by
 * position within each section, and pair them by index. Day N = the
 * N-th warmup and the N-th exit_ticket (1-based).
 *
 * Why index-based instead of `position === dayNumber`:
 *   1. AddToSlotModal can assign position=0 to first deck in a slot.
 *   2. Deleted decks leave gaps (PR 24.9 sets unit_id=null without compacting).
 *   3. PR 24.10 fixed CreateDeckEditor for the "create new" path only.
 *
 * PlanView tolerates all three because it pairs by sorted index. This
 * helper uses the same approach.
 */
function getDecksForDay(
  unit: UnitRow | null | undefined,
  allDecks: DeckRow[] | null | undefined,
  dayNumber: number,
): DeckRow[] {
  if (!unit || !dayNumber || dayNumber < 1) return [];
  const inUnit = (allDecks || []).filter((d) => d.unit_id === unit.id);
  const warmups = inUnit
    .filter((d) => d.section === "warmup")
    .sort((a, b) => (a.position || 0) - (b.position || 0));
  const exits = inUnit
    .filter((d) => d.section === "exit_ticket")
    .sort((a, b) => (a.position || 0) - (b.position || 0));
  const out: DeckRow[] = [];
  if (warmups[dayNumber - 1]) out.push(warmups[dayNumber - 1]);
  if (exits[dayNumber - 1]) out.push(exits[dayNumber - 1]);
  return out;
}

export interface ScheduledPlanItem {
  deck: DeckRow;
  class: ClassRow | undefined;
  unit: UnitRow;
  dayNumber: number;
  status: TodayItemStatus;
  lastLaunchedAt: string | null;
}

export async function getScheduledPlan(
  teacherId: string | null | undefined,
  targetDate: Date | null = null,
): Promise<ScheduledPlanItem[]> {
  if (!teacherId) return [];

  // Anchor target = local-midnight of targetDate (or today).
  const target = targetDate instanceof Date ? new Date(targetDate) : new Date();
  target.setHours(0, 0, 0, 0);
  const targetMs = target.getTime();

  // 1. Classes
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, subject, grade, color_id")
    .eq("teacher_id", teacherId)
    .order("name", { ascending: true });
  if (!classes || classes.length === 0) return [];
  const classRows = classes as ClassRow[];

  const classIds = classRows.map((c) => c.id);

  // 2. Units (need day_dates here)
  const { data: allUnits } = await supabase
    .from("units")
    .select(
      "id, class_id, section, name, position, status, day_dates, created_at",
    )
    .in("class_id", classIds);
  if (!allUnits || allUnits.length === 0) return [];
  const unitRows = allUnits as UnitRow[];

  // 3. Decks belonging to these units
  const unitIds = unitRows.map((u) => u.id);
  const { data: allDecks } = await supabase
    .from("decks")
    .select("*")
    .in("unit_id", unitIds);
  if (!allDecks || allDecks.length === 0) return [];
  const deckRows = allDecks as DeckRow[];

  // 4. Sessions launched today for these decks (to set status)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { data: todaySessions } = await supabase
    .from("sessions")
    .select("id, deck_id, created_at")
    .in("class_id", classIds)
    .in("status", ["lobby", "active", "completed"])
    .gte("created_at", todayStart.toISOString())
    .not("deck_id", "is", null);
  const launchedTodayMap = new Map<string, SessionRow>();
  ((todaySessions as SessionRow[]) || []).forEach((s) => {
    if (s.deck_id && !launchedTodayMap.has(s.deck_id)) {
      launchedTodayMap.set(s.deck_id, s);
    }
  });

  // 5. Build the output list.
  const out: ScheduledPlanItem[] = [];
  const classById = new Map(classRows.map((c) => [c.id, c]));

  for (const unit of unitRows) {
    const dates = Array.isArray(unit.day_dates) ? unit.day_dates : [];
    if (dates.length === 0) continue;

    dates.forEach((raw, idx) => {
      if (!raw) return;
      const d = raw instanceof Date ? raw : new Date(raw);
      if (Number.isNaN(d.getTime())) return;
      d.setHours(0, 0, 0, 0);
      if (d.getTime() !== targetMs) return;

      const dayNumber = idx + 1;
      const decksAtPos = getDecksForDay(unit, deckRows, dayNumber);
      decksAtPos.forEach((deck) => {
        const lastSession = launchedTodayMap.get(deck.id) || null;
        out.push({
          deck,
          class: classById.get(unit.class_id),
          unit,
          dayNumber,
          status: lastSession ? "launched_today" : "pending",
          lastLaunchedAt: lastSession?.created_at || null,
        });
      });
    });
  }

  // 6. Sort: pending first, then by class name, then by section.
  const sectionRank: Record<string, number> = {
    warmup: 0,
    exit_ticket: 1,
    general_review: 2,
  };
  out.sort((a, b) => {
    const aStatus = a.status === "pending" ? 0 : 1;
    const bStatus = b.status === "pending" ? 0 : 1;
    if (aStatus !== bStatus) return aStatus - bStatus;
    const cn = (a.class?.name || "").localeCompare(b.class?.name || "");
    if (cn !== 0) return cn;
    return (
      (sectionRank[a.deck.section as string] || 99) -
      (sectionRank[b.deck.section as string] || 99)
    );
  });

  return out;
}

// ─── PR 25.2: getUpcomingPlan — next N days ─────────────────────────────

export interface UpcomingPlanGroup {
  date: Date;
  items: Array<{
    deck: DeckRow;
    class: ClassRow | undefined;
    unit: UnitRow;
    dayNumber: number;
  }>;
}

export async function getUpcomingPlan(
  teacherId: string | null | undefined,
  days: number = 7,
): Promise<UpcomingPlanGroup[]> {
  if (!teacherId) return [];

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const limit = new Date(todayStart);
  limit.setDate(limit.getDate() + days);

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, subject, grade, color_id")
    .eq("teacher_id", teacherId)
    .order("name", { ascending: true });
  if (!classes || classes.length === 0) return [];
  const classRows = classes as ClassRow[];

  const classIds = classRows.map((c) => c.id);
  const { data: allUnits } = await supabase
    .from("units")
    .select(
      "id, class_id, section, name, position, status, day_dates, created_at",
    )
    .in("class_id", classIds);
  if (!allUnits || allUnits.length === 0) return [];
  const unitRows = allUnits as UnitRow[];

  const unitIds = unitRows.map((u) => u.id);
  const { data: allDecks } = await supabase
    .from("decks")
    .select("*")
    .in("unit_id", unitIds);
  if (!allDecks || allDecks.length === 0) return [];
  const deckRows = allDecks as DeckRow[];

  // Walk all units, collect (date, items) buckets within (today, +N days]
  const byDate = new Map<string, UpcomingPlanGroup>();
  const classById = new Map(classRows.map((c) => [c.id, c]));

  for (const unit of unitRows) {
    const dates = Array.isArray(unit.day_dates) ? unit.day_dates : [];
    dates.forEach((raw, idx) => {
      if (!raw) return;
      const d = raw instanceof Date ? raw : new Date(raw);
      if (Number.isNaN(d.getTime())) return;
      d.setHours(0, 0, 0, 0);
      // Strictly after today, up to and including `limit`
      if (
        d.getTime() <= todayStart.getTime() ||
        d.getTime() > limit.getTime()
      ) {
        return;
      }

      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!byDate.has(key)) byDate.set(key, { date: d, items: [] });

      const dayNumber = idx + 1;
      const decksAtPos = getDecksForDay(unit, deckRows, dayNumber);
      decksAtPos.forEach((deck) => {
        byDate.get(key)!.items.push({
          deck,
          class: classById.get(unit.class_id),
          unit,
          dayNumber,
        });
      });
    });
  }

  // Sort by date ascending, sort items within each day by section
  const sectionRank: Record<string, number> = {
    warmup: 0,
    exit_ticket: 1,
    general_review: 2,
  };
  const result = [...byDate.values()].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
  result.forEach((group) => {
    group.items.sort((a, b) => {
      const cn = (a.class?.name || "").localeCompare(b.class?.name || "");
      if (cn !== 0) return cn;
      return (
        (sectionRank[a.deck.section as string] || 99) -
        (sectionRank[b.deck.section as string] || 99)
      );
    });
  });
  return result;
}

// ─── Internal exports for testing (PR 70) ───────────────────────────────
// Funciones puras (sin async, sin side effects) que vale la pena testear.
// No las exportamos como API pública porque son detalles de implementación,
// pero los tests sí necesitan llamarlas directo.

export const _internal = {
  percentToQuality,
  calculateSM2,
  calculateRetention,
};
