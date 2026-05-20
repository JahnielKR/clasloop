// ─── Shared Supabase row shapes ─────────────────────────────────────────
//
// PR 84: tipos centralizados para los rows que vienen de Supabase. La
// idea es que cada módulo .ts que toque la DB use estas interfaces en
// lugar de inventar las suyas y se desincronicen.
//
// Estos tipos describen lo que el .select('*') devuelve, NO lo que la
// tabla tiene en SQL (algunos campos son nullable en SQL pero el código
// JS los trata como obligatorios; otros tienen defaults y siempre vienen).
//
// Pragmatismo: si una columna no se usa en código, no la incluyo —
// se puede agregar después. La meta no es ser exhaustivo, es atrapar
// los typos comunes (ej. `r.deck_Id` cuando es `r.deck_id`).

// ─── Classes ────────────────────────────────────────────────────────────

export interface ClassRow {
  id: string;
  name: string;
  subject: string | null;
  grade: string | null;
  /** Hex/palette color id used by ClassCard for the tile color. */
  color_id?: string | null;
  teacher_id?: string;
}

// ─── Units ──────────────────────────────────────────────────────────────

/** Phase 5: explicit lifecycle column. */
export type UnitStatus = "active" | "planned" | "closed";

export interface UnitRow {
  id: string;
  class_id: string;
  /** Some legacy code reads "section" on units even though it's a deck concept. Kept optional. */
  section?: string | null;
  name: string;
  position: number;
  status: UnitStatus | null;
  /** Array of YYYY-MM-DD strings (or Date objects, legacy code paths), one per scheduled day. PR 25.2. */
  day_dates?: Array<string | Date | null> | null;
  created_at?: string;
}

// ─── Decks ──────────────────────────────────────────────────────────────

/** Deck section — drives where it appears in PlanView and what it does. */
export type DeckSection = "warmup" | "exit_ticket" | "general_review";

export interface DeckRow {
  id: string;
  class_id: string;
  unit_id: string | null;
  title: string;
  section: DeckSection | string;
  position: number | null;
  /** Other fields exist (questions, language, etc); not needed for typing here. */
  [key: string]: unknown;
}

// ─── Sessions ───────────────────────────────────────────────────────────

export type SessionStatus = "lobby" | "active" | "completed" | string;

export interface SessionRow {
  id: string;
  deck_id: string | null;
  class_id: string | null;
  topic?: string | null;
  status: SessionStatus;
  created_at: string;
}

// ─── Participants & Responses ───────────────────────────────────────────

export interface SessionParticipantRow {
  id: string;
  session_id: string;
  student_id: string | null;
  student_name: string;
  is_guest?: boolean;
  is_kicked?: boolean;
}

export interface ResponseRow {
  id: string;
  session_id: string;
  participant_id: string;
  is_correct: boolean | null;
}

// ─── Topic retention ────────────────────────────────────────────────────

export interface TopicRetentionRow {
  id: string;
  class_id: string;
  deck_id: string | null;
  topic: string;
  subject: string | null;
  retention_score: number;
  total_questions: number | null;
  correct_answers: number | null;
  session_count: number | null;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  ease_factor: number | null;
  interval_days: number | null;
}

// ─── Student progress (per-student per-topic) ───────────────────────────

export interface StudentTopicProgressRow {
  class_id: string;
  student_name: string;
  student_id: string | null;
  topic: string;
  retention_score: number;
  total_questions: number | null;
  correct_answers: number | null;
}
