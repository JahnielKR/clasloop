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
export async function joinClass(classCode, studentName, studentId = null) {
  // Find class by code
  const { data: cls, error: findError } = await supabase
    .from('classes')
    .select('*')
    .eq('class_code', classCode.toUpperCase())
    .single();

  if (findError || !cls) {
    return { error: 'Class not found. Check the code and try again.' };
  }

  // Add member
  const { data: member, error: joinError } = await supabase
    .from('class_members')
    .insert({
      class_id: cls.id,
      student_name: studentName,
      student_id: studentId,
    })
    .select()
    .single();

  if (joinError) {
    if (joinError.code === '23505') {
      return { class: cls, error: 'Already joined this class.' };
    }
    return { error: joinError.message };
  }

  return { class: cls, member };
}

// ─── Delete a class ─────────────────────────────────
export async function deleteClass(classId) {
  const { error } = await supabase
    .from('classes')
    .delete()
    .eq('id', classId);

  return { error };
}
