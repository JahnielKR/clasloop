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

// Deck-editor step geometry, shared by the standalone `deckEditor` tour and the
// journey's `jEditor` leg (same anchors, different copy — see i18n).
const DECK_EDITOR_STEPS = [
  { anchor: "deck-title", placement: "bottom", cleo: "happy" },
  { anchor: "deck-class", placement: "bottom", cleo: "thinking" },
  { anchor: "deck-section", placement: "bottom", cleo: "thinking" },
  { anchor: "deck-language", placement: "bottom", cleo: "happy" },
  // CleoTour fires onStepChange → the editor switches to the Questions tab so
  // this AI button is on screen before we spotlight it.
  { anchor: "ai-generate", placement: "bottom", cleo: "encouraging" },
  { anchor: "save-deck", placement: "top", cleo: "cheer" },
];

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
    steps: DECK_EDITOR_STEPS,
  },

  // Library (/decks list view). What the library is + the Download button that
  // turns any deck into a printable test (which then opens the pdfExport tour).
  library: {
    steps: [
      { placement: "center", cleo: "happy" },
      { anchor: "library-download", placement: "bottom", cleo: "encouraging" },
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

  // Class insights (/classes/:id/insights). How to read the retention bars.
  // Steps 1-2 anchor the first section + deck row; cold (no data) → centered.
  insights: {
    steps: [
      { placement: "center", cleo: "happy" },
      { anchor: "insights-section", placement: "bottom", cleo: "thinking" },
      { anchor: "insights-row", placement: "top", cleo: "encouraging" },
      { placement: "center", cleo: "cheer" },
    ],
  },

  // Student home (/classes for students → MyClasses). The only student-role
  // tour — joining, the class list, reviews, and where delight lives.
  student: {
    steps: [
      { anchor: "student-join", placement: "bottom", cleo: "encouraging" },
      { anchor: "student-class", placement: "bottom", cleo: "happy" },
      { anchor: "student-reviews", placement: "bottom", cleo: "thinking" },
      { placement: "center", cleo: "cheer" },
    ],
  },

  // ── The guided journey (firstClass) ────────────────────────────────────────
  // Cross-page first-run for a brand-new teacher: clase → unidad → warmup →
  // editor → lanzar. Each leg auto-starts via the journey pointer (see
  // journey.js); the real action advances it. Distinct ids from the standalone
  // tours above so the journey can run without their offers competing.

  // Leg 1 — /classes. Welcome + spotlight "create a class".
  jHome: {
    steps: [
      { placement: "center", cleo: "encouraging" }, // what we'll build together
      { anchor: "new-class", placement: "bottom", cleo: "happy" },
    ],
  },

  // Leg 3 — /classes/:id. Units group lessons; the code is how students join.
  jUnit: {
    steps: [
      { anchor: "create-unit", placement: "bottom", cleo: "thinking" },
      { anchor: "class-code", placement: "bottom", cleo: "encouraging" },
    ],
  },

  // Leg 4 — /classes/:id. Add the first warmup inside the unit.
  jWarmup: {
    steps: [
      { anchor: "new-warmup", placement: "bottom", cleo: "encouraging" },
    ],
  },

  // Leg 5 — /decks/new. Same editor walkthrough, journey copy.
  jEditor: {
    steps: DECK_EDITOR_STEPS,
  },

  // Leg 6 — /classes/:id. Spotlight launch, then celebrate. onComplete fires
  // the confetti + finishes the journey.
  jFinale: {
    steps: [
      { anchor: "launch-deck", placement: "top", cleo: "happy" },
      { placement: "center", cleo: "cheer" }, // ¡lo lograste!
    ],
  },
};

export function getTour(tourId) {
  return TOURS[tourId] || null;
}
