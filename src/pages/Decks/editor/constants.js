// ─── Deck editor — shared constants ──────────────────────────────────────
// The question-type catalog and the editor-local button style objects, pulled
// out of CreateDeckEditor so the tab/question modules can share them without
// importing the orchestrator. (CSS classes still live in Decks/styles.js;
// these are the inline-style objects that have no class equivalent.)

import { C } from "../styles";

// Question type catalog — drives the type-selector grid and the per-question
// header icon + label. `short` is the compact label for the "+ MCQ" / "+ T/F"
// duplicate-type CTA; keep these 4-6 chars so the button stays slim.
export const ACTIVITY_TYPES = [
  { id: "mcq", icon: "mcq", label: { en: "Multiple Choice", es: "Opción Múltiple", ko: "객관식" }, short: { en: "MCQ", es: "MCQ", ko: "객관식" } },
  { id: "tf", icon: "truefalse", label: { en: "True / False", es: "Verdadero / Falso", ko: "참 / 거짓" }, short: { en: "T/F", es: "V/F", ko: "참/거짓" } },
  { id: "fill", icon: "fillblank", label: { en: "Fill in the Blank", es: "Completar", ko: "빈칸 채우기" }, short: { en: "Fill", es: "Completar", ko: "빈칸" } },
  { id: "order", icon: "ordering", label: { en: "Put in Order", es: "Ordenar", ko: "순서 맞추기" }, short: { en: "Order", es: "Ordenar", ko: "순서" } },
  { id: "match", icon: "matching", label: { en: "Matching Pairs", es: "Emparejar", ko: "짝 맞추기" }, short: { en: "Match", es: "Emparejar", ko: "짝맞추기" } },
  { id: "free", icon: "study", label: { en: "Free Text", es: "Respuesta Libre", ko: "자유 응답" }, short: { en: "Free", es: "Libre", ko: "자유" } },
  { id: "sentence", icon: "language", label: { en: "Sentence Builder", es: "Crear Oración", ko: "문장 만들기" }, short: { en: "Sentence", es: "Oración", ko: "문장" } },
  { id: "slider", icon: "speed", label: { en: "Slider Estimate", es: "Estimar (Slider)", ko: "슬라이더 추정" }, short: { en: "Slider", es: "Slider", ko: "슬라이더" } },
];

export const addMiniBtn = {
  display: "inline-flex", alignItems: "center", gap: 5,
  padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600,
  background: "transparent", color: C.accent,
  border: `1px dashed ${C.accent}66`, cursor: "pointer",
  fontFamily: "'Outfit',sans-serif",
};

export const miniDeleteBtn = {
  width: 28, height: 28, borderRadius: 6, flexShrink: 0,
  background: "transparent", color: C.textMuted,
  border: "none", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 0,
};

export const iconOverImageBtn = {
  width: 24, height: 24, borderRadius: 6,
  background: "rgba(0,0,0,0.5)", color: "#fff",
  border: "none", cursor: "pointer", padding: 0,
  display: "flex", alignItems: "center", justifyContent: "center",
  backdropFilter: "blur(4px)",
};
