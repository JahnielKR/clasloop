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
function makeSupabase({ classes = [], units = [] } = {}) {
  const resolve = (data) => Promise.resolve({ data, error: null });
  return {
    from(table) {
      return {
        select() {
          return {
            eq() {
              if (table === 'classes') return resolve(classes);
              if (table === 'units') return resolve(units);
              return resolve([]);
            },
          };
        },
      };
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

describe('ACTION_TOOL_NAMES', () => {
  it('marks exactly the four write/navigate tools', () => {
    expect([...ACTION_TOOL_NAMES].sort()).toEqual(
      ['create_class', 'create_unit', 'generate_review_deck', 'navigate'].sort(),
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

describe('unknown action', () => {
  it('returns an unknown_action error', async () => {
    const { error } = await run('frobnicate', {}, {});
    expect(error).toMatch(/unknown_action/);
  });
});
