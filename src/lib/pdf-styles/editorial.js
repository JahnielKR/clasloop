// ─── pdf-styles/editorial ────────────────────────────────────────────────
//
// PR 29.0: "Editorial" PDF style — premium, magazine-like, serif-driven.
// Strong typography (serif title, small caps eyebrow), generous margins,
// monospaced question numbers, thick top rule. Designed for higher
// education and professional content — the kind of PDF a department
// head would feel comfortable circulating.
//
// IMPLEMENTATION STATUS: skeleton in this commit, real render coming
// in a follow-up. Currently delegates to classic so existing exports
// don't break.

import { renderExam as classicExam, renderAnswerKey as classicAnswerKey } from "./classic";

export async function renderExam(doc, deck, classObj, opts = {}) {
  return classicExam(doc, deck, classObj, opts);
}

export async function renderAnswerKey(doc, deck, classObj, opts = {}) {
  return classicAnswerKey(doc, deck, classObj, opts);
}
