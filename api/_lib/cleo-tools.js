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

const READ_DECLARATIONS = [
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

// ─── Action (write) tools — Track B2 ─────────────────────────────────────────
//
// These don't run on the server. When the model calls one, api/cleo-chat.js
// normalizes the args here (resolving class/unit names → ids, scoped to the
// teacher's own classes) and hands the teacher a CONFIRMATION CARD; the write
// only happens client-side, under the teacher's RLS, after they confirm.
// `navigate` is the exception — it's read-only movement, so the client runs it
// immediately (no card).
const ACTION_DECLARATIONS = [
  {
    name: 'navigate',
    description:
      "Take the teacher to a page, open the deck editor pre-filled for a class, or open a class's report/summary. Use for 'take me to…', 'open…', 'make a warmup for <class>', 'give me a summary/report of <class>'. This only moves them — it never creates or changes data.",
    parameters: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          enum: ['new_deck', 'class_decks', 'class_detail', 'class_insights', 'class_report', 'classes', 'sessions', 'scanner', 'review', 'community', 'settings'],
          description: "Where to go. 'new_deck' opens the deck editor to create a deck (pass class_name to tie it to a class). 'class_report' opens a printable class summary (KPIs, hardest topics, students who need help) — use it when the teacher asks for a summary/report of a class.",
        },
        class_name: { type: 'string', description: 'Optional class to focus/scope the destination.' },
      },
      required: ['target'],
    },
  },
  {
    name: 'create_class',
    description:
      "Create a new class for the teacher. Gather the name, grade and subject first (ask if the teacher didn't say). The teacher confirms before it's created.",
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Class name, e.g. "History 2".' },
        grade: { type: 'string', description: 'Grade/level, e.g. "8" or "10th".' },
        subject: { type: 'string', description: 'Subject, e.g. "Math", "History", "Science".' },
      },
      required: ['name', 'grade'],
    },
  },
  {
    name: 'create_unit',
    description:
      "Create a SINGLE new unit (a folder that groups a class's decks for planning) inside one of the teacher's classes. For several at once (a range like 'units 1 to 8'), use create_units instead. The teacher confirms before it's created.",
    parameters: {
      type: 'object',
      properties: {
        class_name: { type: 'string', description: 'The class the unit belongs to.' },
        name: { type: 'string', description: 'Unit name, e.g. "World War II".' },
      },
      required: ['class_name', 'name'],
    },
  },
  {
    name: 'create_units',
    description:
      "Create SEVERAL units at once inside one of the teacher's classes — a numbered range (e.g. 'units 1 to 8') OR a list of names the teacher gives. Use THIS instead of calling create_unit many times. The teacher sees one card listing the names and confirms before any are created; they can rename each one there.",
    parameters: {
      type: 'object',
      properties: {
        class_name: { type: 'string', description: 'The class the units belong to.' },
        count: { type: 'integer', description: 'How many units for a numbered range, e.g. 8 → "Unit 1"…"Unit 8". Max 20.' },
        start: { type: 'integer', description: 'First number of the range. Default 1.' },
        names: {
          type: 'array',
          items: { type: 'string' },
          description: 'Explicit unit names, in order. Use when the teacher names them; overrides count.',
        },
      },
      required: ['class_name'],
    },
  },
  {
    name: 'generate_review_deck',
    description:
      "Generate and save a recap quiz that targets the weakest topics of a UNIT (uses the class's spaced-repetition data). Saves it as a draft the teacher can review and launch. The teacher confirms before it's generated. Needs the class and the unit; if unsure of the unit name, look it up or ask.",
    parameters: {
      type: 'object',
      properties: {
        class_name: { type: 'string' },
        unit_name: { type: 'string', description: 'The unit to build the review from.' },
      },
      required: ['class_name', 'unit_name'],
    },
  },
  {
    name: 'create_deck',
    description:
      "Create a full quiz/deck for a class and generate its questions with AI — from an attached document if the teacher attached one, otherwise from a topic they describe. Gather the class (and a topic if no document is attached). The teacher confirms before it generates, and generation takes a little while. Saves it as a draft they can review and launch.",
    parameters: {
      type: 'object',
      properties: {
        class_name: { type: 'string' },
        section: {
          type: 'string',
          enum: ['warmup', 'exit_ticket', 'general_review'],
          description: "Kind of deck. Default 'general_review' unless the teacher says a warmup (start of class) or exit ticket (end of class).",
        },
        source: {
          type: 'string',
          enum: ['document', 'topic'],
          description: "Use 'document' when the teacher attached a file to build from; otherwise 'topic'.",
        },
        topic: { type: 'string', description: 'The topic to generate from. Required when no document is attached.' },
        title: { type: 'string', description: 'A short title for the deck. Optional — infer from the topic if not given.' },
        num_questions: { type: 'integer', description: 'How many questions, 3-20. Default 5.' },
        language: { type: 'string', enum: ['en', 'es', 'ko'], description: "Deck language. Default the teacher's current UI language." },
      },
      required: ['class_name'],
    },
  },
  {
    name: 'schedule_unit',
    description:
      "Take the teacher to a unit's planner so they can put its days on the calendar. A unit's days map to whichever class days the teacher actually meets (Day 1 might be Monday, Day 2 Wednesday), so you DON'T pick dates — you just open that unit's planner. Use for 'schedule …', 'put … on the calendar', 'add … to my plan'.",
    parameters: {
      type: 'object',
      properties: {
        class_name: { type: 'string' },
        unit_name: { type: 'string' },
      },
      required: ['class_name', 'unit_name'],
    },
  },
  {
    name: 'launch_session',
    description:
      "Take the teacher to the live-session launch screen for one of their decks (theme + start). This does NOT start the session — it just opens the launch screen so they press go. Use for 'launch …', 'run … live', 'start a session with …'.",
    parameters: {
      type: 'object',
      properties: {
        deck_title: { type: 'string', description: 'The deck to launch.' },
        class_name: { type: 'string', description: 'Optional class to disambiguate decks with similar names.' },
      },
      required: ['deck_title'],
    },
  },
];

// The full set declared to Gemini (read tools + action tools).
export const TOOL_DECLARATIONS = [...READ_DECLARATIONS, ...ACTION_DECLARATIONS];

// Names the chat loop must treat as "propose, don't execute".
export const ACTION_TOOL_NAMES = new Set(ACTION_DECLARATIONS.map((d) => d.name));

const round = (n) => (typeof n === 'number' ? Math.round(n) : n);
const norm = (s) => (s || '').trim().toLowerCase();

// Cap on a single bulk create_units call (anti-abuse; one step can make this many).
const MAX_BULK_UNITS = 20;

// Default names for a numbered unit range, localized by the teacher's UI lang.
// "Unit 1" (en) / "Unidad 1" (es) / "1단원" (ko).
function defaultUnitNames(count, start, lang) {
  const n = Math.max(1, Math.min(MAX_BULK_UNITS, count));
  const s = Number.isFinite(start) ? start : 1;
  const label = (i) => (lang === 'es' ? `Unidad ${i}` : lang === 'ko' ? `${i}단원` : `Unit ${i}`);
  return Array.from({ length: n }, (_, k) => label(s + k));
}

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

// ─── Action normalization (Track B2) ─────────────────────────────────────────
//
// Turns a model's action tool call into a concrete, teacher-scoped action the
// CleoChat client can render as a confirmation card and execute. Resolves
// class/unit names → ids using ONLY this teacher's own rows (same isolation as
// the read tools). Returns { action } on success, or { error, ... } which the
// chat loop feeds back to the model so Cleo can ask the teacher to clarify
// (e.g. "which class?"). Never throws.

async function getClassUnits(supabase, classId) {
  const { data } = await supabase
    .from('units')
    .select('id, name')
    .eq('class_id', classId);
  return data || [];
}

function matchUnit(units, name) {
  if (!name) return null;
  const target = norm(name);
  return (
    units.find((u) => norm(u.name) === target) ||
    units.find((u) => norm(u.name).includes(target) || target.includes(norm(u.name))) ||
    null
  );
}

// Decks the teacher owns (across their classes), optionally scoped to one
// class. Used to resolve a deck by title for launch_session.
async function getTeacherDecks(supabase, teacherId, classId) {
  const classes = await getTeacherClasses(supabase, teacherId);
  let ids = classes.map((c) => c.id);
  if (classId) ids = ids.filter((id) => id === classId);
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from('decks')
    .select('id, title, class_id')
    .in('class_id', ids);
  return data || [];
}

function matchDeck(decks, title) {
  if (!title) return null;
  const target = norm(title);
  return (
    decks.find((d) => norm(d.title) === target) ||
    decks.find((d) => norm(d.title).includes(target) || target.includes(norm(d.title))) ||
    null
  );
}

// Targets that need a resolved class to make sense.
const CLASS_SCOPED_TARGETS = new Set(['class_decks', 'class_detail', 'class_insights', 'class_report']);

export async function normalizeCleoAction(name, args, { supabase, teacherId, lang }) {
  try {
    const a = args || {};
    switch (name) {
      case 'navigate': {
        const target = a.target;
        let classId = null;
        let className = null;
        if (a.class_name) {
          const classes = await getTeacherClasses(supabase, teacherId);
          const cls = matchClass(classes, a.class_name);
          if (cls) { classId = cls.id; className = cls.name; }
          else if (CLASS_SCOPED_TARGETS.has(target)) {
            return { error: 'class_not_found', your_classes: classes.map((c) => c.name) };
          }
        } else if (CLASS_SCOPED_TARGETS.has(target)) {
          const classes = await getTeacherClasses(supabase, teacherId);
          return { error: 'class_required', your_classes: classes.map((c) => c.name) };
        }
        return { action: { type: 'navigate', confirm: false, target, classId, className } };
      }

      case 'create_class': {
        const className = (a.name || '').trim();
        const grade = (a.grade || '').trim();
        const subject = (a.subject || '').trim() || 'General';
        if (!className || !grade) return { error: 'missing_fields', need: ['name', 'grade'] };
        return { action: { type: 'create_class', confirm: true, name: className, grade, subject } };
      }

      case 'create_unit': {
        const classes = await getTeacherClasses(supabase, teacherId);
        const cls = matchClass(classes, a.class_name);
        if (!cls) return { error: 'class_not_found', your_classes: classes.map((c) => c.name) };
        const unitName = (a.name || '').trim();
        if (!unitName) return { error: 'missing_fields', need: ['name'] };
        return { action: { type: 'create_unit', confirm: true, classId: cls.id, className: cls.name, name: unitName } };
      }

      case 'create_units': {
        const classes = await getTeacherClasses(supabase, teacherId);
        const cls = matchClass(classes, a.class_name);
        if (!cls) return { error: 'class_not_found', your_classes: classes.map((c) => c.name) };
        let names = [];
        if (Array.isArray(a.names) && a.names.length) {
          names = a.names.map((s) => (typeof s === 'string' ? s.trim() : '')).filter(Boolean);
        } else {
          const count = parseInt(a.count, 10);
          if (Number.isFinite(count)) names = defaultUnitNames(count, parseInt(a.start, 10), lang);
        }
        names = names.slice(0, MAX_BULK_UNITS);
        if (names.length === 0) return { error: 'need_count_or_names' };
        return { action: { type: 'create_units', confirm: true, classId: cls.id, className: cls.name, names } };
      }

      case 'generate_review_deck': {
        const classes = await getTeacherClasses(supabase, teacherId);
        const cls = matchClass(classes, a.class_name);
        if (!cls) return { error: 'class_not_found', your_classes: classes.map((c) => c.name) };
        const units = await getClassUnits(supabase, cls.id);
        if (units.length === 0) return { error: 'no_units_in_class', class: cls.name };
        const unit = matchUnit(units, a.unit_name);
        if (!unit) return { error: 'unit_not_found', units_in_class: units.map((u) => u.name) };
        return {
          action: {
            type: 'generate_review_deck',
            confirm: true,
            classId: cls.id,
            className: cls.name,
            unitId: unit.id,
            unitName: unit.name,
          },
        };
      }

      case 'create_deck': {
        const classes = await getTeacherClasses(supabase, teacherId);
        const cls = matchClass(classes, a.class_name);
        if (!cls) return { error: 'class_not_found', your_classes: classes.map((c) => c.name) };
        const SECTIONS = ['warmup', 'exit_ticket', 'general_review'];
        const section = SECTIONS.includes(a.section) ? a.section : 'general_review';
        // The file (if any) lives client-side; the model signals it via source.
        const source = a.source === 'document' ? 'document' : 'topic';
        const topic = (a.topic || '').trim();
        // Without a document we need a topic to generate from.
        if (source === 'topic' && topic.length < 3) return { error: 'need_topic' };
        let n = parseInt(a.num_questions, 10);
        if (!Number.isFinite(n)) n = 5;
        n = Math.max(3, Math.min(20, n));
        const language = ['en', 'es', 'ko'].includes(a.language) ? a.language : null;
        const title = (a.title || '').trim() || topic; // executor fills from the file name if still empty
        return {
          action: {
            type: 'create_deck',
            confirm: true,
            classId: cls.id,
            className: cls.name,
            section,
            source,
            topic,
            title,
            numQuestions: n,
            language,
          },
        };
      }

      case 'schedule_unit': {
        const classes = await getTeacherClasses(supabase, teacherId);
        const cls = matchClass(classes, a.class_name);
        if (!cls) return { error: 'class_not_found', your_classes: classes.map((c) => c.name) };
        const units = await getClassUnits(supabase, cls.id);
        if (units.length === 0) return { error: 'no_units_in_class', class: cls.name };
        const unit = matchUnit(units, a.unit_name);
        if (!unit) return { error: 'unit_not_found', units_in_class: units.map((u) => u.name) };
        // Shows a card that explains + offers a button to the unit's planner
        // (where the teacher sets each day's date). We never auto-assign dates —
        // a unit's days map to the teacher's real (often irregular) class days.
        return {
          action: { type: 'schedule_unit', confirm: true, classId: cls.id, className: cls.name, unitId: unit.id, unitName: unit.name },
        };
      }

      case 'launch_session': {
        let classId = null;
        if (a.class_name) {
          const classes = await getTeacherClasses(supabase, teacherId);
          const cls = matchClass(classes, a.class_name);
          if (cls) classId = cls.id;
        }
        const decks = await getTeacherDecks(supabase, teacherId, classId);
        if (decks.length === 0) return { error: 'no_decks' };
        const deck = matchDeck(decks, a.deck_title);
        if (!deck) return { error: 'deck_not_found', your_decks: decks.slice(0, 12).map((d) => d.title) };
        // Read-only: just open the launch screen (no confirmation card).
        return { action: { type: 'launch_session', confirm: false, deckId: deck.id, deckTitle: deck.title } };
      }

      default:
        return { error: `unknown_action: ${name}` };
    }
  } catch (err) {
    return { error: String(err?.message || err) };
  }
}
