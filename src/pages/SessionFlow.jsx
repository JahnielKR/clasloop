import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useNavigate, useMatch } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../lib/supabase";
import { processSessionResults, getSuggestedDecksForToday, getScheduledPlan, getUpcomingPlan } from "../lib/spaced-repetition";
import { CIcon } from "../components/Icons";
import { DeckCover, resolveColor } from "../lib/deck-cover";
import MobileMenuButton, { useIsMobile } from "../components/MobileMenuButton";
import PageHeader from "../components/PageHeader";
import SectionBadge, { sectionAccent } from "../components/SectionBadge";
import { C, MONO } from "../components/tokens";
import { estimateDeckSeconds, formatDeckDuration } from "../lib/time-limits";
import { ROUTES, QUERY, buildRoute } from "../routes";

// ─── Theme ─────────────────────────────────────────────────────────────────
const SUBJECTS = ["Math", "Science", "History", "Language", "Geography", "Art", "Music", "Other"];

// ─── i18n ──────────────────────────────────────────────────────────────────
const i18n = {
  en: {
    pageTitle: "Today", subtitle: "Your plan for today and what's worth reviewing",
    yourPlanTitle: "Your plan for today",
    yourPlanHint: "What you set up to teach. One click to launch.",
    yourPlanEmpty: "Nothing planned for today.",
    yourPlanEmptyHint: "Open a class to set up warmups and exit tickets, or browse Decks.",
    yourPlanItemCount: "{n} items",
    yourPlanItemCountOne: "1 item",
    // PR 25.2: sidebar
    todoTitle: "To do today",
    todoEmpty: "Nothing pending today.",
    comingUpTitle: "Next 7 days",
    comingUpEmpty: "Nothing scheduled in the next week.",
    relativeTomorrow: "Tomorrow",
    doneToday: "Done today",
    worthReviewingTitle: "Worth reviewing today",
    worthReviewingHint: "Spotted by the retention algorithm — your students could use a refresh.",
    worthReviewingEmpty: "All caught up. Nothing urgent to review.",
    suggestedToday: "Suggested for today", suggestedHint: "Decks your students should review now",
    suggestedNone: "All your classes are up to date. Nothing urgent to launch — nice work.",
    recentlyLaunched: "Recently launched",
    recentlyLaunchedHint: "The last decks you ran. Tap to launch again.",
    quickLinkToClasses: "Looking for a specific deck? Open it from your classes.",
    quickLinkToClassesBtn: "Go to my classes",
    retentionLabel: "retention", overdueDays: "{n} days overdue", overdueDay: "1 day overdue",
    launchNow: "Launch", customize: "Customize",
    newClass: "+ New class",
    createClass: "Create class", className: "Class name", classNamePlaceholder: "e.g. Math 6th Grade",
    classSubject: "Subject", classGrade: "Grade", classGradePlaceholder: "e.g. 6th, 7th–9th, Mixed",
    classCode: "Class code (auto-generated)", classCreate: "Create class", creating: "Creating...",
    classCreated: "Class created!",
    noClassesYet: "You don't have any classes yet.",
    noClassesHint: "Create a class first to start launching sessions.",
    goToClasses: "Go to my classes",
    sessionOptions: "Session options",
    classLabel: "Class", classNoneAvailable: "No classes yet",
    classPickPrompt: "Pick a class…",
    classHelp: "Sessions are tied to a class so progress and retention can be tracked",
    classBoundHelp: "This deck belongs to this class. Sessions launched from it report to the class.",
    timeLimit: "Time per question", timeLimitNone: "No limit", seconds: "s",
    timerLabel: "Timer",
    timerModePerQuestion: "Per question",
    timerModeTotal: "Total time",
    timerPerQuestionHelp: "Each question has its own time, picked by AI based on its complexity.",
    timerTotalHelp: "When the timer runs out, the session closes automatically.",
    minutesShort: "min",
    competitiveMode: "Show leaderboard during quiz",
    showAnswers: "Show correct answer after each question",
    allowGuests: "Allow students to join without account",
    allowGuestsHelp: "Guests join with just their name. Their progress won't be tracked.",
    backToDecks: "Back to deck selection",
    launchSession: "Launch session", starting: "Starting...",
    lobbyTitle: "Waiting for students",
    sharePin: "Share this code with your students",
    joinAt: "Join at",
    studentsJoined: "students joined", oneStudentJoined: "1 student joined", noStudentsYet: "No students yet",
    startQuiz: "Start quiz", cancel: "Cancel",
    // PR 21.1: themed teacher lobby
    joinWithCode: "Join with the code",
    studentInRoom: "student in the room", studentsInRoom: "students in the room",
    studentJoinedShort: "joined", studentsJoinedShort: "joined",
    cancelLobbyConfirm: "Cancel this session? Students who joined will be sent back.",
    sectionWarmup: "Warmup", sectionExit: "Exit Ticket", sectionReview: "Review", sectionPractice: "Practice",
    kick: "Remove", kickConfirm: "Remove this student from the lobby?", guest: "guest", studentDone: "done",
    clickEnlarge: "Click to enlarge", clickClose: "Click anywhere to close",
    liveResults: "Live results", endSession: "End session",
    students: "students", average: "average", waitingResponses: "Waiting for responses...",
    // PR 21.2: themed teacher live dashboard
    liveAverage: "average", liveDone: "completed",
    liveProgressEyebrow: "Class progress", liveOfTotal: "of", liveAnswers: "answers",
    liveNoOneYet: "Waiting for students to join…",
    joinPinLabel: "PIN", endSessionConfirm: "End this session now?",
    // PR 21.3: themed teacher confirm modal
    cancelLobbyTitle: "Cancel this session?",
    cancelLobbyBody: "Students who joined will be sent back to the join screen.",
    keepLobby: "Keep waiting",
    confirmCancelLobby: "Cancel session",
    endSessionTitle: "End the session?",
    endSessionBody: "This closes the quiz for everyone. Students will see their results.",
    keepLive: "Keep going",
    confirmEndSession: "End now",
    sessionNeedsClass: "This deck isn't linked to a class yet. Open the deck and add it to a class to start a session.",
    sessionCreateFailed: "Could not create session. Please try again.",
  },
  es: {
    pageTitle: "Hoy", subtitle: "Tu plan para hoy y lo que vale la pena repasar",
    yourPlanTitle: "Tu plan para hoy",
    yourPlanHint: "Lo que preparaste para enseñar. Un click para lanzar.",
    yourPlanEmpty: "Nada planificado para hoy.",
    yourPlanEmptyHint: "Abre una clase para preparar warmups y exit tickets, o explora Decks.",
    yourPlanItemCount: "{n} items",
    yourPlanItemCountOne: "1 item",
    todoTitle: "Por hacer hoy",
    todoEmpty: "Nada pendiente hoy.",
    comingUpTitle: "Próximos 7 días",
    comingUpEmpty: "Nada programado esta semana.",
    relativeTomorrow: "Mañana",
    doneToday: "Hecho hoy",
    worthReviewingTitle: "Vale la pena repasar hoy",
    worthReviewingHint: "Detectado por el algoritmo de retención — a tus estudiantes les vendría bien un repaso.",
    worthReviewingEmpty: "Todo al día. Nada urgente que repasar.",
    suggestedToday: "Sugerencias para hoy", suggestedHint: "Decks que tus estudiantes deberían revisar ahora",
    suggestedNone: "Todas tus clases están al día. Nada urgente que lanzar — buen trabajo.",
    recentlyLaunched: "Lanzados recientemente",
    recentlyLaunchedHint: "Los últimos decks que lanzaste. Tócalos para volver a lanzar.",
    quickLinkToClasses: "¿Buscas un deck específico? Ábrelo desde tus clases.",
    quickLinkToClassesBtn: "Ir a mis clases",
    retentionLabel: "retención", overdueDays: "{n} días atrasado", overdueDay: "1 día atrasado",
    launchNow: "Lanzar", customize: "Personalizar",
    newClass: "+ Nueva clase",
    createClass: "Crear clase", className: "Nombre de la clase", classNamePlaceholder: "ej. Matemáticas 6to",
    classSubject: "Materia", classGrade: "Grado", classGradePlaceholder: "ej. 6to, 7mo–9no, Mixto",
    classCode: "Código de clase (autogenerado)", classCreate: "Crear clase", creating: "Creando...",
    classCreated: "¡Clase creada!",
    noClassesYet: "Aún no tienes clases.",
    noClassesHint: "Crea una clase primero para empezar a lanzar sesiones.",
    goToClasses: "Ir a mis clases",
    sessionOptions: "Opciones de la sesión",
    classLabel: "Clase", classNoneAvailable: "Aún no tienes clases",
    classPickPrompt: "Elige una clase…",
    classHelp: "Las sesiones se asocian a una clase para rastrear progreso y retención",
    classBoundHelp: "Este deck pertenece a esta clase. Las sesiones lanzadas desde él reportan a la clase.",
    timeLimit: "Tiempo por pregunta", timeLimitNone: "Sin límite", seconds: "s",
    timerLabel: "Tiempo",
    timerModePerQuestion: "Por pregunta",
    timerModeTotal: "Tiempo total",
    timerPerQuestionHelp: "Cada pregunta tiene su propio tiempo, elegido por la AI según su complejidad.",
    timerTotalHelp: "Cuando se acaba el tiempo, la sesión se cierra automáticamente.",
    minutesShort: "min",
    competitiveMode: "Mostrar clasificación durante el quiz",
    showAnswers: "Mostrar respuesta correcta después de cada pregunta",
    allowGuests: "Permitir entrar sin cuenta",
    allowGuestsHelp: "Los invitados entran solo con su nombre. Su progreso no se guardará.",
    backToDecks: "Volver a selección",
    launchSession: "Lanzar sesión", starting: "Iniciando...",
    lobbyTitle: "Esperando estudiantes",
    sharePin: "Comparte este código con tus estudiantes",
    joinAt: "Únete en",
    studentsJoined: "estudiantes se unieron", oneStudentJoined: "1 estudiante se unió", noStudentsYet: "Aún no se ha unido nadie",
    startQuiz: "Iniciar quiz", cancel: "Cancelar",
    // PR 21.1: themed teacher lobby
    joinWithCode: "Únanse con el código",
    studentInRoom: "estudiante en sala", studentsInRoom: "estudiantes en sala",
    studentJoinedShort: "inscrito", studentsJoinedShort: "inscritos",
    cancelLobbyConfirm: "¿Cancelar esta sesión? Los estudiantes que entraron serán expulsados.",
    sectionWarmup: "Warmup", sectionExit: "Exit Ticket", sectionReview: "Repaso", sectionPractice: "Práctica",
    kick: "Sacar", kickConfirm: "¿Sacar a este estudiante del lobby?", guest: "invitado", studentDone: "listo",
    clickEnlarge: "Click para ampliar", clickClose: "Click en cualquier lugar para cerrar",
    liveResults: "Resultados en vivo", endSession: "Terminar sesión",
    students: "estudiantes", average: "promedio", waitingResponses: "Esperando respuestas...",
    // PR 21.2: themed teacher live dashboard
    liveAverage: "promedio", liveDone: "completados",
    liveProgressEyebrow: "Progreso de la clase", liveOfTotal: "de", liveAnswers: "respuestas",
    liveNoOneYet: "Esperando que entren estudiantes…",
    joinPinLabel: "PIN", endSessionConfirm: "¿Terminar esta sesión ahora?",
    // PR 21.3: themed teacher confirm modal
    cancelLobbyTitle: "¿Cancelar esta sesión?",
    cancelLobbyBody: "Los estudiantes que entraron volverán a la pantalla de entrada.",
    keepLobby: "Seguir esperando",
    confirmCancelLobby: "Cancelar sesión",
    endSessionTitle: "¿Terminar la sesión?",
    endSessionBody: "Esto cierra el quiz para todos. Los estudiantes verán sus resultados.",
    keepLive: "Seguir",
    confirmEndSession: "Terminar",
    sessionNeedsClass: "Este deck todavía no está asignado a una clase. Abrí el deck y agregalo a una clase para iniciar una sesión.",
    sessionCreateFailed: "No se pudo crear la sesión. Probá de nuevo.",
  },
  ko: {
    pageTitle: "오늘", subtitle: "오늘의 계획과 복습할 만한 항목",
    yourPlanTitle: "오늘의 계획",
    yourPlanHint: "준비한 수업 자료. 클릭 한 번으로 시작.",
    yourPlanEmpty: "오늘 계획된 항목이 없습니다.",
    yourPlanEmptyHint: "수업을 열어 워밍업과 종료 티켓을 준비하거나 덱을 살펴보세요.",
    yourPlanItemCount: "{n}개 항목",
    yourPlanItemCountOne: "1개 항목",
    todoTitle: "오늘 할 일",
    todoEmpty: "오늘 예정된 항목 없음.",
    comingUpTitle: "다음 7일",
    comingUpEmpty: "다음 주에 예정된 항목 없음.",
    relativeTomorrow: "내일",
    doneToday: "오늘 완료",
    worthReviewingTitle: "오늘 복습할 만한 것",
    worthReviewingHint: "보존율 알고리즘이 감지함 — 학생들에게 복습이 필요할 수 있습니다.",
    worthReviewingEmpty: "모두 최신 상태. 시급히 복습할 것 없음.",
    suggestedToday: "오늘의 추천", suggestedHint: "지금 학생들이 복습해야 할 덱",
    suggestedNone: "모든 수업이 최신 상태입니다. 시급한 항목 없음 — 잘 하셨어요.",
    recentlyLaunched: "최근 실행한 덱",
    recentlyLaunchedHint: "마지막에 실행한 덱입니다. 다시 실행하려면 탭하세요.",
    quickLinkToClasses: "특정 덱을 찾고 계신가요? 수업에서 열어보세요.",
    quickLinkToClassesBtn: "내 수업으로 이동",
    retentionLabel: "보존율", overdueDays: "{n}일 지연", overdueDay: "1일 지연",
    launchNow: "시작", customize: "맞춤설정",
    newClass: "+ 새 수업",
    createClass: "수업 만들기", className: "수업 이름", classNamePlaceholder: "예: 수학 6학년",
    classSubject: "과목", classGrade: "학년", classGradePlaceholder: "예: 6학년, 7-9학년, 혼합",
    classCode: "수업 코드 (자동 생성)", classCreate: "수업 만들기", creating: "만드는 중...",
    classCreated: "수업이 생성되었습니다!",
    noClassesYet: "아직 수업이 없습니다.",
    noClassesHint: "세션을 시작하려면 먼저 수업을 만드세요.",
    goToClasses: "내 수업으로 이동",
    sessionOptions: "세션 옵션",
    classLabel: "수업", classNoneAvailable: "아직 수업이 없습니다",
    classPickPrompt: "수업을 선택하세요…",
    classHelp: "세션은 수업에 연결되어 학생 진행도와 보존을 추적합니다",
    classBoundHelp: "이 덱은 이 수업에 속해 있습니다. 시작된 세션은 이 수업에 기록됩니다.",
    timeLimit: "문제당 시간", timeLimitNone: "제한 없음", seconds: "초",
    timerLabel: "타이머",
    timerModePerQuestion: "문제별",
    timerModeTotal: "총 시간",
    timerPerQuestionHelp: "각 문제는 AI가 복잡도에 따라 정한 자체 시간을 가집니다.",
    timerTotalHelp: "시간이 다 되면 세션이 자동으로 종료됩니다.",
    minutesShort: "분",
    competitiveMode: "퀴즈 중 순위표 표시",
    showAnswers: "각 문제 후 정답 표시",
    allowGuests: "계정 없이 참여 허용",
    allowGuestsHelp: "게스트는 이름만으로 참여합니다. 진행도는 저장되지 않습니다.",
    backToDecks: "덱 선택으로",
    launchSession: "세션 시작", starting: "시작 중...",
    lobbyTitle: "학생 기다리는 중",
    sharePin: "학생들과 이 코드를 공유하세요",
    joinAt: "참여 주소",
    studentsJoined: "명 참여", oneStudentJoined: "1명 참여", noStudentsYet: "아직 참여자 없음",
    startQuiz: "퀴즈 시작", cancel: "취소",
    // PR 21.1: themed teacher lobby
    joinWithCode: "이 코드로 입장하세요",
    studentInRoom: "명 입장 중", studentsInRoom: "명 입장 중",
    studentJoinedShort: "명", studentsJoinedShort: "명",
    cancelLobbyConfirm: "이 세션을 취소하시겠어요? 입장한 학생들은 나가게 됩니다.",
    sectionWarmup: "Warmup", sectionExit: "Exit Ticket", sectionReview: "복습", sectionPractice: "연습",
    kick: "내보내기", kickConfirm: "이 학생을 로비에서 내보내시겠습니까?", guest: "게스트", studentDone: "완료",
    clickEnlarge: "클릭하여 확대", clickClose: "아무곳이나 클릭하여 닫기",
    liveResults: "실시간 결과", endSession: "세션 종료",
    students: "학생", average: "평균", waitingResponses: "응답 기다리는 중...",
    // PR 21.2: themed teacher live dashboard
    liveAverage: "평균", liveDone: "완료",
    liveProgressEyebrow: "수업 진행도", liveOfTotal: "/", liveAnswers: "응답",
    liveNoOneYet: "학생 입장 대기 중…",
    joinPinLabel: "PIN", endSessionConfirm: "지금 세션을 종료할까요?",
    // PR 21.3: themed teacher confirm modal
    cancelLobbyTitle: "이 세션을 취소하시겠어요?",
    cancelLobbyBody: "입장한 학생들은 입장 화면으로 돌아갑니다.",
    keepLobby: "계속 대기",
    confirmCancelLobby: "세션 취소",
    endSessionTitle: "세션을 종료하시겠어요?",
    endSessionBody: "모두에게 퀴즈가 닫힙니다. 학생들은 결과를 보게 됩니다.",
    keepLive: "계속하기",
    confirmEndSession: "종료",
    sessionNeedsClass: "이 덱은 아직 수업에 연결되지 않았습니다. 덱을 열고 수업에 추가한 후 세션을 시작하세요.",
    sessionCreateFailed: "세션을 만들 수 없습니다. 다시 시도하세요.",
  },
};

// ─── Styles ────────────────────────────────────────────────────────────────
const inp = { fontFamily: "'Outfit',sans-serif", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: "10px 14px", borderRadius: 8, fontSize: 14, width: "100%", outline: "none" };
const sel = { ...inp, cursor: "pointer", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%239B9B9B' stroke-width='1.5'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 32 };

const css = `
  .ns-card { transition: transform .15s ease, box-shadow .15s ease; }
  .ns-card:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,0,0,0.06); }
  .ns-toggle { transition: background .15s ease; }
  .ns-pin { letter-spacing: 0.18em; }
  @keyframes ns-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.03); } }
  .ns-pulse { animation: ns-pulse 2s ease infinite; }
  @keyframes ns-fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  .ns-fade { animation: ns-fadeIn .25s ease; }
  @media (max-width: 720px) {
    .ns-lobby-top { grid-template-columns: 1fr !important; }
  }
  /* PR 25.2: Today layout responsive.
     Desktop (>=900px): center column + 340px sidebar to the right.
     Below 900px: stack — sidebar moves above the center content,
     no sticky positioning. */
  @media (max-width: 900px) {
    .today-grid {
      grid-template-columns: 1fr !important;
    }
    .today-sidebar {
      position: static !important;
      max-height: none !important;
      overflow: visible !important;
      order: -1;
    }
  }
`;

// ─── Session Options (configuring before launch) ──────────────────────────
function SessionOptions({ deck, classes, t, lang = "en", onLaunch, onBack }) {
  // Favorited decks reference a class_id that belongs to the *original* author,
  // not to the current teacher. We can't pre-pick that — fall through and
  // let the teacher choose one of THEIR classes.
  const isFav = !!deck._isFav;

  // Class binding logic:
  //   - Bound:  deck has a class_id AND this teacher owns that class.
  //             Pre-selected and locked (the deck's home class is the
  //             only valid target — sessions are tracked there).
  //   - Open:   deck has no class_id (rare now that decks require one
  //             on creation) or it's a favorited deck pointing at
  //             someone else's class. Teacher must pick from a
  //             dropdown of THEIR classes; selector starts empty.
  const isBound = !isFav
    && !!deck.class_id
    && classes.some(c => c.id === deck.class_id);

  // Initial selection: bound → that class, open → empty (force pick).
  const [classId, setClassId] = useState(isBound ? deck.class_id : "");

  // Race-condition guard: when this component mounts via a deep link to
  // /sessions/options/:deckId (clicking a deck card from ClassPage), the
  // deck hydrates from one fetch and classes hydrates from another. If
  // classes arrives AFTER first render, the initial isBound check above
  // returns false (classes was still []) and classId stays empty — the
  // launch button stays disabled and the select shows the "pick a class"
  // placeholder even though the deck has a class_id we could lock to.
  // This effect re-evaluates once classes settles and corrects classId
  // if the deck's home class is now in the list. We only auto-fill when
  // the user hasn't picked anything yet (classId === "") so we don't
  // override a manual choice on a re-render.
  useEffect(() => {
    if (classId) return; // user already picked or we already filled
    if (isFav) return;
    if (!deck.class_id) return;
    if (classes.some(c => c.id === deck.class_id)) {
      setClassId(deck.class_id);
    }
    // We intentionally only react to classes arriving (and the deck
    // changing), not to classId — once filled, this effect is a noop
    // until the deck/classes change again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes, deck.class_id, deck._isFav]);
  // Modo del timer:
  //   - "per_question" (default): cada pregunta tiene su propio time_limit,
  //     sugerido por la AI o caído al default por tipo. El estudiante ve
  //     countdown que se resetea en cada pregunta.
  //   - "total": un solo timer corre durante toda la sesión, en minutos.
  //     Cuando se acaba, sesión cierra automáticamente.
  const [timeMode, setTimeMode] = useState("per_question");
  // Default sugerido del total: el estimate del deck redondeado al minuto
  // siguiente, cap a 30. Si el deck no tiene preguntas o estimate=0, default 5.
  const suggestedTotalMin = useMemo(() => {
    const seconds = estimateDeckSeconds(deck.questions || []);
    if (seconds <= 0) return 5;
    return Math.min(30, Math.max(1, Math.ceil(seconds / 60)));
  }, [deck]);
  const [totalMinutes, setTotalMinutes] = useState(suggestedTotalMin);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [showAnswers, setShowAnswers] = useState(true);
  const [allowGuests, setAllowGuests] = useState(true);
  const [launching, setLaunching] = useState(false);

  const accent = resolveColor(deck);
  const qs = deck.questions || [];

  const handleLaunch = async () => {
    if (!classId) return; // safety net — button is disabled in this state
    setLaunching(true);
    // El campo `timeLimit` legacy queda como segundos para compatibilidad
    // con SessionFlow's onLaunch handler que ya espera ese shape. En modo
    // per_question lo dejamos en 0 (StudentJoin lee q.time_limit). En modo
    // total le pasamos el total en segundos para que el runtime lo lea.
    const timeLimit = timeMode === "total" ? totalMinutes * 60 : 0;
    try {
      // onLaunch may navigate away on success (lobby) or surface an alert
      // on failure. If it fails (returns falsy or throws) we reset the
      // launching state so the button isn't stuck on "Starting…". Pre-fix
      // behavior: any error left the button stuck and the teacher had to
      // back out and re-enter to retry.
      const result = await onLaunch({
        deck, classId: classId || null,
        timeLimit, timeMode,
        showLeaderboard, showAnswers, allowGuests,
      });
      if (result === false) {
        setLaunching(false);
      }
      // Note: on success we leave launching=true since the parent navigates
      // away (this component unmounts) and resetting state in an unmounted
      // component is a noop / warning. The implicit unmount handles it.
    } catch (e) {
      console.error("Launch failed:", e);
      setLaunching(false);
    }
  };

  return (
    <div className="ns-fade">
      <div style={{
        background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`,
        borderLeft: `4px solid ${accent}`, padding: 14, marginBottom: 20,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <DeckCover deck={deck} size={56} radius={11} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2, color: C.text }}>{deck.title}</div>
          <div style={{ fontSize: 12, color: C.textMuted }}>{deck.subject} · {deck.grade} · {qs.length} {t.questions}</div>
        </div>
        <button
          onClick={onBack}
          style={{
            fontSize: 12, padding: "6px 12px", borderRadius: 6,
            background: C.bg, color: C.textSecondary, border: `1px solid ${C.border}`,
            cursor: "pointer", fontFamily: "'Outfit',sans-serif",
          }}
        >{t.backToDecks}</button>
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: C.textSecondary }}>{t.sessionOptions}</h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 6 }}>{t.classLabel}</label>
          <select
            value={classId}
            onChange={e => setClassId(e.target.value)}
            disabled={isBound}
            style={{
              ...sel,
              ...(isBound ? { background: C.bgSoft, color: C.textSecondary, cursor: "not-allowed" } : null),
            }}
          >
            {/* Bound deck: only its home class. Open deck: empty
                placeholder + all classes the teacher owns. The empty
                placeholder forces the teacher to make an explicit
                choice — the launch button is disabled until they do. */}
            {isBound ? (
              (() => {
                const c = classes.find(c => c.id === deck.class_id);
                return c
                  ? <option value={c.id}>{c.name} · {c.subject} · {c.grade}</option>
                  : null;
              })()
            ) : (
              <>
                <option value="" disabled>{t.classPickPrompt || "Pick a class…"}</option>
                {classes.length === 0 && (
                  <option value="" disabled>{t.classNoneAvailable || "No classes yet"}</option>
                )}
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name} · {c.subject} · {c.grade}</option>
                ))}
              </>
            )}
          </select>
          <p style={{ fontSize: 11, color: C.textMuted, marginTop: 6, lineHeight: 1.4 }}>
            {isBound ? t.classBoundHelp : t.classHelp}
          </p>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 6 }}>{t.timerLabel}</label>
          {/* Toggle de modo */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            <button
              onClick={() => setTimeMode("per_question")}
              style={{
                padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: timeMode === "per_question" ? C.accentSoft : C.bg,
                color: timeMode === "per_question" ? C.accent : C.textSecondary,
                border: `1px solid ${timeMode === "per_question" ? C.accent + "33" : C.border}`,
                cursor: "pointer", fontFamily: "'Outfit',sans-serif",
              }}
            >{t.timerModePerQuestion}</button>
            <button
              onClick={() => setTimeMode("total")}
              style={{
                padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: timeMode === "total" ? C.accentSoft : C.bg,
                color: timeMode === "total" ? C.accent : C.textSecondary,
                border: `1px solid ${timeMode === "total" ? C.accent + "33" : C.border}`,
                cursor: "pointer", fontFamily: "'Outfit',sans-serif",
              }}
            >{t.timerModeTotal}</button>
          </div>
          {/* Help text del modo activo */}
          {timeMode === "per_question" ? (
            <p style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.4, margin: 0 }}>
              {t.timerPerQuestionHelp}
              {qs.length > 0 && (() => {
                const seconds = estimateDeckSeconds(qs);
                if (seconds <= 0) return null;
                return <> · <span style={{ color: C.textSecondary }}>≈ {formatDeckDuration(seconds, lang)}</span></>;
              })()}
            </p>
          ) : (
            <div>
              {/* Slider de minutos para modo Total */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={totalMinutes}
                  onChange={(e) => setTotalMinutes(Number(e.target.value))}
                  style={{ flex: 1, accentColor: C.accent }}
                />
                <span style={{
                  fontSize: 14, fontWeight: 600, color: C.text,
                  minWidth: 56, textAlign: "right",
                }}>
                  {totalMinutes} {t.minutesShort}
                </span>
              </div>
              <p style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.4, margin: "6px 0 0" }}>
                {t.timerTotalHelp}
              </p>
            </div>
          )}
        </div>

        <Toggle label={t.competitiveMode} value={showLeaderboard} onChange={setShowLeaderboard} />
        <Toggle label={t.showAnswers} value={showAnswers} onChange={setShowAnswers} />
        <Toggle label={t.allowGuests} hint={t.allowGuestsHelp} value={allowGuests} onChange={setAllowGuests} />
      </div>

      <button
        onClick={handleLaunch}
        disabled={launching || !classId}
        style={{
          width: "100%", marginTop: 24, padding: 14, borderRadius: 10,
          fontSize: 15, fontWeight: 600,
          background: (launching || !classId) ? C.bgSoft : `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
          color: (launching || !classId) ? C.textMuted : "#fff",
          border: "none", cursor: (launching || !classId) ? "default" : "pointer",
          fontFamily: "'Outfit',sans-serif",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        <CIcon name="rocket" size={16} inline />
        {launching ? t.starting : t.launchSession}
      </button>
    </div>
  );
}

function Toggle({ label, hint, value, onChange }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="button"
          onClick={() => onChange(!value)}
          className="ns-toggle"
          style={{
            width: 36, height: 20, borderRadius: 10, padding: 2,
            background: value ? C.accent : C.border,
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center",
            justifyContent: value ? "flex-end" : "flex-start",
            flexShrink: 0,
          }}
        >
          <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }} />
        </button>
        <span onClick={() => onChange(!value)} style={{ fontSize: 13, color: C.text, fontWeight: 500, cursor: "pointer" }}>{label}</span>
      </div>
      {hint && <p style={{ fontSize: 11, color: C.textMuted, marginTop: 4, marginLeft: 48, lineHeight: 1.4 }}>{hint}</p>}
    </div>
  );
}

// ─── Step 3a: Lobby themed (PR 21.1) ───────────────────────────────────────
// Full-screen takeover with theme styling. Mounted when session.lobby_theme
// is set. Reuses the same realtime subscription pattern as the legacy
// SessionLobby below, just with a different visual.
function SessionLobbyThemed({ session, deck, t, lang, onStart, onCancel }) {
  const [participants, setParticipants] = useState([]);
  const [showQRLarge, setShowQRLarge] = useState(false);
  // PR 21.3: themed confirm modal — replaces the native confirm() that
  // used to fire when the teacher cancels the session from the lobby.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const themeId = session?.lobby_theme || 'calm';

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("session_participants")
        .select("*").eq("session_id", session.id);
      setParticipants(data || []);
    })();

    const channel = supabase.channel(`lobby-themed:${session.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "session_participants", filter: `session_id=eq.${session.id}` },
        (payload) => setParticipants(prev => [...prev, payload.new])
      )
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "session_participants", filter: `session_id=eq.${session.id}` },
        (payload) => setParticipants(prev => prev.map(p => p.id === payload.new.id ? payload.new : p))
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session.id]);

  const activeParticipants = participants.filter(p => !p.is_kicked);

  const joinUrl = typeof window !== "undefined"
    ? `${window.location.origin}/join?code=${session.pin}`
    : `https://clasloop.com/join?code=${session.pin}`;
  const joinHost = (joinUrl.replace(/^https?:\/\//, "").split("/")[0]);

  const handleStart = async () => {
    await supabase.from("sessions").update({ status: "active" }).eq("id", session.id);
    onStart();
  };

  // PR 21.3: replaced native confirm() with a themed modal. The X
  // button and "Cancel" call open the modal; "End session" inside the
  // modal triggers the actual cancel.
  const handleCancelClick = () => setConfirmOpen(true);
  const handleCancelConfirm = () => {
    setConfirmOpen(false);
    onCancel();
  };

  // Section pill label — fall back to the raw deck.section if no i18n key.
  const sectionLabel = deck?.section
    ? (deck.section === 'warmup' ? (t.sectionWarmup || 'Warmup')
       : deck.section === 'exit' ? (t.sectionExit || 'Exit Ticket')
       : deck.section === 'review' ? (t.sectionReview || 'Review')
       : deck.section === 'practice' ? (t.sectionPractice || 'Practice')
       : deck.section)
    : null;

  // QR modal — same big-overlay UX as the legacy lobby, kept consistent
  // visually with the themed palette via a backdrop.
  if (showQRLarge) {
    const dim = typeof window !== "undefined" ? Math.min(420, window.innerHeight - 280) : 320;
    return (
      <div
        onClick={() => setShowQRLarge(false)}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 1000,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          cursor: "pointer", padding: 32,
        }}
      >
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginBottom: 8, fontFamily: "'Outfit',sans-serif" }}>{t.joinAt}</p>
        <p style={{ fontSize: 22, fontWeight: 600, color: "#fff", marginBottom: 28, fontFamily: "'JetBrains Mono', monospace" }}>{joinHost}/join</p>
        <div style={{ background: "#fff", padding: 20, borderRadius: 16 }}>
          <QRCodeSVG value={joinUrl} size={dim} level="M" />
        </div>
        <p style={{ fontSize: 64, fontWeight: 800, color: "#fff", fontFamily: "'JetBrains Mono', monospace", marginTop: 28 }}>{session.pin}</p>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 16 }}>{t.clickClose}</p>
      </div>
    );
  }

  // Pretty student names: first name only (chip space is limited).
  // Falls back to full name if there's only one word.
  const displayName = (p) => {
    const raw = p.is_guest ? (p.guest_name || "Guest") : (p.student_name || "—");
    const parts = raw.trim().split(/\s+/);
    return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : raw;
  };

  return (
    <>
    <div className="teacher-lobby-page">
      <button
        className="teacher-lobby-exit"
        onClick={handleCancelClick}
        title={t.cancel || "Cancel"}
        aria-label={t.cancel || "Cancel"}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      <div className="teacher-lobby" data-theme={themeId}>
        <div className="teacher-lobby-inner">

          {/* TOP */}
          <div className="teacher-lobby-top">
            <div className="lobby-brand">
              <div className="lobby-brand-logo">C</div>
              <div className="lobby-brand-name">Clasloop</div>
            </div>
            <div className="lobby-deck-info">
              {sectionLabel && <div className="lobby-section-tag">{sectionLabel}</div>}
              <div className="lobby-deck-name">{deck?.title || session?.topic || "—"}</div>
              {session?.class_name && (
                <div className="lobby-class-name">
                  {session.class_name}
                  {activeParticipants.length > 0 && (
                    <> · {activeParticipants.length} {activeParticipants.length === 1 ? (t.studentJoinedShort || 'inscrito') : (t.studentsJoinedShort || 'inscritos')}</>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* CENTER */}
          <div className="teacher-lobby-center">
            <div className="lobby-prompt">{t.joinWithCode || "Únanse con el código"}</div>
            <div className="lobby-pin">{session?.pin || "—"}</div>
            <div className="lobby-join-info">
              <button
                className="lobby-qr-mini"
                onClick={() => setShowQRLarge(true)}
                title={t.clickEnlarge || "Enlarge"}
                style={{ border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <rect x="3" y="3" width="6" height="6" rx="1"/>
                  <rect x="15" y="3" width="6" height="6" rx="1"/>
                  <rect x="3" y="15" width="6" height="6" rx="1"/>
                  <rect x="11" y="11" width="2" height="2"/>
                  <rect x="15" y="13" width="2" height="2"/>
                  <rect x="19" y="15" width="2" height="2"/>
                  <rect x="13" y="17" width="2" height="2"/>
                  <rect x="17" y="19" width="2" height="2"/>
                  <rect x="11" y="19" width="2" height="2"/>
                </svg>
              </button>
              <span>{t.joinAt || "en"} <span className="url">{joinHost}/join</span></span>
            </div>
          </div>

          {/* BOTTOM */}
          <div className="teacher-lobby-bottom">
            <div className="lobby-count">
              <div className="lobby-count-dot"></div>
              <span>
                {activeParticipants.length} {activeParticipants.length === 1
                  ? (t.studentInRoom || "estudiante en sala")
                  : (t.studentsInRoom || "estudiantes en sala")}
              </span>
            </div>
            <div className="lobby-chips">
              {activeParticipants.map((p, i) => (
                <span
                  key={p.id}
                  className="lobby-chip"
                  style={{ animationDelay: `${Math.min(i * 0.06, 1.4)}s` }}
                >
                  {displayName(p)}
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Start button (floating, themed via sibling selector) */}
      <button
        className="teacher-lobby-start-btn"
        onClick={handleStart}
        disabled={activeParticipants.length === 0}
        style={activeParticipants.length === 0 ? { opacity: 0.4, cursor: 'default' } : {}}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>
        </svg>
        {t.startQuiz || "Empezar"} {activeParticipants.length > 0 && `(${activeParticipants.length})`}
      </button>
    </div>

    {/* PR 21.3: themed confirm modal (replaces native confirm()) */}
    {confirmOpen && (
      <div
        className="teacher-confirm-overlay"
        onClick={() => setConfirmOpen(false)}
      >
        <div
          className="teacher-confirm-modal"
          data-theme={themeId}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="teacher-confirm-title">
            {t.cancelLobbyTitle || "¿Cancelar sesión?"}
          </div>
          <div className="teacher-confirm-body">
            {t.cancelLobbyBody || t.cancelLobbyConfirm || "Los estudiantes que entraron serán expulsados."}
          </div>
          <div className="teacher-confirm-actions">
            <button
              className="teacher-confirm-primary"
              onClick={() => setConfirmOpen(false)}
              autoFocus
            >
              {t.keepLobby || "Volver"}
            </button>
            <button
              className="teacher-confirm-secondary"
              onClick={handleCancelConfirm}
            >
              {t.confirmCancelLobby || "Cancelar sesión"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

// ─── Step 3: Lobby with QR ─────────────────────────────────────────────────
function SessionLobby({ session, deck, t, onStart, onCancel }) {
  const [participants, setParticipants] = useState([]);
  const [showQRLarge, setShowQRLarge] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("session_participants")
        .select("*").eq("session_id", session.id);
      setParticipants(data || []);
    })();

    const channel = supabase.channel(`lobby:${session.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "session_participants", filter: `session_id=eq.${session.id}` },
        (payload) => setParticipants(prev => [...prev, payload.new])
      )
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "session_participants", filter: `session_id=eq.${session.id}` },
        (payload) => setParticipants(prev => prev.map(p => p.id === payload.new.id ? payload.new : p))
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session.id]);

  const activeParticipants = participants.filter(p => !p.is_kicked);
  const guestCount = activeParticipants.filter(p => p.is_guest).length;

  const joinUrl = typeof window !== "undefined"
    ? `${window.location.origin}/join?code=${session.pin}`
    : `https://clasloop.com/join?code=${session.pin}`;
  const joinHost = (joinUrl.replace(/^https?:\/\//, "").split("/")[0]);

  const handleStart = async () => {
    await supabase.from("sessions").update({ status: "active" }).eq("id", session.id);
    onStart();
  };

  const handleKick = async (p) => {
    if (!confirm(t.kickConfirm)) return;
    await supabase.from("session_participants")
      .update({ is_kicked: true })
      .eq("id", p.id);
  };

  const studentLabel = activeParticipants.length === 0 ? t.noStudentsYet
    : activeParticipants.length === 1 ? t.oneStudentJoined
    : `${activeParticipants.length} ${t.studentsJoined}`;

  if (showQRLarge) {
    const dim = typeof window !== "undefined" ? Math.min(420, window.innerHeight - 280) : 320;
    return (
      <div
        onClick={() => setShowQRLarge(false)}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 1000,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          cursor: "pointer", padding: 32,
        }}
      >
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginBottom: 8, fontFamily: "'Outfit',sans-serif" }}>{t.joinAt}</p>
        <p style={{ fontSize: 22, fontWeight: 600, color: "#fff", marginBottom: 28, fontFamily: MONO }}>{joinHost}/join</p>
        <div style={{ background: "#fff", padding: 20, borderRadius: 16 }}>
          <QRCodeSVG value={joinUrl} size={dim} level="M" />
        </div>
        <p className="ns-pin" style={{ fontSize: 64, fontWeight: 800, color: "#fff", fontFamily: MONO, marginTop: 28 }}>{session.pin}</p>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 16 }}>{t.clickClose}</p>
      </div>
    );
  }

  return (
    <div className="ns-fade" style={{ maxWidth: 720, margin: "0 auto" }}>
      <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 4, color: C.text }}>{t.lobbyTitle}</h2>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 20 }}>{deck.title}</p>

      <div className="ns-lobby-top" style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 20, marginBottom: 20 }}>
        <div style={{
          background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14,
          padding: 28, textAlign: "center", boxShadow: C.shadow,
        }}>
          <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>{t.sharePin}</p>
          <div className="ns-pin ns-pulse" style={{ fontSize: 64, fontWeight: 800, color: C.accent, fontFamily: MONO, lineHeight: 1, marginBottom: 8 }}>{session.pin}</div>
          <p style={{ fontSize: 13, color: C.textSecondary }}>{t.joinAt} <strong>{joinHost}/join</strong></p>
        </div>

        <button
          onClick={() => setShowQRLarge(true)}
          style={{
            background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14,
            padding: 14, cursor: "pointer", boxShadow: C.shadow,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            fontFamily: "'Outfit',sans-serif",
          }}
        >
          <div style={{ background: "#fff", padding: 8, borderRadius: 8 }}>
            <QRCodeSVG value={joinUrl} size={140} level="M" />
          </div>
          <p style={{ fontSize: 11, color: C.textMuted, marginTop: 8 }}>{t.clickEnlarge}</p>
        </button>
      </div>

      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, marginBottom: 20, boxShadow: C.shadow }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{studentLabel}</span>
          {guestCount > 0 && (
            <span style={{ fontSize: 11, color: C.textMuted }}>{guestCount} {t.guest}{guestCount !== 1 ? "s" : ""}</span>
          )}
        </div>
        {activeParticipants.length === 0 ? (
          <p style={{ fontSize: 12, color: C.textMuted, textAlign: "center", padding: "16px 0" }}>—</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {activeParticipants.map(p => (
              <ParticipantChip key={p.id} p={p} t={t} onKick={() => handleKick(p)} />
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={onCancel}
          style={{
            padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600,
            background: C.bg, color: C.red, border: `1px solid ${C.redSoft}`,
            cursor: "pointer", fontFamily: "'Outfit',sans-serif",
          }}
        >{t.cancel}</button>
        <button
          onClick={handleStart}
          disabled={activeParticipants.length === 0}
          style={{
            flex: 1, padding: "12px 20px", borderRadius: 10, fontSize: 15, fontWeight: 600,
            background: activeParticipants.length === 0 ? C.bgSoft : `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
            color: activeParticipants.length === 0 ? C.textMuted : "#fff",
            border: "none", cursor: activeParticipants.length === 0 ? "default" : "pointer",
            fontFamily: "'Outfit',sans-serif",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <CIcon name="rocket" size={16} inline />
          {t.startQuiz} ({activeParticipants.length})
        </button>
      </div>
    </div>
  );
}

function ParticipantChip({ p, t, onKick }) {
  const [hover, setHover] = useState(false);
  const name = p.is_guest ? p.guest_name : p.student_name;
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "5px 10px", borderRadius: 16, fontSize: 12,
        background: p.is_guest ? C.orangeSoft : C.bgSoft,
        color: p.is_guest ? C.orange : C.textSecondary,
        border: `1px solid ${p.is_guest ? C.orange + "33" : C.border}`,
        fontFamily: "'Outfit',sans-serif",
      }}
    >
      <span>{name}</span>
      {p.is_guest && <span style={{ fontSize: 10, opacity: 0.7 }}>({t.guest})</span>}
      {hover && (
        <button
          onClick={onKick}
          title={t.kick}
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            padding: 0, lineHeight: 0, color: C.red,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
        </button>
      )}
    </div>
  );
}

// ─── Step 4: Live Results ──────────────────────────────────────────────────
// ─── PR 21.2: Live dashboard themed (auto-paced) ────────────────────
// Full-screen version of LiveResults for the projected screen during
// a session. Same data flow (participants + responses + realtime),
// different visual. Mounted when session.lobby_theme is set.
function LiveResultsThemed({ session, deck, t, lang, onEnd }) {
  const [participants, setParticipants] = useState([]);
  const [responses, setResponses] = useState([]);
  const autoClosedRef = useRef(false);
  const themeId = session?.lobby_theme || 'calm';
  // PR 21.3: themed confirm modal — replaces native confirm() for the
  // "End session" action. Auto-close still bypasses it (no need to
  // confirm when everyone is done — that's the natural finish).
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: pp } = await supabase.from("session_participants").select("*").eq("session_id", session.id);
      const { data: rr } = await supabase.from("responses").select("*").eq("session_id", session.id);
      setParticipants(pp || []);
      setResponses(rr || []);
    })();

    const ch = supabase.channel(`live-themed:${session.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "responses", filter: `session_id=eq.${session.id}` },
        (payload) => setResponses(prev => [...prev, payload.new])
      )
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "session_participants", filter: `session_id=eq.${session.id}` },
        (payload) => setParticipants(prev => {
          if (prev.some(p => p.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        })
      )
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "session_participants", filter: `session_id=eq.${session.id}` },
        (payload) => setParticipants(prev =>
          prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p)
        )
      )
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [session.id]);

  const questions = session.questions || [];
  const totalQ = questions.length;
  const activeParticipants = participants.filter(p => !p.is_kicked);

  // Build leaderboard rows: name, correct count, answered count.
  // Score = number of correct responses (MVP — see PR 21.2 comments).
  const rows = activeParticipants.map(p => {
    const pResp = responses.filter(r => r.participant_id === p.id);
    return {
      ...p,
      name: p.is_guest ? p.guest_name : p.student_name,
      correct: pResp.filter(r => r.is_correct).length,
      answered: pResp.length,
      done: !!p.completed_at,
    };
  }).sort((a, b) => {
    if (b.correct !== a.correct) return b.correct - a.correct;
    return b.answered - a.answered; // tiebreaker: more answered = ahead
  });

  // Summary numbers shown at the top.
  const studentsWhoAnswered = rows.filter(r => r.answered > 0);
  const avgPct = studentsWhoAnswered.length > 0
    ? Math.round(
        studentsWhoAnswered.reduce((s, r) => s + (r.correct / r.answered) * 100, 0) /
        studentsWhoAnswered.length
      )
    : 0;
  const completedCount = rows.filter(r => r.done).length;
  // Hero number: % of questions answered across the class.
  // Total possible answers = activeParticipants × totalQ.
  // Total actual answers = sum of `answered`.
  const totalPossible = activeParticipants.length * totalQ;
  const totalActual = rows.reduce((s, r) => s + r.answered, 0);
  const classProgressPct = totalPossible > 0
    ? Math.round((totalActual / totalPossible) * 100)
    : 0;

  // Section label — reuse the same map as the themed lobby.
  const sectionLabel = deck?.section
    ? (deck.section === 'warmup' ? (t.sectionWarmup || 'Warmup')
       : deck.section === 'exit' ? (t.sectionExit || 'Exit Ticket')
       : deck.section === 'review' ? (t.sectionReview || 'Review')
       : deck.section === 'practice' ? (t.sectionPractice || 'Practice')
       : deck.section)
    : null;

  // PR 21.3: split end flow into:
  //   - handleEndClick: triggered by the X button or "End session" — opens
  //                     the themed confirm modal
  //   - handleEndConfirm: triggered by the modal's destructive button or
  //                       by the auto-close effect (no modal needed when
  //                       everyone finished naturally)
  const handleEndClick = () => setEndConfirmOpen(true);

  const handleEndConfirm = async () => {
    setEndConfirmOpen(false);
    try { await processSessionResults(session); } catch (err) { console.error("SM-2 error:", err); }
    if (session.deck_id) {
      const { data: dk } = await supabase.from("decks").select("uses_count").eq("id", session.deck_id).maybeSingle();
      await supabase.from("decks").update({ uses_count: (dk?.uses_count || 0) + 1 }).eq("id", session.deck_id);
    }
    await supabase.from("sessions").update({
      status: "completed",
      completed_at: new Date().toISOString(),
    }).eq("id", session.id);
    onEnd(session.id);
  };

  // PR 15 carry-over: auto-close when everyone is done.
  // Same logic as legacy LiveResults — kept in this themed copy so the
  // teacher's class flow works the same way regardless of theme.
  // Bypasses the confirm modal (calls handleEndConfirm directly): when
  // everyone finishes naturally there's nothing to confirm.
  useEffect(() => {
    if (autoClosedRef.current) return;
    if (activeParticipants.length === 0) return;
    if (rows.every(r => r.done)) {
      autoClosedRef.current = true;
      handleEndConfirm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.map(r => r.done).join(",")]);

  return (
    <>
      <button
        className="teacher-live-exit"
        onClick={handleEndClick}
        title={t.endSession || "End"}
        aria-label={t.endSession || "End"}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      <div className="teacher-live-page">
        <div className="teacher-live" data-theme={themeId}>
          <div className="teacher-live-inner">

            {/* TOP — brand + deck info + summary stats */}
            <div className="teacher-live-top">
              <div className="live-brand">
                <div className="live-brand-logo">C</div>
                <div className="live-deck-info">
                  {sectionLabel && <div className="live-section-pill">{sectionLabel}</div>}
                  <div className="live-deck-name">{deck?.title || session?.topic || "—"}</div>
                </div>
              </div>
              <div className="live-summary-stats">
                <div className="live-stat">
                  <div className="live-stat-value">{rows.length}</div>
                  <div className="live-stat-label">{rows.length === 1 ? (t.studentInRoom || 'estudiante') : (t.studentsInRoom || 'estudiantes')}</div>
                </div>
                <div className="live-stat">
                  <div className="live-stat-value">{avgPct}%</div>
                  <div className="live-stat-label">{t.liveAverage || 'promedio'}</div>
                </div>
                <div className="live-stat">
                  <div className="live-stat-value">{completedCount}/{rows.length}</div>
                  <div className="live-stat-label">{t.liveDone || 'completados'}</div>
                </div>
              </div>
            </div>

            {/* CENTER — hero progress + leaderboard */}
            <div className="teacher-live-center">
              <div className="live-hero">
                <div className="live-hero-eyebrow">{t.liveProgressEyebrow || 'Progreso de la clase'}</div>
                <div className="live-hero-num">{classProgressPct}%</div>
                <div className="live-hero-suffix">
                  {totalActual} {t.liveOfTotal || 'de'} {totalPossible} {t.liveAnswers || 'respuestas'}
                </div>
              </div>

              <div className="live-leaderboard">
                {rows.length === 0 ? (
                  <div style={{
                    gridColumn: '1 / -1',
                    textAlign: 'center',
                    padding: '60px 20px',
                    opacity: 0.55,
                    fontSize: 16,
                  }}>
                    {t.liveNoOneYet || 'Esperando que entren estudiantes…'}
                  </div>
                ) : rows.map((r, i) => (
                  <div
                    key={r.id}
                    className={`live-row ${i === 0 ? 'is-top1' : ''} ${r.done ? 'is-done' : ''}`}
                  >
                    <div className={`live-row-rank ${i < 3 ? 'is-top' : ''}`}>
                      {i + 1}
                    </div>
                    <div className="live-row-name">{r.name}</div>
                    <div className="live-row-progress">{r.answered}/{totalQ}</div>
                    <div className="live-row-score">{r.correct}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* BOTTOM — pin + end button */}
            <div className="teacher-live-bottom">
              <div className="live-pin-display">
                {t.joinPinLabel || 'PIN'}
                <span className="live-pin-display-num">{session.pin}</span>
              </div>
              <button
                className="teacher-live-end-btn"
                onClick={handleEndClick}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor"/>
                </svg>
                {t.endSession || 'Terminar sesión'}
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* PR 21.3: themed confirm modal (replaces native confirm()) */}
      {endConfirmOpen && (
        <div
          className="teacher-confirm-overlay"
          onClick={() => setEndConfirmOpen(false)}
        >
          <div
            className="teacher-confirm-modal"
            data-theme={themeId}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="teacher-confirm-title">
              {t.endSessionTitle || "¿Terminar sesión?"}
            </div>
            <div className="teacher-confirm-body">
              {t.endSessionBody || t.endSessionConfirm || "Esto cierra el quiz para todos. Los estudiantes verán sus resultados."}
            </div>
            <div className="teacher-confirm-actions">
              <button
                className="teacher-confirm-primary"
                onClick={() => setEndConfirmOpen(false)}
                autoFocus
              >
                {t.keepLive || "Volver"}
              </button>
              <button
                className="teacher-confirm-secondary"
                onClick={handleEndConfirm}
              >
                {t.confirmEndSession || "Terminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LiveResults({ session, t, onEnd }) {
  const [participants, setParticipants] = useState([]);
  const [responses, setResponses] = useState([]);
  // PR 15: prevent the auto-close logic from firing more than once.
  // Once true, the effect that detects "all completed" no-ops, even if
  // a late participant updates their completed_at after we've called
  // handleEnd (which can happen during the few seconds of state
  // transition). Also prevents re-triggering when the realtime
  // subscription replays events on reconnect.
  const autoClosedRef = useRef(false);

  useEffect(() => {
    (async () => {
      const { data: pp } = await supabase.from("session_participants").select("*").eq("session_id", session.id);
      const { data: rr } = await supabase.from("responses").select("*").eq("session_id", session.id);
      setParticipants(pp || []);
      setResponses(rr || []);
    })();

    const ch = supabase.channel(`live:${session.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "responses", filter: `session_id=eq.${session.id}` },
        (payload) => setResponses(prev => [...prev, payload.new])
      )
      // PR 15: subscribe to participant updates so we see ✓ in realtime
      // when each student reaches the results screen. We listen to both
      // INSERT (someone new joined late) and UPDATE (someone completed).
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "session_participants", filter: `session_id=eq.${session.id}` },
        (payload) => setParticipants(prev => {
          if (prev.some(p => p.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        })
      )
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "session_participants", filter: `session_id=eq.${session.id}` },
        (payload) => setParticipants(prev =>
          prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p)
        )
      )
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [session.id]);

  const questions = session.questions || [];
  const totalQ = questions.length;
  const activeParticipants = participants.filter(p => !p.is_kicked);

  const results = activeParticipants.map(p => {
    const pResp = responses.filter(r => r.participant_id === p.id);
    return {
      ...p,
      name: p.is_guest ? p.guest_name : p.student_name,
      correct: pResp.filter(r => r.is_correct).length,
      answered: pResp.length,
    };
  }).sort((a, b) => b.correct - a.correct);

  // PR 16: fix average calculation. The previous formula divided by
  // totalQ for every participant, including those who hadn't answered
  // a single question yet. Result: a class of 3 students where only
  // one answered 2/2 correctly showed 8% average (2 / 3 / 8 = 8%)
  // instead of the intuitive 100% for the student who actually played.
  //
  // The fix: only consider students who answered at least one question,
  // and compute their average as (correct / answered) × 100. This
  // reflects the active class's performance live, and updates naturally
  // as more students answer.
  const studentsWhoAnswered = results.filter(r => r.answered > 0);
  const avgPct = studentsWhoAnswered.length > 0
    ? Math.round(
        studentsWhoAnswered.reduce((s, r) => s + (r.correct / r.answered) * 100, 0) /
        studentsWhoAnswered.length
      )
    : 0;

  const handleEnd = async () => {
    try { await processSessionResults(session); } catch (err) { console.error("SM-2 error:", err); }
    if (session.deck_id) {
      const { data: dk } = await supabase.from("decks").select("uses_count").eq("id", session.deck_id).maybeSingle();
      await supabase.from("decks").update({ uses_count: (dk?.uses_count || 0) + 1 }).eq("id", session.deck_id);
    }
    await supabase.from("sessions").update({
      status: "completed",
      completed_at: new Date().toISOString(),
    }).eq("id", session.id);
    // PR 13: pass the session id so the parent can navigate to the
    // recap page. The status update above triggers the Database Webhook
    // that fires the Edge Function to generate the AI insight in the
    // background — by the time the teacher lands on /recap, the insight
    // is usually ready or almost ready.
    onEnd(session.id);
  };

  // PR 15: auto-close when ALL active participants have reached the
  // results screen (completed_at is set). Fires once per LiveResults
  // mount thanks to autoClosedRef.
  //
  // What counts as "everyone done":
  //   - There is at least 1 active participant (not kicked)
  //   - Every active participant has completed_at != null
  //
  // Edge cases handled by the design:
  //   - 0 participants → never fires (no one to wait for)
  //   - Late joiner who never reaches results → blocks auto-close,
  //     teacher closes manually (acceptable per design conversation)
  //   - Realtime replay on reconnect → autoClosedRef prevents double-fire
  useEffect(() => {
    if (autoClosedRef.current) return;
    if (activeParticipants.length === 0) return;
    const allDone = activeParticipants.every(p => p.completed_at != null);
    if (!allDone) return;
    autoClosedRef.current = true;
    handleEnd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeParticipants]);

  const retCol = (v) => v >= 70 ? C.green : v >= 40 ? C.orange : C.red;

  return (
    <div className="ns-fade" style={{ maxWidth: 560, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <CIcon name="chart" size={20} inline /> {t.liveResults}
        </h2>
        <button
          onClick={handleEnd}
          style={{
            fontSize: 12, padding: "8px 16px", borderRadius: 8, fontWeight: 600,
            background: C.bg, color: C.red, border: `1px solid ${C.redSoft}`,
            cursor: "pointer", fontFamily: "'Outfit',sans-serif",
          }}
        >{t.endSession}</button>
      </div>

      <div style={{
        background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20,
        textAlign: "center", marginBottom: 16, boxShadow: C.shadow,
      }}>
        <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>{session.topic}</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 12 }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 700, color: C.accent, fontFamily: MONO }}>{activeParticipants.length}</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>{t.students}</div>
          </div>
          <div>
            <div style={{ fontSize: 32, fontWeight: 700, color: retCol(avgPct), fontFamily: MONO }}>{avgPct}%</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>{t.average}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {results.map((s, i) => {
          const pct = totalQ > 0 ? (s.correct / totalQ) * 100 : 0;
          return (
            <div key={s.id} style={{
              background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
              padding: "12px 16px", display: "flex", alignItems: "center", gap: 12,
              boxShadow: C.shadow,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.textMuted, width: 20, textAlign: "center" }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  {s.name}
                  {s.is_guest && <span style={{ fontSize: 10, color: C.orange, background: C.orangeSoft, padding: "1px 6px", borderRadius: 6 }}>{t.guest}</span>}
                  {/* PR 15: ✓ chip when this student reached the results screen.
                      Updated in realtime via the session_participants subscription. */}
                  {s.completed_at && (
                    <span style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: C.green,
                      background: (C.greenSoft || "#E6F4EA"),
                      padding: "1px 7px",
                      borderRadius: 6,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      fontFamily: "'Outfit', sans-serif",
                    }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      {t.studentDone}
                    </span>
                  )}
                </div>
                <div style={{ background: C.bgSoft, height: 4, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: retCol(pct), transition: "width .25s ease" }} />
                </div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, fontFamily: MONO, color: retCol(pct) }}>
                {s.correct}/{totalQ}
              </span>
            </div>
          );
        })}
        {results.length === 0 && (
          <p style={{ textAlign: "center", color: C.textMuted, padding: 32 }}>{t.waitingResponses}</p>
        )}
      </div>
    </div>
  );
}

// ─── Your Plan For Today ────────────────────────────────────────────────
//
// The protagonist row on Today. Pulls from getTodayPlan (active unit per
// class + recent-launches fallback). Visual language matches the deck
// cards in /classes/:id and /decks: stripe-top per section, badge inline,
// minimal chrome. The point is the teacher should feel "this is mine,
// I planned this" — not "this is the algorithm's pick".
//
// Layout choice: items are stacked vertically full-width (not in a grid)
// so they read like a list of meaningful actions rather than a wall of
// equivalent options. Each row's section badge + stripe make the role
// scannable without reading.
function YourPlanForToday({ teacherId, t, lang = "en", onPickItem, onLoaded }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teacherId) return;
    (async () => {
      try {
        // PR 25.2: switched from getTodayPlan (heuristic-based) to
        // getScheduledPlan (filters by units.day_dates set explicitly
        // by the teacher). Units without day_dates produce no items
        // here — there's no fallback, by design (Jota's call).
        const list = await getScheduledPlan(teacherId);
        setItems(list);
        // PR 25.2: expose loaded items to parent so the sidebar can
        // reuse them (filter to pending) without a double-fetch.
        if (onLoaded) onLoaded(list);
      } catch (e) {
        console.error("Today plan fetch failed:", e);
        if (onLoaded) onLoaded([]);
      } finally {
        setLoading(false);
      }
    })();
    // onLoaded intentionally excluded from deps — stable parent callback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherId]);

  // Don't render the heading skeleton during loading — Today already has
  // a page header; an empty section title with no items below it would
  // flicker awkwardly. Just render nothing until we know.
  if (loading) return null;

  const count = items.length;

  return (
    <div className="ns-fade" style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
        <h3 style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 15, fontWeight: 700, color: C.text,
          letterSpacing: "-0.01em",
        }}>
          {t.yourPlanTitle}
        </h3>
        {count > 0 && (
          <span style={{ fontSize: 12, color: C.textMuted, fontFamily: MONO }}>
            {count === 1 ? t.yourPlanItemCountOne : t.yourPlanItemCount.replace("{n}", count)}
          </span>
        )}
      </div>
      <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>{t.yourPlanHint}</p>

      {count === 0 ? (
        // Empty state — minimal, no fake encouragement. Just states the
        // fact and offers the obvious next step.
        <div style={{
          padding: "28px 20px",
          background: C.bg,
          border: `1px dashed ${C.border}`,
          borderRadius: 10,
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4,
          }}>
            {t.yourPlanEmpty}
          </div>
          <div style={{ fontSize: 12.5, color: C.textSecondary, lineHeight: 1.5 }}>
            {t.yourPlanEmptyHint}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map(it => (
            <YourPlanCard
              key={`${it.class.id}-${it.deck.id}`}
              item={it}
              t={t}
              lang={lang}
              onPick={onPickItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// One row in "Your plan for today". Visually echoes the today-card shapes
// from the mockup: section-colored stripe on the left, badge inline,
// title bold, meta in muted gray, prominent Launch button on the right.
//
// Sections: warmup → orange stripe; exit_ticket → purple; general_review
// → neutral. We import sectionAccent from SectionBadge to keep one source
// of truth.
function YourPlanCard({ item, t, lang = "en", onPick }) {
  const { deck, class: cls, status } = item;
  const stripe = sectionAccent(deck.section);
  const isDone = status === "launched_today";
  const qs = deck.questions || [];

  return (
    <div
      onClick={() => onPick(item)}
      style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${stripe}`,
        borderRadius: 10,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        cursor: "pointer",
        // Hover lifts the card with a soft shadow rather than touching the
        // border colors. The previous version dimmed the section identity
        // (warm/cool/neutral stripes lost prominence under a darker
        // perimeter) — that broke the whole point of having section
        // colors in the first place. This way the card "responds" without
        // ever apologizing for its color.
        transition: "transform .12s ease, box-shadow .12s ease",
        boxShadow: "none",
        // Done-today rows are ghosted — visible but visually quieter.
        // The teacher who already ran the morning warmup should see it
        // ticked off, not erased.
        opacity: isDone ? 0.65 : 1,
      }}
      onMouseEnter={(e) => {
        if (isDone) return; // already-done rows don't lift on hover
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <SectionBadge section={deck.section} lang={lang} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 14.5, fontWeight: 600, color: C.text,
          lineHeight: 1.3,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {deck.title}
        </div>
        <div style={{
          fontSize: 11.5, color: C.textSecondary,
          marginTop: 2,
          display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
        }}>
          <span style={{ fontWeight: 500 }}>{cls.name}</span>
          {/* PR5.1: show the unit context — "Unit 3 — Day 2" — when
              the deck is part of a unit. Reflects the lesson plan
              context "from the other side" (Plan view). */}
          {item.unit && item.unit.name && (
            <>
              <span style={{ width: 3, height: 3, background: C.textMuted, borderRadius: "50%" }} />
              <span style={{ fontWeight: 500 }}>{item.unit.name}</span>
            </>
          )}
          <span style={{ width: 3, height: 3, background: C.textMuted, borderRadius: "50%" }} />
          <span>{qs.length} {t.questions || "questions"}</span>
          {isDone && (
            <>
              <span style={{ width: 3, height: 3, background: C.textMuted, borderRadius: "50%" }} />
              <span style={{ color: C.green, fontWeight: 600 }}>✓ {t.doneToday}</span>
            </>
          )}
        </div>
      </div>

      {!isDone && (
        <button
          onClick={(e) => { e.stopPropagation(); onPick(item); }}
          style={{
            padding: "7px 14px",
            borderRadius: 7,
            background: C.accent,
            color: "#fff",
            border: "none",
            fontFamily: "'Outfit', sans-serif",
            fontSize: 13, fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 4,
            flexShrink: 0,
            transition: "filter .1s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.08)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.filter = "brightness(1)"; }}
        >
          {t.launchNow} →
        </button>
      )}
    </div>
  );
}


// ─── Worth Reviewing Today ──────────────────────────────────────────────
//
// The retention-algorithm row, sitting BELOW "Your plan for today" as a
// supporting cast member rather than the protagonist. Mechanically this
// is the same `getSuggestedDecksForToday` data that v1 used as the
// page's main attraction — what changed in PR3 is its position in the
// hierarchy (below the plan) and its framing (worth reviewing, not
// "do this now"). Same data, different role, calmer copy.
//
// Visual treatment also shifts: cards keep retention chips and overdue
// labels because that information IS useful here (the algorithm's whole
// job is "here's why I think this matters"), but they sit on a slightly
// muted background and use a less prominent button so the eye lands on
// the plan above first.
function WorthReviewingToday({ teacherId, t, lang = "en", onPickSuggestion, onLoaded }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teacherId) return;
    (async () => {
      try {
        const list = await getSuggestedDecksForToday(teacherId);
        // PR 25.2: cap to 6. The algorithm can return up to 9; 9 felt
        // crowded once the sidebar (To do today + Coming up) took
        // permanent space in the layout. 6 fits comfortably below the
        // main plan without dominating the page.
        const capped = list.slice(0, 6);
        setItems(capped);
        if (onLoaded) onLoaded({ count: capped.length });
      } catch (e) {
        console.error("Suggested fetch failed:", e);
        if (onLoaded) onLoaded({ count: 0 });
      } finally {
        setLoading(false);
      }
    })();
    // onLoaded is intentionally not in deps — it's a stable callback from
    // the parent and including it would re-run the fetch every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherId]);

  if (loading) return null; // silently load — the parent shows nothing while loading
  // Empty state: a calm "all caught up" rather than hiding the section
  // entirely — without something here the page can feel broken when this
  // is the page's secondary content.
  if (items.length === 0) {
    return (
      <div className="ns-fade" style={{ marginBottom: 24 }}>
        <h3 style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 15, fontWeight: 700, color: C.text,
          letterSpacing: "-0.01em",
          marginBottom: 6,
        }}>
          {t.worthReviewingTitle}
        </h3>
        <div style={{
          padding: "20px 18px",
          background: C.bgSoft,
          border: `1px dashed ${C.border}`,
          borderRadius: 10,
          fontSize: 13,
          color: C.textSecondary,
          lineHeight: 1.5,
          textAlign: "center",
        }}>
          {t.worthReviewingEmpty}
        </div>
      </div>
    );
  }

  return (
    <div className="ns-fade" style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
        <h3 style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 15, fontWeight: 700, color: C.text,
          letterSpacing: "-0.01em",
        }}>
          {t.worthReviewingTitle}
        </h3>
        <span style={{ fontSize: 12, color: C.textMuted, fontFamily: MONO }}>
          {items.length === 1 ? t.yourPlanItemCountOne : t.yourPlanItemCount.replace("{n}", items.length)}
        </span>
      </div>
      <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>{t.worthReviewingHint}</p>

      {/* Vertical list, same shape as Your Plan above. The two blocks
          should feel like cousins with one differentiator (this block's
          cards have a slightly muted background to mark them as the
          supporting cast). The cap (9 items) is enforced server-side
          in getSuggestedDecksForToday. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map(item => <SuggestedCard key={`${item.class.id}-${item.deck.id}`} item={item} t={t} lang={lang} onPick={onPickSuggestion} />)}
      </div>
    </div>
  );
}

function SuggestedCard({ item, t, lang = "en", onPick }) {
  const { deck, class: cls, retention_score, days_overdue, is_overdue } = item;
  const stripe = sectionAccent(deck.section);
  const retCol = retention_score >= 70 ? C.green : retention_score >= 40 ? C.orange : C.red;

  const overdueLabel = is_overdue && days_overdue > 0
    ? (days_overdue === 1 ? t.overdueDay : t.overdueDays.replace("{n}", days_overdue))
    : null;

  return (
    <div
      onClick={() => onPick(item)}
      style={{
        // Same shape as YourPlanCard above — full-width row, section
        // stripe on the left, badge inline. The ONLY visual differences
        // from Your Plan are intentional and minimal:
        //   1. bgSoft instead of bg → the card sits one shade back from
        //      the protagonist row, marking this as supporting content
        //      without redesigning anything.
        //   2. Retention chip + overdue label inline in the meta row —
        //      this info IS the algorithm's whole pitch ("here's why
        //      this matters today"), so it earns its place. Your Plan
        //      doesn't have these because the teacher already knows why
        //      they planned what they planned.
        background: C.bgSoft,
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${stripe}`,
        borderRadius: 10,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        cursor: "pointer",
        transition: "transform .12s ease, box-shadow .12s ease",
        boxShadow: "none",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <SectionBadge section={deck.section} lang={lang} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 14.5, fontWeight: 600, color: C.text,
          lineHeight: 1.3,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {deck.title}
        </div>
        <div style={{
          fontSize: 11.5, color: C.textSecondary,
          marginTop: 2,
          display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
        }}>
          <span style={{ fontWeight: 500 }}>{cls.name}</span>
          <span style={{ width: 3, height: 3, background: C.textMuted, borderRadius: "50%" }} />
          {/* Retention chip — colored background + bold pct. Matches the
              chip language used in deck cards in /classes/:id and /decks. */}
          <span style={{
            fontFamily: MONO,
            fontSize: 10.5, fontWeight: 600,
            padding: "1px 6px", borderRadius: 4,
            background: retCol + "1A",
            color: retCol,
          }}>
            {retention_score}%
          </span>
          <span>{t.retentionLabel}</span>
          {overdueLabel && (
            <>
              <span style={{ width: 3, height: 3, background: C.textMuted, borderRadius: "50%" }} />
              <span style={{ color: C.red, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 10.5 }}>
                {overdueLabel}
              </span>
            </>
          )}
        </div>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onPick(item); }}
        style={{
          // Slightly less prominent than the Launch button on Your Plan.
          // White bg + dark border, not solid blue. Reads as "available
          // action" rather than "primary action of the day". The plan
          // above keeps the visual weight.
          padding: "7px 14px",
          borderRadius: 7,
          background: C.bg,
          color: C.text,
          border: `1px solid ${C.border}`,
          fontFamily: "'Outfit', sans-serif",
          fontSize: 13, fontWeight: 500,
          cursor: "pointer",
          flexShrink: 0,
          transition: "border-color .12s ease, background .12s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = C.textMuted;
          e.currentTarget.style.background = C.bg;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = C.border;
          e.currentTarget.style.background = C.bg;
        }}
      >
        {t.launchNow}
      </button>
    </div>
  );
}

// ─── PR 25.2: ComingUpSidebar — right-rail "To do today" + "Next 7 days" ──
//
// Two stacked sections rendered to the right of the main column on
// desktop, and stacked above the main column on mobile (<900px).
//
// "To do today" reuses the same getScheduledPlan result that the
// center column has, but filters to status="pending" only (already-
// launched decks don't need a reminder). Passed down by the parent so
// we don't double-fetch.
//
// "Next 7 days" calls getUpcomingPlan independently — it has its own
// fetch path because the date range is different.

function ComingUpSidebar({ teacherId, todayPlanItems, t, lang = "en", onPickItem }) {
  const [upcoming, setUpcoming] = useState([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);

  useEffect(() => {
    if (!teacherId) return;
    (async () => {
      try {
        const list = await getUpcomingPlan(teacherId, 7);
        setUpcoming(list);
      } catch (e) {
        console.error("Upcoming plan fetch failed:", e);
      } finally {
        setLoadingUpcoming(false);
      }
    })();
  }, [teacherId]);

  // Filter today's items to pending only — already-launched decks
  // don't need a "to do" reminder.
  const todoItems = (todayPlanItems || []).filter(it => it.status === "pending");
  const todoCount = todoItems.length;

  // Format relative day label: "Mañana" if it's tomorrow, else "Mar 27"
  const formatRelativeDayLabel = (date) => {
    if (!(date instanceof Date)) return "";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const candidate = new Date(date);
    candidate.setHours(0, 0, 0, 0);
    const locale = lang === "es" ? "es" : lang === "ko" ? "ko" : "en-US";
    let label;
    try {
      label = new Intl.DateTimeFormat(locale, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(date);
    } catch {
      label = date.toDateString();
    }
    const isTomorrow = candidate.getTime() === tomorrow.getTime();
    return { label, relative: isTomorrow ? t.relativeTomorrow : null };
  };

  const sectionDot = (section) => {
    const color = section === "warmup" ? C.orange
      : section === "exit_ticket" ? C.purple
      : C.textMuted;
    return (
      <span style={{
        width: 7, height: 7, borderRadius: 7,
        background: color, flexShrink: 0,
        display: "inline-block",
      }} />
    );
  };

  return (
    <aside style={{
      display: "flex",
      flexDirection: "column",
      gap: 18,
    }}>
      {/* TO DO TODAY */}
      <section style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: "16px 16px 14px",
      }}>
        <div style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 12,
        }}>
          <h3 style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 700, fontSize: 15,
            color: C.text, margin: 0,
            letterSpacing: "-0.005em",
          }}>
            {t.todoTitle}
          </h3>
          <span style={{
            display: "inline-flex",
            alignItems: "center", justifyContent: "center",
            minWidth: 22, height: 22, padding: "0 7px",
            borderRadius: 11,
            background: todoCount > 0 ? C.accent : C.bgSoft,
            color: todoCount > 0 ? "#FFFFFF" : C.textMuted,
            fontSize: 12, fontWeight: 700,
            fontFamily: "'Outfit', sans-serif",
          }}>
            {todoCount}
          </span>
        </div>

        {todoCount === 0 ? (
          <div style={{
            padding: "8px 4px",
            color: C.textMuted,
            fontSize: 13,
            textAlign: "center",
          }}>
            {t.todoEmpty}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {todoItems.map((it, idx) => (
              <button
                key={`${it.deck.id}-${idx}`}
                onClick={() => onPickItem(it)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  padding: "10px 0",
                  borderTop: idx === 0 ? "none" : `1px solid ${C.border}`,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.bgSoft; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {sectionDot(it.deck.section)}
                  <span style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 600, fontSize: 13.5,
                    color: C.text,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    flex: 1,
                  }}>
                    {it.deck.title}
                  </span>
                </div>
                <div style={{
                  fontSize: 11.5,
                  color: C.textSecondary,
                  marginLeft: 13,
                }}>
                  {it.class?.name || ""}
                  {it.unit?.name ? ` · ${it.unit.name}` : ""}
                  {it.dayNumber ? ` · Day ${it.dayNumber}` : ""}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* COMING UP — next 7 days */}
      <section style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: "16px 16px 14px",
      }}>
        <div style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 12,
        }}>
          <h3 style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 700, fontSize: 15,
            color: C.text, margin: 0,
            letterSpacing: "-0.005em",
          }}>
            {t.comingUpTitle}
          </h3>
          {!loadingUpcoming && (
            <span style={{
              display: "inline-flex",
              alignItems: "center", justifyContent: "center",
              minWidth: 22, height: 22, padding: "0 7px",
              borderRadius: 11,
              background: upcoming.reduce((s, g) => s + g.items.length, 0) > 0 ? C.accent : C.bgSoft,
              color: upcoming.reduce((s, g) => s + g.items.length, 0) > 0 ? "#FFFFFF" : C.textMuted,
              fontSize: 12, fontWeight: 700,
              fontFamily: "'Outfit', sans-serif",
            }}>
              {upcoming.reduce((s, g) => s + g.items.length, 0)}
            </span>
          )}
        </div>

        {loadingUpcoming ? (
          <div style={{
            padding: "8px 4px",
            color: C.textMuted,
            fontSize: 13,
            textAlign: "center",
          }}>
            …
          </div>
        ) : upcoming.length === 0 ? (
          <div style={{
            padding: "8px 4px",
            color: C.textMuted,
            fontSize: 13,
            textAlign: "center",
          }}>
            {t.comingUpEmpty}
          </div>
        ) : (
          <div>
            {upcoming.map(group => {
              const { label, relative } = formatRelativeDayLabel(group.date);
              return (
                <div key={group.date.toISOString()} style={{ marginBottom: 12 }}>
                  <div style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 700, fontSize: 11,
                    color: C.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    margin: "0 0 6px",
                    display: "flex", alignItems: "baseline", gap: 6,
                  }}>
                    <span>{label}</span>
                    {relative && (
                      <span style={{
                        color: C.accent,
                        fontWeight: 600,
                        textTransform: "none",
                        letterSpacing: 0,
                      }}>
                        · {relative}
                      </span>
                    )}
                  </div>
                  {group.items.map((it, idx) => (
                    <button
                      key={`${group.date.toISOString()}-${it.deck.id}-${idx}`}
                      onClick={() => onPickItem(it)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "7px 8px",
                        margin: "0 -8px",
                        cursor: "pointer",
                        borderRadius: 5,
                        background: "transparent",
                        border: "none",
                        width: "calc(100% + 16px)",
                        textAlign: "left",
                        fontFamily: "inherit",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = C.bgSoft; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      {sectionDot(it.deck.section)}
                      <span style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 500, fontSize: 13,
                        color: C.text,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        flex: 1,
                      }}>
                        {it.deck.title}
                      </span>
                      <span style={{
                        fontSize: 11,
                        color: C.textMuted,
                        flexShrink: 0,
                      }}>
                        {it.class?.grade || ""}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </aside>
  );
}

// ─── Main Export ───────────────────────────────────────────────────────────
export default function SessionFlow({ lang = "en", setLang, onNavigateToDecks, onOpenMobileMenu, notifyActiveSessionChanged }) {
  const t = i18n[lang] || i18n.en;
  const [user, setUser] = useState(null);
  const [classes, setClasses] = useState([]);
  // URL-bound subviews (Phase 3):
  //   /sessions                          → step="pickDeck" (default)
  //   /sessions/lobby/:sessionId         → step="lobby"
  //   /sessions/live/:sessionId          → step="live"
  // The "options" step is intentionally NOT in the URL — it's a transient
  // "configuring before launch" state that doesn't need to survive refresh,
  // and giving it a URL would be misleading (the deck object only lives in
  // memory at that moment). It stays as a local-only state value.
  const navigate = useNavigate();
  const optionsMatch = useMatch("/sessions/options/:deckId");
  const lobbyMatch = useMatch("/sessions/lobby/:sessionId");
  const liveMatch  = useMatch("/sessions/live/:sessionId");
  const urlSessionId = lobbyMatch?.params?.sessionId || liveMatch?.params?.sessionId || null;
  const urlDeckId = optionsMatch?.params?.deckId || null;
  // Local step state. The URL drives lobby/live AND options (the latter
  // for deep links from ClassPage's deck cards — clicking a deck card
  // takes the teacher straight to options). The effect below keeps
  // state in sync when the URL changes (back button, deep link, refresh).
  const [step, setStep] = useState(() => {
    if (lobbyMatch) return "lobby";
    if (liveMatch) return "live";
    if (optionsMatch) return "options";
    return "pickDeck";
  });
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [session, setSession] = useState(null);
  const [toast, setToast] = useState(null); // { message, code? } | null
  // PR 25.2: share today's plan items between center column and sidebar
  // to avoid double-fetching. YourPlanForToday's onLoaded sets this.
  const [todayPlanItems, setTodayPlanItems] = useState([]);

  // URL-driven intents:
  //   ?class=<id>    → focus the deck picker on this class
  // The legacy ?createClass=1 is forwarded to /classes (see effect below).
  const [searchParams, setSearchParams] = useSearchParams();
  const focusClassId = searchParams.get(QUERY.CLASS) || "";

  // Sync URL → step. Fires on initial mount (deep link / refresh on
  // /sessions/lobby/:id, /sessions/options/:deckId, etc) and on browser
  // back/forward.
  useEffect(() => {
    if (lobbyMatch) setStep(prev => prev === "live" ? prev : "lobby");
    else if (liveMatch) setStep("live");
    else if (optionsMatch) setStep("options");
    else if (step === "lobby" || step === "live" || step === "options") {
      // We were in lobby/live/options but the URL no longer says so
      // (user pressed back). Reset to pickDeck and clear in-memory
      // session/deck.
      setStep("pickDeck");
      setSession(null);
      setSelectedDeck(null);
    }
    // We don't include `step` in the deps — that's intentional. We only want
    // this effect to react to URL changes, not to its own setState calls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobbyMatch, liveMatch, optionsMatch]);

  // Hydration: if we landed on /sessions/lobby/:id or /sessions/live/:id
  // directly (refresh, deep link, OAuth bounce-back), session and
  // selectedDeck are null in memory. Load them from the DB so the UI can
  // render. If the session is gone (cancelled/ended) bounce to /sessions.
  useEffect(() => {
    if (!urlSessionId) return;
    if (session && session.id === urlSessionId && selectedDeck) return; // already hydrated
    let cancelled = false;
    (async () => {
      const { data: s, error: sErr } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", urlSessionId)
        .maybeSingle();
      if (cancelled) return;
      if (sErr || !s || s.status === "cancelled" || s.status === "ended") {
        navigate(ROUTES.SESSIONS, { replace: true });
        return;
      }
      setSession(s);
      // Load the deck so the lobby's title/cover/questions can render.
      const { data: dk } = await supabase
        .from("decks")
        .select("*")
        .eq("id", s.deck_id)
        .maybeSingle();
      if (!cancelled && dk) setSelectedDeck(dk);
    })();
    return () => { cancelled = true; };
  }, [urlSessionId]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Hydration for options deep link: /sessions/options/:deckId is reached
  // when a teacher clicks a deck card from ClassPage. We need to load the
  // deck so the SessionOptions step has something to render. RLS already
  // restricts which decks the teacher can fetch — if the deck isn't in
  // their reach, we bounce back to /sessions.
  useEffect(() => {
    if (!urlDeckId) return;
    if (selectedDeck && selectedDeck.id === urlDeckId) return; // already hydrated
    let cancelled = false;
    (async () => {
      const { data: dk, error: dErr } = await supabase
        .from("decks")
        .select("*")
        .eq("id", urlDeckId)
        .maybeSingle();
      if (cancelled) return;
      if (dErr || !dk) {
        navigate(ROUTES.SESSIONS, { replace: true });
        return;
      }
      setSelectedDeck(dk);
    })();
    return () => { cancelled = true; };
  }, [urlDeckId]);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);
      // PR 19: order classes by position (teacher's drag arrangement)
      const { data: cls } = await supabase
        .from("classes")
        .select("*")
        .eq("teacher_id", user.id)
        .order("position", { ascending: true })
        .order("created_at", { ascending: false });
      setClasses(cls || []);
    })();
  }, []);

  // If we arrived with ?createClass=1 (e.g. from "+ New class" elsewhere),
  // open the modal and remove the param so the modal doesn't reopen on
  // back/forward or token refresh.
  // Legacy handler: older flows used /sessions?createClass=1 to open the
  // create-class modal. Class creation now lives in MyClasses (the teacher's
  // home), so we forward the intent there. Once any deployed link or
  // bookmark with this URL is unlikely to still be in use, this whole effect
  // can be dropped.
  useEffect(() => {
    if (searchParams.get(QUERY.CREATE_CLASS) === "1") {
      navigate(`${ROUTES.CLASSES}?${QUERY.CREATE_CLASS}=1`, { replace: true });
    }
  }, [searchParams, navigate]);

  // ?class=<id> is a leftover query param from the old DeckPicker flow.
  // We clear it on next tick so a stale URL doesn't keep it indefinitely.
  // The new dashboard doesn't read it; this exists purely to clean the URL.
  useEffect(() => {
    if (!focusClassId) return;
    const t = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      next.delete(QUERY.CLASS);
      setSearchParams(next, { replace: true });
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusClassId]);

  // Auto-dismiss toast after 3s (5s when showing a class code so the teacher
  // has time to read it before it disappears).
  useEffect(() => {
    if (!toast) return;
    const ms = toast.code ? 5000 : 3000;
    const timer = setTimeout(() => setToast(null), ms);
    return () => clearTimeout(timer);
  }, [toast]);

  // PR 23.11: when a teacher closes the tab / navigates away while in
  // an active session (lobby or live), mark the session as
  // pending_close_at = now() so the cleanup RPC can close it later.
  // If they come back within 2 min, the lobby/live re-mount effect
  // clears the flag (see below).
  //
  // Why beforeunload + sendBeacon: at unload, regular fetch/supabase
  // calls can be cancelled by the browser. sendBeacon is the official
  // "fire and forget" channel for telemetry-on-unload. Supabase REST
  // accepts plain JSON PATCH via fetch with keepalive=true; that's the
  // closest equivalent we can do here.
  //
  // PR 23.13.2 (bugfix): the previous version called `supabase.auth.
  // session()` which is a v1 API that doesn't exist in supabase-js v2.
  // It returned undefined, the code fell back to anon key, RLS
  // rejected the PATCH with 400. Now we proactively cache the access
  // token from supabase.auth.getSession() (async, called once on
  // mount) into a ref. beforeunload reads ref.current — always the
  // current authed token, available synchronously.
  const accessTokenRef = useRef(null);

  useEffect(() => {
    if (!session?.id) return;
    if (session?._isPractice) return;
    if (step !== "lobby" && step !== "live") return;

    // Refresh the cached token on every relevant mount. supabase-js
    // refreshes the token in the background so this stays valid.
    (async () => {
      const { data } = await supabase.auth.getSession();
      accessTokenRef.current = data?.session?.access_token || null;
    })().catch(() => {});

    const onBeforeUnload = () => {
      try {
        const token = accessTokenRef.current;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        // Without a logged-in user token, the request can't satisfy
        // RLS for sessions UPDATE. Bail silently — the 2-min zombie
        // timer is a backup.
        if (!token || !supabaseUrl || !anonKey) return;
        fetch(`${supabaseUrl}/rest/v1/sessions?id=eq.${session.id}`, {
          method: "PATCH",
          keepalive: true,
          headers: {
            "Content-Type": "application/json",
            "apikey": anonKey,
            "Authorization": `Bearer ${token}`,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({ pending_close_at: new Date().toISOString() }),
        });
      } catch (e) {
        // beforeunload runs at a delicate moment; never throw
        console.warn("[clasloop] beforeunload pending_close_at:", e);
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [session?.id, step, session?._isPractice]);

  // PR 23.11: when SessionFlow mounts (or re-mounts) into an active
  // session that has pending_close_at set, the teacher has come back.
  // Clear the flag so the zombie cleanup doesn't fire on us.
  useEffect(() => {
    if (!session?.id || session?._isPractice) return;
    if (step !== "lobby" && step !== "live") return;
    // Only act if pending_close_at is set
    if (!session.pending_close_at) return;
    (async () => {
      const { error } = await supabase
        .from("sessions")
        .update({ pending_close_at: null })
        .eq("id", session.id);
      if (error) {
        // Likely: migration phase23_11_zombie_sessions.sql hasn't run
        // yet (column doesn't exist) — log so it's visible, don't
        // crash the lobby render.
        console.warn("[clasloop] clear pending_close_at:", error);
      }
    })();
    // Reflect locally so the next render doesn't re-fire
    setSession(s => s ? { ...s, pending_close_at: null } : s);
  }, [session?.id, session?.pending_close_at, step, session?._isPractice]);

  const handleLaunch = async (config) => {
    const { deck, classId, timeLimit, timeMode, showLeaderboard, showAnswers, allowGuests } = config;

    // Pre-flight: sessions.class_id is NOT NULL. If the deck isn't in a
    // class, surface an actionable message instead of letting the INSERT
    // fail with a generic "Could not create session". Most decks ARE in a
    // class (created from inside a ClassPage), so this only triggers for
    // decks made stand-alone (e.g. via /decks/new without a class
    // prefilled).
    if (!classId) {
      alert(t.sessionNeedsClass || "This deck isn't linked to a class yet. Open the deck and add it to a class to start a session.");
      return false; // tell the child to reset its launching state
    }

    const pin = String(Math.floor(100000 + Math.random() * 900000));

    // PR 20.2.3: resolve the session's theme + section at launch time
    // and persist them on the session row. The student can't read the
    // decks/classes tables directly (RLS), so denormalizing onto
    // sessions is the way they learn the theme.
    //
    // Cascade: deck.lobby_theme_override > class.lobby_theme > 'calm'.
    // We need the class's lobby_theme to compute this. The teacher has
    // RLS access to their own classes, so fetching is fine.
    let resolvedTheme = 'calm';
    if (!deck.lobby_theme_override) {
      const { data: cls } = await supabase
        .from('classes')
        .select('lobby_theme')
        .eq('id', classId)
        .single();
      resolvedTheme = cls?.lobby_theme || 'calm';
    } else {
      resolvedTheme = deck.lobby_theme_override;
    }

    // PR 23.11: before creating a new session, force-close any of the
    // teacher's own sessions that are zombie-pending (closed tab
    // without End test). Per Jota: "si vas a mis classes y lanzas
    // otro deck, lo que estaba abierto debe de cerrarse". The RPC is
    // SECURITY DEFINER and uses auth.uid() internally so it only
    // touches THIS teacher's sessions. Non-fatal if it errors (the
    // INSERT below still proceeds).
    try {
      await supabase.rpc("force_close_my_pending_sessions");
    } catch (e) {
      console.warn("[clasloop] force_close_my_pending_sessions:", e);
    }

    const { data, error } = await supabase.from("sessions").insert({
      class_id: classId,
      teacher_id: user.id,
      deck_id: deck.id,
      topic: deck.title,
      pin,
      status: "lobby",
      questions: deck.questions || [],
      allow_guests: allowGuests,
      // PR 20.2.3: denormalized for student-side reads
      section: deck.section || null,
      lobby_theme: resolvedTheme,
      session_settings: {
        // Bloque timer: time_mode dice si correr per-question (cada pregunta
        // tiene su propio time_limit) o total (un solo countdown sobre toda
        // la sesión). time_limit en modo total es el total en segundos. En
        // modo per_question time_limit queda 0 — StudentJoin lee q.time_limit.
        // Decks viejos sin time_mode se leen como "per_question" por compatibilidad.
        time_mode: timeMode || "per_question",
        time_limit: timeLimit,
        show_leaderboard: showLeaderboard,
        show_answers: showAnswers,
      },
    }).select().single();

    if (error) {
      console.error("Failed to create session:", error);
      // If the failure was a NOT NULL violation on class_id (somehow we
      // got past the pre-flight), surface the same actionable message
      // instead of a generic one. Other errors (network, RLS, etc.) get
      // the existing generic alert.
      const isClassError = error.message && (error.message.includes("class_id") || error.code === "23502");
      alert(isClassError
        ? (t.sessionNeedsClass || "This deck isn't linked to a class yet. Open the deck and add it to a class to start a session.")
        : (t.sessionCreateFailed || "Could not create session. Please try again."));
      return false; // tell the child to reset its launching state
    }

    // If the deck wasn't bound to a class (or was bound to a class the
    // teacher doesn't own — e.g. a favorited deck), the teacher just
    // picked one in the launcher. Persist that choice on the deck so
    // future sessions inherit it and the deck shows up in the class
    // hierarchy. Only update if it's actually different from what the
    // deck already had — avoids a no-op write.
    //
    // We only do this for decks owned by the current teacher. Favorited
    // decks (deck._isFav) point at someone else's deck record we can't
    // mutate; for those, the session.class_id is the only binding.
    if (!deck._isFav && deck.class_id !== classId) {
      const { error: updErr } = await supabase
        .from("decks")
        .update({ class_id: classId })
        .eq("id", deck.id);
      if (updErr) {
        // Non-fatal: the session was created successfully, the deck just
        // didn't get re-homed. Log and continue. The teacher can move it
        // manually from /decks if they care.
        console.warn("Could not bind deck to class after launch:", updErr);
      }
    }

    setSession(data);
    setStep("lobby");
    navigate(buildRoute.sessionsLobby(data.id));
    return true;
  };

  // Suggested-card handler: pre-fill selected deck + class, then go to options.
  // We could skip straight to lobby with defaults, but giving the teacher one
  // last screen to confirm timing/leaderboard/etc. is friendlier.
  const handlePickSuggestion = (item) => {
    setSelectedDeck(item.deck);
    setStep("options");
  };

  const handleCancel = async () => {
    if (session) {
      const { error } = await supabase
        .from("sessions")
        .update({ status: "cancelled" })
        .eq("id", session.id);
      if (error) {
        // PR 23.13.3: log the error so we don't silently fail like
        // before. The pre-23.13.3 schema CHECK constraint rejected
        // 'cancelled' and this UPDATE 400'd; the migration adds it.
        // If the user still sees this warning, the migration didn't
        // run.
        console.warn("[clasloop] cancel session failed:", error);
      }
    }
    setSession(null);
    setSelectedDeck(null);
    setStep("pickDeck");
    // PR 23.13.1: tell App.jsx to re-check the active-session sidebar
    // badge. Without this, the badge keeps showing the now-cancelled
    // session until the next page-change navigation.
    if (notifyActiveSessionChanged) notifyActiveSessionChanged();
    navigate(ROUTES.SESSIONS);
  };

  // PR 13: when the teacher ends a session, we now navigate to the
  // SessionRecap page (showing leaderboard + AI insight) instead of
  // bouncing straight back to the sessions hub. Falls back to the hub
  // only if for some reason we don't have a session id (defensive).
  const handleEnd = (endedSessionId) => {
    setSession(null);
    setSelectedDeck(null);
    setStep("pickDeck");
    // PR 23.13.1: same reason as handleCancel — refresh sidebar.
    if (notifyActiveSessionChanged) notifyActiveSessionChanged();
    if (endedSessionId) {
      navigate(buildRoute.sessionRecap(endedSessionId));
    } else {
      navigate(ROUTES.SESSIONS);
    }
  };

  if (!user) return <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>Loading...</div>;

  return (
    <div style={{ padding: "28px 20px" }}>
      <style>{css}</style>
      {step !== "lobby" && step !== "live" && (
        <PageHeader
          title={t.pageTitle}
          lang={lang}
          setLang={setLang}
          onOpenMobileMenu={onOpenMobileMenu}
          maxWidth={step === "pickDeck" ? 1340 : 800}
        />
      )}
      {/* In lobby/live there's no PageHeader, so render the hamburger on its
          own so the user can still open the drawer on mobile. */}
      {(step === "lobby" || step === "live") && (
        <div style={{ maxWidth: 800, margin: "0 auto 16px" }}>
          <MobileMenuButton onOpen={onOpenMobileMenu} />
        </div>
      )}

      {/* PR 25.2: pickDeck uses a wider container (1340px) with a
          2-col grid for sidebar. Other steps stay at maxWidth 800. */}
      <div style={{
        maxWidth: step === "pickDeck" ? 1340 : 800,
        margin: "0 auto",
      }}>
        {/* Deep-link hydration placeholder. When refreshing /sessions/options/:deckId
            we land with step="options" already (set from optionsMatch) but
            selectedDeck is still null until the deck fetch resolves. Without
            this guard, NONE of the step blocks below render — the page goes
            blank for a frame, then SessionOptions mounts with an ns-fade
            animation, producing a visible flash. Showing a quiet Loading
            state here keeps the screen stable until the deck arrives, then
            SessionOptions slides in cleanly. Same idea for /sessions/lobby/:id
            and /sessions/live/:id when session/deck haven't hydrated yet. */}
        {(
          (optionsMatch && !selectedDeck) ||
          (lobbyMatch && (!session || !selectedDeck)) ||
          (liveMatch && (!session || !selectedDeck))
        ) && (
          <p style={{ textAlign: "center", color: C.textMuted, padding: 40 }}>Loading...</p>
        )}

        {step === "pickDeck" && (
          <div className="today-grid" style={{
            display: "grid",
            gridTemplateColumns: "1fr 340px",
            gap: 28,
            alignItems: "start",
          }}>
            {/* CENTER COLUMN */}
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 14, color: C.textSecondary, marginBottom: 20 }}>{t.subtitle}</p>

              <YourPlanForToday
                teacherId={user.id}
                t={t}
                lang={lang}
                onPickItem={(item) => navigate(buildRoute.sessionsOptions(item.deck.id))}
                onLoaded={setTodayPlanItems}
              />

              <WorthReviewingToday
                teacherId={user.id}
                t={t}
                lang={lang}
                onPickSuggestion={handlePickSuggestion}
              />

              {/* Quick link to classes */}
              <div style={{
                marginTop: 8,
                padding: "16px 18px",
                background: C.bgSoft,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 14,
                flexWrap: "wrap",
              }}>
                <span style={{ fontSize: 13, color: C.textSecondary, flex: 1, minWidth: 200 }}>
                  {t.quickLinkToClasses}
                </span>
                <button
                  onClick={() => navigate(ROUTES.CLASSES)}
                  className="clp-lift"
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    background: C.accent,
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "'Outfit',sans-serif",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.quickLinkToClassesBtn} →
                </button>
              </div>
            </div>

            {/* RIGHT SIDEBAR */}
            <div style={{
              position: "sticky",
              top: 24,
              alignSelf: "start",
              maxHeight: "calc(100vh - 48px)",
              overflowY: "auto",
            }} className="today-sidebar">
              <ComingUpSidebar
                teacherId={user.id}
                todayPlanItems={todayPlanItems}
                t={t}
                lang={lang}
                onPickItem={(item) => navigate(buildRoute.sessionsOptions(item.deck.id))}
              />
            </div>
          </div>
        )}

        {step === "options" && selectedDeck && (
          <SessionOptions
            deck={selectedDeck}
            classes={classes}
            t={t}
            lang={lang}
            onLaunch={handleLaunch}
            onBack={() => {
              // If we arrived via deep link (/sessions/options/:deckId from
              // a ClassPage deck card), the natural "back" is the class
              // page the deck belongs to — going to pickDeck would be
              // a UX detour. Otherwise (came from the deck picker) we
              // reset state and go back to it.
              if (optionsMatch && selectedDeck.class_id) {
                navigate(buildRoute.classDetail(selectedDeck.class_id));
                return;
              }
              if (optionsMatch) {
                // No class on the deck (favorited / orphan edge case) —
                // fall back to the deck picker URL.
                navigate(ROUTES.SESSIONS);
                return;
              }
              setSelectedDeck(null);
              setStep("pickDeck");
            }}
          />
        )}

        {step === "lobby" && session && selectedDeck && (
          // PR 21.1: route to themed full-screen lobby if the session has
          // a theme set. Falls back to the legacy in-page lobby otherwise.
          // The themed lobby is `position: fixed inset: 0` so the app
          // sidebar/topbar are hidden during the projected experience.
          session.lobby_theme ? (
            <SessionLobbyThemed
              session={session}
              deck={selectedDeck}
              t={t}
              lang={lang}
              onStart={() => { setStep("live"); navigate(buildRoute.sessionsLive(session.id)); }}
              onCancel={handleCancel}
            />
          ) : (
            <SessionLobby
              session={session}
              deck={selectedDeck}
              t={t}
              onStart={() => { setStep("live"); navigate(buildRoute.sessionsLive(session.id)); }}
              onCancel={handleCancel}
            />
          )
        )}

        {step === "live" && session && (
          // PR 21.2: route to themed full-screen live dashboard if the
          // session has a theme. Falls back to the legacy LiveResults
          // (in-page panel) when no theme is set.
          session.lobby_theme ? (
            <LiveResultsThemed
              session={session}
              deck={selectedDeck}
              t={t}
              lang={lang}
              onEnd={handleEnd}
            />
          ) : (
            <LiveResults
              session={session}
              t={t}
              onEnd={handleEnd}
            />
          )
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="ns-fade"
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 200,
            background: C.green, color: "#fff",
            padding: "10px 16px", borderRadius: 10,
            fontSize: 13, fontWeight: 600, fontFamily: "'Outfit',sans-serif",
            boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <CIcon name="check" size={14} inline /> {toast.message}
        </div>
      )}
    </div>
  );
}
