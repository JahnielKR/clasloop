import { supabase } from './supabase';

// ─── Create a deck (teacher) ────────────────────────────────────────────
//
// Inserts a deck row owned by the teacher (author_id), under their own RLS —
// the same shape saveReviewDeck (close-unit-ai.js) uses. Centralized here so
// Cleo's create_deck action (src/lib/cleo-actions.js) saves a generated deck
// through one path. The questions array is whatever the AI pipeline
// (generateQuestions) returned. Returns { deck } on success or { error }.
//
// `section` is one of warmup | exit_ticket | general_review. `unit_id` stays
// null — a chat-created deck lives at the class level; the teacher can file it
// into a unit later from the editor.
export async function createDeck(args: {
  teacherId: string;
  classId: string;
  section: string;
  title: string;
  subject?: string | null;
  grade?: string | null;
  language?: string;
  questions: unknown[];
  description?: string;
}): Promise<{ deck?: { id: string; title: string }; error?: string }> {
  const title = (args.title || '').trim();
  if (!args.teacherId) return { error: 'You must be signed in to create a deck.' };
  if (!args.classId) return { error: 'A deck needs a class.' };
  if (!title) return { error: 'A deck needs a title.' };
  if (!Array.isArray(args.questions) || args.questions.length === 0) {
    return { error: 'A deck needs at least one question.' };
  }

  const { data, error } = await supabase
    .from('decks')
    .insert({
      title,
      description: args.description || '',
      class_id: args.classId,
      unit_id: null,
      section: args.section || 'general_review',
      author_id: args.teacherId,
      // subject/grade are NOT NULL in the schema — fall back to '' defensively.
      subject: args.subject || '',
      grade: args.grade || '',
      language: args.language || 'en',
      questions: args.questions,
      is_public: false,
    })
    .select('id, title')
    .single();
  if (error) return { error: error.message };
  return { deck: data as { id: string; title: string } };
}

// ─── Rename a deck (teacher) ────────────────────────────────────────────
//
// Updates only the title. Centralized so Cleo's action layer renames through
// one path. Runs under the teacher's own RLS. Returns { deck } or { error }.
export async function renameDeck(args: {
  deckId: string;
  title: string;
}): Promise<{ deck?: { id: string; title: string }; error?: string }> {
  const title = (args.title || '').trim();
  if (!args.deckId) return { error: 'A deck is required.' };
  if (!title) return { error: 'A deck needs a title.' };

  const { data, error } = await supabase
    .from('decks')
    .update({ title })
    .eq('id', args.deckId)
    .select('id, title')
    .single();
  if (error) return { error: error.message };
  return { deck: data as { id: string; title: string } };
}

// ─── Delete a deck (teacher) ────────────────────────────────────────────
//
// Mirrors the inline delete in Decks.jsx:250. Runs under RLS.
export async function deleteDeck(deckId: string): Promise<{ ok?: boolean; error?: string }> {
  if (!deckId) return { error: 'A deck is required.' };
  const { error } = await supabase.from('decks').delete().eq('id', deckId);
  if (error) return { error: error.message };
  return { ok: true };
}

// ─── Move a deck to a unit, or back to class level (teacher) ────────────
//
// `unitId` null files the deck at the class level (no unit) — same as the
// inline moves in ClassPage.jsx:746 / PlanView.jsx:1313. Runs under RLS.
export async function moveDeck(args: {
  deckId: string;
  unitId: string | null;
}): Promise<{ ok?: boolean; error?: string }> {
  if (!args.deckId) return { error: 'A deck is required.' };
  const { error } = await supabase
    .from('decks')
    .update({ unit_id: args.unitId ?? null })
    .eq('id', args.deckId);
  if (error) return { error: error.message };
  return { ok: true };
}
