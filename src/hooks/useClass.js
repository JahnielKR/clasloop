import { supabase } from '../lib/supabase';

// ─── Create a class ─────────────────────────────────
export async function createClass({ teacherId, name, grade, subject }) {
  // Generate class code
  const code = subject.slice(0, 4).toUpperCase() + '-' + grade.replace(/[^0-9]/g, '') + String.fromCharCode(65 + Math.floor(Math.random() * 26));

  const { data, error } = await supabase
    .from('classes')
    .insert({
      teacher_id: teacherId,
      name,
      grade,
      subject,
      class_code: code,
    })
    .select()
    .single();

  return { data, error };
}

// ─── Get teacher's classes ──────────────────────────
export async function getTeacherClasses(teacherId) {
  const { data, error } = await supabase
    .from('classes')
    .select(`
      *,
      class_members(count)
    `)
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });

  return { data, error };
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
export async function joinClass(classCode, studentName, studentId = null) {
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

// ─── Delete a class ─────────────────────────────────
export async function deleteClass(classId) {
  const { error } = await supabase
    .from('classes')
    .delete()
    .eq('id', classId);

  return { error };
}
