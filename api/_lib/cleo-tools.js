// ─── api/_lib/cleo-tools.js — Cleo's read-only data tools (Track B / B1) ──────
//
// These are the functions Cleo (api/cleo-chat.js) can call to answer questions
// about the teacher's own classes, students and spaced-repetition progress.
//
// SECURITY — tenant isolation is enforced HERE and only here. The supabase
// client passed in is the SERVICE_KEY admin client (it bypasses RLS), so every
// tool MUST start from the classes this teacher owns (classes.teacher_id =
// teacherId) and constrain all queries to those class ids. A teacher can never
// see another teacher's classes or students. No raw SQL — only the query
// builder with parameterized .eq()/.in() filters; name matching happens in JS
// over rows we already scoped.

export const TOOL_DECLARATIONS = [
  {
    name: 'list_classes',
    description:
      "List the teacher's own classes with subject, grade and how many students each has. Use when the teacher asks what classes they have, or to find the exact class name before another lookup.",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'list_students',
    description:
      "List the student names in one of the teacher's classes. Use to find a student's exact name or to see the roster.",
    parameters: {
      type: 'object',
      properties: {
        class_name: { type: 'string', description: 'The class name, e.g. "Español 1".' },
      },
      required: ['class_name'],
    },
  },
  {
    name: 'get_student_progress',
    description:
      "Get one student's spaced-repetition progress in a class: retention score per topic (0-100), questions answered, and which topics are strongest/weakest. Use for 'how is X doing?'.",
    parameters: {
      type: 'object',
      properties: {
        class_name: { type: 'string' },
        student_name: { type: 'string' },
      },
      required: ['class_name', 'student_name'],
    },
  },
  {
    name: 'get_class_overview',
    description:
      "Get a class summary: number of students, subject/grade, and the class's topics with retention scores and when each is due for spaced-repetition review. Use for 'how is my class doing?'.",
    parameters: {
      type: 'object',
      properties: { class_name: { type: 'string' } },
      required: ['class_name'],
    },
  },
  {
    name: 'get_weak_topics',
    description:
      "List the weakest topics in a class (lowest retention) with their next spaced-repetition review date. Use for 'what should I reteach?' or 'what's due for review?'.",
    parameters: {
      type: 'object',
      properties: { class_name: { type: 'string' } },
      required: ['class_name'],
    },
  },
];

const round = (n) => (typeof n === 'number' ? Math.round(n) : n);
const norm = (s) => (s || '').trim().toLowerCase();

async function getTeacherClasses(supabase, teacherId) {
  const { data, error } = await supabase
    .from('classes')
    .select('id, name, grade, subject')
    .eq('teacher_id', teacherId);
  if (error) throw new Error(error.message);
  return data || [];
}

// Resolve a class the teacher owns by (fuzzy) name. Exact match first, then a
// contains match either direction. Returns null if nothing plausible.
function matchClass(classes, name) {
  if (!name) return null;
  const target = norm(name);
  return (
    classes.find((c) => norm(c.name) === target) ||
    classes.find((c) => norm(c.name).includes(target) || target.includes(norm(c.name))) ||
    null
  );
}

// Single entry point used by the chat loop. Always returns a plain object
// (never throws) so the model can react to errors ("class not found", etc.).
export async function executeCleoTool(name, args, { supabase, teacherId }) {
  try {
    switch (name) {
      case 'list_classes':
        return await listClasses(supabase, teacherId);
      case 'list_students':
        return await listStudents(supabase, teacherId, args || {});
      case 'get_student_progress':
        return await getStudentProgress(supabase, teacherId, args || {});
      case 'get_class_overview':
        return await getClassOverview(supabase, teacherId, args || {});
      case 'get_weak_topics':
        return await getWeakTopics(supabase, teacherId, args || {});
      default:
        return { error: `unknown_tool: ${name}` };
    }
  } catch (err) {
    return { error: String(err?.message || err) };
  }
}

async function listClasses(supabase, teacherId) {
  const classes = await getTeacherClasses(supabase, teacherId);
  if (classes.length === 0) return { classes: [] };
  const ids = classes.map((c) => c.id);
  const { data: members } = await supabase
    .from('class_members')
    .select('class_id')
    .in('class_id', ids);
  const counts = {};
  for (const m of members || []) counts[m.class_id] = (counts[m.class_id] || 0) + 1;
  return {
    classes: classes.map((c) => ({
      name: c.name,
      subject: c.subject,
      grade: c.grade,
      students: counts[c.id] || 0,
    })),
  };
}

async function listStudents(supabase, teacherId, { class_name }) {
  const classes = await getTeacherClasses(supabase, teacherId);
  const cls = matchClass(classes, class_name);
  if (!cls) return { error: 'class_not_found', your_classes: classes.map((c) => c.name) };
  const { data } = await supabase
    .from('class_members')
    .select('student_name')
    .eq('class_id', cls.id);
  return { class: cls.name, students: (data || []).map((m) => m.student_name) };
}

async function getStudentProgress(supabase, teacherId, { class_name, student_name }) {
  const classes = await getTeacherClasses(supabase, teacherId);
  const cls = matchClass(classes, class_name);
  if (!cls) return { error: 'class_not_found', your_classes: classes.map((c) => c.name) };

  const { data: members } = await supabase
    .from('class_members')
    .select('student_name')
    .eq('class_id', cls.id);
  const names = (members || []).map((m) => m.student_name);
  const target = norm(student_name);
  const matched =
    names.find((n) => norm(n) === target) || names.find((n) => norm(n).includes(target));
  if (!matched) return { error: 'student_not_found', students_in_class: names };

  const { data: rows } = await supabase
    .from('student_topic_progress')
    .select('topic, retention_score, total_questions, correct_answers, last_reviewed_at')
    .eq('class_id', cls.id)
    .eq('student_name', matched);

  if (!rows || rows.length === 0) {
    return { class: cls.name, student: matched, note: 'No progress recorded yet for this student.' };
  }

  const topics = rows
    .map((r) => ({
      topic: r.topic,
      retention: round(r.retention_score),
      answered: r.total_questions,
      correct: r.correct_answers,
      last_reviewed: r.last_reviewed_at,
    }))
    .sort((a, b) => (a.retention || 0) - (b.retention || 0));
  const avg = round(topics.reduce((s, t) => s + (t.retention || 0), 0) / topics.length);

  return {
    class: cls.name,
    student: matched,
    overall_retention: avg,
    weakest: topics.slice(0, 3),
    strongest: [...topics].reverse().slice(0, 3),
    topics,
  };
}

async function getClassOverview(supabase, teacherId, { class_name }) {
  const classes = await getTeacherClasses(supabase, teacherId);
  const cls = matchClass(classes, class_name);
  if (!cls) return { error: 'class_not_found', your_classes: classes.map((c) => c.name) };

  const [{ count: studentCount }, { data: topics }] = await Promise.all([
    supabase.from('class_members').select('id', { count: 'exact', head: true }).eq('class_id', cls.id),
    supabase
      .from('topic_retention')
      .select('topic, retention_score, total_questions, next_review_at, last_reviewed_at')
      .eq('class_id', cls.id)
      .eq('dismissed', false)
      .order('retention_score', { ascending: true }),
  ]);

  return {
    class: cls.name,
    subject: cls.subject,
    grade: cls.grade,
    students: studentCount || 0,
    topics_by_retention: (topics || []).map((r) => ({
      topic: r.topic,
      retention: round(r.retention_score),
      answered: r.total_questions,
      due_for_review: r.next_review_at,
      last_reviewed: r.last_reviewed_at,
    })),
  };
}

async function getWeakTopics(supabase, teacherId, { class_name }) {
  const classes = await getTeacherClasses(supabase, teacherId);
  const cls = matchClass(classes, class_name);
  if (!cls) return { error: 'class_not_found', your_classes: classes.map((c) => c.name) };

  const { data } = await supabase
    .from('topic_retention')
    .select('topic, retention_score, total_questions, next_review_at, interval_days')
    .eq('class_id', cls.id)
    .eq('dismissed', false)
    .order('retention_score', { ascending: true })
    .limit(8);

  return {
    class: cls.name,
    weak_topics: (data || []).map((r) => ({
      topic: r.topic,
      retention: round(r.retention_score),
      answered: r.total_questions,
      due_for_review: r.next_review_at,
      interval_days: r.interval_days,
    })),
  };
}
