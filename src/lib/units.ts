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

// ─── Rename a unit (teacher) ────────────────────────────────────────────
//
// Updates only the name — same as PlanView's inline rename (PlanView.jsx:160).
// Centralized so Cleo's action layer renames through one path. Runs under the
// teacher's own RLS. Returns { unit } on success or { error } — never throws.
export async function renameUnit(args: {
  unitId: string;
  name: string;
}): Promise<{ unit?: UnitRow; error?: string }> {
  const name = (args.name || '').trim();
  if (!args.unitId) return { error: 'A unit is required.' };
  if (!name) return { error: 'A unit needs a name.' };

  const { data, error } = await supabase
    .from('units')
    .update({ name })
    .eq('id', args.unitId)
    .select()
    .single();
  if (error) return { error: error.message };
  return { unit: data as UnitRow };
}

// ─── Delete a unit (teacher) ────────────────────────────────────────────
//
// Deletes the unit row. Cleo only calls this for an EMPTY unit — the
// "no decks" check lives server-side in api/_lib/cleo-tools.js so a non-empty
// unit never reaches here. Runs under RLS. Returns { ok } or { error }.
export async function deleteUnit(unitId: string): Promise<{ ok?: boolean; error?: string }> {
  if (!unitId) return { error: 'A unit is required.' };
  const { error } = await supabase.from('units').delete().eq('id', unitId);
  if (error) return { error: error.message };
  return { ok: true };
}
