// ─── Practice timer preference per deck ───────────────────────
// El estudiante puede tener cada deck con o sin timer en practice mode. La
// preferencia se guarda por deck (no global) porque la dificultad de cada
// materia es distinta — biología puede gustarle con tiempo, matemáticas sin
// presión.
//
// Storage shape: localStorage["clasloop_practice_timer:<deckId>"] = "on" | "off"
// Default cuando no hay valor guardado: ON.
//
// Usado por:
//   - MyClasses (botón ⏱ en la card del deck, antes de entrar)
//   - StudentJoin (botón pequeño dentro del quiz, durante practice)
//
// Ambos leen/escriben la misma key, así que cualquier toggle se refleja en
// el otro lado al recargar la vista.

const KEY_PREFIX = "clasloop_practice_timer:";

export function getPracticeTimerPref(deckId) {
  if (!deckId || typeof window === "undefined") return true;
  const saved = window.localStorage?.getItem(KEY_PREFIX + deckId);
  if (saved === "off") return false;
  return true; // default ON
}

export function setPracticeTimerPref(deckId, on) {
  if (!deckId || typeof window === "undefined") return;
  window.localStorage?.setItem(KEY_PREFIX + deckId, on ? "on" : "off");
}
