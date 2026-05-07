// ─────────────────────────────────────────────────────────────────────────────
// Routes — single source of truth for URL paths in the app.
//
// Esto es la base del refactor a react-router (Bug 2: el botón Back del
// navegador salía a Google porque la app no tenía rutas reales). Cada
// "página" interna se mapea a una URL real, y los components usan estas
// constantes en vez de hardcodear strings.
//
// Convención:
//   ROUTES.X     → ruta literal (ej. "/decks")
//   buildRoute() → para rutas con params (ej. /decks/:deckId/edit)
//   PAGE_TO_ROUTE / ROUTE_TO_PAGE → equivalencia con el viejo state `page`
//                                   de App.jsx, útil durante la migración
//                                   gradual donde algunas pantallas todavía
//                                   leen `page` como prop.
//
// Notas de diseño (acordadas con Jota antes de arrancar):
//   • Identidad de la pantalla → route param.
//       practiceDeck       → /practice/:deckId
//       viewingTeacherId   → /teacher/:teacherId
//       editing un deck    → /decks/:deckId/edit
//       sesión live/lobby  → /sessions/(lobby|live)/:sessionId
//   • Intención efímera al llegar → search param.
//       sessionsOpts.openCreateClass  → ?createClass=1
//       sessionsOpts.focusClassId     → ?class=<id>
//       decksOpts.focusClassId        → ?class=<id>
//       studentJoinOpts.prefilledPin  → ?pin=<6 digitos>
//   • Search params se consumen una vez (useEffect lee → ejecuta acción
//     → limpia con setSearchParams({}, {replace:true})). Reemplaza el
//     patrón actual de onConsumeSessionsOpts/onConsumeDecksOpts.
// ─────────────────────────────────────────────────────────────────────────────

// ── Rutas literales ─────────────────────────────────────────────────────────
//
// Las que NO tienen params están acá. Las que tienen params se construyen
// abajo con buildRoute() para evitar template strings sueltos por el código.

export const ROUTES = {
  // ─ Públicas (no auth) ─
  HOME: "/",                 // PublicHome cuando no hay user, sino redirige al home del rol
  JOIN: "/join",             // GuestJoin (alumno con PIN sin login). Acepta ?pin=123456

  // ─ Teacher ─
  SESSIONS: "/sessions",                // step=pickDeck (lista). Acepta ?createClass=1, ?class=<id>
  // SESSIONS_OPTIONS: "/sessions/options/:deckId"  → buildRoute.sessionsOptions(deckId)
  // SESSIONS_LOBBY:   "/sessions/lobby/:sessionId" → buildRoute.sessionsLobby(sessionId)
  // SESSIONS_LIVE:    "/sessions/live/:sessionId"  → buildRoute.sessionsLive(sessionId)

  DECKS: "/decks",                      // view=list. Acepta ?class=<id> (focus class)
  DECKS_NEW: "/decks/new",              // view=create (nuevo deck). Acepta ?class=<id> (prefilled)
  // DECKS_EDIT: "/decks/:deckId/edit"   → buildRoute.deckEdit(deckId)

  SCHOOL: "/school",                    // Director (label en sidebar dice "School")
  COMMUNITY: "/community",
  // TEACHER: "/teacher/:teacherId"      → buildRoute.teacher(id)

  // ─ Student ─
  CLASSES: "/classes",                  // MyClasses (view=list)
  // CLASSES_DETAIL: "/classes/:classId" → buildRoute.classDetail(id)  [Fase 3]
  STUDENT_JOIN: "/join-session",        // StudentJoin autenticado. Acepta ?pin=<6 digitos>
  // PRACTICE: "/practice/:deckId"       → buildRoute.practice(deckId)
  ACHIEVEMENTS: "/achievements",

  // ─ Compartidas ─
  NOTIFICATIONS: "/notifications",
  SETTINGS: "/settings",

  // ─ Admin ─
  ADMIN_AI_STATS: "/admin/ai-stats",

  // ─ Catch-all ─
  NOT_FOUND: "*",
};

// ── Constructores de rutas con params ──────────────────────────────────────
//
// Usar estos helpers en vez de `\`/teacher/${id}\`` por dos razones:
//   1. Encoding seguro de IDs (UUIDs no necesitan, pero futuras claves quizá sí).
//   2. Si renombramos un segmento (ej. /teacher → /teachers), un solo cambio.

const enc = (v) => encodeURIComponent(String(v));

export const buildRoute = {
  // Sessions flow (subviews que en SessionFlow.jsx hoy son `step`)
  sessionsOptions: (deckId) => `/sessions/options/${enc(deckId)}`,
  sessionsLobby:   (sessionId) => `/sessions/lobby/${enc(sessionId)}`,
  sessionsLive:    (sessionId) => `/sessions/live/${enc(sessionId)}`,

  // Decks (subview view=edit hoy en Decks.jsx)
  deckEdit: (deckId) => `/decks/${enc(deckId)}/edit`,

  // Practice mode (hoy es state practiceDeck en App.jsx)
  practice: (deckId) => `/practice/${enc(deckId)}`,

  // Teacher profile público (hoy es state viewingTeacherId en App.jsx)
  teacher: (teacherId) => `/teacher/${enc(teacherId)}`,

  // Class detail (Fase 3 — MyClasses.jsx tiene view=list|class)
  classDetail: (classId) => `/classes/${enc(classId)}`,
};

// ── Patrones para <Route path=...> ─────────────────────────────────────────
//
// Lo que va dentro de <Routes> en Fase 1+. Separado de buildRoute porque
// el path para react-router lleva ":param", no un valor real.

export const ROUTE_PATTERNS = {
  HOME: "/",
  JOIN: "/join",

  SESSIONS: "/sessions",
  SESSIONS_OPTIONS: "/sessions/options/:deckId",
  SESSIONS_LOBBY:   "/sessions/lobby/:sessionId",
  SESSIONS_LIVE:    "/sessions/live/:sessionId",

  DECKS: "/decks",
  DECKS_NEW: "/decks/new",
  DECKS_EDIT: "/decks/:deckId/edit",

  SCHOOL: "/school",
  COMMUNITY: "/community",
  TEACHER: "/teacher/:teacherId",

  CLASSES: "/classes",
  CLASSES_DETAIL: "/classes/:classId",
  STUDENT_JOIN: "/join-session",
  PRACTICE: "/practice/:deckId",
  ACHIEVEMENTS: "/achievements",

  NOTIFICATIONS: "/notifications",
  SETTINGS: "/settings",

  ADMIN_AI_STATS: "/admin/ai-stats",

  NOT_FOUND: "*",
};

// ── Search param keys ──────────────────────────────────────────────────────
//
// Centralizado para no escribir el string a mano en cada lectura/escritura.
// Cada lugar que hoy lee `decksOpts.focusClassId` mañana lee
// searchParams.get(QUERY.CLASS).

export const QUERY = {
  CLASS: "class",                 // ?class=<classId>: focus / prefilled class id
  CREATE_CLASS: "createClass",    // ?createClass=1: open the "new class" modal on mount
  PIN: "pin",                     // ?pin=123456: prefilled PIN for student join
};

// ── Mapping con el viejo state `page` ──────────────────────────────────────
//
// Durante la Fase 1, App.jsx mantiene `page` como un *shadow* derivado del
// URL. Esto permite que ninguna pantalla tenga que cambiar nada en su
// implementación todavía: siguen recibiendo `page` como antes. Cuando
// migremos cada pantalla a useLocation/useParams (Fase 2+) podemos ir
// eliminando entradas.

export const PAGE_TO_ROUTE = {
  sessions: ROUTES.SESSIONS,
  studentJoin: ROUTES.STUDENT_JOIN,
  community: ROUTES.COMMUNITY,
  achievements: ROUTES.ACHIEVEMENTS,
  settings: ROUTES.SETTINGS,
  director: ROUTES.SCHOOL,
  notifications: ROUTES.NOTIFICATIONS,
  decks: ROUTES.DECKS,
  myClasses: ROUTES.CLASSES,
  // teacherProfile no entra acá: es ruta con param. Se navega con
  // buildRoute.teacher(id), no con setPage("teacherProfile").
  adminAIStats: ROUTES.ADMIN_AI_STATS,
};

// Inversa: dado un pathname, devuelve el "page" id que App.jsx esperaría
// (para mantener compat durante Fase 1). Para rutas con params (teacher,
// practice, deck-edit, sessions/lobby...) devuelve el page id base.
//
// Nota: usa startsWith para que /decks/abc/edit cuente como page="decks",
// igual que /sessions/lobby/xyz cuenta como page="sessions". El refinamiento
// (qué subview mostrar) lo hace el componente leyendo useParams/useLocation.

export function pathToPage(pathname) {
  if (!pathname || pathname === "/") return null; // home: depende del rol, App.jsx decide

  if (pathname.startsWith("/sessions"))    return "sessions";
  if (pathname.startsWith("/decks"))       return "decks";
  if (pathname === "/school")              return "director";
  if (pathname === "/community")           return "community";
  if (pathname.startsWith("/teacher/"))    return "teacherProfile";

  if (pathname.startsWith("/classes"))     return "myClasses";
  if (pathname === "/join-session")        return "studentJoin";
  if (pathname.startsWith("/practice/"))   return "studentJoin"; // practice usa StudentJoin
  if (pathname === "/achievements")        return "achievements";

  if (pathname === "/notifications")       return "notifications";
  if (pathname === "/settings")            return "settings";

  if (pathname === "/admin/ai-stats")      return "adminAIStats";

  if (pathname === "/join")                return null; // GuestJoin, fuera del shell auth

  return null;
}

// ── Default route por rol ──────────────────────────────────────────────────
//
// Hoy fetchProfile decide setPage("sessions") para teacher y setPage("myClasses")
// para student en el primer load. Acá centralizamos esa decisión para que
// App.jsx la pueda usar para redirigir "/" según el rol.

export function defaultRouteForRole(role) {
  // Both roles default to /classes. For students it's their joined classes;
  // for teachers it's the classes they own (with codes to share with students).
  // The /classes route renders MyClassesByRole which picks the right component.
  if (role === "student") return ROUTES.CLASSES;
  return ROUTES.CLASSES; // teacher
}

// ── Role guards ────────────────────────────────────────────────────────────
//
// Which page IDs each role is allowed to see. Pages not listed here are
// considered shared (everyone with an account can see them).
//
// We deny on a "page id" granularity rather than per-pathname because the
// shadow `page` state in App.jsx already does the path → id mapping for us.
// Bouncing happens by navigating to defaultRouteForRole(role).
//
// teacherProfile is shared (anyone can view another teacher's public profile).
// notifications/settings/community are shared too (no entry below — falls
// through the "not in either list" branch which means allowed).

const TEACHER_ONLY_PAGES = new Set([
  "sessions",
  "decks",
  "director",       // /school — analytics dashboard, accessible from MyClasses header
  "adminAIStats",   // additionally requires is_admin, checked at the page level
]);

// Note: "myClasses" is intentionally NOT in either set. The /classes route is
// shared — students see classes they joined (MyClasses.jsx), teachers see
// classes they own (MyClassesTeacher.jsx). The MyClassesByRole wrapper in
// App.jsx picks the right component based on profile.role.
const STUDENT_ONLY_PAGES = new Set([
  "achievements",
  "studentJoin",    // teachers don't join sessions; they create them
]);

// Returns true if the role is allowed to see the given page id.
// Unknown role → allow (we don't know enough to deny).
// Unknown page id → allow (don't accidentally deny shared pages).
export function isPageAllowedForRole(pageId, role) {
  if (!role) return true;
  if (TEACHER_ONLY_PAGES.has(pageId)) return role === "teacher";
  if (STUDENT_ONLY_PAGES.has(pageId)) return role === "student";
  return true;
}

// ── Legacy opts → URL ──────────────────────────────────────────────────────
//
// Phase 2 migration helper. The old App.jsx held three pieces of transient
// state (sessionsOpts/decksOpts/studentJoinOpts) that callers passed when
// navigating. They now travel through URL search params instead so:
//   1. The intents are shareable links.
//   2. Refresh / back / forward all preserve them naturally.
//   3. App.jsx no longer holds the state.
//
// This function takes a base path (e.g. "/sessions") and an opts object
// (e.g. {focusClassId:"abc", openCreateClass:true}), translates the keys to
// the canonical query keys (QUERY.CLASS, QUERY.CREATE_CLASS, ...), and
// returns the final URL. Unknown keys are ignored — they shouldn't reach
// here, but if they do we'd rather drop them than pollute the URL.
//
// `targetPage` is used so we can tell apart cases where the same opts dict
// would mean different things on different pages (today there's just one
// target per key, but it makes future-proofing trivial).

export function buildPathWithOpts(basePath, opts, targetPage) {
  if (!opts || typeof opts !== "object") return basePath;

  const params = new URLSearchParams();

  // sessions: focusClassId → ?class, openCreateClass → ?createClass=1
  if (targetPage === "sessions") {
    if (opts.focusClassId) params.set(QUERY.CLASS, String(opts.focusClassId));
    if (opts.openCreateClass) params.set(QUERY.CREATE_CLASS, "1");
    if (opts.openCreateSession) params.set("createSession", "1");
  }
  // decks: focusClassId → ?class
  else if (targetPage === "decks") {
    if (opts.focusClassId) params.set(QUERY.CLASS, String(opts.focusClassId));
  }
  // studentJoin: prefilledPin → ?pin
  else if (targetPage === "studentJoin") {
    if (opts.prefilledPin) params.set(QUERY.PIN, String(opts.prefilledPin));
  }
  // myClasses and others: no opts mapped today
  // (teacherProfile and practice are *not* opts targets — they use route
  // params via buildRoute.teacher() / buildRoute.practice())

  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
