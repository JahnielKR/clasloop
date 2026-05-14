// ─── SM-2 Spaced Repetition Algorithm for Clasloop ──
// Based on the SuperMemo SM-2 algorithm, adapted for classroom use
// https://en.wikipedia.org/wiki/SuperMemo#Algorithm_SM-2
//
// Key difference from traditional SM-2: 
// - We track per-TOPIC retention, not per-flashcard
// - A "review" is a session (warmup/exit ticket) with multiple questions
// - The score is based on % correct across all questions in that topic
// - Works at both class-level and individual student level

import { supabase } from './supabase';
import { pickActiveUnit } from './class-hierarchy';

// ─── SM-2 Core Algorithm ────────────────────────────
// quality: 0-5 rating of how well the topic was recalled
//   5 = 90-100% correct (perfect)
//   4 = 80-89% correct (good)  
//   3 = 70-79% correct (acceptable)
//   2 = 50-69% correct (difficult, needs review)
//   1 = 30-49% correct (poor)
//   0 = 0-29% correct (complete failure)

function percentToQuality(percent) {
  if (percent >= 90) return 5;
  if (percent >= 80) return 4;
  if (percent >= 70) return 3;
  if (percent >= 50) return 2;
  if (percent >= 30) return 1;
  return 0;
}

function calculateSM2({ easeFactor = 2.5, interval = 1, repetition = 0, quality }) {
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

// ─── Calculate retention score ──────────────────────
// Estimated retention based on time since last review and interval
function calculateRetention(lastReviewedAt, intervalDays, correctRate) {
  if (!lastReviewedAt) return 0;

  const now = new Date();
  const lastReview = new Date(lastReviewedAt);
  const daysSince = Math.max(0, (now - lastReview) / (1000 * 60 * 60 * 24));

  // Forgetting curve: retention = e^(-t/S) where S is stability (interval)
  // Modified to also factor in the last correct rate
  const stability = Math.max(intervalDays, 1);
  const forgettingFactor = Math.exp(-daysSince / stability);
  const baseRetention = correctRate * 100;
  const currentRetention = baseRetention * forgettingFactor;

  return Math.round(Math.max(0, Math.min(100, currentRetention)));
}

// ─── Update topic retention after a session ─────────
export async function updateTopicRetention({ classId, topic, subject, totalQuestions, correctAnswers, deckId = null }) {
  if (totalQuestions === 0) return;

  const correctRate = correctAnswers / totalQuestions;
  const percent = Math.round(correctRate * 100);
  const quality = percentToQuality(percent);

  // Get existing retention data — match by deck_id when available (more reliable),
  // otherwise fall back to topic string for legacy data.
  let existing = null;
  if (deckId) {
    const { data } = await supabase
      .from('topic_retention')
      .select('*')
      .eq('class_id', classId)
      .eq('deck_id', deckId)
      .maybeSingle();
    existing = data;
  }
  if (!existing) {
    const { data } = await supabase
      .from('topic_retention')
      .select('*')
      .eq('class_id', classId)
      .eq('topic', topic)
      .is('deck_id', null)
      .maybeSingle();
    existing = data;
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
    const retentionScore = calculateRetention(now, sm2.interval, newCorrect / newTotal);

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + sm2.interval);

    const updates = {
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

    await supabase
      .from('topic_retention')
      .update(updates)
      .eq('id', existing.id);
  } else {
    // Create new topic retention entry
    const sm2 = calculateSM2({ quality });
    const retentionScore = percent;

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + sm2.interval);

    await supabase
      .from('topic_retention')
      .insert({
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

// ─── Update student-level retention ─────────────────
export async function updateStudentRetention({ classId, studentName, studentId, topic, totalQuestions, correctAnswers }) {
  if (totalQuestions === 0) return;

  const correctRate = correctAnswers / totalQuestions;
  const percent = Math.round(correctRate * 100);

  const { data: existing } = await supabase
    .from('student_topic_progress')
    .select('*')
    .eq('class_id', classId)
    .eq('student_name', studentName)
    .eq('topic', topic)
    .single();

  const now = new Date().toISOString();

  if (existing) {
    const newTotal = (existing.total_questions || 0) + totalQuestions;
    const newCorrect = (existing.correct_answers || 0) + correctAnswers;
    const retentionScore = calculateRetention(now, 3, newCorrect / newTotal);

    await supabase
      .from('student_topic_progress')
      .update({
        retention_score: retentionScore,
        total_questions: newTotal,
        correct_answers: newCorrect,
        last_reviewed_at: now,
      })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('student_topic_progress')
      .insert({
        class_id: classId,
        student_name: studentName,
        student_id: studentId,
        topic,
        retention_score: percent,
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
        last_reviewed_at: now,
      });
  }
}

// ─── Process all results after a session ends ───────
export async function processSessionResults(session) {
  // Skip retention tracking entirely for sessions without a class
  if (!session.class_id) return;

  const { data: participants } = await supabase
    .from('session_participants')
    .select('*')
    .eq('session_id', session.id);

  const { data: responses } = await supabase
    .from('responses')
    .select('*')
    .eq('session_id', session.id);

  if (!participants || !responses) return;

  // Only count responses from non-guest, non-kicked participants — guests and
  // kicked players don't feed retention.
  const eligibleParticipants = participants.filter(p => !p.is_guest && !p.is_kicked && p.student_id);
  const eligibleParticipantIds = new Set(eligibleParticipants.map(p => p.id));
  const eligibleResponses = responses.filter(r => eligibleParticipantIds.has(r.participant_id));

  // If everyone was a guest, skip retention update (deck uses_count is bumped elsewhere).
  if (eligibleResponses.length === 0) return;

  // 1. Update class-level topic retention
  const totalQ = eligibleResponses.length;
  const totalCorrect = eligibleResponses.filter(r => r.is_correct).length;

  await updateTopicRetention({
    classId: session.class_id,
    deckId: session.deck_id || null,
    topic: session.topic,
    subject: null,
    totalQuestions: totalQ,
    correctAnswers: totalCorrect,
  });

  // 2. Update per-student retention (only for eligible participants)
  for (const participant of eligibleParticipants) {
    const studentResponses = eligibleResponses.filter(r => r.participant_id === participant.id);
    const stuTotal = studentResponses.length;
    const stuCorrect = studentResponses.filter(r => r.is_correct).length;

    if (stuTotal > 0) {
      await updateStudentRetention({
        classId: session.class_id,
        studentName: participant.student_name,
        studentId: participant.student_id,
        topic: session.topic,
        totalQuestions: stuTotal,
        correctAnswers: stuCorrect,
      });
    }
  }
}

// ─── Get review suggestions for one class (legacy, used by Notifications) ──
export async function getReviewSuggestions(classId) {
  const { data: topics } = await supabase
    .from('topic_retention')
    .select('*')
    .eq('class_id', classId)
    .order('retention_score', { ascending: true });

  if (!topics) return [];

  const now = new Date();
  const withCurrentRetention = topics.map(t => {
    const currentRetention = calculateRetention(
      t.last_reviewed_at,
      t.interval_days || 1,
      t.total_questions > 0 ? t.correct_answers / t.total_questions : 0
    );
    const nextReview = t.next_review_at ? new Date(t.next_review_at) : now;
    const isOverdue = nextReview <= now;
    const daysSinceReview = t.last_reviewed_at
      ? Math.round((now - new Date(t.last_reviewed_at)) / (1000 * 60 * 60 * 24))
      : 999;
    return {
      ...t,
      current_retention: currentRetention,
      is_overdue: isOverdue,
      days_since_review: daysSinceReview,
      urgency: isOverdue ? (100 - currentRetention) + daysSinceReview : 0,
    };
  });

  return withCurrentRetention
    .filter(t => t.is_overdue || t.current_retention < 70)
    .sort((a, b) => b.urgency - a.urgency);
}

// ─── Get suggested decks for today (across all teacher's classes) ───────────
// Returns an array sorted by urgency, each item shaped as:
//   { class: {id,name,subject,grade}, deck: {...full deck row...},
//     retention_score, days_since_review, days_overdue, urgency }
// Only includes topics linked to a real, still-existing deck (deck_id != null).
//
// Filtering rules (added when /sessions was rebranded to a "today" dashboard):
//   - Aging cap: decks with days_overdue > 14 are dropped. If the teacher
//     hasn't launched it in two full weeks, surfacing it daily is noise —
//     they can find it from /classes/<id> when they want it.
//   - Distribution: at most 9 items returned (3×3 grid in the UI). Round 1
//     gives every class with urgents at least 1 slot before any class gets a
//     second one. Round 2+ fills remaining slots by raw urgency. Prevents a
//     single class with low retention from monopolizing the screen.
export async function getSuggestedDecksForToday(teacherId) {
  if (!teacherId) return [];

  // 1. Get all the teacher's classes
  const { data: classes } = await supabase
    .from('classes')
    .select('id, name, subject, grade')
    .eq('teacher_id', teacherId);
  if (!classes || classes.length === 0) return [];

  const classIds = classes.map(c => c.id);
  const classMap = Object.fromEntries(classes.map(c => [c.id, c]));

  // 2. Get all topic_retention rows that have a deck_id, across these classes
  const { data: rows } = await supabase
    .from('topic_retention')
    .select('*')
    .in('class_id', classIds)
    .not('deck_id', 'is', null);
  if (!rows || rows.length === 0) return [];

  // 3. Get the actual deck rows
  const deckIds = Array.from(new Set(rows.map(r => r.deck_id)));
  const { data: decks } = await supabase
    .from('decks')
    .select('*')
    .in('id', deckIds);
  const deckMap = Object.fromEntries((decks || []).map(d => [d.id, d]));

  // 4. Compute current retention + urgency for each row, keep only urgent
  //    AND not aged-out
  const now = new Date();
  const items = [];
  for (const r of rows) {
    const deck = deckMap[r.deck_id];
    if (!deck) continue; // deck was deleted

    const correctRate = (r.total_questions || 0) > 0 ? (r.correct_answers || 0) / r.total_questions : 0;
    const currentRetention = calculateRetention(
      r.last_reviewed_at,
      r.interval_days || 1,
      correctRate
    );

    const nextReview = r.next_review_at ? new Date(r.next_review_at) : now;
    const isOverdue = nextReview <= now;
    const daysSinceReview = r.last_reviewed_at
      ? Math.round((now - new Date(r.last_reviewed_at)) / (1000 * 60 * 60 * 24))
      : 999;
    const daysOverdue = isOverdue
      ? Math.max(0, Math.round((now - nextReview) / (1000 * 60 * 60 * 24)))
      : 0;

    // Show as urgent if overdue OR retention dropped below 70%.
    const isUrgent = isOverdue || currentRetention < 70;
    if (!isUrgent) continue;

    // Aging cap: 14 days overdue is the cutoff. After that the teacher
    // has clearly not been engaging with this deck — keeping it in
    // suggestions every day is noise. They can still launch it from
    // /classes/<id> any time.
    if (daysOverdue > 14) continue;

    const urgency = (isOverdue ? (100 - currentRetention) + daysOverdue : (70 - currentRetention));

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

  // 6. Forced distribution: round-robin by class first, then fill by
  //    urgency until cap. Within each class the items are already in
  //    urgency order from step 5, so the per-class queue is correct.
  const CAP = 9;
  if (items.length <= CAP) return items;

  const byClass = new Map();
  for (const it of items) {
    const cid = it.class?.id || "_";
    if (!byClass.has(cid)) byClass.set(cid, []);
    byClass.get(cid).push(it);
  }

  const result = [];
  // Round-robin: keep popping from class queues until cap or queues empty.
  // Iteration order of Map preserves insertion order, but the order doesn't
  // matter much for the user — what matters is "every class with urgents
  // gets a slot before any class gets a second slot". After all queues
  // contribute one, we go around again until cap is reached.
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

// ─── Get recently launched decks for a teacher ──────────────────────────────
// Returns up to N (default 3) decks the teacher has recently launched as
// sessions, most recent first, deduplicated by deck (so re-launching the
// same deck 5 times in a week shows up as 1 card, not 5).
//
// Definition of "launched": session with status in ('lobby','active','completed').
// We exclude 'cancelled' (those weren't real launches) and treat lobby+active
// as "still alive" — they count for recency too.
//
// Used by the new /sessions dashboard to power the "Recently launched" row,
// covering the weekly-routine case ("on Mondays I launch Verbos") without
// re-introducing the old DeckPicker.
export async function getRecentlyLaunchedDecks(teacherId, limit = 3) {
  if (!teacherId) return [];

  // Pull more rows than `limit` so dedupe-by-deck still leaves us with
  // enough cards. Fetching 30 covers most cases without being heavy.
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, deck_id, created_at, status, classes ( id, name )')
    .eq('teacher_id', teacherId)
    .in('status', ['lobby', 'active', 'completed'])
    .not('deck_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(30);
  if (!sessions || sessions.length === 0) return [];

  // Dedupe by deck_id, keeping the most recent session per deck (sessions
  // are already ordered desc, so first hit wins).
  const seen = new Set();
  const dedupedDeckIds = [];
  const sessionByDeck = new Map();
  for (const s of sessions) {
    if (!s.deck_id || seen.has(s.deck_id)) continue;
    seen.add(s.deck_id);
    dedupedDeckIds.push(s.deck_id);
    sessionByDeck.set(s.deck_id, s);
    if (dedupedDeckIds.length >= limit) break;
  }
  if (dedupedDeckIds.length === 0) return [];

  // Fetch the deck rows for those ids
  const { data: decks } = await supabase
    .from('decks')
    .select('*')
    .in('id', dedupedDeckIds);
  if (!decks || decks.length === 0) return [];

  // Preserve the recency order from `dedupedDeckIds` — `decks` may come
  // back in arbitrary order from PG.
  const deckMap = Object.fromEntries(decks.map(d => [d.id, d]));
  const out = [];
  for (const did of dedupedDeckIds) {
    const deck = deckMap[did];
    if (!deck) continue; // deck was deleted between the two queries
    const s = sessionByDeck.get(did);
    out.push({
      deck,
      class: s?.classes || null,
      lastLaunchedAt: s?.created_at || null,
    });
  }
  return out;
}

// ─── Get class retention overview ───────────────────
export async function getClassRetentionOverview(classId) {
  const { data: topics } = await supabase
    .from('topic_retention')
    .select('*')
    .eq('class_id', classId)
    .order('last_reviewed_at', { ascending: false });

  if (!topics || topics.length === 0) {
    return { average: 0, topics: [], strong: 0, medium: 0, weak: 0 };
  }

  const now = new Date();

  const enriched = topics.map(t => {
    const currentRetention = calculateRetention(
      t.last_reviewed_at,
      t.interval_days || 1,
      t.total_questions > 0 ? t.correct_answers / t.total_questions : 0
    );

    const daysSince = t.last_reviewed_at
      ? Math.round((now - new Date(t.last_reviewed_at)) / (1000 * 60 * 60 * 24))
      : 999;

    const status = currentRetention >= 70 ? 'strong' : currentRetention >= 40 ? 'medium' : 'weak';
    const trend = t.session_count > 1
      ? (currentRetention > t.retention_score ? 'up' : currentRetention < t.retention_score ? 'down' : 'stable')
      : 'new';

    return {
      ...t,
      current_retention: currentRetention,
      days_since_review: daysSince,
      status,
      trend,
    };
  });

  const average = Math.round(enriched.reduce((s, t) => s + t.current_retention, 0) / enriched.length);
  const strong = enriched.filter(t => t.status === 'strong').length;
  const medium = enriched.filter(t => t.status === 'medium').length;
  const weak = enriched.filter(t => t.status === 'weak').length;

  return { average, topics: enriched, strong, medium, weak };
}

// ─── Get student progress for a class ───────────────
export async function getStudentProgress(classId) {
  const { data } = await supabase
    .from('student_topic_progress')
    .select('*')
    .eq('class_id', classId);

  if (!data) return [];

  // Group by student
  const byStudent = {};
  data.forEach(row => {
    if (!byStudent[row.student_name]) {
      byStudent[row.student_name] = { name: row.student_name, topics: [], totalCorrect: 0, totalQuestions: 0 };
    }
    byStudent[row.student_name].topics.push(row);
    byStudent[row.student_name].totalCorrect += row.correct_answers || 0;
    byStudent[row.student_name].totalQuestions += row.total_questions || 0;
  });

  return Object.values(byStudent).map(s => ({
    ...s,
    avgRetention: s.totalQuestions > 0 ? Math.round((s.totalCorrect / s.totalQuestions) * 100) : 0,
    weakTopics: s.topics.filter(t => t.retention_score < 40).length,
    strongTopics: s.topics.filter(t => t.retention_score >= 70).length,
  })).sort((a, b) => b.avgRetention - a.avgRetention);
}

// ─── Get the teacher's plan for today ────────────────────────────────
//
// "Your plan for today" — the protagonist row on the Today screen. Returns
// the decks the teacher meant to use today, derived from their workflow:
// what they're actively teaching (the active unit per class) plus what
// they recently launched.
//
// Contract per item returned:
//   {
//     deck:     { id, title, section, class_id, ... },        // full deck row
//     class:    { id, name, subject, grade, color_id },       // its class
//     unit:     { id, name, ... } | null,                      // its unit, if any
//     status:   "pending" | "launched_today",                  // see below
//     lastLaunchedAt: timestamptz | null,                      // for sorting
//   }
//
// Status meanings:
//   pending         → the deck is in the active unit but hasn't been
//                     launched today. THIS is the protagonist case —
//                     "you planned this, you haven't done it yet".
//   launched_today  → already launched today. Kept visible (not hidden)
//                     so the teacher who already ran their morning warmup
//                     can see it as "done" rather than thinking they
//                     forgot. Will get a "✓ done" visual treatment.
//
// What we DON'T include:
//   - decks launched yesterday or earlier (those belong to past days,
//     don't pollute today)
//   - decks from non-active units (those live in /classes/:id, not here)
//   - general_review decks unless they were just launched today (they're
//     the algorithm's territory, shown in "Worth reviewing today")
//
// Ordering inside the result:
//   Per class, we order: pending warmups → pending exit_tickets →
//   launched_today (any section). Across classes, we keep classes
//   alphabetical so the teacher with several classes has a stable
//   reading order.
//
// Active-unit derivation (since units don't have an is_active flag yet):
//   1. If any unit in the class has a deck launched in the last 14 days,
//      the most recently active such unit wins.
//   2. Otherwise, the unit with the highest `position` in the class
//      (the "latest created" by manual order) wins.
//   3. If the class has no units at all, we skip the unit logic entirely
//      and just use recently-launched fallback for that class.
//
// This will get cleaner in PR 4 once units gain an explicit status column
// ('planned' | 'active' | 'closed') — at that point we just read the flag.
//
export async function getTodayPlan(teacherId) {
  if (!teacherId) return [];

  // 1. Get all the teacher's classes
  const { data: classes } = await supabase
    .from('classes')
    .select('id, name, subject, grade, color_id')
    .eq('teacher_id', teacherId)
    .order('name', { ascending: true });
  if (!classes || classes.length === 0) return [];

  // Compute "today" once, in the user's tz. We use UTC for date-line math
  // — slight inaccuracy at midnight is tolerable for "what did I launch
  // today". For lastLaunched comparisons (within last 24h) we use ms.
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // 2. Pull all units for these classes in one query.
  // Phase 5 added units.status — we read it directly via pickActiveUnit
  // instead of deriving "active" from session activity (the old heuristic
  // pre-Phase 5 needed 3 chained queries; this is one). For backward
  // safety pickActiveUnit handles units that don't have a status column
  // yet (returns the most recently created — same as the old fallback).
  const classIds = classes.map(c => c.id);
  const { data: allUnits } = await supabase
    .from('units')
    .select('id, class_id, section, name, position, status, created_at')
    .in('class_id', classIds);
  const unitsByClass = {};
  (allUnits || []).forEach(u => {
    if (!unitsByClass[u.class_id]) unitsByClass[u.class_id] = [];
    unitsByClass[u.class_id].push(u);
  });

  // 3. Pull recent sessions for these classes — used for "launched today"
  //    status on each deck. Last 14d range is generous and harmless.
  const { data: recentSessions } = await supabase
    .from('sessions')
    .select('id, deck_id, class_id, created_at, status')
    .in('class_id', classIds)
    .in('status', ['lobby', 'active', 'completed'])
    .not('deck_id', 'is', null)
    .gte('created_at', fourteenDaysAgo.toISOString())
    .order('created_at', { ascending: false });

  // Index sessions by deck — for each deck, what's the most recent session?
  const lastSessionByDeck = new Map();
  (recentSessions || []).forEach(s => {
    if (!lastSessionByDeck.has(s.deck_id)) {
      lastSessionByDeck.set(s.deck_id, s);
    }
  });

  // 4. For each class, determine the active unit using the new column.
  //    pickActiveUnit prefers status='active', falls back to 'planned',
  //    and returns null if only 'closed' units exist or there are no
  //    units at all. The classes-without-units fallback path below
  //    handles the null case.
  const activeUnitByClass = {};
  for (const cls of classes) {
    const classUnits = unitsByClass[cls.id] || [];
    const active = pickActiveUnit(classUnits);
    if (active) {
      activeUnitByClass[cls.id] = active;
    }
  }

  // 5. For each class, fetch the decks of its active unit (or recent-fallback
  //    if there's no active unit). Build the result list.
  const out = [];
  for (const cls of classes) {
    const activeUnit = activeUnitByClass[cls.id];

    let decks = [];
    if (activeUnit) {
      // Active-unit path: pull all decks in this unit
      const { data: unitDecks } = await supabase
        .from('decks')
        .select('*')
        .eq('class_id', cls.id)
        .eq('unit_id', activeUnit.id)
        .order('position', { ascending: true });
      decks = unitDecks || [];
    } else {
      // Fallback path: decks launched in this class today or yesterday
      const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
      const recentSessionsInClass = (recentSessions || [])
        .filter(s => s.class_id === cls.id && new Date(s.created_at) >= yesterdayStart);
      const recentDeckIds = Array.from(new Set(recentSessionsInClass.map(s => s.deck_id)));
      if (recentDeckIds.length === 0) continue;
      const { data: recentDecks } = await supabase
        .from('decks')
        .select('*')
        .in('id', recentDeckIds);
      decks = recentDecks || [];
    }

    // 6. For each deck, classify its status and decide whether to include
    for (const deck of decks) {
      const lastSession = lastSessionByDeck.get(deck.id);
      const lastLaunchedAt = lastSession ? new Date(lastSession.created_at) : null;
      const launchedToday = lastLaunchedAt && lastLaunchedAt >= todayStart;

      // For the active-unit path: include warmup + exit_ticket. Skip
      // general_review unless it was launched today (then it counts as
      // "you actually used this today, here it is as done"). For the
      // fallback path: include everything that was launched recently.
      let status;
      if (activeUnit) {
        if (launchedToday) {
          status = "launched_today";
        } else if (deck.section === "warmup" || deck.section === "exit_ticket") {
          status = "pending";
        } else {
          continue; // general_review and not launched today → skip
        }
      } else {
        // Fallback path: only items launched today/yesterday land here
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

  // 7. Sort: pending first (warmup → exit_ticket → review), then
  //    launched_today. Within each bucket, group by class (alphabetical
  //    is already the input order).
  const sectionRank = { warmup: 0, exit_ticket: 1, general_review: 2 };
  out.sort((a, b) => {
    const statusRank = (it) => it.status === "pending" ? 0 : 1;
    const sr = statusRank(a) - statusRank(b);
    if (sr !== 0) return sr;
    const cr = (a.class.name || "").localeCompare(b.class.name || "");
    if (cr !== 0) return cr;
    return (sectionRank[a.deck.section] ?? 9) - (sectionRank[b.deck.section] ?? 9);
  });

  return out;
}

// ─── Get unit retention summary (PR 6: Close unit narrative) ─────────────
//
// Computes the closing-summary stats for a given unit. Used by the
// CloseUnitSummary screen and the past-unit recap line in PlanView.
//
// Returns:
//   {
//     unit:           the unit row,
//     decks:          [{ deck, sessionCount, retention, status }] sorted by position,
//     dayCount:       max(warmup count, exit count) — same logic as PlanView buildDayRows,
//     daysLaunched:   how many days had at least one launch (warmup OR exit),
//     averageRetention: avg of all topic_retention rows tied to this unit's decks,
//     strongest:      the deck with highest retention (or null),
//     weakest:        the deck with lowest retention (or null),
//     totalSessions:  total sessions launched across all decks of this unit,
//   }
//
// Why we compute this client-side (not via a DB view): keeps the
// algorithm transparent and easy to evolve. Per-unit volume is small
// (10–30 decks max), so 2 supabase queries are enough.
export async function getUnitRetentionSummary(unitId) {
  if (!unitId) return null;

  // 1. Fetch the unit and its decks
  const { data: unit } = await supabase
    .from('units')
    .select('*')
    .eq('id', unitId)
    .maybeSingle();
  if (!unit) return null;

  const { data: unitDecks } = await supabase
    .from('decks')
    .select('id, title, section, position')
    .eq('unit_id', unitId)
    .order('position', { ascending: true });
  const decks = unitDecks || [];

  if (decks.length === 0) {
    return {
      unit,
      decks: [],
      dayCount: 0,
      daysLaunched: 0,
      averageRetention: null,
      strongest: null,
      weakest: null,
      totalSessions: 0,
    };
  }

  const deckIds = decks.map(d => d.id);

  // 2. Fetch retention rows + session counts in parallel
  const [retRes, sessRes] = await Promise.all([
    supabase
      .from('topic_retention')
      .select('deck_id, retention_score, total_questions, correct_answers, last_reviewed_at, interval_days, session_count')
      .in('deck_id', deckIds),
    supabase
      .from('sessions')
      .select('id, deck_id, status')
      .in('deck_id', deckIds)
      .in('status', ['active', 'completed']),
  ]);

  const retentionRows = retRes.data || [];
  const sessions = sessRes.data || [];

  // Index sessions by deck for "did this deck ever launch"
  const sessionsByDeck = new Map();
  sessions.forEach(s => {
    sessionsByDeck.set(s.deck_id, (sessionsByDeck.get(s.deck_id) || 0) + 1);
  });

  // For each deck, compute its CURRENT retention from its retention rows.
  // A deck might have multiple topic_retention rows (one per topic). We
  // average them per deck.
  const now = new Date();
  const enrichedDecks = decks.map(deck => {
    const retsForDeck = retentionRows.filter(r => r.deck_id === deck.id);
    let retention = null;
    if (retsForDeck.length > 0) {
      const currents = retsForDeck.map(r => calculateRetention(
        r.last_reviewed_at,
        r.interval_days || 1,
        (r.total_questions || 0) > 0 ? (r.correct_answers || 0) / r.total_questions : 0
      ));
      retention = Math.round(currents.reduce((s, x) => s + x, 0) / currents.length);
    }
    const sessCount = sessionsByDeck.get(deck.id) || 0;
    const status = retention === null ? 'new'
      : retention >= 70 ? 'strong'
      : retention >= 40 ? 'medium'
      : 'weak';
    return { deck, sessionCount: sessCount, retention, status };
  });

  // Day count: max of warmup count and exit count (same as PlanView)
  const warmupCount = decks.filter(d => d.section === 'warmup').length;
  const exitCount = decks.filter(d => d.section === 'exit_ticket').length;
  const dayCount = Math.max(warmupCount, exitCount);

  // Days launched: a "day" counts as launched if its warmup OR exit ticket
  // (or both) had at least one session. We pair them by position.
  const warmupsByPos = new Map();
  const exitsByPos = new Map();
  decks.forEach(d => {
    if (d.section === 'warmup') warmupsByPos.set(d.position, d.id);
    else if (d.section === 'exit_ticket') exitsByPos.set(d.position, d.id);
  });
  let daysLaunched = 0;
  for (let i = 0; i < dayCount; i++) {
    const pos = i;
    const w = warmupsByPos.get(pos);
    const e = exitsByPos.get(pos);
    const wLaunched = w && (sessionsByDeck.get(w) || 0) > 0;
    const eLaunched = e && (sessionsByDeck.get(e) || 0) > 0;
    if (wLaunched || eLaunched) daysLaunched++;
  }

  // Average retention across all decks that have a retention score
  const decksWithScore = enrichedDecks.filter(d => d.retention !== null);
  const averageRetention = decksWithScore.length === 0
    ? null
    : Math.round(decksWithScore.reduce((s, d) => s + d.retention, 0) / decksWithScore.length);

  // Strongest and weakest — null when no decks have retention yet
  let strongest = null, weakest = null;
  if (decksWithScore.length > 0) {
    strongest = decksWithScore.reduce((best, d) =>
      d.retention > best.retention ? d : best, decksWithScore[0]);
    weakest = decksWithScore.reduce((worst, d) =>
      d.retention < worst.retention ? d : worst, decksWithScore[0]);
  }

  const totalSessions = sessions.length;

  // PR6.2: extra counts for the closing-summary header.
  // - Separate warmup vs exit counts (decks AND sessions) so the header
  //   can read "8 warmups launched · 7 exit tickets launched"
  // - Total student responses across all sessions of the unit
  // - Strong/medium/weak topic counts derived from the deck statuses
  const warmupSessionCount = sessions.filter(s => {
    const d = decks.find(x => x.id === s.deck_id);
    return d && d.section === 'warmup';
  }).length;
  const exitSessionCount = sessions.filter(s => {
    const d = decks.find(x => x.id === s.deck_id);
    return d && d.section === 'exit_ticket';
  }).length;

  // Count student responses across all this unit's sessions.
  // We do this in a separate query — `responses` doesn't carry unit_id,
  // so we filter by session_id IN (...). For typical unit volume (10-30
  // sessions max) this is fast.
  let totalResponses = 0;
  if (sessions.length > 0) {
    const sessionIds = sessions.map(s => s.id);
    // We only need a count, not the rows themselves.
    const { count } = await supabase
      .from('responses')
      .select('id', { count: 'exact', head: true })
      .in('session_id', sessionIds);
    totalResponses = count || 0;
  }

  const strongTopics = enrichedDecks.filter(d => d.status === 'strong').length;
  const mediumTopics = enrichedDecks.filter(d => d.status === 'medium').length;
  const weakTopics = enrichedDecks.filter(d => d.status === 'weak').length;

  return {
    unit,
    decks: enrichedDecks,
    dayCount,
    daysLaunched,
    averageRetention,
    strongest,
    weakest,
    totalSessions,
    // PR6.2 additions
    warmupSessionCount,
    exitSessionCount,
    totalResponses,
    strongTopics,
    mediumTopics,
    weakTopics,
  };
}

// ─── PR 25.2: getScheduledPlan — filter by day_dates ─────────────────────
//
// Returns the decks scheduled for a target date (today, by default).
// Unlike getTodayPlan which uses heuristics (most recently active unit,
// recent launches), this function uses the explicit `units.day_dates`
// array set by the teacher via DayDateModal.
//
// Each result item has the same shape as getTodayPlan items:
//   { deck, class, unit, dayNumber, status, lastLaunchedAt }
//
// `status` is one of:
//   - "launched_today" : a session was created for this deck today
//   - "pending"        : not yet launched today
//
// Decks belong to a day if their position-1 equals the index of a
// day_date that matches the target date. So a deck with position=2
// belongs to Day 2; its date is unit.day_dates[1].
//
// No fallback: units WITHOUT day_dates at all don't appear in this
// list. Teachers who haven't migrated their units to dates get an
// empty Today (intentional — per Jota's choice).

export async function getScheduledPlan(teacherId, targetDate = null) {
  if (!teacherId) return [];

  // Anchor target = local-midnight of targetDate (or today). All
  // comparisons against day_dates strings happen at calendar-day
  // resolution.
  const target = targetDate instanceof Date ? new Date(targetDate) : new Date();
  target.setHours(0, 0, 0, 0);
  const targetMs = target.getTime();

  // 1. Classes
  const { data: classes } = await supabase
    .from('classes')
    .select('id, name, subject, grade, color_id')
    .eq('teacher_id', teacherId)
    .order('name', { ascending: true });
  if (!classes || classes.length === 0) return [];

  const classIds = classes.map(c => c.id);

  // 2. Units (need day_dates here)
  const { data: allUnits } = await supabase
    .from('units')
    .select('id, class_id, section, name, position, status, day_dates, created_at')
    .in('class_id', classIds);
  if (!allUnits || allUnits.length === 0) return [];

  // 3. Decks belonging to these units
  const unitIds = allUnits.map(u => u.id);
  const { data: allDecks } = await supabase
    .from('decks')
    .select('*')
    .in('unit_id', unitIds);
  if (!allDecks || allDecks.length === 0) return [];

  // 4. Sessions launched today for these decks (to set status)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { data: todaySessions } = await supabase
    .from('sessions')
    .select('id, deck_id, created_at')
    .in('class_id', classIds)
    .in('status', ['lobby', 'active', 'completed'])
    .gte('created_at', todayStart.toISOString())
    .not('deck_id', 'is', null);
  const launchedTodayMap = new Map();
  (todaySessions || []).forEach(s => {
    if (!launchedTodayMap.has(s.deck_id)) launchedTodayMap.set(s.deck_id, s);
  });

  // 5. Build the output list. For each unit, walk through day_dates
  //    and find decks whose position matches a date hit.
  const out = [];
  const classById = new Map(classes.map(c => [c.id, c]));

  for (const unit of allUnits) {
    const dates = Array.isArray(unit.day_dates) ? unit.day_dates : [];
    if (dates.length === 0) continue;

    // For every day_date that matches target, find the warmup/exit
    // decks at that position.
    dates.forEach((raw, idx) => {
      if (!raw) return;
      const d = raw instanceof Date ? raw : new Date(raw);
      if (Number.isNaN(d.getTime())) return;
      d.setHours(0, 0, 0, 0);
      if (d.getTime() !== targetMs) return;

      const dayNumber = idx + 1;
      const decksAtPos = allDecks.filter(dk =>
        dk.unit_id === unit.id && (dk.position || 0) === dayNumber
      );
      decksAtPos.forEach(deck => {
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

  // 6. Sort: pending first, then by class name, then by section
  //    (warmup before exit_ticket within a class/day).
  const sectionRank = { warmup: 0, exit_ticket: 1, general_review: 2 };
  out.sort((a, b) => {
    const aStatus = a.status === "pending" ? 0 : 1;
    const bStatus = b.status === "pending" ? 0 : 1;
    if (aStatus !== bStatus) return aStatus - bStatus;
    const cn = (a.class?.name || "").localeCompare(b.class?.name || "");
    if (cn !== 0) return cn;
    return (sectionRank[a.deck.section] || 99) - (sectionRank[b.deck.section] || 99);
  });

  return out;
}

// ─── PR 25.2: getUpcomingPlan — next N days ──────────────────────────────
//
// Returns decks scheduled within (today, today + N days] — strictly
// future, not today. Grouped by day for sidebar display.
//
// Returns: [{ date: Date, items: [{ deck, class, unit, dayNumber }] }]
//          sorted by date ascending.
//
// `days` defaults to 7. Used by Today's "Coming up" sidebar.

export async function getUpcomingPlan(teacherId, days = 7) {
  if (!teacherId) return [];

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const limit = new Date(todayStart);
  limit.setDate(limit.getDate() + days);

  // Reuse the classes + units + decks queries from getScheduledPlan.
  // We could share via a helper but two duplications is cheaper than
  // a refactor that risks breaking Today's primary query.
  const { data: classes } = await supabase
    .from('classes')
    .select('id, name, subject, grade, color_id')
    .eq('teacher_id', teacherId)
    .order('name', { ascending: true });
  if (!classes || classes.length === 0) return [];

  const classIds = classes.map(c => c.id);
  const { data: allUnits } = await supabase
    .from('units')
    .select('id, class_id, section, name, position, status, day_dates, created_at')
    .in('class_id', classIds);
  if (!allUnits || allUnits.length === 0) return [];

  const unitIds = allUnits.map(u => u.id);
  const { data: allDecks } = await supabase
    .from('decks')
    .select('*')
    .in('unit_id', unitIds);
  if (!allDecks || allDecks.length === 0) return [];

  // Walk all units, collect (date, items) buckets within (today, +N days]
  const byDate = new Map(); // "YYYY-MM-DD" → { date: Date, items: [] }
  const classById = new Map(classes.map(c => [c.id, c]));

  for (const unit of allUnits) {
    const dates = Array.isArray(unit.day_dates) ? unit.day_dates : [];
    dates.forEach((raw, idx) => {
      if (!raw) return;
      const d = raw instanceof Date ? raw : new Date(raw);
      if (Number.isNaN(d.getTime())) return;
      d.setHours(0, 0, 0, 0);
      // Strictly after today, up to and including `limit`
      if (d.getTime() <= todayStart.getTime() || d.getTime() > limit.getTime()) return;

      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!byDate.has(key)) byDate.set(key, { date: d, items: [] });

      const dayNumber = idx + 1;
      const decksAtPos = allDecks.filter(dk =>
        dk.unit_id === unit.id && (dk.position || 0) === dayNumber
      );
      decksAtPos.forEach(deck => {
        byDate.get(key).items.push({
          deck,
          class: classById.get(unit.class_id),
          unit,
          dayNumber,
        });
      });
    });
  }

  // Sort by date ascending, sort items within each day by section
  const sectionRank = { warmup: 0, exit_ticket: 1, general_review: 2 };
  const result = [...byDate.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
  result.forEach(group => {
    group.items.sort((a, b) => {
      const cn = (a.class?.name || "").localeCompare(b.class?.name || "");
      if (cn !== 0) return cn;
      return (sectionRank[a.deck.section] || 99) - (sectionRank[b.deck.section] || 99);
    });
  });
  return result;
}
