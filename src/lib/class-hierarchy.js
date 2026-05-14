// ─── Class hierarchy constants ───────────────────────────────────────────
// Phase 1 of the Punto 4 refactor: every deck belongs to a section
// (warmup / exit_ticket / general_review) and optionally a unit within
// that section. Class color can override the subject-derived default.
//
// SECTIONS is the authoritative list — new code that switches on section
// should iterate this array, not hard-code the strings, so future additions
// (e.g. "homework") only need a one-line edit here.

import { C } from "../components/tokens";
import { supabase } from "./supabase";

export const SECTIONS = [
  {
    id: "warmup",
    icon: "rocket",          // 5-min energizer at start of class
    iconFallback: "lightbulb",
  },
  {
    id: "exit_ticket",
    icon: "flag",            // closing checkpoint
    iconFallback: "check",
  },
  {
    id: "general_review",
    icon: "refresh",         // catch-all / spaced repetition pool
    iconFallback: "book",
  },
];

export const SECTION_IDS = SECTIONS.map(s => s.id);

export const DEFAULT_SECTION = "general_review";

export function isValidSection(id) {
  return SECTION_IDS.includes(id);
}

// Convert a section id (DB form: snake_case) to the lessonContext value
// the AI generator expects (camelCase). They mean the same thing — section
// is the storage representation, lessonContext is the prompt-engineering
// hint passed into generateQuestions(). Keeping them in sync via this
// helper means the deck's tab placement and the AI's prompt flavor can
// never drift.
export function sectionToLessonContext(section) {
  if (section === "warmup") return "warmup";
  if (section === "exit_ticket") return "exitTicket";
  return "general"; // general_review or anything unknown
}

// i18n labels per section. The hosting page passes its lang and we return
// the right strings — co-locating means new sections only need a label
// here, not in every page.
export function sectionLabels(lang = "en") {
  if (lang === "es") return {
    warmup: { name: "Warmups", singular: "Warmup", empty: "Aún no hay warmups en esta clase.", newOne: "Nuevo warmup" },
    exit_ticket: { name: "Exit tickets", singular: "Exit ticket", empty: "Aún no hay exit tickets en esta clase.", newOne: "Nuevo exit ticket" },
    general_review: { name: "Repaso general", singular: "Repaso", empty: "Aún no hay decks de repaso en esta clase.", newOne: "Nuevo repaso" },
  };
  if (lang === "ko") return {
    warmup: { name: "워밍업", singular: "워밍업", empty: "이 수업에 워밍업이 없습니다.", newOne: "새 워밍업" },
    exit_ticket: { name: "출구 티켓", singular: "출구 티켓", empty: "이 수업에 출구 티켓이 없습니다.", newOne: "새 출구 티켓" },
    general_review: { name: "일반 복습", singular: "복습", empty: "이 수업에 복습 덱이 없습니다.", newOne: "새 복습" },
  };
  return {
    warmup: { name: "Warmups", singular: "Warmup", empty: "No warmups in this class yet.", newOne: "New warmup" },
    exit_ticket: { name: "Exit tickets", singular: "Exit ticket", empty: "No exit tickets in this class yet.", newOne: "New exit ticket" },
    general_review: { name: "General review", singular: "Review", empty: "No review decks in this class yet.", newOne: "New review" },
  };
}

// ─── Class color palette ─────────────────────────────────────────────────
// 7 named colors + 'auto'. 'auto' means "derive from subject" (the existing
// behavior — keeps unmigrated classes looking the same as before). Each
// named color is an id that resolves to a hex via paletteHex().
//
// Hexes are the same ramp Mid stops (~600) used in the rest of the design
// system. Resolved here (not via CSS vars) because we need hex+alpha
// suffixes (color + "10") for soft tints on cards.

export const CLASS_COLORS = [
  { id: "auto",   hex: null,       autoLabel: true },
  { id: "blue",   hex: "#2383E2" },
  { id: "purple", hex: "#6940A5" },
  { id: "green",  hex: "#0F7B6C" },
  { id: "orange", hex: "#D9730D" },
  { id: "pink",   hex: "#D34185" },
  { id: "yellow", hex: "#D4A017" },
  { id: "red",    hex: "#E03E3E" },
  { id: "gray",   hex: "#888780" },
];

// Subject → color id map. Mirrors the one in MyClassesTeacher / Decks; kept
// here so resolveClassAccent() stays self-contained.
const SUBJ_COLOR = {
  Math: "blue", Science: "green", History: "orange",
  Language: "purple", Art: "pink", Music: "yellow",
  PE: "green", Geography: "green", Other: "gray",
};

const HEX_BY_ID = Object.fromEntries(
  CLASS_COLORS.filter(c => c.hex).map(c => [c.id, c.hex])
);

// Returns the accent hex for a class. Honors color_id if set; falls back
// to the subject-derived color if it's 'auto' or missing. This is the ONE
// function any UI component should call to figure out what color a class
// should show — keeps the 'auto' fallback logic in one place.
export function resolveClassAccent(cls) {
  if (!cls) return HEX_BY_ID.blue;
  const id = cls.color_id;
  if (id && id !== "auto" && HEX_BY_ID[id]) return HEX_BY_ID[id];
  // Auto / unset → derive from subject
  const subjId = SUBJ_COLOR[cls.subject] || "blue";
  return HEX_BY_ID[subjId] || HEX_BY_ID.blue;
}

// ─── Unit status (Phase 5) ───────────────────────────────────────────────
//
// Units gained a `status` column in phase5_units_status.sql:
//   'planned' → created, not actively taught yet (the teacher set it
//               up ahead but it's still in the future)
//   'active'  → currently being taught
//   'closed'  → finished, decks remain searchable but it doesn't crowd
//               the active views
//
// Helpers:
//   UNIT_STATUSES         → list of valid status ids
//   isValidUnitStatus(s)  → guard before writing to the DB
//   pickActiveUnit(units) → from a list of class units, return the one
//                           that should be shown in Plan view
//
// pickActiveUnit selection rules (in order):
//   1. If exactly one unit is status='active', return it.
//   2. If multiple are 'active', the one with the highest `position`
//      wins (manual ordering — teachers create newer units further down).
//   3. If none are 'active', the most-recently-created 'planned' wins
//      (a teacher about to start the next one).
//   4. If only 'closed' units exist, return null — the class has past
//      content but nothing being taught now.
//
// This replaces the heuristic in spaced-repetition.js#getTodayPlan
// (sessions-activity-based). Once Phase 5 is deployed everywhere this
// helper is the canonical answer.

export const UNIT_STATUSES = ["planned", "active", "closed"];

export function isValidUnitStatus(status) {
  return UNIT_STATUSES.includes(status);
}

export function pickActiveUnit(units) {
  if (!Array.isArray(units) || units.length === 0) return null;

  const active = units.filter(u => u.status === "active");
  if (active.length === 1) return active[0];
  if (active.length > 1) {
    // Highest position wins. Tie-break by most-recently-created.
    return [...active].sort((a, b) => {
      const pos = (b.position || 0) - (a.position || 0);
      if (pos !== 0) return pos;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    })[0];
  }

  const planned = units.filter(u => u.status === "planned");
  if (planned.length > 0) {
    // Most-recently-created planned. The teacher's next thing.
    return [...planned].sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
    )[0];
  }

  return null;
}

// ─── Unit status labels (i18n) ───────────────────────────────────────────
// Short readable labels per status, matching the visual chips used in
// ClassPage Plan view header.
export function unitStatusLabel(status, lang = "en") {
  const labels = {
    en: { planned: "Planned", active: "Active", closed: "Closed" },
    es: { planned: "Planeada", active: "Activa", closed: "Cerrada" },
    ko: { planned: "예정", active: "진행 중", closed: "종료됨" },
  };
  return labels[lang]?.[status] || labels.en[status] || status;
}

// ─── PR 25.0: Day dates helpers ──────────────────────────────────────────
//
// Day dates live in units.day_dates as a date[] array. The array is
// 0-indexed at the database level, but every UI-facing call uses
// 1-based dayNumber to match the "Day 1, Day 2, Day 3" UI vocabulary.
//
// FORMAT
//   Dates are stored as ISO date strings (YYYY-MM-DD) — Postgres date
//   type. We never store times. A class on Monday May 26 is "Day 1"
//   regardless of whether it's at 8am or 3pm.
//
// MODEL DETAILS
//   - day_dates.length may be SHORTER than the number of days the unit
//     actually has. That's fine: positions beyond the array length
//     just don't have a date assigned yet. The UI shows "Day N · sin
//     fecha" in that case.
//   - day_dates may have a longer length than active days if a deck
//     was removed. Trailing nulls/dates are harmless — they get
//     filtered out when the UI queries for "today" or "upcoming".
//   - Skipping is allowed: day_dates[0] set + day_dates[1] null +
//     day_dates[2] set is valid (rare in practice but legal). In SQL
//     this would be an array with a NULL element; in JS we treat
//     null/undefined the same.

// Returns the date assigned to dayNumber in this unit, or null if
// unassigned. dayNumber is 1-based (Day 1 → index 0).
//
// Returns a JS Date object (not a string) for easier comparison;
// callers comparing against "today" should use Date.prototype methods.
export function getDayDate(unit, dayNumber) {
  if (!unit || typeof dayNumber !== "number" || dayNumber < 1) return null;
  const arr = Array.isArray(unit.day_dates) ? unit.day_dates : [];
  const raw = arr[dayNumber - 1];
  if (!raw) return null;
  // raw can be a string (YYYY-MM-DD) from Supabase or a Date if a
  // caller passed pre-parsed data. Normalize to Date.
  const d = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Writes a date for one specific day in a unit. Reads the current
// array, expands it (filling missing slots with null) if dayNumber
// exceeds current length, sets the target slot, and writes back.
//
// `date` can be:
//   - a Date object (will be converted to YYYY-MM-DD)
//   - a string (assumed already YYYY-MM-DD)
//   - null/undefined (to clear a previously-set date)
//
// Returns { error } on failure, { unit } on success.
export async function setDayDate(unitId, dayNumber, date) {
  if (!unitId || typeof dayNumber !== "number" || dayNumber < 1) {
    return { error: "invalid args" };
  }

  // Normalize date to YYYY-MM-DD or null
  let dateStr = null;
  if (date instanceof Date) {
    if (!Number.isNaN(date.getTime())) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      dateStr = `${yyyy}-${mm}-${dd}`;
    }
  } else if (typeof date === "string" && date.length > 0) {
    dateStr = date;
  }

  // Read current array
  const { data: cur, error: readErr } = await supabase
    .from("units")
    .select("day_dates")
    .eq("id", unitId)
    .single();
  if (readErr || !cur) return { error: readErr || "unit not found" };

  // Expand or shrink as needed
  const arr = Array.isArray(cur.day_dates) ? [...cur.day_dates] : [];
  while (arr.length < dayNumber) arr.push(null);
  arr[dayNumber - 1] = dateStr;

  const { data, error } = await supabase
    .from("units")
    .update({ day_dates: arr })
    .eq("id", unitId)
    .select()
    .single();

  if (error) return { error };
  return { unit: data };
}

// Returns true if `date` (Date or YYYY-MM-DD string) equals "today"
// in the user's local timezone. Centralized so all callers agree on
// what "today" means (no UTC/local mismatches).
export function isToday(date) {
  if (!date) return false;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

// Returns true if `date` is strictly in the future (any day after
// today). Used by the "Coming up" sidebar.
export function isFuture(date) {
  if (!date) return false;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return false;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const candStart = new Date(d);
  candStart.setHours(0, 0, 0, 0);
  return candStart.getTime() > todayStart.getTime();
}

// Returns true if `date` is within the next `days` days (1-based,
// inclusive of `days`). E.g. daysAhead(date, 7) returns true if date
// is today through 7 days from now. Used to cap "Coming up" to a
// 7-day horizon.
export function isWithinDays(date, days) {
  if (!date) return false;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return false;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const limit = new Date(todayStart);
  limit.setDate(limit.getDate() + days);
  const candStart = new Date(d);
  candStart.setHours(0, 0, 0, 0);
  return (
    candStart.getTime() >= todayStart.getTime() &&
    candStart.getTime() <= limit.getTime()
  );
}

// Suggests the next sensible date when adding a new day to a unit:
// the day after the latest existing day_date, skipping weekends.
// Returns a Date or null if no existing dates to anchor on (caller
// should default to today in that case).
export function suggestNextDayDate(unit) {
  if (!unit) return null;
  const arr = Array.isArray(unit.day_dates) ? unit.day_dates : [];
  // Find the latest non-null date
  let latest = null;
  for (const raw of arr) {
    if (!raw) continue;
    const d = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(d.getTime())) continue;
    if (!latest || d.getTime() > latest.getTime()) latest = d;
  }
  if (!latest) return null;
  // Add 1 day, skip weekends (Sat=6, Sun=0)
  const next = new Date(latest);
  next.setDate(next.getDate() + 1);
  while (next.getDay() === 0 || next.getDay() === 6) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}
