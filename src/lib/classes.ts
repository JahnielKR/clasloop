import { supabase } from './supabase';
import type { ClassRow } from './db-types';

// ─── Create a class (teacher) ───────────────────────
//
// Generates a friendly join code server-side via the generate_class_code RPC
// (e.g. "MATH-8B") and inserts the class row. Runs under the teacher's own
// RLS (the same path the create-class modal used inline before PR-Cleo-B2).
//
// Centralized here so BOTH the CreateClassModal and Cleo's action layer
// (src/lib/cleo-actions.js) create classes through one path instead of
// duplicating the RPC + insert. Returns { class } on success or { error }
// with a human-readable message — never throws.
export async function createClass(args: {
  teacherId: string;
  name: string;
  subject: string;
  grade: string;
}): Promise<{ class?: ClassRow; error?: string }> {
  const teacherId = args.teacherId;
  const name = (args.name || '').trim();
  const subject = (args.subject || '').trim();
  const grade = (args.grade || '').trim();

  if (!teacherId) return { error: 'You must be signed in to create a class.' };
  if (!name || !grade) return { error: 'A class needs a name and a grade.' };

  // Friendly, unique join code (e.g. "MATH-8B").
  const { data: rpcCode, error: rpcErr } = await supabase.rpc('generate_class_code', {
    p_subject: subject,
    p_grade: grade,
  });
  if (rpcErr || !rpcCode) {
    return { error: rpcErr?.message || 'Could not generate class code' };
  }

  const { data, error } = await supabase
    .from('classes')
    .insert({ teacher_id: teacherId, name, subject, grade, class_code: rpcCode })
    .select()
    .single();
  if (error) return { error: error.message };
  return { class: data as ClassRow };
}

// ─── Join a class (student) ─────────────────────────
//
// PR 72: ahora usa el RPC join_class_by_code en lugar de hacer INSERT
// directo a class_members. El RPC valida server-side que el class_code
// corresponde a una clase real — antes cualquiera con un class_id (UUID)
// podía meterse a cualquier clase saltándose el código.
//
// El RPC es idempotent: si el alumno ya es member, devuelve la row
// existente en vez de errorear (igual semántica que el código anterior
// que detectaba duplicado por código 23505).
//
// Devuelve la misma shape que antes: { class, member } o { error }.
//
// PR 140: este archivo era src/hooks/useClass.js pero nunca fue un hook.
// Renombrado a lib/classes.ts y migrado a TS. Las funciones createClass /
// getTeacherClasses / deleteClass se eliminaron: no tenían consumers.
export async function joinClass(
  classCode: string,
  studentName: string,
  studentId: string | null = null,
): Promise<{ class?: unknown; member?: unknown; error?: string }> {
  if (!studentId) {
    return { error: 'You must be signed in to join a class.' };
  }

  const { data, error } = await supabase.rpc('join_class_by_code', {
    p_class_code:   classCode,
    p_student_name: studentName,
    p_student_id:   studentId,
  });

  if (error) {
    // El RPC tira excepciones con mensajes específicos (raise exception 'foo').
    // Supabase las pasa como error.message. Las traducimos a los mismos
    // mensajes que el código viejo devolvía, para no romper UI.
    const msg = error.message || '';
    if (msg.includes('class_not_found')) {
      return { error: 'Class not found. Check the code and try again.' };
    }
    if (msg.includes('not_authenticated') || msg.includes('identity_mismatch')) {
      return { error: 'You must be signed in to join a class.' };
    }
    if (msg.includes('invalid_class_code') || msg.includes('invalid_name')) {
      return { error: 'Invalid input.' };
    }
    return { error: msg };
  }

  // El RPC devuelve { class, member } como jsonb.
  return { class: data?.class, member: data?.member };
}
