import { supabase } from './supabase';
import type { UnitRow } from './db-types';

// ─── Create a unit (teacher) ────────────────────────────────────────────
//
// Mirrors the inline insert ClassPage uses from its empty-state: the new
// unit lands at the end (position = max + 1) and the FIRST unit of a class
// becomes 'active' so PlanView has something to show; any later one is
// 'planned' to preserve the existing active unit.
//
// Centralized here so Cleo's action layer (src/lib/cleo-actions.js) creates
// units through the same logic. Runs under the teacher's own RLS. Returns
// { unit } on success or { error } — never throws.
//
// `existingUnits` lets a caller that already holds the class's units (e.g.
// ClassPage) skip the extra fetch; omit it and we fetch the minimal columns
// we need to compute position/status.
export async function createUnit(args: {
  classId: string;
  name: string;
  existingUnits?: Array<{ position?: number | null }>;
}): Promise<{ unit?: UnitRow; error?: string }> {
  const classId = args.classId;
  const name = (args.name || '').trim();
  if (!classId) return { error: 'A unit needs a class.' };
  if (!name) return { error: 'A unit needs a name.' };

  let units = args.existingUnits;
  if (!units) {
    const { data, error } = await supabase
      .from('units')
      .select('position')
      .eq('class_id', classId);
    if (error) return { error: error.message };
    units = data || [];
  }

  const nextPos =
    units.length === 0
      ? 1
      : Math.max(...units.map((u) => u.position || 0)) + 1;
  const status = units.length === 0 ? 'active' : 'planned';

  const { data, error } = await supabase
    .from('units')
    .insert({ class_id: classId, section: null, name, position: nextPos, status })
    .select()
    .single();
  if (error) return { error: error.message };
  return { unit: data as UnitRow };
}
