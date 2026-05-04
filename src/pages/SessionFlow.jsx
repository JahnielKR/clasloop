import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { generateQuestions, SUPPORTED_FILES } from "../lib/ai";
import { processSessionResults, getReviewSuggestions, getClassRetentionOverview, getAllReviewsForTeacher, buildSmartBatches } from "../lib/spaced-repetition";
import { CIcon } from "../components/Icons";
import { DeckCover } from "../lib/deck-cover";

// ─── Theme ──────────────────────────────────────────
const C = {
  bg: "#FFFFFF", bgSoft: "#F7F7F5", accent: "#2383E2", accentSoft: "#E8F0FE",
  green: "#0F7B6C", greenSoft: "#EEFBF5", orange: "#D9730D", orangeSoft: "#FFF3E0",
  red: "#E03E3E", redSoft: "#FDECEC", purple: "#6940A5", purpleSoft: "#F3EEFB",
  text: "#191919", textSecondary: "#6B6B6B", textMuted: "#9B9B9B",
  border: "#E8E8E4", shadow: "0 1px 3px rgba(0,0,0,0.04)",
};
const MONO = "'JetBrains Mono', monospace";
const SUBJECTS = ["Math", "Science", "History", "Language", "Geography", "Art", "Music", "Other"];
const SUBJ_ICON = { Math: "math", Science: "science", History: "history", Language: "language", Geography: "geo", Art: "art", Music: "music", Other: "book" };
const SUBJ_COLOR = { Math: "blue", Science: "green", History: "amber", Language: "indigo", Geography: "teal", Art: "pink", Music: "purple", Other: "slate" };
const GRADES = ["6th", "7th", "8th", "9th", "10th", "11th", "12th"];

// ─── i18n ───────────────────────────────────────────
const i18n = {
  en: {
    pageTitle: "Sessions", yourClasses: "Your Classes", yourClassesSub: "Select a class to create a session, or create a new one.",
    createNewClass: "Create new class", className: "Class name", classPlaceholder: "e.g. 8th Grade History",
    grade: "Grade", subject: "Subject", createClass: "Create Class", creating: "Creating...",
    suggestedToday: "Suggested for today", reviewNow: "Review now", reviewWithAI: "Practice with AI", reviewWithDeck: "Use saved deck", today: "today", daysAgo: "d ago", more: "more",
    tapToReview: "Tap to review",
    newSession: "New Session", backToClasses: "Back to classes", topic: "Topic",
    topicPlaceholder: "e.g. French Revolution, Photosynthesis...", keyPoints: "Key points (optional)",
    keyPointsPlaceholder: "Main concepts covered, one per line", numQuestions: "Number of questions",
    warmup: "Warmup", exitTicket: "Exit Ticket", typeTopic: "Type topic", uploadFile: "Upload file", useDeck: "Use a deck",
    dropHere: "Drop your class material here", orBrowse: "or click to browse", clickToChange: "Click to change",
    topicFromFile: "Topic (auto-filled from file)", generateFromFile: "Generate from file",
    generateWithAI: "Generate with AI", aiWillAnalyze: "AI will analyze your",
    generating: "AI is generating questions...", edit: "Edit", regenerate: "Regenerate",
    launchSession: "Launch Session", questions: "questions", saveAsDeck: "Save as deck", deckSaved: "Deck saved!",
    selectDeck: "Select a deck", noDecks: "No decks yet. Create one in Community or save from AI Generator.",
    sharePin: "Share this PIN with your students", studentsJoined: "students joined",
    cancel: "Cancel", startQuiz: "Start Quiz", backToDecks: "Back to decks",
    liveResults: "Live Results", endSession: "End Session", students: "students", average: "average",
    waitingResponses: "Waiting for responses...", loadingClasses: "Loading classes...", loading: "Loading...",
    fileTooLarge: "File too large. Max",
    editClass: "Edit", deleteClass: "Delete", deleteConfirm: "Delete this class? This cannot be undone.",
    confirmDelete: "Yes, delete", cancelDelete: "Cancel", saveClass: "Save", newSessionBtn: "New session", useDeckBtn: "Use deck",
    editingClass: "Edit class", students: "students",
    tabToday: "Today", tabAllClasses: "All Classes",
    nothingDueToday: "Nothing due today \uD83C\uDF89",
    nothingDueSub: "Your students are caught up. Check back tomorrow or browse all classes.",
    noClassesYet: "No classes yet",
    noClassesSub: "Create your first class to get started.",
    newClassBtn: "+ New Class", classCreated: "Class created!", andNMore: "and {n} more",
    viewAllReviews: "View all reviews",
    hideAllReviews: "Hide all reviews",
    reviewsFilterAll: "All", reviewsFilterCritical: "Critical", reviewsFilterOverdue: "Overdue",
    searchTopics: "Search topics...",
    noReviewsMatch: "No reviews match your filters.",
    noReviews: "No reviews pending. Great work!",
    smartBatch: "Practice weak topics",
    smartBatchSub: "topics, avg",
    review: "Review",
    daysOverdue: "d overdue",
  },
  es: {
    pageTitle: "Sesiones", yourClasses: "Tus Clases", yourClassesSub: "Selecciona una clase para crear una sesión, o crea una nueva.",
    createNewClass: "Crear nueva clase", className: "Nombre de la clase", classPlaceholder: "ej. Historia 8° Grado",
    grade: "Grado", subject: "Materia", createClass: "Crear Clase", creating: "Creando...",
    suggestedToday: "Sugerido para hoy", reviewNow: "Repasar ahora", reviewWithAI: "Practicar con IA", reviewWithDeck: "Usar deck guardado", today: "hoy", daysAgo: "d atrás", more: "más",
    tapToReview: "Toca para repasar",
    newSession: "Nueva Sesión", backToClasses: "Volver a clases", topic: "Tema",
    topicPlaceholder: "ej. Revolución Francesa, Fotosíntesis...", keyPoints: "Puntos clave (opcional)",
    keyPointsPlaceholder: "Conceptos principales, uno por línea", numQuestions: "Número de preguntas",
    warmup: "Warmup", exitTicket: "Exit Ticket", typeTopic: "Escribir tema", uploadFile: "Subir archivo", useDeck: "Usar un deck",
    dropHere: "Arrastra tu material de clase aquí", orBrowse: "o haz click para buscar", clickToChange: "Click para cambiar",
    topicFromFile: "Tema (auto-completado del archivo)", generateFromFile: "Generar del archivo",
    generateWithAI: "Generar con IA", aiWillAnalyze: "La IA analizará tu",
    generating: "La IA está generando preguntas...", edit: "Editar", regenerate: "Regenerar",
    launchSession: "Lanzar Sesión", questions: "preguntas", saveAsDeck: "Guardar como deck", deckSaved: "¡Deck guardado!",
    selectDeck: "Seleccionar un deck", noDecks: "Sin decks aún. Crea uno en Comunidad o guarda del Generador IA.",
    sharePin: "Comparte este PIN con tus estudiantes", studentsJoined: "estudiantes unidos",
    cancel: "Cancelar", startQuiz: "Iniciar Quiz", backToDecks: "Volver a decks",
    liveResults: "Resultados en Vivo", endSession: "Terminar Sesión", students: "estudiantes", average: "promedio",
    waitingResponses: "Esperando respuestas...", loadingClasses: "Cargando clases...", loading: "Cargando...",
    fileTooLarge: "Archivo muy grande. Máx",
    editClass: "Editar", deleteClass: "Eliminar", deleteConfirm: "¿Eliminar esta clase? No se puede deshacer.",
    confirmDelete: "Sí, eliminar", cancelDelete: "Cancelar", saveClass: "Guardar", newSessionBtn: "Nueva sesión", useDeckBtn: "Usar deck",
    editingClass: "Editar clase", students: "estudiantes",
    tabToday: "Hoy", tabAllClasses: "Todas las clases",
    nothingDueToday: "Nada pendiente hoy \uD83C\uDF89",
    nothingDueSub: "Tus estudiantes están al día. Vuelve mañana o explora todas tus clases.",
    noClassesYet: "Aún no tienes clases",
    noClassesSub: "Crea tu primera clase para empezar.",
    newClassBtn: "+ Nueva clase", classCreated: "¡Clase creada!", andNMore: "y {n} más",
    viewAllReviews: "Ver todos los repasos",
    hideAllReviews: "Ocultar repasos",
    reviewsFilterAll: "Todas", reviewsFilterCritical: "Críticas", reviewsFilterOverdue: "Vencidas",
    searchTopics: "Buscar temas...",
    noReviewsMatch: "Ningún repaso coincide con los filtros.",
    noReviews: "No hay repasos pendientes. ¡Buen trabajo!",
    smartBatch: "Practicar temas débiles",
    smartBatchSub: "temas, promedio",
    review: "Repasar",
    daysOverdue: "d vencido",
  },
  ko: {
    pageTitle: "세션", yourClasses: "내 수업", yourClassesSub: "수업을 선택하여 세션을 만들거나 새 수업을 만드세요.",
    createNewClass: "새 수업 만들기", className: "수업 이름", classPlaceholder: "예: 중2 역사",
    grade: "학년", subject: "과목", createClass: "수업 만들기", creating: "생성 중...",
    suggestedToday: "오늘 추천 복습", reviewNow: "지금 복습", reviewWithAI: "AI로 연습", reviewWithDeck: "저장된 덱 사용", today: "오늘", daysAgo: "일 전", more: "더보기",
    tapToReview: "탭하여 복습",
    newSession: "새 세션", backToClasses: "수업 목록으로", topic: "주제",
    topicPlaceholder: "예: 프랑스 혁명, 광합성...", keyPoints: "핵심 포인트 (선택)",
    keyPointsPlaceholder: "다룬 주요 개념, 줄당 하나", numQuestions: "문제 수",
    warmup: "워밍업", exitTicket: "마무리 퀴즈", typeTopic: "주제 입력", uploadFile: "파일 업로드", useDeck: "덱 사용",
    dropHere: "수업 자료를 여기에 드롭하세요", orBrowse: "또는 클릭하여 찾기", clickToChange: "클릭하여 변경",
    topicFromFile: "주제 (파일에서 자동 입력)", generateFromFile: "파일에서 생성",
    generateWithAI: "AI로 생성", aiWillAnalyze: "AI가 분석합니다:",
    generating: "AI가 문제를 생성하고 있습니다...", edit: "편집", regenerate: "재생성",
    launchSession: "세션 시작", questions: "문제", saveAsDeck: "덱으로 저장", deckSaved: "덱 저장됨!",
    selectDeck: "덱 선택", noDecks: "아직 덱이 없습니다. 커뮤니티에서 만들거나 AI 생성기에서 저장하세요.",
    sharePin: "이 PIN을 학생들과 공유하세요", studentsJoined: "명 참여",
    cancel: "취소", startQuiz: "퀴즈 시작", backToDecks: "덱으로 돌아가기",
    liveResults: "실시간 결과", endSession: "세션 종료", students: "학생", average: "평균",
    waitingResponses: "응답 대기 중...", loadingClasses: "수업 로딩 중...", loading: "로딩...",
    fileTooLarge: "파일이 너무 큽니다. 최대",
    editClass: "편집", deleteClass: "삭제", deleteConfirm: "이 수업을 삭제하시겠습니까? 되돌릴 수 없습니다.",
    confirmDelete: "네, 삭제", cancelDelete: "취소", saveClass: "저장", newSessionBtn: "새 세션", useDeckBtn: "덱 사용",
    editingClass: "수업 편집", students: "학생",
    tabToday: "오늘", tabAllClasses: "전체 수업",
    nothingDueToday: "오늘 할 일 없음 \uD83C\uDF89",
    nothingDueSub: "학생들이 잘 따라가고 있습니다. 내일 다시 확인하거나 전체 수업을 살펴보세요.",
    noClassesYet: "아직 수업이 없습니다",
    noClassesSub: "첫 수업을 만들어 시작하세요.",
    newClassBtn: "+ 새 수업", classCreated: "수업이 생성되었습니다!", andNMore: "외 {n}개",
    viewAllReviews: "모든 복습 보기",
    hideAllReviews: "복습 숨기기",
    reviewsFilterAll: "전체", reviewsFilterCritical: "중요", reviewsFilterOverdue: "기한 초과",
    searchTopics: "주제 검색...",
    noReviewsMatch: "필터와 일치하는 복습이 없습니다.",
    noReviews: "대기 중인 복습이 없습니다. 잘했어요!",
    smartBatch: "취약한 주제 연습",
    smartBatchSub: "개 주제, 평균",
    review: "복습",
    daysOverdue: "일 지남",
  },
};

// ─── Shared Components ──────────────────────────────
const interactiveCSS = `
  .cl-btn { transition: all .15s ease; }
  .cl-btn:hover { transform: translateY(-1px); filter: brightness(1.05); }
  .cl-btn:active { transform: translateY(0) scale(.97); filter: brightness(.95); }
  .cl-btn-secondary:hover { background: #E8F0FE !important; border-color: #2383E2 !important; color: #2383E2 !important; }
  .cl-btn-danger:hover { background: #E03E3E !important; color: #fff !important; border-color: #E03E3E !important; }
  .cl-btn-ghost:hover { background: #E8F0FE !important; color: #2383E2 !important; }
  .cl-card { transition: all .2s ease; }
  .cl-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .cl-card-clickable:hover { background: #FAFBFF !important; border-color: #2383E244 !important; box-shadow: 0 4px 12px rgba(35,131,226,0.08); }
  .cl-card-clickable:active { transform: scale(.995); box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .cl-pill { transition: all .15s ease; cursor: pointer; }
  .cl-pill:hover { background: #E8F0FE !important; border-color: #2383E244 !important; color: #2383E2 !important; }
  .cl-pill:active { transform: scale(.96); }
  .cl-input { transition: all .15s ease; }
  .cl-input:hover { border-color: #2383E266 !important; }
  .cl-input:focus { border-color: #2383E2 !important; box-shadow: 0 0 0 3px #E8F0FE !important; }
  .cl-select { transition: all .15s ease; }
  .cl-select:hover { border-color: #2383E266 !important; }
  .cl-select:focus { border-color: #2383E2 !important; box-shadow: 0 0 0 3px #E8F0FE !important; }
  .cl-back { transition: all .15s ease; }
  .cl-back:hover { background: #E8F0FE !important; color: #2383E2 !important; }
  .cl-back:active { transform: scale(.96); }
  .cl-tag { transition: all .15s ease; cursor: default; }
  .cl-tag:hover { filter: brightness(.93); transform: scale(1.04); }
  .cl-num { transition: all .15s ease; }
  .cl-num:hover { background: #E8F0FE !important; border-color: #2383E244 !important; color: #2383E2 !important; }
  .cl-action { transition: all .15s ease; }
  .cl-action:hover { background: #E8F0FE !important; color: #2383E2 !important; border-color: #2383E244 !important; }
  .cl-action:active { transform: scale(.96); }
  .cl-action-delete { transition: all .15s ease; }
  .cl-action-delete:hover { background: #FDECEC !important; color: #E03E3E !important; border-color: #E03E3E44 !important; }
  .cl-action-delete:active { transform: scale(.96); }
  .cl-suggested-row { transition: all .15s ease; cursor: pointer; }
  .cl-suggested-row:hover { background: #F5F9FF !important; border-color: #2383E2 !important; box-shadow: 0 2px 8px rgba(35,131,226,0.10); }
  .cl-suggested-row:hover .cl-suggested-arrow { transform: translateX(3px); color: #2383E2 !important; }
  .cl-suggested-row:active { transform: scale(.99); }
  .cl-suggested-arrow { transition: all .15s ease; }
  .cl-cta { transition: all .15s ease; cursor: pointer; }
  .cl-cta:hover { transform: translateY(-1px); filter: brightness(1.06); box-shadow: 0 3px 8px rgba(35,131,226,0.18); }
  .cl-cta:active { transform: translateY(0) scale(.97); }
  .cl-cta-deck:hover { box-shadow: 0 3px 8px rgba(105,64,165,0.22) !important; }
  .cl-participant { transition: all .15s ease; animation: fadeIn .3s ease; }
  .cl-participant:hover { background: #E8F0FE !important; border-color: #2383E244 !important; color: #2383E2 !important; }
  .cl-result-card { transition: all .2s ease; animation: slideIn .3s ease; }
  .cl-result-card:hover { background: #FAFBFF !important; border-color: #2383E233 !important; }
  .cl-lang { transition: all .12s ease; }
  .cl-lang:hover { background: #E8F0FE !important; color: #2383E2 !important; }
  .cl-file-zone { transition: all .2s ease; }
  .cl-file-zone:hover { border-color: #2383E2 !important; background: #FAFBFF !important; }
  .cl-option { transition: all .15s ease; }
  .cl-option:hover { border-color: #2383E244 !important; background: #FAFBFF !important; }
  .cl-tab:hover { color: #2383E2 !important; }
  .cl-new-class-btn:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(35,131,226,0.25); }
  .cl-new-class-btn:not(:disabled):active { transform: translateY(0) scale(.97); }
  .cl-view-all-btn:hover { background: #E8F0FE !important; border-color: #2383E266 !important; color: #2383E2 !important; }
  .cl-view-all-btn:active { transform: scale(.99); }
  .cl-review-row { transition: all .12s ease; }
  .cl-review-row:hover { background: #F5F9FF !important; border-color: #2383E266 !important; transform: translateX(2px); }
  .cl-review-row:hover .cl-suggested-arrow { transform: translateX(3px); color: #2383E2 !important; }
  .cl-review-row:active { transform: scale(.99); }
  @keyframes flashGlow {
    0%   { box-shadow: 0 0 0 0 #2383E266, 0 0 18px 6px #2383E244; }
    100% { box-shadow: 0 0 0 0 transparent, 0 0 0 0 transparent; }
  }
  .cl-flash { animation: flashGlow 1.6s ease-out; border-radius: 12px; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .fade-up { animation: fadeUp .35s ease-out both; }
  @keyframes fadeIn { from { opacity: 0; transform: scale(.9); } to { opacity: 1; transform: scale(1); } }
  @keyframes slideIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
`;

const Btn = ({ children, v = "primary", onClick, disabled, style = {}, full }) => {
  const base = { padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, width: full ? "100%" : "auto", opacity: disabled ? 0.4 : 1, pointerEvents: disabled ? "none" : "auto", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif" };
  const vs = {
    primary: { background: `linear-gradient(135deg,${C.accent},${C.purple})`, color: "#fff" },
    secondary: { background: C.bg, color: C.text, border: `1px solid ${C.border}` },
    danger: { background: C.redSoft, color: C.red },
    ghost: { background: "transparent", color: C.textSecondary },
  };
  const className = `cl-btn ${v === "secondary" ? "cl-btn-secondary" : v === "danger" ? "cl-btn-danger" : v === "ghost" ? "cl-btn-ghost" : ""}`;
  return <button className={className} onClick={onClick} disabled={disabled} style={{ ...base, ...vs[v], ...style }}>{children}</button>;
};

const Card = ({ children, style = {}, onClick, className: cx = "" }) => (
  <div className={`cl-card ${onClick ? "cl-card-clickable" : ""} ${cx}`} onClick={onClick} style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, boxShadow: C.shadow, cursor: onClick ? "pointer" : "default", ...style }}>{children}</div>
);

const Bar = ({ value, max = 100, color = C.accent, h = 6 }) => (
  <div style={{ width: "100%", height: h, background: C.bgSoft, borderRadius: h }}>
    <div style={{ width: `${Math.min((value / max) * 100, 100)}%`, height: "100%", borderRadius: h, background: color, transition: "width .5s ease" }} />
  </div>
);

const retCol = (v) => v >= 70 ? C.green : v >= 40 ? C.orange : C.red;

const inp = { fontFamily: "'Outfit',sans-serif", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: "10px 14px", borderRadius: 8, fontSize: 14, width: "100%", outline: "none" };
const sel = { ...inp, cursor: "pointer", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%239B9B9B' stroke-width='1.5'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 32 };

// ─── Page Header ────────────────────────────────────
function PageHeader({ title, icon, lang, setLang }) {
  return (
    <div style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, padding: "14px 28px", margin: "-28px -20px 24px -20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CIcon name={icon} size={28} />
          <h1 style={{ fontFamily: "'Outfit'", fontSize: 18, fontWeight: 700 }}>{title}</h1>
        </div>
        <div style={{ display: "flex", gap: 2, background: C.bg, borderRadius: 8, padding: 3 }}>
          {[["en", "EN"], ["es", "ES"], ["ko", "한"]].map(([c, l]) => (
            <button key={c} className="cl-lang" onClick={() => setLang(c)} style={{
              padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: lang === c ? C.bg : "transparent", color: lang === c ? C.text : C.textMuted,
              border: "none", cursor: "pointer", boxShadow: lang === c ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
            }}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Class Setup ────────────────────────────
function ClassSetup({ userId, onClassReady, t }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [retention, setRetention] = useState({});
  const [suggestions, setSuggestions] = useState({});
  const [classDecks, setClassDecks] = useState({});
  const [editing, setEditing] = useState(null); // class id being edited
  const [editName, setEditName] = useState("");
  const [editGrade, setEditGrade] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [deleting, setDeleting] = useState(null); // class id confirming delete

  // ── Tabs + create form UX ──
  const [activeTab, setActiveTab] = useState("today"); // "today" | "all"
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [flashClassId, setFlashClassId] = useState(null);
  const createFormRef = useRef(null);
  const classRefs = useRef({});

  // ── Phase 2: View all reviews + filters ──
  const [allReviews, setAllReviews] = useState([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [reviewFilter, setReviewFilter] = useState("all"); // "all" | "critical" | "overdue" | classId
  const [reviewSearch, setReviewSearch] = useState("");

  useEffect(() => { loadClasses(); }, [userId]);

  const loadClasses = async () => {
    const { data } = await supabase.from("classes").select("*").eq("teacher_id", userId).order("created_at", { ascending: false });
    setClasses(data || []);
    setLoading(false);
    if (data) {
      // First pass: get retention overviews so we know each class's average.
      const overviews = {};
      for (const cls of data) {
        const overview = await getClassRetentionOverview(cls.id);
        overviews[cls.id] = overview;
        setRetention(prev => ({ ...prev, [cls.id]: overview }));
      }
      // Second pass: get suggestions with proper class average for scoring.
      for (const cls of data) {
        const avg = overviews[cls.id]?.average ?? null;
        const sug = await getReviewSuggestions(cls.id, avg);
        setSuggestions(prev => ({ ...prev, [cls.id]: sug }));
        const { data: decks } = await supabase.from("decks").select("*").eq("class_id", cls.id);
        setClassDecks(prev => ({ ...prev, [cls.id]: decks || [] }));
      }
      // Third: build the global flat list for "View all reviews" panel.
      const all = await getAllReviewsForTeacher(userId);
      setAllReviews(all);
    }
  };

  const createClass = async () => {
    if (!name || !grade || !subject) return;
    setCreating(true);
    const code = subject.slice(0, 4).toUpperCase() + "-" + grade.replace(/[^0-9]/g, "") + String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const { data, error } = await supabase.from("classes").insert({ teacher_id: userId, name, grade, subject, class_code: code }).select().single();
    if (!error && data) {
      setClasses(prev => [data, ...prev]);
      setName(""); setGrade(""); setSubject("");
      setShowCreateForm(false);
      setActiveTab("all"); // switch to "All Classes" tab so user sees the new class
      setFlashClassId(data.id);
      // After it mounts in the list, scroll into view + clear flash.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          classRefs.current[data.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      });
      setTimeout(() => setFlashClassId(null), 1600);
    }
    setCreating(false);
  };

  const openCreateForm = () => {
    setShowCreateForm(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        createFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  };

  const startEdit = (cls, e) => {
    e.stopPropagation();
    setEditing(cls.id);
    setEditName(cls.name);
    setEditGrade(cls.grade);
    setEditSubject(cls.subject);
  };

  const saveEdit = async (classId) => {
    if (!editName || !editGrade || !editSubject) return;
    await supabase.from("classes").update({ name: editName, grade: editGrade, subject: editSubject }).eq("id", classId);
    setClasses(prev => prev.map(c => c.id === classId ? { ...c, name: editName, grade: editGrade, subject: editSubject } : c));
    setEditing(null);
  };

  const confirmDelete = (classId, e) => {
    e.stopPropagation();
    setDeleting(classId);
  };

  const doDelete = async (classId) => {
    await supabase.from("classes").delete().eq("id", classId);
    setClasses(prev => prev.filter(c => c.id !== classId));
    setDeleting(null);
  };

  if (loading) return <p style={{ color: C.textMuted, textAlign: "center", padding: 40 }}>{t.loadingClasses}</p>;

  // ── Compute "Today's focus" — at most 2 reviews per class, only classes with reviews ──
  const REVIEWS_PER_CLASS = 2;
  const todaysFocus = classes
    .map(cls => {
      const sug = (suggestions[cls.id] || []).slice(0, REVIEWS_PER_CLASS);
      return sug.length > 0 ? { cls, sug } : null;
    })
    .filter(Boolean);

  // ── Smart batches: classes with 3+ weak topics (Phase 2) ──
  const smartBatches = buildSmartBatches(allReviews, 3, 65);
  // Hide topics that are part of a batch from the "Today" individual rows to avoid double-listing.
  const batchedTopicIds = new Set(smartBatches.flatMap(b => b.topics.map(tp => tp.id)));
  const todaysFocusFiltered = todaysFocus
    .map(({ cls, sug }) => ({ cls, sug: sug.filter(s => !batchedTopicIds.has(s.id)) }))
    .filter(({ sug }) => sug.length > 0);

  // ── Filtered reviews list (Phase 2) ──
  const filteredReviews = allReviews.filter(r => {
    if (reviewFilter === "critical" && r.current_retention >= 50) return false;
    if (reviewFilter === "overdue" && !r.is_overdue) return false;
    if (reviewFilter !== "all" && reviewFilter !== "critical" && reviewFilter !== "overdue") {
      // Class id filter
      if (r.class.id !== reviewFilter) return false;
    }
    if (reviewSearch.trim()) {
      const q = reviewSearch.toLowerCase();
      if (!r.topic.toLowerCase().includes(q) && !r.class.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      {/* ── Header with title + New Class button ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontFamily: "'Outfit'", fontSize: 18, fontWeight: 700, margin: 0, marginBottom: 2 }}>{t.yourClasses}</h2>
          <p style={{ fontSize: 13, color: C.textSecondary, margin: 0 }}>{t.yourClassesSub}</p>
        </div>
        <button
          className="cl-new-class-btn"
          onClick={openCreateForm}
          disabled={showCreateForm}
          style={{
            padding: "9px 16px", borderRadius: 8,
            fontSize: 13, fontWeight: 600,
            background: showCreateForm ? C.bgSoft : `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
            color: showCreateForm ? C.textMuted : "#fff",
            border: showCreateForm ? `1px solid ${C.border}` : "none",
            cursor: showCreateForm ? "default" : "pointer",
            opacity: showCreateForm ? 0.6 : 1,
            fontFamily: "'Outfit',sans-serif",
            flexShrink: 0,
            display: "inline-flex", alignItems: "center", gap: 6,
            whiteSpace: "nowrap",
          }}
        >
          {t.newClassBtn}
        </button>
      </div>

      {/* ── Inline Create Class form (collapsible) ── */}
      {showCreateForm && (
        <div ref={createFormRef}>
          <Card className="fade-up" style={{ marginBottom: 16, borderColor: C.accent, borderLeft: `3px solid ${C.accent}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 6, color: C.accent }}>
                <CIcon name="plus" size={16} inline /> {t.createNewClass}
              </h3>
              <button
                onClick={() => { setShowCreateForm(false); setName(""); setGrade(""); setSubject(""); }}
                style={{
                  padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                  background: "transparent", color: C.textMuted, border: "none",
                  cursor: "pointer", fontFamily: "'Outfit',sans-serif",
                }}
              >{t.cancel}</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder={t.classPlaceholder} className="cl-input" style={inp} autoFocus />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <select value={grade} onChange={e => setGrade(e.target.value)} className="cl-select" style={sel}><option value="">{t.grade}...</option>{GRADES.map(g => <option key={g}>{g}</option>)}</select>
                <select value={subject} onChange={e => setSubject(e.target.value)} className="cl-select" style={sel}><option value="">{t.subject}...</option>{SUBJECTS.map(s => <option key={s}>{s}</option>)}</select>
              </div>
              <Btn full onClick={createClass} disabled={!name || !grade || !subject || creating}>{creating ? t.creating : t.createClass}</Btn>
            </div>
          </Card>
        </div>
      )}

      {/* ── Tabs ── */}
      {classes.length > 0 && (
        <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: `1px solid ${C.border}` }}>
          {[
            { id: "today", label: t.tabToday, count: todaysFocus.length, icon: "clock" },
            { id: "all",   label: t.tabAllClasses, count: classes.length, icon: "book" },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className="cl-tab"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "10px 14px",
                  background: "transparent",
                  border: "none",
                  borderBottom: `2.5px solid ${isActive ? C.accent : "transparent"}`,
                  color: isActive ? C.accent : C.textSecondary,
                  fontSize: 13, fontWeight: 600,
                  fontFamily: "'Outfit',sans-serif",
                  cursor: "pointer",
                  marginBottom: -1,
                  display: "flex", alignItems: "center", gap: 6,
                  transition: "all .15s ease",
                }}
              >
                <CIcon name={tab.icon} size={14} inline />
                {tab.label}
                <span style={{
                  fontSize: 11, fontWeight: 700, fontFamily: MONO,
                  padding: "1px 7px", borderRadius: 999,
                  background: isActive ? C.accent : C.bgSoft,
                  color: isActive ? "#fff" : C.textMuted,
                }}>{tab.count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Tab: Today ── */}
      {classes.length > 0 && activeTab === "today" && (
        <div>
          {smartBatches.length === 0 && todaysFocusFiltered.length === 0 ? (
            <Card style={{ textAlign: "center", padding: 36 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, fontFamily: "'Outfit'" }}>{t.nothingDueToday}</h3>
              <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 16, lineHeight: 1.5 }}>{t.nothingDueSub}</p>
              <Btn v="secondary" onClick={() => setActiveTab("all")} style={{ padding: "8px 16px" }}>
                <CIcon name="book" size={14} inline /> {t.tabAllClasses}
              </Btn>
            </Card>
          ) : (
            <>
              {/* Smart batch cards (Phase 2) */}
              {smartBatches.map((batch, bi) => (
                <Card key={`batch-${batch.cls.id}-${bi}`} style={{
                  marginBottom: 14, padding: 16,
                  borderLeft: `3px solid ${C.purple}`,
                  background: `linear-gradient(135deg, ${C.purpleSoft}66, ${C.accentSoft}33)`,
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: `linear-gradient(135deg, ${C.purple}, ${C.accent})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: `0 3px 10px ${C.purple}33`,
                    }}>
                      <span style={{ fontSize: 20 }}>💪</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.purple, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 2 }}>
                        {t.smartBatch}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: C.text }}>{batch.cls.name}</div>
                      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>
                        {batch.topics.length} {t.smartBatchSub} <strong style={{ color: retCol(batch.avgRetention) }}>{batch.avgRetention}%</strong>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                        {batch.topics.slice(0, 5).map((tp, ti) => (
                          <span key={ti} style={{
                            padding: "2px 8px", borderRadius: 5,
                            background: C.bg, border: `1px solid ${C.border}`,
                            fontSize: 11, color: C.textSecondary, fontWeight: 500,
                          }}>{tp.topic} · <span style={{ color: retCol(tp.current_retention), fontFamily: MONO, fontWeight: 700 }}>{tp.current_retention}%</span></span>
                        ))}
                        {batch.topics.length > 5 && (
                          <span style={{ padding: "2px 6px", fontSize: 11, color: C.textMuted }}>
                            +{batch.topics.length - 5} {t.more}
                          </span>
                        )}
                      </div>
                      <button
                        className="cl-cta"
                        onClick={() => onClassReady(batch.cls, batch.topics.map(tp => tp.topic).join(", "), "create")}
                        style={{
                          padding: "9px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                          background: `linear-gradient(135deg, ${C.purple}, ${C.accent})`,
                          color: "#fff", border: "none",
                          fontFamily: "'Outfit',sans-serif",
                          display: "inline-flex", alignItems: "center", gap: 6,
                          cursor: "pointer",
                        }}
                      >
                        <CIcon name="brain" size={14} inline /> {t.smartBatch}
                      </button>
                    </div>
                  </div>
                </Card>
              ))}

              {/* Individual review cards by class */}
              {todaysFocusFiltered.map(({ cls, sug }) => {
                const decksForClass = classDecks[cls.id] || [];
                return (
                  <Card key={`sug-${cls.id}`} style={{ marginBottom: 16, padding: 16, borderLeft: `3px solid ${C.orange}`, background: C.orangeSoft + "33" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.orange, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <CIcon name="clock" size={16} inline /> {t.suggestedToday} — {cls.name}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {sug.map((st, i) => {
                        const matchingDeck = decksForClass.find(d => d.title.toLowerCase().includes(st.topic.toLowerCase()) || st.topic.toLowerCase().includes(d.title.toLowerCase()));
                        const dayLabel = st.days_since_review === 0 ? t.today : `${st.days_since_review}${t.daysAgo}`;

                        if (!matchingDeck) {
                          return (
                            <button
                              key={i}
                              className="cl-suggested-row"
                              onClick={() => onClassReady(cls, st.topic, "create")}
                              style={{
                                display: "flex", alignItems: "center", gap: 10,
                                padding: "12px 14px", borderRadius: 8,
                                background: C.bg, border: `1px solid ${C.border}`,
                                textAlign: "left", width: "100%",
                                fontFamily: "'Outfit',sans-serif",
                              }}
                              title={t.tapToReview}
                            >
                              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ fontSize: 14, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{st.topic}</span>
                                  <span style={{ fontSize: 11, color: C.textMuted, flexShrink: 0 }}>· {dayLabel}</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.accent, fontWeight: 600 }}>
                                  <CIcon name="brain" size={12} inline /> {t.reviewWithAI}
                                </div>
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: MONO, color: retCol(st.current_retention), minWidth: 36, textAlign: "right", flexShrink: 0 }}>{st.current_retention}%</span>
                              <span className="cl-suggested-arrow" style={{ fontSize: 18, color: C.textMuted, flexShrink: 0, lineHeight: 1 }}>→</span>
                            </button>
                          );
                        }

                        return (
                          <div key={i} style={{
                            display: "flex", flexDirection: "column", gap: 8,
                            padding: 12, borderRadius: 8,
                            background: C.bg, border: `1px solid ${C.border}`,
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{st.topic}</div>
                                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{dayLabel}</div>
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: MONO, color: retCol(st.current_retention), minWidth: 36, textAlign: "right", flexShrink: 0 }}>{st.current_retention}%</span>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                              <button
                                className="cl-cta"
                                onClick={() => onClassReady(cls, st.topic, "create")}
                                style={{
                                  padding: "9px 12px", borderRadius: 7, fontSize: 13, fontWeight: 600,
                                  background: C.accent, color: "#fff", border: "none",
                                  fontFamily: "'Outfit',sans-serif",
                                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                                }}
                              >
                                <CIcon name="brain" size={14} inline /> {t.reviewWithAI}
                              </button>
                              <button
                                className="cl-cta cl-cta-deck"
                                onClick={() => onClassReady(cls, null, "deckPreview", matchingDeck)}
                                style={{
                                  padding: "9px 12px", borderRadius: 7, fontSize: 13, fontWeight: 600,
                                  background: C.purple, color: "#fff", border: "none",
                                  fontFamily: "'Outfit',sans-serif",
                                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                                }}
                              >
                                <CIcon name="book" size={14} inline /> {t.reviewWithDeck}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </>
          )}

          {/* ── View all reviews (Phase 2) ── */}
          {allReviews.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <button
                className="cl-view-all-btn"
                onClick={() => setShowAllReviews(s => !s)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  fontSize: 13, fontWeight: 600,
                  background: showAllReviews ? C.accentSoft : C.bg,
                  color: showAllReviews ? C.accent : C.textSecondary,
                  border: `1px solid ${showAllReviews ? C.accent + "44" : C.border}`,
                  cursor: "pointer",
                  fontFamily: "'Outfit',sans-serif",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "all .15s ease",
                }}
              >
                {showAllReviews ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 15L12 9L6 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                )}
                {showAllReviews ? t.hideAllReviews : `${t.viewAllReviews} (${allReviews.length})`}
              </button>

              {showAllReviews && (
                <Card className="fade-up" style={{ marginTop: 12, padding: 14 }}>
                  {/* Filter chips */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                    {[
                      { id: "all",      label: t.reviewsFilterAll,      count: allReviews.length },
                      { id: "critical", label: t.reviewsFilterCritical, count: allReviews.filter(r => r.current_retention < 50).length },
                      { id: "overdue",  label: t.reviewsFilterOverdue,  count: allReviews.filter(r => r.is_overdue).length },
                    ].map(f => {
                      const isActive = reviewFilter === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() => setReviewFilter(f.id)}
                          style={{
                            padding: "5px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                            background: isActive ? C.accent : C.bgSoft,
                            color: isActive ? "#fff" : C.textSecondary,
                            border: `1px solid ${isActive ? C.accent : C.border}`,
                            cursor: "pointer", fontFamily: "'Outfit',sans-serif",
                            display: "inline-flex", alignItems: "center", gap: 5,
                          }}
                        >
                          {f.label}
                          <span style={{ fontSize: 10, opacity: .8, fontFamily: MONO, fontWeight: 700 }}>{f.count}</span>
                        </button>
                      );
                    })}
                    {classes.map(cls => {
                      const count = allReviews.filter(r => r.class.id === cls.id).length;
                      if (count === 0) return null;
                      const isActive = reviewFilter === cls.id;
                      return (
                        <button
                          key={cls.id}
                          onClick={() => setReviewFilter(cls.id)}
                          style={{
                            padding: "5px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                            background: isActive ? C.accent : C.bgSoft,
                            color: isActive ? "#fff" : C.textSecondary,
                            border: `1px solid ${isActive ? C.accent : C.border}`,
                            cursor: "pointer", fontFamily: "'Outfit',sans-serif",
                            display: "inline-flex", alignItems: "center", gap: 5,
                            maxWidth: 180,
                          }}
                          title={cls.name}
                        >
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cls.name}</span>
                          <span style={{ fontSize: 10, opacity: .8, fontFamily: MONO, fontWeight: 700, flexShrink: 0 }}>{count}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Search */}
                  {allReviews.length > 8 && (
                    <input
                      type="text"
                      value={reviewSearch}
                      onChange={e => setReviewSearch(e.target.value)}
                      placeholder={t.searchTopics}
                      className="cl-input"
                      style={{ ...inp, fontSize: 13, padding: "8px 12px", marginBottom: 10 }}
                    />
                  )}

                  {/* Reviews list */}
                  {filteredReviews.length === 0 ? (
                    <p style={{ fontSize: 13, color: C.textMuted, textAlign: "center", padding: 20 }}>{t.noReviewsMatch}</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {filteredReviews.map((r, i) => {
                        const dayLabel = r.is_overdue ? `${r.days_since_review}${t.daysOverdue}` : (r.days_since_review === 0 ? t.today : `${r.days_since_review}${t.daysAgo}`);
                        return (
                          <button
                            key={`${r.id}-${i}`}
                            className="cl-review-row"
                            onClick={() => onClassReady(r.class, r.topic, "create")}
                            style={{
                              display: "flex", alignItems: "center", gap: 8,
                              padding: "9px 11px", borderRadius: 7,
                              background: C.bg, border: `1px solid ${C.border}`,
                              textAlign: "left", width: "100%",
                              fontFamily: "'Outfit',sans-serif",
                              cursor: "pointer",
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.topic}</div>
                              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1, display: "flex", alignItems: "center", gap: 5 }}>
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>{r.class.name}</span>
                                <span>·</span>
                                <span style={{ color: r.is_overdue ? C.red : C.textMuted, fontWeight: r.is_overdue ? 600 : 400 }}>{dayLabel}</span>
                              </div>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: MONO, color: retCol(r.current_retention), minWidth: 34, textAlign: "right", flexShrink: 0 }}>
                              {r.current_retention}%
                            </span>
                            <span className="cl-suggested-arrow" style={{ fontSize: 16, color: C.textMuted, flexShrink: 0, lineHeight: 1 }}>→</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: All Classes ── */}
      {classes.length > 0 && activeTab === "all" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {classes.map(cls => {
            const ret = retention[cls.id];
            const isEditing = editing === cls.id;
            const isDeleting = deleting === cls.id;
            const isFlash = flashClassId === cls.id;

            // Delete confirmation
            if (isDeleting) return (
              <div key={cls.id} ref={(el) => { classRefs.current[cls.id] = el; }}>
                <Card style={{ padding: 16, borderLeft: `3px solid ${C.red}` }}>
                  <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>{t.deleteConfirm}</p>
                  <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 14 }}>{cls.name} · {cls.grade} · {cls.subject}</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setDeleting(null)} style={{ flex: 1, padding: "8px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: C.bg, color: C.textSecondary, border: `1px solid ${C.border}`, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{t.cancelDelete}</button>
                    <button onClick={() => doDelete(cls.id)} style={{ flex: 1, padding: "8px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: C.red, color: "#fff", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{t.confirmDelete}</button>
                  </div>
                </Card>
              </div>
            );

            // Edit form
            if (isEditing) return (
              <div key={cls.id} ref={(el) => { classRefs.current[cls.id] = el; }}>
                <Card style={{ padding: 16, borderLeft: `3px solid ${C.accent}` }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.accent, marginBottom: 12 }}>{t.editingClass}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <input value={editName} onChange={e => setEditName(e.target.value)} className="cl-input" style={inp} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <select value={editGrade} onChange={e => setEditGrade(e.target.value)} className="cl-select" style={sel}>{GRADES.map(g => <option key={g}>{g}</option>)}</select>
                      <select value={editSubject} onChange={e => setEditSubject(e.target.value)} className="cl-select" style={sel}>{SUBJECTS.map(s => <option key={s}>{s}</option>)}</select>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setEditing(null)} style={{ flex: 1, padding: "8px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: C.bg, color: C.textSecondary, border: `1px solid ${C.border}`, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{t.cancelDelete}</button>
                      <button onClick={() => saveEdit(cls.id)} style={{ flex: 1, padding: "8px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: C.accent, color: "#fff", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{t.saveClass}</button>
                    </div>
                  </div>
                </Card>
              </div>
            );

            // Normal class card
            return (
              <div key={cls.id} ref={(el) => { classRefs.current[cls.id] = el; }} className={isFlash ? "cl-flash" : ""}>
                <Card style={{ padding: 14, borderLeft: `3px solid ${ret ? retCol(ret.average) : C.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cls.name}</h3>
                      <p style={{ fontSize: 12, color: C.textMuted, margin: "2px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
                        <CIcon name={SUBJ_ICON[cls.subject] || "book"} size={11} inline /> {cls.subject} · {cls.grade}
                        <span style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 4, background: C.bgSoft, fontSize: 10, fontFamily: MONO, color: C.textSecondary }}>{cls.class_code}</span>
                      </p>
                    </div>
                    {ret && ret.topics.length > 0 && (
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: MONO, color: retCol(ret.average) }}>{ret.average}%</div>
                        <div style={{ fontSize: 10, color: C.textMuted }}>{t.average}</div>
                      </div>
                    )}
                  </div>
                  {ret && ret.topics.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
                      {ret.topics.slice(0, 5).map((tp, i) => (
                        <div key={i} className="cl-tag" style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, background: tp.status === "strong" ? C.greenSoft : tp.status === "medium" ? C.orangeSoft : C.redSoft, color: tp.status === "strong" ? C.green : tp.status === "medium" ? C.orange : C.red, fontWeight: 500, cursor: "default" }}>{tp.topic} {tp.current_retention}%</div>
                      ))}
                      {ret.topics.length > 5 && <span style={{ fontSize: 11, color: C.textMuted, padding: "3px 4px" }}>+{ret.topics.length - 5} {t.more}</span>}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                    <Btn onClick={() => onClassReady(cls, null, "create")} style={{ flex: 1, fontSize: 13, padding: "7px 12px" }}>
                      <CIcon name="rocket" size={14} inline /> {t.newSessionBtn}
                    </Btn>
                    <Btn v="secondary" onClick={() => onClassReady(cls, null, "deckSelect")} style={{ flex: 1, fontSize: 13, padding: "7px 12px" }}>
                      <CIcon name="book" size={14} inline /> {t.useDeckBtn}
                    </Btn>
                    <button className="cl-action" onClick={(e) => startEdit(cls, e)} style={{ padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, background: C.bg, color: C.textSecondary, border: `1px solid ${C.border}`, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{t.editClass}</button>
                    <button className="cl-action-delete" onClick={(e) => confirmDelete(cls.id, e)} style={{ padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, background: C.bg, color: C.red, border: `1px solid ${C.redSoft}`, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{t.deleteClass}</button>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Empty state when no classes at all ── */}
      {classes.length === 0 && !showCreateForm && (
        <Card style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📚</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, fontFamily: "'Outfit'" }}>{t.noClassesYet}</h3>
          <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 18, lineHeight: 1.5 }}>{t.noClassesSub}</p>
          <Btn onClick={openCreateForm} style={{ padding: "10px 20px" }}>
            <CIcon name="plus" size={14} inline /> {t.newClassBtn}
          </Btn>
        </Card>
      )}
    </div>
  );
}

const ACTIVITY_TYPES = [
  { id: "mcq", icon: "mcq", label: { en: "Multiple Choice", es: "Opción Múltiple", ko: "객관식" } },
  { id: "tf", icon: "truefalse", label: { en: "True / False", es: "Verdadero / Falso", ko: "참 / 거짓" } },
  { id: "fill", icon: "fillblank", label: { en: "Fill in the Blank", es: "Completar", ko: "빈칸 채우기" } },
  { id: "order", icon: "ordering", label: { en: "Put in Order", es: "Ordenar", ko: "순서 맞추기" } },
  { id: "match", icon: "matching", label: { en: "Matching Pairs", es: "Emparejar", ko: "짝 맞추기" } },
];

// ─── Step 2: Create Session ─────────────────────────
function CreateSession({ cls, userId, onSessionCreated, onBack, t, lang, reviewTopic, deckData }) {
  const [topic, setTopic] = useState(deckData?.title || reviewTopic || "");
  const [keyPoints, setKeyPoints] = useState("");
  const [sessionType, setSessionType] = useState("warmup");
  const [activityType, setActivityType] = useState(deckData?.questions?.[0]?.type || "mcq");
  const [numQuestions, setNumQuestions] = useState(5);
  const [customNum, setCustomNum] = useState("");
  const [questionLang, setQuestionLang] = useState(lang);
  const [step, setStep] = useState(deckData ? "preview" : "form");
  const [questions, setQuestions] = useState(deckData?.questions || []);
  const [error, setError] = useState("");
  const [inputMode, setInputMode] = useState("text");
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [deckSaved, setDeckSaved] = useState(false);
  const fileRef = useRef(null);

  // Auto-generate if reviewTopic is provided AND no deckData (don't generate when using deck)
  const [autoGenerate, setAutoGenerate] = useState(!!reviewTopic && !deckData);

  const handleFile = (f) => {
    if (!f) return;
    if (f.size > SUPPORTED_FILES.maxSizeMB * 1024 * 1024) { setError(`${t.fileTooLarge} ${SUPPORTED_FILES.maxSizeMB}MB.`); return; }
    setFile(f);
    if (!topic) setTopic(f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); };

  const handleGenerate = async () => {
    setStep("generating"); setError("");
    try {
      const qs = await generateQuestions({ topic, keyPoints, grade: cls.grade, subject: cls.subject, activityType, numQuestions, language: questionLang, file: inputMode === "file" ? file : null });
      setQuestions(qs); setStep("preview");
    } catch (err) { setError(err.message); setStep("form"); }
  };

  // Auto-generate when coming from "Review now"
  useEffect(() => {
    if (autoGenerate && topic.trim()) {
      setAutoGenerate(false);
      handleGenerate();
    }
  }, [autoGenerate]);

  const handleLaunch = async () => {
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const { data, error: err } = await supabase.from("sessions").insert({ class_id: cls.id, teacher_id: userId, topic, key_points: keyPoints, session_type: sessionType, activity_type: activityType, pin, status: "lobby", questions }).select().single();
    if (!err && data) onSessionCreated(data);
  };

  const handleSaveAsDeck = async () => {
    const { error } = await supabase.from("decks").insert({
      author_id: userId, class_id: cls.id, title: topic, description: keyPoints || "",
      subject: cls.subject, grade: cls.grade, language: lang,
      questions: questions.map(q => ({ ...q, type: activityType })),
      tags: [cls.subject.toLowerCase(), activityType], is_public: false,
      cover_color: SUBJ_COLOR[cls.subject] || "blue",
      cover_icon: SUBJ_ICON[cls.subject] || "book",
    });
    if (!error) setDeckSaved(true);
  };

  if (step === "generating") return (
    <div style={{ maxWidth: 480, margin: "0 auto", textAlign: "center", padding: "80px 20px" }}>
      <div style={{ width: 56, height: 56, borderRadius: 14, background: C.purpleSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", animation: "pulse 1.5s infinite" }}>
        <CIcon name="brain" size={28} inline />
      </div>
      <p style={{ fontSize: 16, fontWeight: 600 }}>{t.generating}</p>
      <p style={{ fontSize: 14, color: C.textSecondary, marginTop: 4 }}>{topic}</p>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );

  if (step === "preview") return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <button className="cl-back" onClick={() => deckData ? onBack() : setStep("form")} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: C.accent, background: C.accentSoft, border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif", marginBottom: 16 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12L11 6M5 12L11 18" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        {deckData ? t.backToDecks : t.edit}
      </button>
      <h2 style={{ fontFamily: "'Outfit'", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{topic}</h2>
      <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 16 }}>{questions.length} {t.questions} · {cls.name}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {questions.map((q, i) => {
          const qt = q.type || activityType;
          const correctSet = Array.isArray(q.correct) ? new Set(q.correct) : null;
          return (
          <Card key={i} style={{ padding: 16 }}>
            <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>Q{i + 1} · {ACTIVITY_TYPES.find(a => a.id === qt)?.label[lang] || qt}</p>
            {q.image_url && (
              <div style={{ marginBottom: 8, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}`, background: "#000" }}>
                <img src={q.image_url} alt="" style={{ display: "block", width: "100%", maxHeight: 140, objectFit: "contain", background: C.bg }} />
              </div>
            )}
            <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 10, lineHeight: 1.4, whiteSpace: "pre-wrap" }}>{q.q}</p>

            {/* MCQ (single or multi-correct) */}
            {qt === "mcq" && Array.isArray(q.options) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {q.options.map((o, j) => {
                  const ok = correctSet ? correctSet.has(j) : j === q.correct;
                  const optText = typeof o === "string" ? o : (o?.text || "");
                  const optImg = (typeof o === "object" && o?.image_url) ? o.image_url : null;
                  return (
                    <div key={j} className="cl-option" style={{ padding: optImg ? 0 : "7px 10px", borderRadius: 6, fontSize: 13, background: ok ? C.greenSoft : C.bgSoft, color: ok ? C.green : C.textSecondary, fontWeight: ok ? 500 : 400, border: `1px solid ${ok ? C.green + "33" : "transparent"}`, overflow: "hidden", minHeight: optImg ? 60 : "auto" }}>
                      {optImg ? <div style={{ width: "100%", height: 60, backgroundImage: `url(${optImg})`, backgroundSize: "cover", backgroundPosition: "center" }} /> : optText}
                    </div>
                  );
                })}
              </div>
            )}

            {/* True/False */}
            {qt === "tf" && (
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ padding: "6px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600, background: q.correct === true ? C.greenSoft : C.bgSoft, color: q.correct === true ? C.green : C.textMuted, border: `1px solid ${q.correct === true ? C.green + "33" : C.border}` }}>True</div>
                <div style={{ padding: "6px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600, background: q.correct === false ? C.greenSoft : C.bgSoft, color: q.correct === false ? C.green : C.textMuted, border: `1px solid ${q.correct === false ? C.green + "33" : C.border}` }}>False</div>
              </div>
            )}

            {/* Fill in the Blank */}
            {qt === "fill" && q.answer && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ padding: "6px 12px", borderRadius: 6, background: C.greenSoft, fontSize: 13, color: C.green, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start" }}>
                  <CIcon name="check" size={12} inline /> {q.answer}
                </div>
                {Array.isArray(q.alternatives) && q.alternatives.length > 0 && (
                  <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>
                    Also accepted: {q.alternatives.join(", ")}
                  </p>
                )}
              </div>
            )}

            {/* Ordering */}
            {qt === "order" && Array.isArray(q.items) && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {q.items.map((item, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, background: C.bgSoft, fontSize: 13 }}>
                    <span style={{ width: 20, height: 20, borderRadius: 5, background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{j + 1}</span>
                    {item}
                  </div>
                ))}
              </div>
            )}

            {/* Matching */}
            {qt === "match" && Array.isArray(q.pairs) && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {q.pairs.map((p, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, background: C.bgSoft, fontSize: 13 }}>
                    <span style={{ fontWeight: 600, color: C.accent, fontFamily: MONO }}>{p.left}</span>
                    <span style={{ color: C.textMuted }}>→</span>
                    <span style={{ color: C.textSecondary }}>{p.right}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Free Text */}
            {qt === "free" && (
              <div style={{ padding: "8px 12px", borderRadius: 6, background: C.bgSoft, fontSize: 12, color: C.textMuted, fontStyle: "italic", border: `1px dashed ${C.border}` }}>
                Open response — students will type freely
              </div>
            )}

            {/* Sentence Builder */}
            {qt === "sentence" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                  {q.required_word && (
                    <span style={{ padding: "4px 10px", borderRadius: 6, background: C.accentSoft, color: C.accent, fontSize: 12, fontWeight: 600, fontFamily: MONO }}>
                      {q.required_word}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: C.textMuted }}>
                    min {q.min_words ?? 3} words
                  </span>
                </div>
                <div style={{ padding: "6px 12px", borderRadius: 6, background: C.bgSoft, fontSize: 12, color: C.textMuted, fontStyle: "italic", border: `1px dashed ${C.border}` }}>
                  Auto-graded sentence — student must use the required word
                </div>
              </div>
            )}

            {/* Slider */}
            {qt === "slider" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.textSecondary, fontFamily: MONO }}>
                  <span style={{ color: C.textMuted }}>{q.min ?? 0}{q.unit || ""}</span>
                  <div style={{ flex: 1, height: 4, borderRadius: 2, background: `linear-gradient(90deg, ${C.accent}, ${C.purple})` }} />
                  <span style={{ color: C.textMuted }}>{q.max ?? 100}{q.unit || ""}</span>
                </div>
                <div style={{ padding: "4px 10px", borderRadius: 6, background: C.greenSoft, color: C.green, fontSize: 12, fontWeight: 600, alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: MONO }}>
                  <CIcon name="check" size={12} inline /> {q.correct ?? 50}{q.unit || ""}
                  {(q.tolerance ?? 0) > 0 && <span style={{ color: C.textMuted, fontWeight: 400 }}>± {q.tolerance}{q.unit || ""}</span>}
                </div>
              </div>
            )}
          </Card>
          );
        })}
      </div>
      {deckData ? (
        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={handleLaunch} full style={{ padding: "12px 24px" }}><CIcon name="rocket" size={16} inline /> {t.launchSession}</Btn>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn v="secondary" onClick={handleGenerate} style={{ flex: 1 }}><CIcon name="refresh" size={14} inline /> {t.regenerate}</Btn>
            <Btn onClick={handleLaunch} style={{ flex: 2 }}><CIcon name="rocket" size={16} inline /> {t.launchSession}</Btn>
          </div>
          <div style={{ marginTop: 10 }}>
            <button className="cl-pill" onClick={handleSaveAsDeck} disabled={deckSaved} style={{ width: "100%", padding: 10, borderRadius: 8, fontSize: 13, fontWeight: 500, background: deckSaved ? C.greenSoft : C.bgSoft, color: deckSaved ? C.green : C.textSecondary, border: `1px solid ${deckSaved ? C.green + "33" : C.border}`, cursor: "pointer", fontFamily: "'Outfit',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {deckSaved ? <><CIcon name="check" size={14} inline /> {t.deckSaved}</> : <><CIcon name="book" size={14} inline /> {t.saveAsDeck}</>}
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <button className="cl-back" onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: C.accent, background: C.accentSoft, border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif", marginBottom: 16 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12L11 6M5 12L11 18" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        {t.backToClasses}
      </button>
      <h2 style={{ fontFamily: "'Outfit'", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{t.newSession}</h2>
      <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 20 }}>{cls.name} · {cls.grade} · {cls.subject}</p>

      {error && <div style={{ padding: "10px 14px", borderRadius: 8, background: C.redSoft, color: C.red, fontSize: 13, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}><CIcon name="warning" size={14} inline /> {error}</div>}

      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {[["warmup", "warmup", t.warmup], ["exitTicket", "ticket", t.exitTicket]].map(([val, icon, label]) => (
          <button key={val} className="cl-pill" onClick={() => setSessionType(val)} style={{ flex: 1, padding: 10, borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", background: sessionType === val ? C.accentSoft : C.bg, color: sessionType === val ? C.accent : C.textSecondary, border: `1px solid ${sessionType === val ? C.accent + "33" : C.border}`, fontFamily: "'Outfit',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <CIcon name={icon} size={16} inline /> {label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[["text", "book", t.typeTopic], ["file", "plus", t.uploadFile]].map(([mode, icon, label]) => (
          <button key={mode} className="cl-pill" onClick={() => setInputMode(mode)} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: inputMode === mode ? C.bg : "transparent", color: inputMode === mode ? C.text : C.textMuted, border: `1px solid ${inputMode === mode ? C.border : "transparent"}`, boxShadow: inputMode === mode ? C.shadow : "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <CIcon name={icon} size={15} inline /> {label}
          </button>
        ))}
      </div>

      {/* Activity Type */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 8 }}>Activity type</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {ACTIVITY_TYPES.map(at => (
            <button key={at.id} className="cl-pill" onClick={() => setActivityType(at.id)} style={{
              padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500,
              background: activityType === at.id ? C.accentSoft : C.bg,
              color: activityType === at.id ? C.accent : C.textSecondary,
              border: `1px solid ${activityType === at.id ? C.accent + "33" : C.border}`,
              cursor: "pointer", fontFamily: "'Outfit',sans-serif",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <CIcon name={at.icon} size={14} inline /> {at.label[lang] || at.label.en}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {inputMode === "file" && (
          <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop} onClick={() => fileRef.current?.click()}
            style={{ border: `2px dashed ${dragOver ? C.accent : file ? C.green : C.border}`, borderRadius: 12, padding: file ? "16px" : "32px 20px", textAlign: "center", cursor: "pointer", background: dragOver ? C.accentSoft : file ? C.greenSoft : C.bg, transition: "all .2s" }}>
            <input ref={fileRef} type="file" accept={SUPPORTED_FILES.accept} onChange={e => handleFile(e.target.files[0])} style={{ display: "none" }} />
            {file ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center" }}>
                <CIcon name="book" size={24} inline />
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.green }}>{file.name}</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>{(file.size / 1024).toFixed(0)} KB · {t.clickToChange}</div>
                </div>
                <button onClick={e => { e.stopPropagation(); setFile(null); }} style={{ width: 24, height: 24, borderRadius: 6, background: C.redSoft, color: C.red, fontSize: 12, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>x</button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 8 }}><CIcon name="book" size={32} /></div>
                <p style={{ fontSize: 14, fontWeight: 500, color: C.text, marginBottom: 4 }}>{t.dropHere}</p>
                <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>{t.orBrowse}</p>
                <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                  {SUPPORTED_FILES.types.map((ft, i) => <span key={i} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: C.bgSoft, color: C.textMuted }}>{ft.ext}</span>)}
                </div>
              </>
            )}
          </div>
        )}

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{inputMode === "file" ? t.topicFromFile : t.topic}</label>
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder={t.topicPlaceholder} className="cl-input" style={inp} />
        </div>
        {inputMode === "text" && (
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.keyPoints}</label>
            <textarea value={keyPoints} onChange={e => setKeyPoints(e.target.value)} placeholder={t.keyPointsPlaceholder} className="cl-input" style={{ ...inp, minHeight: 80, resize: "vertical" }} />
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.numQuestions}</label>
            <div style={{ display: "flex", gap: 4 }}>
              {[3, 5, 10, 15].map(n => (
                <button key={n} className="cl-num" onClick={() => { setNumQuestions(n); setCustomNum(""); }} style={{ flex: 1, padding: 8, borderRadius: 6, fontSize: 14, fontWeight: 600, background: numQuestions === n && !customNum ? C.accentSoft : C.bg, color: numQuestions === n && !customNum ? C.accent : C.textMuted, border: `1px solid ${numQuestions === n && !customNum ? C.accent + "33" : C.border}`, fontFamily: MONO, cursor: "pointer" }}>{n}</button>
              ))}
              <input className="cl-input" value={customNum} onChange={e => { const v = e.target.value.replace(/\D/g, ""); setCustomNum(v); if (v) setNumQuestions(parseInt(v) || 5); }} placeholder="#" style={{ ...inp, width: 44, flex: "none", textAlign: "center", fontFamily: MONO, fontWeight: 600, fontSize: 14, padding: 8 }} />
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>Question language</label>
            <div style={{ display: "flex", gap: 4 }}>
              {[["en", "EN"], ["es", "ES"], ["ko", "한"]].map(([c, lb]) => (
                <button key={c} className="cl-num" onClick={() => setQuestionLang(c)} style={{ flex: 1, padding: 8, borderRadius: 6, fontSize: 13, fontWeight: 600, background: questionLang === c ? C.accentSoft : C.bg, color: questionLang === c ? C.accent : C.textMuted, border: `1px solid ${questionLang === c ? C.accent + "33" : C.border}`, fontFamily: MONO, cursor: "pointer" }}>{lb}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <Btn full onClick={handleGenerate} disabled={!topic.trim() && !file}>
            <CIcon name="brain" size={16} inline /> {inputMode === "file" && file ? t.generateFromFile : t.generateWithAI}
          </Btn>
          {inputMode === "file" && file && <p style={{ fontSize: 11, color: C.textMuted, textAlign: "center", marginTop: 8 }}>{t.aiWillAnalyze} {file.name.split(".").pop().toUpperCase()}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Session Lobby ──────────────────────────
function SessionLobby({ session, onStart, onEnd, t }) {
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    supabase.from("session_participants").select("*").eq("session_id", session.id).then(({ data }) => setParticipants(data || []));
    const channel = supabase.channel(`lobby:${session.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "session_participants", filter: `session_id=eq.${session.id}` },
        (payload) => setParticipants(prev => [...prev, payload.new])
      ).subscribe();
    return () => supabase.removeChannel(channel);
  }, [session.id]);

  const handleStart = async () => {
    await supabase.from("sessions").update({ status: "active" }).eq("id", session.id);
    onStart();
  };

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", textAlign: "center", padding: "40px 20px" }}>
      <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 8 }}>{t.sharePin}</p>
      <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: ".12em", fontFamily: MONO, color: C.accent, marginBottom: 4 }}>{session.pin}</div>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 28 }}>clasloop.com</p>

      <Card style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: C.textMuted }}>{session.topic} · {session.session_type === "warmup" ? t.warmup : t.exitTicket}</p>
        <div style={{ fontSize: 36, fontWeight: 700, color: C.accent, fontFamily: MONO, margin: "12px 0 4px" }}>{participants.length}</div>
        <p style={{ fontSize: 13, color: C.textSecondary }}>{t.studentsJoined}</p>
        {participants.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", marginTop: 14 }}>
            {participants.map((p, i) => <span key={i} className="cl-participant" style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, background: C.bgSoft, color: C.textSecondary, border: `1px solid ${C.border}` }}>{p.student_name}</span>)}
          </div>
        )}
      </Card>

      <div style={{ display: "flex", gap: 10 }}>
        <Btn v="danger" onClick={onEnd} style={{ flex: 1 }}>{t.cancel}</Btn>
        <Btn onClick={handleStart} style={{ flex: 2 }}><CIcon name="rocket" size={16} inline /> {t.startQuiz} ({participants.length})</Btn>
      </div>
    </div>
  );
}

// ─── Step 4: Live Results ───────────────────────────
function LiveResults({ session, onEnd, t }) {
  const [participants, setParticipants] = useState([]);
  const [responses, setResponses] = useState([]);

  useEffect(() => {
    supabase.from("session_participants").select("*").eq("session_id", session.id).then(({ data }) => setParticipants(data || []));
    supabase.from("responses").select("*").eq("session_id", session.id).then(({ data }) => setResponses(data || []));
    const ch = supabase.channel(`live:${session.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "responses", filter: `session_id=eq.${session.id}` },
        (payload) => setResponses(prev => [...prev, payload.new])
      ).subscribe();
    return () => supabase.removeChannel(ch);
  }, [session.id]);

  const questions = session.questions || [];
  const totalQ = questions.length;
  const results = participants.map(p => {
    const pResp = responses.filter(r => r.participant_id === p.id);
    return { ...p, correct: pResp.filter(r => r.is_correct).length, answered: pResp.length };
  }).sort((a, b) => b.correct - a.correct);
  const avgPct = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.correct, 0) / results.length / Math.max(totalQ, 1) * 100) : 0;

  const handleEnd = async () => {
    try { await processSessionResults(session); } catch (err) { console.error("SM-2 error:", err); }
    await supabase.from("sessions").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", session.id);
    onEnd();
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontFamily: "'Outfit'", fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}><CIcon name="chart" size={20} inline /> {t.liveResults}</h2>
        <Btn v="danger" onClick={handleEnd} style={{ fontSize: 12, padding: "6px 14px" }}>{t.endSession}</Btn>
      </div>

      <Card style={{ textAlign: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: C.textMuted }}>{session.topic}</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 12 }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 700, color: C.accent, fontFamily: MONO }}>{participants.length}</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>{t.students}</div>
          </div>
          <div>
            <div style={{ fontSize: 32, fontWeight: 700, color: retCol(avgPct), fontFamily: MONO }}>{avgPct}%</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>{t.average}</div>
          </div>
        </div>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {results.map((s, i) => {
          const pct = totalQ > 0 ? (s.correct / totalQ) * 100 : 0;
          return (
            <Card key={i} className="cl-result-card" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.textMuted, width: 20, textAlign: "center" }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{s.student_name}</div>
                <Bar value={s.correct} max={totalQ} color={retCol(pct)} h={4} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, fontFamily: MONO, color: retCol(pct) }}>{s.correct}/{totalQ}</span>
            </Card>
          );
        })}
        {results.length === 0 && <p style={{ textAlign: "center", color: C.textMuted, padding: 20 }}>{t.waitingResponses}</p>}
      </div>
    </div>
  );
}

// ─── Deck Select Step ───────────────────────────────
function DeckSelect({ cls, userId, onDeckSelected, onBack, t, lang }) {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Only decks linked to THIS specific class
      const { data } = await supabase.from("decks")
        .select("*")
        .eq("class_id", cls.id)
        .order("created_at", { ascending: false });
      setDecks(data || []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <button className="cl-back" onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: C.accent, background: C.accentSoft, border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif", marginBottom: 16 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12L11 6M5 12L11 18" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        {t.backToClasses}
      </button>
      <h2 style={{ fontFamily: "'Outfit'", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{t.selectDeck}</h2>
      <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 20 }}>{cls.name} · {cls.grade} · {cls.subject}</p>

      {loading ? (
        <p style={{ textAlign: "center", color: C.textMuted, padding: 40 }}>{t.loading}</p>
      ) : decks.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, background: C.bgSoft, borderRadius: 14, border: `1px dashed ${C.border}` }}>
          <CIcon name="book" size={36} />
          <p style={{ fontSize: 14, color: C.textMuted, marginTop: 12 }}>{t.noDecks}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {decks.map(dk => {
            const qs = dk.questions || [];
            return (
              <Card key={dk.id} onClick={() => onDeckSelected(dk)} style={{ padding: 14, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <DeckCover deck={dk} size={48} radius={11} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dk.title}</div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                      {dk.subject} · {dk.grade} · {qs.length} {t.questions}
                      {dk.profiles?.full_name ? ` · by ${dk.profiles.full_name}` : dk.author_id === userId ? " · yours" : ""}
                    </div>
                    {dk.description && <p style={{ fontSize: 12, color: C.textSecondary, marginTop: 4, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{dk.description}</p>}
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6L15 12L9 18" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────
export default function SessionFlow({ lang = "en", setLang }) {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState("classes");
  const [selectedClass, setSelectedClass] = useState(null);
  const [session, setSession] = useState(null);
  const [reviewTopic, setReviewTopic] = useState(null);
  const [deckQuestions, setDeckQuestions] = useState(null);
  const t = i18n[lang] || i18n.en;

  useEffect(() => { supabase.auth.getUser().then(({ data: { user } }) => setUser(user)); }, []);

  if (!user) return <p style={{ padding: 40, color: C.textMuted, textAlign: "center" }}>{t.loading}</p>;

  return (
    <div style={{ padding: "28px 20px" }}>
      <style>{interactiveCSS}</style>
      <PageHeader title={t.pageTitle} icon="pin" lang={lang} setLang={setLang || (() => {})} />

      {step === "classes" && <ClassSetup userId={user.id} onClassReady={(cls, topic, mode, deck) => { setSelectedClass(cls); setReviewTopic(topic || null); if (deck) setDeckQuestions(deck); setStep(mode || "create"); }} t={t} />}
      {step === "create" && selectedClass && <CreateSession cls={selectedClass} userId={user.id} onSessionCreated={(s) => { setSession(s); setStep("lobby"); }} onBack={() => { setStep("classes"); setReviewTopic(null); }} t={t} lang={lang} reviewTopic={reviewTopic} />}
      {step === "deckSelect" && selectedClass && <DeckSelect cls={selectedClass} userId={user.id} onDeckSelected={(dk) => { setDeckQuestions(dk); setStep("deckPreview"); }} onBack={() => setStep("classes")} t={t} lang={lang} />}
      {step === "deckPreview" && selectedClass && deckQuestions && <CreateSession cls={selectedClass} userId={user.id} onSessionCreated={(s) => { setSession(s); setStep("lobby"); }} onBack={() => setStep("deckSelect")} t={t} lang={lang} deckData={deckQuestions} />}
      {step === "lobby" && session && <SessionLobby session={session} onStart={() => setStep("live")} onEnd={() => { setSession(null); setStep("classes"); }} t={t} />}
      {step === "live" && session && <LiveResults session={session} onEnd={() => { setSession(null); setStep("classes"); }} t={t} />}
    </div>
  );
}
