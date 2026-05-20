// ─── i18n/es.js ────────────────────────────────────────────────────────
//
// PR 73: traducciones en ESPAÑOL, agrupadas por namespace.
// Ver en.js para documentación de la estructura.

export default {
  avatarOnboarding: {
    welcome: "¡Bienvenido, {name}!",
    pickOne: "Elige tu avatar",
    sub: "Puedes cambiarlo cuando quieras desde Configuración.",
    selected: "¡Te queda bien!",
    continue: "Continuar",
    saving: "Guardando...",
  },

  sessionInsightBar: {
    labelOne: "Punto débil",
    labelTwo: "Puntos débiles",
    failed: "fallaron",
    expand: "ver estudiantes",
    collapse: "ocultar",
    dismiss: "ocultar",
    analyzing: "Analizando la sesión…",
    repeatedNote: (name) => `**${name}** aparece en ambos puntos. Está en problemas más allá de un solo tema.`,
    failerSummary: (wrong, total) => `falló ${wrong}/${total}`,
  },

  community: {
    pageTitle: "Comunidad",
    subtitle: "Busca decks compartidos por profesores",
    search: "Buscar temas...",
    allSubjects: "Todas las materias",
    allLanguages: "Todos los idiomas",
    mostUsed: "Más usados",
    topRated: "Mejor valorados",
    newest: "Más recientes",
    questions: "preguntas",
    uses: "usos",
    saveToMyDecks: "Guardar en mis decks",
    saved: "¡Guardado!",
    back: "Volver",
    by: "por",
    adaptedFrom: "Adaptado de",
    noResults: "No se encontraron decks.",
    favorite: "Favorito",
    favorited: "En favoritos",
    favoriteAdd: "Agregar a favoritos",
    favoriteRemove: "Quitar de favoritos",
    addToWhich: "¿A qué clase agregarlo?",
    noClass: "Guardar sin clase",
    noClassesYet: "No tienes clases aún. Crea una en Sesiones primero.",
    cancel: "Cancelar",
    langs: ["Inglés", "Español", "Coreano"],
  },

  dayDateModal: {
    titleAssign: "¿Cuándo es el Day {n}?",
    titleEdit: "Cambiar fecha del Day {n}",
    bodyAssign: "Elegí la fecha en que vas a dar este día. Los decks de hoy aparecen en Today; las fechas futuras en Próximos días.",
    bodyEdit: "Actualizá la fecha de este día. Today muestra decks según esta fecha.",
    save: "Guardar",
    cancel: "Cancelar",
    saving: "Guardando…",
    errorGeneric: "No se pudo guardar la fecha. Intentá de nuevo.",
    quickToday: "Hoy",
    quickTomorrow: "Mañana",
    quickNextWeek: "Próxima semana",
  },
};
