// ─── journey.js ──────────────────────────────────────────────────────────────
// The "first class" guided journey: a cross-page, resumable onboarding that
// walks a brand-new teacher through clase → unidad → warmup → editor → lanzar.
//
// Unlike the per-page first-visit tours (useFirstVisitTour), the journey carries
// a single pointer across navigations, so it can resume after a refresh and hand
// off between pages. Each leg's tour auto-starts on its page while the pointer
// sits on that leg; the *real* action (create class/unit/warmup, save the deck,
// launch) advances the pointer — the tour overlay is modal, so it explains and
// then gets out of the way for the user to act.
//
// The pointer lives per-user in localStorage (no DB column — same trade-off as
// the seen-tours list in useFirstVisitTour).
import { safeGetJSON, safeSetJSON } from "../lib/safe-storage";

export const JOURNEY_ID = "firstClass";

// Ordered legs. "home" is the entry leg; "finale" ends with confetti.
export const LEGS = ["home", "unit", "warmup", "editor", "finale"];

const key = (userId) => `cl.journey.${userId || "anon"}`;

// In-tab change notifier — localStorage's native "storage" event only fires in
// OTHER tabs, so same-tab transitions (e.g. jUnit → jWarmup on the same page)
// need this to re-render subscribers (useJourney).
const listeners = new Set();
function emit() {
  listeners.forEach((fn) => {
    try { fn(); } catch { /* a bad listener shouldn't break the rest */ }
  });
}
export function subscribeJourney(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getJourney(userId) {
  const j = safeGetJSON(key(userId), null);
  return j && typeof j === "object" ? j : null;
}

// Called once when a brand-new teacher picks the teacher role.
export function startJourney(userId) {
  const j = { id: JOURNEY_ID, leg: "home", classId: null, unitId: null, done: false };
  safeSetJSON(key(userId), j);
  emit();
  return j;
}

// Advance to `leg`, optionally patching carried context (classId, unitId).
export function setJourneyLeg(userId, leg, patch = {}) {
  const base = getJourney(userId) || { id: JOURNEY_ID, classId: null, unitId: null, done: false };
  const next = { ...base, ...patch, id: JOURNEY_ID, leg, done: false };
  safeSetJSON(key(userId), next);
  emit();
  return next;
}

// End the journey for good — reached the finale, or the teacher skipped it.
export function finishJourney(userId) {
  const base = getJourney(userId) || { id: JOURNEY_ID, leg: "finale", classId: null, unitId: null };
  const next = { ...base, id: JOURNEY_ID, done: true };
  safeSetJSON(key(userId), next);
  emit();
  return next;
}

export function isJourneyActive(userId) {
  const j = getJourney(userId);
  return !!(j && j.id === JOURNEY_ID && !j.done);
}

// The current leg id, or null when no journey is active.
export function journeyLeg(userId) {
  const j = getJourney(userId);
  if (!j || j.id !== JOURNEY_ID || j.done) return null;
  return j.leg;
}
