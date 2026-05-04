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
export async function updateTopicRetention({ classId, topic, subject, totalQuestions, correctAnswers }) {
  if (totalQuestions === 0) return;

  const correctRate = correctAnswers / totalQuestions;
  const percent = Math.round(correctRate * 100);
  const quality = percentToQuality(percent);

  // Get existing retention data
  const { data: existing } = await supabase
    .from('topic_retention')
    .select('*')
    .eq('class_id', classId)
    .eq('topic', topic)
    .single();

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

    await supabase
      .from('topic_retention')
      .update({
        retention_score: retentionScore,
        total_questions: newTotal,
        correct_answers: newCorrect,
        session_count: (existing.session_count || 0) + 1,
        last_reviewed_at: now,
        next_review_at: nextReview.toISOString(),
        ease_factor: sm2.easeFactor,
        interval_days: sm2.interval,
      })
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
  const { data: participants } = await supabase
    .from('session_participants')
    .select('*')
    .eq('session_id', session.id);

  const { data: responses } = await supabase
    .from('responses')
    .select('*')
    .eq('session_id', session.id);

  if (!participants || !responses) return;

  // 1. Update class-level topic retention
  const totalQ = responses.length;
  const totalCorrect = responses.filter(r => r.is_correct).length;

  await updateTopicRetention({
    classId: session.class_id,
    topic: session.topic,
    subject: null,
    totalQuestions: totalQ,
    correctAnswers: totalCorrect,
  });

  // 2. Update per-student retention
  for (const participant of participants) {
    const studentResponses = responses.filter(r => r.participant_id === participant.id);
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

// ─── Get review suggestions for today ───────────────
// ─── Scoring helpers (Phase 2) ──────────────────────
// Higher score = more urgent. Combines retention, days overdue, and class strength.
function urgencyMultiplier(daysSinceReview, isOverdue) {
  if (!isOverdue) return 0;
  if (daysSinceReview <= 3)  return 1.0;
  if (daysSinceReview <= 7)  return 1.3;
  if (daysSinceReview <= 14) return 1.7;
  return 2.0;
}

function classFactor(classAverage) {
  // Boost struggling classes, soften strong ones.
  if (!Number.isFinite(classAverage) || classAverage === 0) return 1.0;
  if (classAverage < 60) return 1.2;
  if (classAverage > 80) return 0.8;
  return 1.0;
}

// Auto-decay: topics shown as overdue for too long without action get gradually
// deprioritized. Not hidden — just less urgent visually so they don't clog the
// top of the list. The teacher can always find them via "View all reviews".
function autoDecayMultiplier(daysSinceReview, isOverdue) {
  if (!isOverdue) return 1.0;
  if (daysSinceReview <= 14) return 1.0; // no decay first 2 weeks overdue
  if (daysSinceReview <= 30) return 0.7; // 30% decay
  return 0.4; // 60% decay after 30 days
}

function computeScore(retention, daysSinceReview, isOverdue, classAverage) {
  const base = Math.max(0, 100 - retention);
  return Math.round(
    base
    * urgencyMultiplier(daysSinceReview, isOverdue)
    * classFactor(classAverage)
    * autoDecayMultiplier(daysSinceReview, isOverdue)
  );
}

export async function getReviewSuggestions(classId, classAverage = null) {
  const { data: topics } = await supabase
    .from('topic_retention')
    .select('*')
    .eq('class_id', classId)
    .order('retention_score', { ascending: true });

  if (!topics) return [];

  const now = new Date();

  // Recalculate current retention for each topic
  const withCurrentRetention = topics
    // Filter out dismissed and currently-snoozed topics first.
    .filter(t => {
      if (t.dismissed === true) return false;
      if (t.snoozed_until && new Date(t.snoozed_until) > now) return false;
      return true;
    })
    .map(t => {
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
        urgency: isOverdue ? (100 - currentRetention) + daysSinceReview : 0, // legacy, kept for compat
        score: computeScore(currentRetention, daysSinceReview, isOverdue, classAverage),
      };
    });

  // Filter to actionable suggestions and sort by new score (desc)
  const suggestions = withCurrentRetention
    .filter(t => t.is_overdue || t.current_retention < 70)
    .sort((a, b) => b.score - a.score);

  return suggestions;
}

// ─── Snooze / Dismiss management (Phase 3) ─────────────────────────────────

// Snooze a topic for `days` days. Snoozed topics don't appear in suggestions
// until the snooze expires. Pass days=0 to clear an existing snooze.
export async function snoozeTopic(topicId, days) {
  if (!topicId) return { error: 'missing_topic_id' };
  let snoozedUntil = null;
  if (Number.isFinite(days) && days > 0) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    snoozedUntil = d.toISOString();
  }
  const { error } = await supabase
    .from('topic_retention')
    .update({ snoozed_until: snoozedUntil })
    .eq('id', topicId);
  return error ? { error: error.message } : { ok: true, snoozed_until: snoozedUntil };
}

// Permanently dismiss a topic from suggestions. Can be reversed with undismissTopic.
export async function dismissTopic(topicId) {
  if (!topicId) return { error: 'missing_topic_id' };
  const { error } = await supabase
    .from('topic_retention')
    .update({ dismissed: true })
    .eq('id', topicId);
  return error ? { error: error.message } : { ok: true };
}

// Undo a dismiss (re-enable suggestions for this topic).
export async function undismissTopic(topicId) {
  if (!topicId) return { error: 'missing_topic_id' };
  const { error } = await supabase
    .from('topic_retention')
    .update({ dismissed: false, snoozed_until: null })
    .eq('id', topicId);
  return error ? { error: error.message } : { ok: true };
}

// ─── Get all reviews across all classes for a teacher ──────────────────────
// Returns a flat list of suggestions enriched with the class info, sorted by score.
// Used by the "View all reviews" panel in Phase 2.
export async function getAllReviewsForTeacher(teacherId) {
  const { data: classes } = await supabase
    .from('classes')
    .select('*')
    .eq('teacher_id', teacherId);

  if (!classes || classes.length === 0) return [];

  // Pull retention overviews in parallel for class average context.
  const overviews = await Promise.all(classes.map(c => getClassRetentionOverview(c.id)));
  const overviewByClassId = Object.fromEntries(classes.map((c, i) => [c.id, overviews[i]]));

  // Pull suggestions per class (with classAverage for proper scoring).
  const perClass = await Promise.all(classes.map(c => {
    const avg = overviewByClassId[c.id]?.average ?? null;
    return getReviewSuggestions(c.id, avg).then(suggestions => ({ cls: c, suggestions }));
  }));

  const flat = [];
  for (const { cls, suggestions } of perClass) {
    for (const s of suggestions) {
      flat.push({ ...s, class: cls });
    }
  }
  flat.sort((a, b) => b.score - a.score);
  return flat;
}

// ─── Smart batching: group weak topics by class for combined sessions ──────
// A "batch" is offered when a class has 3+ weak topics (retention < 65%).
// Returns an array of { cls, topics, avgRetention } objects, sorted by need.
export function buildSmartBatches(allReviews, minTopicsPerBatch = 3, weakRetentionThreshold = 65) {
  const byClassId = {};
  for (const r of allReviews) {
    if (r.current_retention >= weakRetentionThreshold) continue; // only weak ones go into batches
    const id = r.class.id;
    if (!byClassId[id]) byClassId[id] = { cls: r.class, topics: [] };
    byClassId[id].topics.push(r);
  }

  const batches = [];
  for (const id of Object.keys(byClassId)) {
    const { cls, topics } = byClassId[id];
    if (topics.length < minTopicsPerBatch) continue;
    // Cap batch size to keep sessions reasonable.
    const top = topics.slice(0, 8);
    const avgRet = Math.round(top.reduce((s, t) => s + t.current_retention, 0) / top.length);
    batches.push({
      cls,
      topics: top,
      avgRetention: avgRet,
      // Use the highest-scored topic in the batch as the batch priority.
      score: Math.max(...top.map(t => t.score)),
    });
  }
  batches.sort((a, b) => b.score - a.score);
  return batches;
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
