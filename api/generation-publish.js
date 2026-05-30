// ─── api/generation-publish.js ───────────────────────────────────────────
//
// Área 4: completa el "oro" de una generación cuando el docente GUARDA el deck.
// Recibe { generationId, finalQuestions } y hace UPDATE de ai_generations:
//   output_final + time_to_publish_ms + accepted_count + edited_count
// (accepted/edited se calculan comparando output_raw vs finalQuestions, server-side).
//
// Idempotente: la PRIMERA publicación gana (re-guardar el deck no infla el
// time-to-publish ni re-cuenta). Ownership: solo el dueño de la generación.
// El cliente lo llama fire-and-forget al guardar; un fallo no rompe el guardado.

import { requireTeacher } from './_lib/auth.js';
import { diffRawVsFinal } from './_lib/ai-gold.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const auth = await requireTeacher(req, res);
  if (!auth) return; // error response already sent
  const supabaseAdmin = auth.supabase;
  const userId = auth.user.id;

  const { generationId, finalQuestions } = req.body || {};
  if (!generationId || !Array.isArray(finalQuestions)) {
    return res.status(400).json({ error: 'bad_request' });
  }

  try {
    const { data: row, error: selErr } = await supabaseAdmin
      .from('ai_generations')
      .select('id, teacher_id, output_raw, created_at, output_final')
      .eq('id', generationId)
      .single();

    if (selErr || !row) {
      return res.status(404).json({ error: 'not_found' });
    }
    // Ownership: el endpoint usa SERVICE_KEY (bypasea RLS), así que el guard
    // explícito es la autorización real.
    if (row.teacher_id !== userId) {
      return res.status(403).json({ error: 'forbidden' });
    }
    // Idempotente: la primera publicación gana.
    if (row.output_final != null) {
      return res.status(200).json({ ok: true, note: 'already_published' });
    }

    const { accepted, edited, discarded } = diffRawVsFinal(row.output_raw, finalQuestions);
    const ttp = Math.max(0, Date.now() - new Date(row.created_at).getTime());

    const { error: updErr } = await supabaseAdmin
      .from('ai_generations')
      .update({
        output_final: finalQuestions,
        time_to_publish_ms: ttp,
        accepted_count: accepted,
        edited_count: edited,
      })
      .eq('id', generationId);

    if (updErr) {
      console.error('generation-publish update failed:', updErr);
      return res.status(500).json({ error: 'update_failed' });
    }

    return res.status(200).json({ ok: true, accepted, edited, discarded, time_to_publish_ms: ttp });
  } catch (e) {
    console.error('generation-publish threw:', e);
    return res.status(500).json({ error: e.message });
  }
}
