// ─── Tiempos por tipo de pregunta — fuente de verdad ───────────
//
// Set de tiempos permitidos por cada tipo de pregunta. Es la fuente de verdad
// para:
//   - El prompt AI (ai-prompt.js): el modelo elige UN valor del set por
//     pregunta basándose en complejidad real.
//   - validateQuestion (ai.js): si la AI manda un valor fuera del set, lo
//     normalizamos al default. No descartamos la pregunta — el time_limit
//     es opcional y siempre puede caer al default.
//   - CreateDeckEditor: barra "Estimated session time" suma los time_limit
//     (o defaults si no hay).
//   - SessionFlow: cuando el profe abre Total mode, el slider arranca en
//     ceil(suma de time_limit / 60) como default sugerido.
//   - StudentJoin: lee q.time_limit; si está, lo usa; si no, cae al default.
//
// Si en el futuro queremos cambiar valores, este es el ÚNICO lugar.

export const TIME_LIMITS = {
  mcq:      { allowed: [15, 30, 45], default: 30 },
  tf:       { allowed: [10, 15, 20], default: 15 },
  fill:     { allowed: [20, 30, 45], default: 30 },
  order:    { allowed: [30, 45, 60], default: 45 },
  match:    { allowed: [30, 45, 60], default: 45 },
  free:     { allowed: [60, 90, 120], default: 90 },
  sentence: { allowed: [45, 60, 90], default: 60 },
  slider:   { allowed: [15, 25, 40], default: 25 },
  // poll no tiene timer (opinión); resolveTimeLimit devuelve null para él.
  poll:     { allowed: [], default: null },
};

// Resuelve el tiempo efectivo de una pregunta, en segundos.
// Si la pregunta tiene time_limit y está en el set permitido, lo usa.
// Si no está o está fuera de rango, cae al default del tipo.
// Si el tipo es poll → null (sin timer).
export function resolveTimeLimit(q) {
  if (!q || typeof q !== "object") return null;
  const config = TIME_LIMITS[q.type];
  if (!config) return null;
  if (config.default === null) return null;
  const candidate = q.time_limit;
  if (typeof candidate === "number" && config.allowed.includes(candidate)) {
    return candidate;
  }
  return config.default;
}

// Suma el tiempo total estimado de un deck en segundos.
// Pasa por cada pregunta y aplica resolveTimeLimit. Polls suman 0 (sin timer).
export function estimateDeckSeconds(questions) {
  if (!Array.isArray(questions)) return 0;
  let total = 0;
  for (const q of questions) {
    const t = resolveTimeLimit(q);
    if (t) total += t;
  }
  return total;
}

// Formatea segundos a string "X min" o "X min Y s" para mostrar al profe.
// Redondea hacia arriba al minuto más cercano cuando los segundos sobrantes
// son ≥ 30, ya que en práctica un minuto extra siempre es buen cushion.
export function formatDeckDuration(totalSeconds, lang = "en") {
  if (totalSeconds <= 0) {
    return lang === "es" ? "—" : (lang === "ko" ? "—" : "—");
  }
  const min = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  if (min === 0) {
    if (lang === "es") return `${sec} s`;
    if (lang === "ko") return `${sec}초`;
    return `${sec}s`;
  }
  if (sec === 0) {
    if (lang === "es") return `${min} min`;
    if (lang === "ko") return `${min}분`;
    return `${min} min`;
  }
  if (lang === "es") return `${min} min ${sec} s`;
  if (lang === "ko") return `${min}분 ${sec}초`;
  return `${min} min ${sec}s`;
}
