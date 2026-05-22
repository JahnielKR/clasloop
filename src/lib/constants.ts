// ─── lib/constants.ts ───────────────────────────────────────────────────
//
// PR 138 (M2): single source of truth for the subjects Clasloop teaches.
// Previously this exact array was duplicated in 6 files — drift waiting to
// happen (add a subject in one, forget the others).
//
// IMPORTANT: these English strings are BOTH the labels shown in the UI AND
// the values persisted to the DB (classes.subject, decks.subject). The
// <option> elements use the string as value and text. Do NOT rename or
// reorder-to-different-values without a data migration — existing rows store
// "Math", "Science", etc. (That's also why this PR keeps the plain string
// array instead of the id/icon/i18n redesign the README sketched: that would
// change the stored values and break every existing class/deck filter.)

export const SUBJECTS = [
  "Math",
  "Science",
  "History",
  "Language",
  "Geography",
  "Art",
  "Music",
  "Other",
] as const;

export type Subject = (typeof SUBJECTS)[number];
