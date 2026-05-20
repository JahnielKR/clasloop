// ─── i18n/en.js ────────────────────────────────────────────────────────
//
// PR 73 + 74: traducciones en INGLÉS, agrupadas por namespace.
//
// Cada key corresponde a un archivo/componente de src/.
//
// Para agregar strings nuevas:
//   1. Agregalas acá bajo el namespace correspondiente
//   2. Hacé lo MISMO en es.js y ko.js (mantener sincronizado)
//   3. Usalas con `useT("namespace")` en el componente

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

  // ─── PR 74: nuevos namespaces ────────────────────────────────────────

  // ─── src/pages/SessionRecap.jsx ──────────────────────────────────────
  sessionRecap: {
    pageTitle: "Session results",
    summary: "{n} students · {q} questions",
    avgLabel: "average",
    topPctLabel: "above 85%",
    leaderboardTitle: "Results",
    backToSessions: "Back to sessions",
    viewDetails: "Per-question details",
    loading: "Loading results…",
    notFound: "Session not found.",
    notAuthorized: "You don't own this session.",
  },

  // ─── src/components/DeleteAccountModal.jsx ───────────────────────────
  deleteAccountModal: {
    title: "Delete your account",
    subtitle: "This is permanent and cannot be undone.",
    explainStudent: "Your profile, class memberships, answer history, achievements, and progress will be permanently deleted. You can sign up again later with the same email if you change your mind.",
    explainTeacher: "Your profile and ALL classes you own, including their decks, sessions, and student responses, will be permanently deleted. Students currently in your classes will lose access. This cannot be undone.",
    typeToConfirm: "Type DELETE to confirm",
    typeHint: "Must match exactly",
    cancel: "Cancel",
    deleteBtn: "Delete account permanently",
    deleting: "Deleting…",
    error: "Could not delete the account. Try again.",
    errorAuth: "Session expired. Sign in again before deleting.",
  },

  // ─── src/components/LobbyThemeSelector.jsx ───────────────────────────
  lobbyThemeSelector: {
    title: "Theme",
    subtitle: "Pick how the quiz looks on your students' devices.",
    cancel: "Cancel",
    save: "Save",
    saving: "Saving…",
    previewLabel: "Preview — Question 4 of 8",
    sampleQuestion: "Which of these conjugates the verb ser in present?",
    sampleOptions: ["soy", "estoy", "tengo", "voy"],
    sampleSection: "Warmup",
    selected: "Selected",
    errorSaving: "Couldn't save the theme. Try again.",
  },

  // ─── src/components/ClassCodeModal.jsx ───────────────────────────────
  classCodeModal: {
    title: "Join your class",
    subtitle: "Enter the class code your teacher gave you to get started.",
    inputLabel: "Class code",
    inputPlaceholder: "e.g. SPAN-9A",
    joinBtn: "Join class",
    joining: "Joining…",
    signOut: "Sign out",
    errorNotFound: "Class not found. Check the code and try again.",
    errorAlreadyJoined: "You're already in this class.",
    errorGeneric: "Could not join the class. Try again.",
    errorMissingCode: "Enter a class code.",
    helpHint: "Don't have a code? Ask your teacher.",
  },

  // ─── src/pages/Director.jsx ──────────────────────────────────────────
  director: {
    pageTitle: "School Dashboard",
    subtitle: "Overview of your classes and student performance",
    backToMyClasses: "Back to My Classes",
    overview: "Overview", byClass: "By Class", students: "Students", alerts: "Alerts",
    avgRetention: "Avg retention", totalStudents: "Total students", totalSessions: "Total sessions", classesActive: "Classes active",
    className: "Class", grade: "Grade", subject: "Subject", retention: "Retention", sessions: "Sessions", studentCount: "Students",
    topPerformers: "Top performers", atRisk: "At-risk students", atRiskDesc: "Retention below 40% in 2+ topics",
    lowTopics: "Low retention topics", lowTopicsDesc: "Topics below 50% that need review",
    noClasses: "No classes yet. Create a class in My Classes to start tracking.",
    noStudents: "No student data yet. Run a session first.",
    noAlerts: "No alerts — everything looks good!",
    strong: "Strong", needsReview: "Needs review", weak: "Weak",
    lastSession: "Last session", noSessions: "No sessions",
    loading: "Loading...",
  },

  // ─── src/pages/Notifications.jsx ─────────────────────────────────────
  notifications: {
    pageTitle: "Notifications", all: "All", review: "Review", sessions: "Sessions", system: "System",
    noNotifications: "You're all caught up!", loading: "Loading...",
    topicsNeedReview: "topics need review", belowRetention: "below 50% retention",
    sessionCompleted: "Session completed", avgScore: "Class average", students: "students participated",
    streakReminder: "Don't lose your streak!", currentStreak: "Current streak", daysStreak: "days",
    welcomeBack: "Welcome to Clasloop!", welcomeDesc: "Start by creating a class and running your first session.",
    newSession: "New session available", joinNow: "Join now",
    reviewNow: "Review now", viewResults: "View results",
    feedbackTitle: "Feedback from your teacher",
    feedbackDescOne: "1 answer was reviewed in {topic}",
    feedbackDescMany: "{n} answers were reviewed in {topic}",
    seeFeedback: "See feedback",
    justNow: "Just now", minsAgo: "m ago", hoursAgo: "h ago", daysAgo: "d ago",
    markAllRead: "Mark all as read",
  },

  // ─── src/components/AddToSlotModal.jsx ───────────────────────────────
  addToSlotModal: {
    titleWarmup: "Add a warmup to Day {n}",
    titleExit: "Add an exit ticket to Day {n}",
    tabLibrary: "Pick from library",
    tabCreate: "Create a new one",
    searchPlaceholder: "Search your decks…",
    emptyLibrary: "No decks of this type yet. Create your first one.",
    emptySearch: "No matches. Try a different search or create a new one.",
    loadingDecks: "Loading your decks…",
    fromClass: "from",
    willCopy: "copy",
    questions: "questions",
    pick: "Add to slot",
    createButton: "Create a new one",
    cancel: "Cancel",
    addingError: "Could not add the deck. Try again.",
  },

  // ─── src/pages/TeacherProfile.jsx ────────────────────────────────────
  teacherProfile: {
    pageTitle: "Profile", teacher: "Teacher",
    publicDecks: "Public decks", uses: "uses", deck: "deck", decks: "decks",
    noDecks: "This teacher hasn't published any decks yet.",
    notAvailable: "This profile isn't public",
    notAvailableHint: "The profile you're looking for is private or doesn't exist.",
    backToCommunity: "Back to Community",
    share: "Share", linkCopied: "Link copied!",
    questions: "questions",
    saveToFavorites: "Save to favorites", removeFromFavorites: "Remove from favorites",
    saveToMyDecks: "Save to my decks",
    addToWhich: "Add to which class?", noClass: "No class — keep as personal", saved: "Saved!",
    cancel: "Cancel",
    by: "by", back: "Back",
    searchPlaceholder: "Search decks...", filterAllSubjects: "All subjects", filterAllGrades: "All grades", filterAllLanguages: "All languages",
    noResults: "No decks match your filters.", clearFilters: "Clear filters",
  },

  // ─── src/pages/RoleOnboarding.jsx ────────────────────────────────────
  roleOnboarding: {
    welcome: "Welcome to Clasloop",
    subtitle: "Which one are you?",
    teacher: "I'm a Teacher",
    teacherDesc: "Create classes, build decks, run quizzes for students",
    student: "I'm a Student",
    studentDesc: "Join your teacher's class and answer their quizzes",
    warning: "This choice can't be changed later.",
    creating: "Setting up your account…",
    error: "Something went wrong. Try again.",
    confirmTitle: "Are you sure?",
    confirmTeacher: "You're about to create a Teacher account.",
    confirmStudent: "You're about to create a Student account.",
    confirmDetail: "This can't be changed later. If you need the other role, you'll have to use a different email.",
    confirmBack: "Go back",
    confirmYes: "Yes, create my account",
  },

  // ─── src/pages/GuestJoin.jsx ─────────────────────────────────────────
  guestJoin: {
    joinSession: "Join session",
    enterCode: "Enter the 6-digit code your teacher gave you",
    enterName: "What's your name?",
    namePlaceholder: "Your name",
    codePlaceholder: "Code",
    join: "Join", joining: "Joining...",
    notFound: "Session not found or guests not allowed",
    nameInvalid: "Please choose an appropriate name",
    nameTooShort: "Please enter your name",
    nameTooLong: "Name is too long (max 30 chars)",
    haveAccount: "Have an account?", signIn: "Sign in",
    backHome: "Back to home",
    reconnecting: "Reconnecting...",
    kickedTitle: "You were removed from this session",
    kickedHint: "Your teacher removed you from the lobby. You can rejoin with a different name if needed.",
    rejoin: "Rejoin",
  },
};
