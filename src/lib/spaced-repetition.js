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
