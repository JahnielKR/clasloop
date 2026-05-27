/* @vitest-environment node */
// Tests for Cleo's server-side action normalization (Track B2). Pure logic:
// resolve class/unit names → ids (scoped to the teacher's own rows), validate
// required fields, and shape the action the client confirms. We mock the
// Supabase query builder so no DB/env is needed.
import { describe, it, expect } from 'vitest';
import { normalizeCleoAction, ACTION_TOOL_NAMES } from '../../../api/_lib/cleo-tools.js';

// Minimal chainable mock: from(table).select(...).eq(...) resolves to { data }
// chosen by table. Mirrors getTeacherClasses / getClassUnits which both do a
// single .eq() then await.
function makeSupabase({ classes = [], units = [], decks = [] } = {}) {
  // `count` mirrors a head:true count query (the mock ignores .eq() filters, so
  // craft per-test rows to drive the empty-unit / class-counts paths).
  const resolve = (data) => Promise.resolve({ data, count: Array.isArray(data) ? data.length : 0, error: null });
  const pick = (table) =>
    table === 'classes' ? classes : table === 'units' ? units : table === 'decks' ? decks : [];
  return {
    from(table) {
      // getTeacherClasses/getClassUnits use .eq(); getTeacherDecks uses .in().
      const r = () => resolve(pick(table));
      return { select() { return { eq: r, in: r }; } };
    },
  };
}

const TEACHER = 't1';
const CLASSES = [
  { id: 'c1', name: 'History 2', grade: '8', subject: 'History' },
  { id: 'c2', name: 'Math 1', grade: '7', subject: 'Math' },
];

const run = (name, args, opts) =>
  normalizeCleoAction(name, args, { supabase: makeSupabase(opts), teacherId: TEACHER });
// Same, but also passes the teacher's UI language (used for default unit names).
const runL = (name, args, opts, lang) =>
  normalizeCleoAction(name, args, { supabase: makeSupabase(opts), teacherId: TEACHER, lang });

describe('ACTION_TOOL_NAMES', () => {
  it('marks exactly the write/navigate tools', () => {
    expect([...ACTION_TOOL_NAMES].sort()).toEqual(
      ['create_class', 'create_deck', 'create_unit', 'create_units', 'delete_item', 'generate_review_deck', 'launch_session', 'move_deck', 'navigate', 'rename_item', 'schedule_unit'].sort(),
    );
  });
});

describe('navigate', () => {
  it('returns a read-only (confirm:false) action with no class needed', async () => {
    const { action, error } = await run('navigate', { target: 'classes' }, {});
    expect(error).toBeUndefined();
    expect(action).toMatchObject({ type: 'navigate', confirm: false, target: 'classes', classId: null });
  });

  it('resolves a fuzzy class name for a class-scoped target', async () => {
    const { action } = await run('navigate', { target: 'class_insights', class_name: 'history' }, { classes: CLASSES });
    expect(action).toMatchObject({ target: 'class_insights', classId: 'c1', className: 'History 2' });
  });

  it('resolves class_report (the class summary) to a class-scoped navigate', async () => {
    const { action } = await run('navigate', { target: 'class_report', class_name: 'math' }, { classes: CLASSES });
    expect(action).toMatchObject({ type: 'navigate', confirm: false, target: 'class_report', classId: 'c2' });
  });

  it('requires a class for class-scoped targets when none is given', async () => {
    const { action, error } = await run('navigate', { target: 'class_detail' }, { classes: CLASSES });
    expect(action).toBeUndefined();
    expect(error).toBe('class_required');
  });

  it('reports class_not_found (with the teacher\'s classes) for an unknown name', async () => {
    const res = await run('navigate', { target: 'class_detail', class_name: 'Chemistry' }, { classes: CLASSES });
    expect(res.error).toBe('class_not_found');
    expect(res.your_classes).toEqual(['History 2', 'Math 1']);
  });
});

describe('create_class', () => {
  it('defaults subject to General when missing', async () => {
    const { action } = await run('create_class', { name: 'Biology', grade: '9' }, {});
    expect(action).toMatchObject({ type: 'create_class', confirm: true, name: 'Biology', grade: '9', subject: 'General' });
  });

  it('keeps a provided subject', async () => {
    const { action } = await run('create_class', { name: 'Biology', subject: 'Science', grade: '10' }, {});
    expect(action.subject).toBe('Science');
  });

  it('errors when a required field is missing', async () => {
    const { action, error, need } = await run('create_class', { name: 'Biology' }, {});
    expect(action).toBeUndefined();
    expect(error).toBe('missing_fields');
    expect(need).toContain('grade');
  });
});

describe('create_unit', () => {
  it('resolves the class and shapes the action', async () => {
    const { action } = await run('create_unit', { class_name: 'math', name: 'Fractions' }, { classes: CLASSES });
    expect(action).toMatchObject({ type: 'create_unit', confirm: true, classId: 'c2', className: 'Math 1', name: 'Fractions' });
  });

  it('errors on unknown class', async () => {
    const { error } = await run('create_unit', { class_name: 'Chemistry', name: 'X' }, { classes: CLASSES });
    expect(error).toBe('class_not_found');
  });

  it('errors on missing unit name', async () => {
    const { error } = await run('create_unit', { class_name: 'math', name: '  ' }, { classes: CLASSES });
    expect(error).toBe('missing_fields');
  });
});

describe('create_units (bulk)', () => {
  it('expands a count into localized default names (en)', async () => {
    const { action } = await runL('create_units', { class_name: 'history', count: 3 }, { classes: CLASSES }, 'en');
    expect(action).toMatchObject({ type: 'create_units', confirm: true, classId: 'c1', className: 'History 2' });
    expect(action.names).toEqual(['Unit 1', 'Unit 2', 'Unit 3']);
  });

  it('localizes default names by lang and honors start', async () => {
    const { action } = await runL('create_units', { class_name: 'math', count: 2, start: 4 }, { classes: CLASSES }, 'es');
    expect(action.names).toEqual(['Unidad 4', 'Unidad 5']);
  });

  it('uses explicit names over count (trimmed, empties dropped)', async () => {
    const { action } = await runL('create_units', { class_name: 'history', count: 9, names: ['  Intro ', '', 'Atoms'] }, { classes: CLASSES }, 'en');
    expect(action.names).toEqual(['Intro', 'Atoms']);
  });

  it('caps the batch at 20 units', async () => {
    const { action } = await runL('create_units', { class_name: 'history', count: 50 }, { classes: CLASSES }, 'en');
    expect(action.names).toHaveLength(20);
  });

  it('errors when neither count nor names is given', async () => {
    const res = await run('create_units', { class_name: 'history' }, { classes: CLASSES });
    expect(res.error).toBe('need_count_or_names');
  });

  it('errors on unknown class', async () => {
    const res = await run('create_units', { class_name: 'Chemistry', count: 3 }, { classes: CLASSES });
    expect(res.error).toBe('class_not_found');
  });
});

describe('rename_item', () => {
  it('renames a class', async () => {
    const { action } = await run('rename_item', { type: 'class', name: 'history', new_name: 'History 3' }, { classes: CLASSES });
    expect(action).toMatchObject({ type: 'rename_class', confirm: true, classId: 'c1', className: 'History 2', newName: 'History 3' });
  });

  it('renames a unit, scoped to its class', async () => {
    const { action } = await run(
      'rename_item',
      { type: 'unit', name: 'world war', new_name: 'WWII', class_name: 'history' },
      { classes: CLASSES, units: [{ id: 'u1', name: 'World War II' }] },
    );
    expect(action).toMatchObject({ type: 'rename_unit', unitId: 'u1', classId: 'c1', newName: 'WWII' });
  });

  it('renames a deck (carries classId for the view link)', async () => {
    const { action } = await run(
      'rename_item',
      { type: 'deck', name: 'fractions quiz', new_name: 'Fractions 1' },
      { classes: CLASSES, decks: [{ id: 'd2', title: 'Fractions Quiz', class_id: 'c2' }] },
    );
    expect(action).toMatchObject({ type: 'rename_deck', deckId: 'd2', classId: 'c2', newName: 'Fractions 1' });
  });

  it('errors on a blank new name', async () => {
    const res = await run('rename_item', { type: 'class', name: 'history', new_name: '  ' }, { classes: CLASSES });
    expect(res.error).toBe('missing_fields');
  });
});

describe('delete_item', () => {
  it('deletes a deck (destructive, no empty check)', async () => {
    const { action } = await run(
      'delete_item',
      { type: 'deck', name: 'fractions quiz' },
      { classes: CLASSES, decks: [{ id: 'd2', title: 'Fractions Quiz', class_id: 'c2' }] },
    );
    expect(action).toMatchObject({ type: 'delete_deck', confirm: true, destructive: true, deckId: 'd2' });
  });

  it('deletes an EMPTY unit', async () => {
    const { action } = await run(
      'delete_item',
      { type: 'unit', name: 'world war', class_name: 'history' },
      { classes: CLASSES, units: [{ id: 'u1', name: 'World War II' }], decks: [] },
    );
    expect(action).toMatchObject({ type: 'delete_unit', destructive: true, unitId: 'u1' });
  });

  it('refuses a NON-empty unit with the deck count', async () => {
    const res = await run(
      'delete_item',
      { type: 'unit', name: 'world war', class_name: 'history' },
      { classes: CLASSES, units: [{ id: 'u1', name: 'World War II' }], decks: [{ id: 'd9', title: 'x', class_id: 'c1' }] },
    );
    expect(res.error).toBe('unit_not_empty');
    expect(res.deck_count).toBe(1);
  });

  it('deletes a class with a type-to-confirm payload + counts', async () => {
    const { action } = await run(
      'delete_item',
      { type: 'class', name: 'history' },
      { classes: CLASSES, decks: [{ id: 'd1', title: 'a', class_id: 'c1' }] },
    );
    expect(action).toMatchObject({
      type: 'delete_class', destructive: true, classId: 'c1',
      confirmName: 'History 2', deckCount: 1, studentCount: 0,
    });
  });
});

describe('move_deck', () => {
  const DECKS = [{ id: 'd2', title: 'Fractions Quiz', class_id: 'c2' }];

  it('moves a deck into a unit', async () => {
    const { action } = await run(
      'move_deck',
      { deck_title: 'fractions quiz', to_unit: 'cold war', class_name: 'math' },
      { classes: CLASSES, decks: DECKS, units: [{ id: 'u2', name: 'Cold War' }] },
    );
    expect(action).toMatchObject({ type: 'move_deck', deckId: 'd2', classId: 'c2', toUnitId: 'u2', toUnitName: 'Cold War' });
  });

  it('moves a deck to the class level when to_unit is omitted', async () => {
    const { action } = await run('move_deck', { deck_title: 'fractions quiz' }, { classes: CLASSES, decks: DECKS });
    expect(action).toMatchObject({ type: 'move_deck', deckId: 'd2', toUnitId: null, toUnitName: null });
  });

  it("treats 'none' as the class level", async () => {
    const { action } = await run('move_deck', { deck_title: 'fractions quiz', to_unit: 'none' }, { classes: CLASSES, decks: DECKS });
    expect(action.toUnitId).toBeNull();
  });
});

describe('generate_review_deck', () => {
  const UNITS = [{ id: 'u1', name: 'World War II' }, { id: 'u2', name: 'Cold War' }];

  it('resolves class + unit (fuzzy) into a confirm action', async () => {
    const { action } = await run(
      'generate_review_deck',
      { class_name: 'history', unit_name: 'world war' },
      { classes: CLASSES, units: UNITS },
    );
    expect(action).toMatchObject({
      type: 'generate_review_deck', confirm: true,
      classId: 'c1', className: 'History 2', unitId: 'u1', unitName: 'World War II',
    });
  });

  it('errors when the class has no units', async () => {
    const { error } = await run('generate_review_deck', { class_name: 'history', unit_name: 'x' }, { classes: CLASSES, units: [] });
    expect(error).toBe('no_units_in_class');
  });

  it('reports unit_not_found with the class\'s units', async () => {
    const res = await run('generate_review_deck', { class_name: 'history', unit_name: 'Renaissance' }, { classes: CLASSES, units: UNITS });
    expect(res.error).toBe('unit_not_found');
    expect(res.units_in_class).toEqual(['World War II', 'Cold War']);
  });
});

describe('create_deck', () => {
  it('builds a document-source action with sane defaults', async () => {
    const { action } = await run('create_deck', { class_name: 'history', source: 'document' }, { classes: CLASSES });
    expect(action).toMatchObject({
      type: 'create_deck', confirm: true,
      classId: 'c1', className: 'History 2',
      section: 'general_review', source: 'document', numQuestions: 5,
    });
  });

  it('requires a topic when no document is attached', async () => {
    const { action, error } = await run('create_deck', { class_name: 'history', source: 'topic', topic: 'hi' }, { classes: CLASSES });
    expect(action).toBeUndefined();
    expect(error).toBe('need_topic');
  });

  it('accepts a topic source with section, count and language', async () => {
    const { action } = await run(
      'create_deck',
      { class_name: 'math', source: 'topic', topic: 'Fractions basics', num_questions: 8, section: 'warmup', language: 'es' },
      { classes: CLASSES },
    );
    expect(action).toMatchObject({
      classId: 'c2', section: 'warmup', source: 'topic',
      topic: 'Fractions basics', numQuestions: 8, language: 'es',
    });
  });

  it('clamps num_questions to 3..20 and defaults an unknown section', async () => {
    const { action } = await run('create_deck', { class_name: 'history', source: 'document', num_questions: 99, section: 'weird' }, { classes: CLASSES });
    expect(action.numQuestions).toBe(20);
    expect(action.section).toBe('general_review');
  });

  it('nulls an invalid language so the executor can fall back', async () => {
    const { action } = await run('create_deck', { class_name: 'history', source: 'document', language: 'fr' }, { classes: CLASSES });
    expect(action.language).toBeNull();
  });

  it('errors on unknown class', async () => {
    const { error } = await run('create_deck', { class_name: 'Chemistry', source: 'document' }, { classes: CLASSES });
    expect(error).toBe('class_not_found');
  });
});

describe('schedule_unit', () => {
  const UNITS = [{ id: 'u1', name: 'World War II' }];

  it('resolves class + unit into a card action that opens the planner (no date)', async () => {
    const { action } = await run('schedule_unit', { class_name: 'history', unit_name: 'world war' }, { classes: CLASSES, units: UNITS });
    expect(action).toMatchObject({ type: 'schedule_unit', confirm: true, classId: 'c1', unitId: 'u1', unitName: 'World War II' });
  });

  it('errors on unknown class / unit', async () => {
    expect((await run('schedule_unit', { class_name: 'Chem', unit_name: 'x' }, { classes: CLASSES, units: UNITS })).error).toBe('class_not_found');
    expect((await run('schedule_unit', { class_name: 'history', unit_name: 'Renaissance' }, { classes: CLASSES, units: UNITS })).error).toBe('unit_not_found');
  });
});

describe('launch_session', () => {
  const DECKS = [
    { id: 'd1', title: 'Unit 1 Warmup', class_id: 'c1' },
    { id: 'd2', title: 'Fractions Quiz', class_id: 'c2' },
  ];

  it('resolves a deck by title into a read-only launch action', async () => {
    const { action } = await run('launch_session', { deck_title: 'fractions quiz' }, { classes: CLASSES, decks: DECKS });
    expect(action).toMatchObject({ type: 'launch_session', confirm: false, deckId: 'd2', deckTitle: 'Fractions Quiz' });
  });

  it('reports deck_not_found with the teacher\'s decks', async () => {
    const res = await run('launch_session', { deck_title: 'Nonexistent' }, { classes: CLASSES, decks: DECKS });
    expect(res.error).toBe('deck_not_found');
    expect(res.your_decks).toEqual(['Unit 1 Warmup', 'Fractions Quiz']);
  });
});

describe('unknown action', () => {
  it('returns an unknown_action error', async () => {
    const { error } = await run('frobnicate', {}, {});
    expect(error).toMatch(/unknown_action/);
  });
});
