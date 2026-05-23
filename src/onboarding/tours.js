// ─── Tour registry ───────────────────────────────────────────────────────────
// Language-agnostic definition of each first-visit tour. The copy (offer line,
// per-step title/body) lives in i18n under the "tours" namespace, matched to
// these steps BY INDEX — so a tour's `steps` length here must match
// `tours[tourId].steps` length in every locale (en/es/ko).
//
// Each step:
//   anchor?:    value of a `data-tour="<anchor>"` attribute on the page. When
//               present, CleoTour spotlights that element. When absent (or the
//               element isn't found), the step renders as a centered card.
//   placement?: "bottom" | "top" | "center" — where the bubble sits relative to
//               the anchored element. Ignored for centered steps.
//   cleo?:      Cleo's expression for the step (see Cleo/expressions.js).
//
// tourIds align with the page ids in src/routes.ts so each page mounts the
// matching <CleoTour tourId="..." />.

export const TOURS = {
  // Teacher home (/classes → MyClassesTeacher). The very first thing a new
  // teacher should do: create a class (everything hangs off class_id).
  home: {
    steps: [
      { anchor: "new-class", placement: "bottom", cleo: "encouraging" },
      { placement: "center", cleo: "happy" }, // class code = how students join
    ],
  },

  // Class detail (/classes/:id → ClassPage). Fills the two gaps the linear
  // onboarding skipped: creating a unit, and sharing the code with students.
  classDetail: {
    steps: [
      { anchor: "section-tabs", placement: "bottom", cleo: "happy" },
      { anchor: "create-unit", placement: "bottom", cleo: "thinking" },
      { anchor: "class-code", placement: "bottom", cleo: "encouraging" },
      { placement: "center", cleo: "happy" }, // open or create a deck
    ],
  },

  // Deck editor (/decks/new + /decks/:id/edit). Replaces the old ?onboarding=1
  // inline coach: build questions (AI or manual), pick a section, save.
  deckEditor: {
    steps: [
      { anchor: "deck-title", placement: "bottom", cleo: "happy" },
      { anchor: "deck-class", placement: "bottom", cleo: "thinking" },
      { anchor: "deck-section", placement: "bottom", cleo: "thinking" },
      { anchor: "deck-language", placement: "bottom", cleo: "happy" },
      { anchor: "add-questions", placement: "bottom", cleo: "encouraging" },
      { anchor: "save-deck", placement: "top", cleo: "cheer" },
    ],
  },

  // PDF export modal. The "download a PDF" gap the user named.
  pdfExport: {
    steps: [
      { placement: "center", cleo: "happy" },
      { anchor: "pdf-variant", placement: "bottom", cleo: "thinking" },
      { anchor: "pdf-style", placement: "bottom", cleo: "thinking" },
      { anchor: "pdf-download", placement: "top", cleo: "cheer" },
    ],
  },

  // Scanner (/scan). Grade paper exams with the camera. All-centered: the
  // scanner is native-only and stage-based (no stable button to spotlight).
  scanner: {
    steps: [
      { placement: "center", cleo: "happy" },
      { placement: "center", cleo: "encouraging" },
      { placement: "center", cleo: "cheer" }, // review uncertain marks + save
    ],
  },
};

export function getTour(tourId) {
  return TOURS[tourId] || null;
}
