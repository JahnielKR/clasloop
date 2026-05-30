// api/_lib/ai-gold.js
//
// Pure diff for the ai_generations "gold": compara output_raw (lo que generó
// la IA) vs las preguntas finales (lo que el docente guardó en el deck) para
// derivar accepted / edited / discarded. Sin React, sin Supabase — lo usa el
// endpoint api/generation-publish.js. Vive en api/_lib (no en src/) para que
// la función serverless lo bundlee sin import cross-folder. Testeado desde
// src/lib/__tests__/ai-gold.test.js.
//
// Heurística (robusta a la normalización del editor, que añade campos como
// `multi`/`time_limit`): comparamos SOLO el TEXTO de la pregunta.
//   - texto normalizado idéntico a alguna final → accepted (la usó tal cual)
//   - no idéntico pero similar (Jaccard de tokens >= 0.5) → edited (la reescribió)
//   - sin match → discarded (la descartó)
// Limitación consciente: una edición que sólo cambia una opción/respuesta (sin
// tocar el texto) cuenta como accepted. Suficiente para la tasa de aceptación.

function normText(q) {
  const raw = String((q && (q.q ?? q.question ?? q.prompt)) ?? "");
  return raw.toLowerCase().replace(/\s+/g, " ").replace(/[?.!,;:]+$/g, "").trim();
}

function tokenSet(text) {
  return new Set(text.split(" ").filter(Boolean));
}

function jaccard(aSet, bSet) {
  if (aSet.size === 0 && bSet.size === 0) return 1;
  let inter = 0;
  for (const tk of aSet) if (bSet.has(tk)) inter++;
  const union = aSet.size + bSet.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * @param {Array} raw   output_raw de la generación (preguntas crudas de la IA)
 * @param {Array} final preguntas finales del deck al guardar
 * @returns {{ accepted: number, edited: number, discarded: number }}
 */
export function diffRawVsFinal(raw, final) {
  const rawArr = Array.isArray(raw) ? raw : [];
  const finalArr = Array.isArray(final) ? final : [];
  const finalNorm = finalArr.map(normText);
  const finalSets = finalNorm.map(tokenSet);

  let accepted = 0, edited = 0, discarded = 0;
  for (const rq of rawArr) {
    const rt = normText(rq);
    if (!rt) { discarded++; continue; }
    if (finalNorm.includes(rt)) { accepted++; continue; }
    const rset = tokenSet(rt);
    let best = 0;
    for (const fs of finalSets) {
      const j = jaccard(rset, fs);
      if (j > best) best = j;
    }
    if (best >= 0.5) edited++;
    else discarded++;
  }
  return { accepted, edited, discarded };
}
