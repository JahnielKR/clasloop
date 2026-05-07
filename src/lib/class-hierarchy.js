// ─── Class hierarchy constants ───────────────────────────────────────────
// Phase 1 of the Punto 4 refactor: every deck belongs to a section
// (warmup / exit_ticket / general_review) and optionally a unit within
// that section. Class color can override the subject-derived default.
//
// SECTIONS is the authoritative list — new code that switches on section
// should iterate this array, not hard-code the strings, so future additions
// (e.g. "homework") only need a one-line edit here.

import { C } from "../components/tokens";

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
