import { supabase } from './supabase';
import { retentionTier, type ScoreTier } from './scoring-thresholds';

// ─── Class report data ───────────────────────────────────────────────────
//
// Aggregates a teacher-facing snapshot of one class for the Class Report page
// (src/pages/ClassReport.jsx), which Cleo opens on request. Runs client-side
// under the teacher's own RLS — the same tables the analytics surfaces and
// spaced-repetition already read (topic_retention, student_topic_progress,
// class_members). All numbers are real (no AI estimation).

const round = (n: unknown): number => (typeof n === 'number' ? Math.round(n) : 0);

export interface TopicStat { topic: string; retention: number; answered: number; }
export interface StudentStat { name: string; retention: number; answered: number; }

export interface ClassReportData {
  class: { id: string; name: string; subject: string | null; grade: string | null };
  generatedAt: string;
  kpis: { students: number; topics: number; avgRetention: number | null };
  // Topic counts per retention tier — feeds the distribution donut.
  distribution: Record<ScoreTier, number>;
  hardestTopics: TopicStat[];
  strongestTopics: TopicStat[];
  studentsNeedingHelp: StudentStat[];
}

export async function getClassReport(
  classId: string,
): Promise<{ data?: ClassReportData; error?: string }> {
  if (!classId) return { error: 'missing_class' };

  const { data: cls, error: clsErr } = await supabase
    .from('classes')
    .select('id, name, subject, grade')
    .eq('id', classId)
    .maybeSingle();
  if (clsErr) return { error: clsErr.message };
  if (!cls) return { error: 'class_not_found' };

  const [membersRes, topicsRes, progressRes] = await Promise.all([
    supabase.from('class_members').select('student_name').eq('class_id', classId),
    supabase
      .from('topic_retention')
      .select('topic, retention_score, total_questions')
      .eq('class_id', classId)
      .eq('dismissed', false),
    supabase
      .from('student_topic_progress')
      .select('student_name, retention_score, total_questions')
      .eq('class_id', classId),
  ]);

  const members = membersRes.data || [];
  const topicRows: TopicStat[] = (topicsRes.data || [])
    .filter((t) => t && t.topic)
    .map((t) => ({ topic: t.topic, retention: round(t.retention_score), answered: t.total_questions || 0 }));

  const byRetentionAsc = [...topicRows].sort((a, b) => a.retention - b.retention);
  const hardestTopics = byRetentionAsc.slice(0, 8);
  const strongestTopics = [...topicRows].sort((a, b) => b.retention - a.retention).slice(0, 5);

  const distribution: Record<ScoreTier, number> = { green: 0, orange: 0, red: 0 };
  for (const t of topicRows) distribution[retentionTier(t.retention)] += 1;

  const avgRetention = topicRows.length
    ? round(topicRows.reduce((s, t) => s + t.retention, 0) / topicRows.length)
    : null;

  // Aggregate per-student standing across their topics.
  const byStudent = new Map<string, { sum: number; n: number; answered: number }>();
  for (const r of progressRes.data || []) {
    if (!r || !r.student_name) continue;
    const cur = byStudent.get(r.student_name) || { sum: 0, n: 0, answered: 0 };
    cur.sum += typeof r.retention_score === 'number' ? r.retention_score : 0;
    cur.n += 1;
    cur.answered += r.total_questions || 0;
    byStudent.set(r.student_name, cur);
  }
  const studentsNeedingHelp: StudentStat[] = Array.from(byStudent.entries())
    .map(([name, v]) => ({ name, retention: v.n ? round(v.sum / v.n) : 0, answered: v.answered }))
    .sort((a, b) => a.retention - b.retention)
    .slice(0, 8);

  return {
    data: {
      class: { id: cls.id, name: cls.name, subject: cls.subject, grade: cls.grade },
      generatedAt: new Date().toISOString(),
      kpis: { students: members.length, topics: topicRows.length, avgRetention },
      distribution,
      hardestTopics,
      strongestTopics,
      studentsNeedingHelp,
    },
  };
}
