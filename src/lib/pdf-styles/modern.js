// ─── pdf-styles/modern ──────────────────────────────────────────────────
//
// PR 29.0: "Modern" PDF style — colorful, youth-friendly, card-based.
// Designed for younger students (primary, early secondary). Gradient
// header band, colored question cards, pill-shaped answer options,
// emoji-friendly icons.
//
// IMPLEMENTATION STATUS: skeleton in this commit, real render coming
// in a follow-up. Currently delegates to classic so existing exports
// don't break. Replace bodies with the modern render once design is set.

import { renderExam as classicExam, renderAnswerKey as classicAnswerKey } from "./classic";

export async function renderExam(doc, deck, classObj, opts = {}) {
  // TODO PR 29.0.x: implement the modern style. For now, delegate to
  // classic so the dispatcher works end-to-end and the modal-selector
  // PR (29.1) can be built against a stable interface.
  return classicExam(doc, deck, classObj, opts);
}

export async function renderAnswerKey(doc, deck, classObj, opts = {}) {
  return classicAnswerKey(doc, deck, classObj, opts);
}
