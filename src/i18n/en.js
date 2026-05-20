// ─── i18n/en.js ────────────────────────────────────────────────────────
//
// PR 73: traducciones en INGLÉS, agrupadas por namespace.
//
// Cada key del objeto exportado corresponde a un archivo/componente de
// src/. Ej: `avatarOnboarding` son las strings de src/pages/AvatarOnboarding.jsx.
//
// Para agregar strings nuevas:
//   1. Agregalas acá bajo el namespace correspondiente
//   2. Hacé lo MISMO en es.js y ko.js (mantener sincronizado)
//   3. Usalas en el componente con `useT("namespace")`
//
// Para agregar un namespace nuevo (componente nuevo):
//   1. Agregar la entrada acá
//   2. Agregar en es.js y ko.js
//   3. En el componente: `const t = useT("nombreNamespace", lang)`

export default {
  // ─── src/pages/AvatarOnboarding.jsx ──────────────────────────────────
  avatarOnboarding: {
    welcome: "Welcome, {name}!",
    pickOne: "Pick your avatar",
    sub: "You can change it any time from Settings.",
    selected: "Looking good!",
    continue: "Continue",
    saving: "Saving...",
  },

  // ─── src/components/SessionInsightBar.jsx ────────────────────────────
  sessionInsightBar: {
    labelOne: "Weak point",
    labelTwo: "Weak points",
    failed: "failed",
    expand: "view students",
    collapse: "hide",
    dismiss: "hide",
    analyzing: "Analyzing session…",
    repeatedNote: (name) => `**${name}** appears in both points. They're struggling beyond a single topic.`,
    failerSummary: (wrong, total) => `failed ${wrong}/${total}`,
  },

  // ─── src/pages/Community.jsx ─────────────────────────────────────────
  community: {
    pageTitle: "Community",
    subtitle: "Browse decks shared by teachers worldwide",
    search: "Search topics...",
    allSubjects: "All subjects",
    allLanguages: "All languages",
    mostUsed: "Most used",
    topRated: "Top rated",
    newest: "Newest",
    questions: "questions",
    uses: "uses",
    saveToMyDecks: "Save to my decks",
    saved: "Saved!",
    back: "Back",
    by: "by",
    adaptedFrom: "Adapted from",
    noResults: "No decks found.",
    favorite: "Favorite",
    favorited: "Favorited",
    favoriteAdd: "Add to favorites",
    favoriteRemove: "Remove from favorites",
    addToWhich: "Add to which class?",
    noClass: "Save without class",
    noClassesYet: "You don't have any classes yet. Create one in Sessions first.",
    cancel: "Cancel",
    langs: ["English", "Spanish", "Korean"],
  },

  // ─── src/components/DayDateModal.jsx ─────────────────────────────────
  dayDateModal: {
    titleAssign: "When is Day {n}?",
    titleEdit: "Change date for Day {n}",
    bodyAssign: "Pick the date you'll teach this day. Decks scheduled for today appear in Today; future dates appear in Coming up.",
    bodyEdit: "Update the date for this day. Today shows decks based on this date.",
    save: "Save",
    cancel: "Cancel",
    saving: "Saving…",
    errorGeneric: "Could not save the date. Try again.",
    quickToday: "Today",
    quickTomorrow: "Tomorrow",
    quickNextWeek: "Next week",
  },
};
