import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { LogoMark, CIcon } from "../components/Icons";
import { Avatar } from "../components/Avatars";
import { checkAndGrantUnlocks } from "../lib/unlock-checker";
import { generateGuestToken, saveGuestSession, validateGuestName, clearGuestSession } from "../lib/guest-session";
import { C, MONO } from "../components/tokens";
import { resolveTimeLimit } from "../lib/time-limits";
import { getPracticeTimerPref, setPracticeTimerPref } from "../lib/practice-timer-pref";
import { evaluateAnswer, describeCorrectAnswer, formatStudentAnswer } from "../lib/scoring";
import { QUERY } from "../routes";
import { getSectionTheme, getSectionLabel, SectionIconSVG } from "../lib/section-theme";

// Quiz option colors — kahoot-style fixed palette. NOT theme-aware on purpose:
// students need to see the same colors the teacher launches the session with.
const OPT_C = ["#2383E2", "#0F7B6C", "#D9730D", "#6940A5"];
const retCol = (v) => v >= 70 ? C.green : v >= 40 ? C.orange : C.red;

const i18n = {
  en: {
    joinSession: "Join Session", sessionPin: "Session PIN", yourName: "Your name",
    namePlaceholder: "Enter your name", join: "Join",
    notFound: "Session not found. Check the PIN.", youreIn: "You're in!",
    waitingFor: "Waiting for", toStart: "to start...", pin: "PIN",
    of: "of", correct: "Correct!", incorrect: "Incorrect",
    seeResults: "See results", next: "Next",
    sessionComplete: "Session Complete", greatJob: "Great job!",
    keepPracticing: "Keep practicing!", correctLabel: "correct", incorrectLabel: "incorrect",
    // Review screen — student sees correct answers + their answers question by question.
    seeAnswers: "See correct answers",
    backToResults: "Back to results",
    yourAnswer: "Your answer",
    correctAnswer: "Correct answer",
    pendingReview: "Waiting for teacher review",
    pendingReviewHint: "Your answer was sent. Your teacher will review it.",
    noAnswerSubmitted: "(no answer)",
    reviewQuestion: "Question {n} of {total}",
    pointsLabel: "{points}/{max} points",
    joinAnother: "Join another session", noQuestions: "No questions available",
    // PR 20.2: themed quiz render labels
    pregunta: "Question", de: "of", elegiRespuesta: "Pick the right answer",
    segundos: "seconds", tuPuntaje: "Your score",
    // PR 11: practice mode exit button
    exitPractice: "Exit",
    exitPracticeConfirm: "Exit practice? Your progress will be lost.",
    // PR 20.2.4: confirmation when a student tries to leave a live quiz
    exitQuizConfirm: "Exit the quiz? Your progress will be lost.",
    timerOnTip: "Timer on. Tap to study without time pressure.",
    timerOffTip: "Timer off. Tap to turn on the recommended timing.",
    totalTimeLabel: "Time left",
    teacherEndedTitle: "Teacher ended the session", teacherEndedHint: "Here's how you did so far.",
    waitingEndedTitle: "Session ended", waitingEndedHint: "The teacher ended the session before it started.",
    returningHome: "Returning to home...",
    timeUp: "Time's up!",
    true_: "True", false_: "False",
    typeAnswer: "Type your answer...", submit: "Submit",
    tapToOrder: "Tap items in the correct order",
    tapMatch: "Tap a left item, then its match",
    correctAnswer: "Correct answer", undo: "Undo",
    joiningAs: "Joining as",
    multipleCorrect: "Select all that apply",
    submitted: "Submitted",
    notGraded: "ungraded",
    writeYourSentence: "Write your sentence",
    sentenceMustContain: "Must contain:",
    sentenceMustHaveWords: "min words",
    dragSliderHint: "Drag the slider to your estimate",
    youUnlocked: "You unlocked a new avatar!",
    awesome: "Awesome!",
    moreUnlocks: "more to see",
    backToClass: "Back to class",
  },
  es: {
    joinSession: "Unirse a Sesión", sessionPin: "PIN de Sesión", yourName: "Tu nombre",
    namePlaceholder: "Escribe tu nombre", join: "Unirse",
    notFound: "Sesión no encontrada. Verifica el PIN.", youreIn: "¡Estás dentro!",
    waitingFor: "Esperando que", toStart: "empiece...", pin: "PIN",
    of: "de", correct: "¡Correcto!", incorrect: "Incorrecto",
    seeResults: "Ver resultados", next: "Siguiente",
    sessionComplete: "Sesión Completa", greatJob: "¡Buen trabajo!",
    keepPracticing: "¡Sigue practicando!", correctLabel: "correctas", incorrectLabel: "incorrectas",
    seeAnswers: "Ver respuestas correctas",
    backToResults: "Volver a resultados",
    yourAnswer: "Tu respuesta",
    correctAnswer: "Respuesta correcta",
    pendingReview: "Pendiente de revisión",
    pendingReviewHint: "Tu respuesta fue enviada. Tu profe la va a revisar.",
    noAnswerSubmitted: "(sin respuesta)",
    reviewQuestion: "Pregunta {n} de {total}",
    pointsLabel: "{points}/{max} puntos",
    joinAnother: "Unirse a otra sesión", noQuestions: "No hay preguntas",
    // PR 20.2: themed quiz render labels
    pregunta: "Pregunta", de: "de", elegiRespuesta: "Elegí la respuesta",
    segundos: "segundos", tuPuntaje: "Tu puntaje",
    exitPractice: "Salir",
    exitPracticeConfirm: "¿Salir de la práctica? Vas a perder tu progreso.",
    exitQuizConfirm: "¿Salir del quiz? Tu progreso se perderá.",
    timerOnTip: "Timer activo. Toca para estudiar sin presión.",
    timerOffTip: "Timer apagado. Toca para activar el tiempo recomendado.",
    totalTimeLabel: "Tiempo restante",
    teacherEndedTitle: "El profe terminó la sesión", teacherEndedHint: "Aquí tu progreso hasta ahora.",
    waitingEndedTitle: "Sesión terminada", waitingEndedHint: "El profe terminó la sesión antes de empezar.",
    returningHome: "Regresando al inicio...",
    timeUp: "¡Tiempo!",
    true_: "Verdadero", false_: "Falso",
    typeAnswer: "Escribe tu respuesta...", submit: "Enviar",
    tapToOrder: "Toca los elementos en el orden correcto",
    tapMatch: "Toca un elemento de la izquierda, luego su par",
    correctAnswer: "Respuesta correcta", undo: "Deshacer",
    joiningAs: "Te unirás como",
    multipleCorrect: "Selecciona todas las correctas",
    submitted: "Enviada",
    notGraded: "sin evaluar",
    writeYourSentence: "Escribe tu oración",
    sentenceMustContain: "Debe contener:",
    sentenceMustHaveWords: "palabras mín.",
    dragSliderHint: "Arrastra el control para estimar",
    youUnlocked: "¡Desbloqueaste un avatar!",
    awesome: "¡Genial!",
    moreUnlocks: "más por ver",
    backToClass: "Volver a la clase",
  },
  ko: {
    joinSession: "세션 참여", sessionPin: "세션 PIN", yourName: "이름",
    namePlaceholder: "이름을 입력하세요", join: "참여",
    notFound: "세션을 찾을 수 없습니다. PIN을 확인하세요.", youreIn: "참여 완료!",
    waitingFor: "", toStart: "시작 대기 중...", pin: "PIN",
    of: "/", correct: "정답!", incorrect: "오답",
    seeResults: "결과 보기", next: "다음",
    sessionComplete: "세션 완료", greatJob: "잘했어요!",
    keepPracticing: "계속 연습하세요!", correctLabel: "정답", incorrectLabel: "오답",
    seeAnswers: "정답 보기",
    backToResults: "결과로 돌아가기",
    yourAnswer: "내 답변",
    correctAnswer: "정답",
    pendingReview: "선생님 검토 대기 중",
    pendingReviewHint: "답변이 제출되었습니다. 선생님이 검토할 예정입니다.",
    noAnswerSubmitted: "(답변 없음)",
    reviewQuestion: "{total}문제 중 {n}번",
    pointsLabel: "{points}/{max} 점",
    joinAnother: "다른 세션 참여", noQuestions: "문제가 없습니다",
    // PR 20.2: themed quiz render labels
    pregunta: "문제", de: "/", elegiRespuesta: "정답을 선택하세요",
    segundos: "초", tuPuntaje: "내 점수",
    exitPractice: "나가기",
    exitPracticeConfirm: "연습을 종료할까요? 진행 상황이 사라집니다.",
    exitQuizConfirm: "퀴즈를 나가시겠어요? 진행 상황이 사라집니다.",
    timerOnTip: "타이머 켜짐. 시간 압박 없이 학습하려면 탭하세요.",
    timerOffTip: "타이머 꺼짐. 권장 시간을 활성화하려면 탭하세요.",
    totalTimeLabel: "남은 시간",
    teacherEndedTitle: "선생님이 세션을 종료했습니다", teacherEndedHint: "지금까지의 결과입니다.",
    waitingEndedTitle: "세션 종료됨", waitingEndedHint: "선생님이 시작 전에 세션을 종료했습니다.",
    returningHome: "홈으로 돌아가는 중...",
    timeUp: "시간 초과!",
    true_: "참", false_: "거짓",
    typeAnswer: "답을 입력하세요...", submit: "제출",
    tapToOrder: "올바른 순서로 항목을 탭하세요",
    tapMatch: "왼쪽 항목을 탭한 다음 짝을 탭하세요",
    correctAnswer: "정답", undo: "되돌리기",
    joiningAs: "참여자",
    multipleCorrect: "해당하는 모두 선택",
    submitted: "제출됨",
    notGraded: "채점 없음",
    writeYourSentence: "문장을 작성하세요",
    sentenceMustContain: "포함해야 함:",
    sentenceMustHaveWords: "최소 단어",
    dragSliderHint: "슬라이더를 드래그하여 추정",
    youUnlocked: "새 아바타를 잠금 해제했습니다!",
    awesome: "최고!",
    moreUnlocks: "개 더 보기",
    backToClass: "수업으로 돌아가기",
  },
};

const css = `
  .sj-btn { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .sj-btn:hover { transform: translateY(-1px); filter: brightness(1.05); }
  .sj-btn:active { transform: translateY(0) scale(.97); }
  .sj-btn-secondary:hover { background: ${C.accentSoft} !important; border-color: ${C.accent} !important; color: ${C.accent} !important; }
  .sj-option { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .sj-option:hover { transform: scale(1.02); filter: brightness(1.1); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
  .sj-option:active { transform: scale(.96); }
  .sj-input { transition: border-color .15s, box-shadow .15s; }
  .sj-input:hover { border-color: ${C.accent} !important; }
  .sj-input:focus { border-color: ${C.accent} !important; box-shadow: 0 0 0 3px ${C.accentSoft} !important; }
  .sj-chip { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .sj-chip:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.03); }
  .sj-chip:active:not(:disabled) { transform: translateY(0) scale(.98); }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes popIn { from { opacity: 0; transform: scale(.8); } to { opacity: 1; transform: scale(1); } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
  @keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
  @keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
  @keyframes sj-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .fade-up { animation: fadeUp .35s ease-out both; }
  .pop-in { animation: popIn .3s ease-out both; }
  @keyframes unlockBgIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes unlockCardIn { from { opacity: 0; transform: scale(.85) translateY(12px); } to { opacity: 1; transform: scale(1) translateY(0); } }
  .sj-unlock-bg { animation: unlockBgIn .25s ease-out both; }
  .sj-unlock-card { animation: unlockCardIn .45s cubic-bezier(.34,1.56,.64,1) both; }
  .bounce { animation: bounce .5s ease; }
  .shake { animation: shake .4s ease; }
  .sj-slider {
    -webkit-appearance: none; appearance: none;
    width: 100%; height: 8px; border-radius: 999px;
    background: linear-gradient(90deg, ${C.accent}, ${C.purple});
    outline: none; cursor: pointer; padding: 0;
  }
  .sj-slider::-webkit-slider-thumb {
    -webkit-appearance: none; appearance: none;
    width: 28px; height: 28px; border-radius: 50%;
    background: #fff; border: 3px solid ${C.accent};
    box-shadow: 0 2px 8px rgba(35,131,226,0.35);
    cursor: grab; transition: transform .15s ease;
  }
  .sj-slider::-webkit-slider-thumb:active { transform: scale(1.15); cursor: grabbing; }
  .sj-slider::-moz-range-thumb {
    width: 28px; height: 28px; border-radius: 50%;
    background: #fff; border: 3px solid ${C.accent};
    box-shadow: 0 2px 8px rgba(35,131,226,0.35);
    cursor: grab;
  }
  .sj-slider:disabled { opacity: .6; cursor: default; }
`;

const inp = { fontFamily: "'Outfit',sans-serif", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: "11px 14px", borderRadius: 8, fontSize: 14, width: "100%", outline: "none" };

// ─── Helpers ──────────────────────────────────────────────────────────────
// Resolve question type, falling back to session.activity_type then "mcq".
const getQType = (q, session) => q?.type || session?.activity_type || "mcq";

// Fisher-Yates shuffle (used to randomise order/match positions per question)
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Evaluate correctness + return value to persist in responses.answer (jsonb).
// evaluateAnswer (and describeCorrectAnswer) live in src/lib/scoring.js
// — single source of truth shared with the teacher's To Review page.
// The local copy that used to live here has been removed; if you're
// looking for the per-type grading logic, that's the place.

export default function StudentJoin({ lang: pageLang = "en", profile = null, practiceDeck = null, onPracticeExit = null, guestMode = false, guestPin = "", guestName = "", guestToken = "", onGuestKicked = null }) {
  // Practice mode: start straight in the quiz with the deck's questions, no PIN, no live session.
  const isPractice = Boolean(practiceDeck);
  // Guest mode: prefilled pin + name from the /join page; no profile linkage.
  const isGuest = Boolean(guestMode);

  // ?pin=<6digits>: prefilled PIN when arriving from a notification's "Join now"
  // action (or any future shareable link). Only honored when we're in the
  // logged-in flow (not practice, not guest — those have their own sources).
  // We consume it once on mount and clear it from the URL with replace=true
  // so a back/forward or refresh doesn't re-prefill an old PIN.
  const [searchParams, setSearchParams] = useSearchParams();
  const urlPin = (!isPractice && !isGuest) ? (searchParams.get(QUERY.PIN) || "") : "";

  const [step, setStep] = useState(isPractice ? "quiz" : (isGuest ? "joining" : "join"));
  const [pin, setPin] = useState(isGuest ? guestPin : urlPin);
  const [name, setName] = useState(isGuest ? guestName : (profile?.full_name || ""));
  const isLoggedIn = !isGuest && Boolean(profile?.full_name);
  const [error, setError] = useState("");

  const [session, setSession] = useState(isPractice
    ? { id: `practice-${practiceDeck.id}`, questions: practiceDeck.questions || [], topic: practiceDeck.title, class_id: practiceDeck.class_id, status: "active", _isPractice: true }
    : null);
  // PR 10: track the deck's section ("warmup" | "exit_ticket" | "general_review" | null)
  // so the quiz UI can theme itself per type. For practice mode we read it
  // straight from the practiceDeck prop. For live sessions we fetch it
  // when the session loads (see effect below).
  const [deckSection, setDeckSection] = useState(
    isPractice ? (practiceDeck?.section || null) : null
  );
  // PR 20.1: the resolved lobby/student theme for this deck. Cascade is:
  // deck.lobby_theme_override > class.lobby_theme > 'calm' fallback.
  // Set null until the fetch resolves; defaults to 'calm' when rendered.
  // For practice mode we don't fetch anything — practice always uses 'calm'
  // since there's no class/deck theme context to resolve from.
  const [lobbyThemeId, setLobbyThemeId] = useState(
    isPractice ? 'calm' : null
  );
  const [participant, setParticipant] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]); // [{ isCorrect, raw, points, maxPoints, needsReview }]
  // When the student opens the "see correct answers" review at the end
  // of the session. Toggles between the results summary and the per-
  // question detail view. Only available in graded sessions (live + the
  // student is logged in or guest); always available in practice mode.
  const [showReview, setShowReview] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultAnim, setResultAnim] = useState("");
  const [timeLeft, setTimeLeft] = useState(20);
  // Timer global para modo "total" — countdown único que cuenta toda la sesión.
  // Se inicializa cuando el estudiante entra al quiz si el modo es total. null
  // cuando no aplica (modo per_question, practice, sin timer total). Al llegar
  // a 0 se cierra la sesión y se muestran resultados.
  const [totalTimeLeft, setTotalTimeLeft] = useState(null);
  const [lastIsCorrect, setLastIsCorrect] = useState(false);
  // True when the teacher ends the live session (status → completed/cancelled)
  // while the student is still in lobby/quiz. Used to show a banner on results.
  const [endedByTeacher, setEndedByTeacher] = useState(false);
  // Practice timer preference por deck. Cada deck tiene su propia preferencia
  // (clasloop_practice_timer:<deckId>) — el estudiante elige por deck si quiere
  // estudiar con tiempo o sin presión. Default ON.
  // En sesión en vivo no aplica (el profe controla).
  // El deckId que usamos como key es el del practiceDeck o del session.deck_id
  // si lo tenemos. Si no podemos identificar el deck, fallback a "default".
  const practiceDeckId = practiceDeck?.id || session?.deck_id || "default";
  const [practiceTimerOn, setPracticeTimerOn] = useState(() => getPracticeTimerPref(practiceDeckId));
  useEffect(() => {
    setPracticeTimerPref(practiceDeckId, practiceTimerOn);
  }, [practiceTimerOn, practiceDeckId]);
  // Si el deckId cambia (caso raro: estudiante navega entre prácticas sin
  // unmount), re-sincronizamos el state con la preferencia guardada del nuevo
  // deck para no aplicar el flag de uno a otro.
  useEffect(() => {
    setPracticeTimerOn(getPracticeTimerPref(practiceDeckId));
  }, [practiceDeckId]);

  // ── URL pin consumption ──
  // After mount, if we arrived with ?pin=, strip it from the URL so a
  // refresh/back doesn't keep re-prefilling an old PIN. The initial value is
  // already in state via useState above.
  useEffect(() => {
    if (urlPin) {
      const next = new URLSearchParams(searchParams);
      next.delete(QUERY.PIN);
      setSearchParams(next, { replace: true });
    }
    // We only want to consume on mount — deliberately not depending on urlPin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Unlock celebration (Phase 3) ──
  const [newUnlocks, setNewUnlocks] = useState([]);  // queue of just-unlocked avatars
  const [showingUnlock, setShowingUnlock] = useState(null); // avatar currently being celebrated

  // Per-question working state (cleared when `current` changes)
  const [mcqSelected, setMcqSelected] = useState(null);
  const [tfSelected, setTfSelected] = useState(null);
  const [fillText, setFillText] = useState("");
  const [freeText, setFreeText] = useState("");
  const [sentenceText, setSentenceText] = useState("");
  const [sliderValue, setSliderValue] = useState(null); // null = not interacted yet
  const [orderPicked, setOrderPicked] = useState([]); // ordered list of items
  const [matchPicks, setMatchPicks] = useState({}); // { [left]: right }
  const [matchActiveLeft, setMatchActiveLeft] = useState(null);

  const l = pageLang || "en";
  const t = i18n[l] || i18n.en;

  // Keep `name` in sync with the logged-in profile
  useEffect(() => {
    if (profile?.full_name && step === "join") setName(profile.full_name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.full_name]);

  // Guest auto-join: when the parent passed pre-filled pin+name, join immediately.
  // Runs once on mount.
  useEffect(() => {
    if (!isGuest) return;
    if (step !== "joining") return;
    if (!guestPin || !guestName) return;
    handleJoin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const questions = session?.questions || [];
  const q = questions[current];
  const qType = getQType(q, session);

  // Time limit per question. Tres escenarios:
  //   1) Practice mode con timer apagado → null (sin countdown, el estudiante
  //      avanza a su ritmo).
  //   2) Sesión en vivo modo "total" → null per-pregunta (el timer global
  //      cuenta para toda la sesión, no per-pregunta).
  //   3) Per question (default live, o practice con timer on) → leemos
  //      q.time_limit (sugerido por AI) o caemos al default por tipo via
  //      resolveTimeLimit.
  const timeLimit = useMemo(() => {
    // Practice con timer apagado.
    if (isPractice && !practiceTimerOn) return null;
    // Modo total: el timer corre arriba en lugar de en cada pregunta.
    const mode = session?.session_settings?.time_mode;
    if (mode === "total") return null;
    // Per-question: usamos resolveTimeLimit que ya conoce el set permitido y
    // los defaults por tipo.
    const t = resolveTimeLimit(q);
    return t || null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, isPractice, practiceTimerOn, session?.session_settings?.time_mode]);

  // Stable shuffles per question. Re-shuffle when `current` changes.
  const shuffledItems = useMemo(() => {
    if (qType !== "order" || !Array.isArray(q?.items)) return [];
    return shuffle(q.items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, qType]);

  const shuffledRights = useMemo(() => {
    if (qType !== "match" || !Array.isArray(q?.pairs)) return [];
    return shuffle(q.pairs.map(p => p.right));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, qType]);

  // ── PR 10.1: keep deckSection in sync with practiceDeck ──
  // useState only reads its initial value once. If the parent swaps
  // practiceDeck (e.g. the student finishes one practice deck and the
  // app loads another without remounting StudentJoin), deckSection
  // would stay stuck on the first deck's section. This effect fixes
  // that.
  useEffect(() => {
    if (!isPractice) return;
    setDeckSection(practiceDeck?.section || null);
  }, [isPractice, practiceDeck?.id, practiceDeck?.section]);

  // ── PR 10: load deck.section when the session is set ──
  // We theme the quiz UI by section (warmup/exit/review). The session
  // row itself doesn't include section, only deck_id, so we need a
  // small follow-up fetch. Practice mode skips this entirely (the
  // section is read from practiceDeck on initial mount).
  //
  // PR 10.1 fix: previous version guarded with `if (deckSection != null) return`
  // which meant the section was set ONCE and never re-fetched. After the
  // first quiz, the second/third quiz inherited the previous section
  // (e.g. you'd open a warmup, then an exit ticket, and the exit ticket
  // would still render with warmup theming). Now we re-fetch whenever
  // deck_id changes, and reset the local section first so we don't show
  // stale theming during the brief window before the new fetch resolves.
  useEffect(() => {
    if (isPractice) return;
    if (!session?.deck_id) return;
    // PR 20.2.3: read section + theme directly from the session row.
    // The student has RLS access to sessions (joined via pin/participant),
    // unlike decks/classes which they cannot read. SessionFlow now copies
    // these values onto the session at launch time.
    //
    // Falls back to 'calm' if the column is missing (e.g. the migration
    // wasn't run yet — graceful degradation to the legacy render).
    if (session?.section) setDeckSection(session.section);
    if (session?.lobby_theme) setLobbyThemeId(session.lobby_theme);
    else setLobbyThemeId('calm');
  }, [session?.deck_id, session?.section, session?.lobby_theme, isPractice]);

  // ── Realtime: react to session status changes ──
  useEffect(() => {
    if (!session) return;
    // Don't subscribe in practice mode — there's no real session to listen to.
    if (session._isPractice) return;
    const ch = supabase.channel(`student-session:${session.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${session.id}` },
        (payload) => {
          // CRÍTICO: NO reemplazar session entero con payload.new. Supabase
          // realtime con TOAST storage puede mandar el row con la columna
          // jsonb grande (questions) vacía o truncada — un deck de 38 preguntas
          // con time_limit pesa ~80KB y cae en ese caso. El estudiante vería
          // "No questions available" porque payload.new.questions sería [].
          // Solo mergeamos los campos chicos que pueden cambiar (status,
          // session_settings). El array questions se mantiene del initial
          // fetch que hicimos al joinear.
          setSession(prev => prev ? {
            ...prev,
            status: payload.new.status,
            session_settings: payload.new.session_settings || prev.session_settings,
          } : payload.new);
          // Teacher started the quiz → move from waiting to quiz
          if (payload.new.status === "active" && step === "waiting") setStep("quiz");
          // Teacher ended or cancelled the session → bail out of quiz/lobby
          // and show the results screen (or a "session ended" message if the
          // student hadn't even started answering).
          // BUT: if the student already finished on their own (step === "results"),
          // they reached the end naturally — don't show "Teacher ended" because
          // nobody ended anything from the student's perspective.
          if (payload.new.status === "completed" || payload.new.status === "cancelled") {
            if (step !== "results") {
              setEndedByTeacher(true);
              setStep("results");
            }
          }
        }
      ).subscribe();
    return () => supabase.removeChannel(ch);
  }, [session?.id, step]);

  // ── Realtime: detect when this guest gets kicked from the lobby ──
  // The teacher sets is_kicked=true on a participant row. We listen for that
  // and bail out of the session, telling the parent (GuestJoin) to show a
  // "you were removed" message.
  useEffect(() => {
    if (!isGuest || !participant?.id) return;
    const ch = supabase.channel(`guest-participant:${participant.id}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "session_participants", filter: `id=eq.${participant.id}` },
        (payload) => {
          if (payload.new.is_kicked && onGuestKicked) {
            onGuestKicked("kicked");
          }
        }
      ).subscribe();
    return () => supabase.removeChannel(ch);
  }, [isGuest, participant?.id, onGuestKicked]);

  // ── Timer ──
  useEffect(() => {
    if (step !== "quiz" || showResult || timeLeft <= 0) return;
    const tm = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(tm);
  }, [timeLeft, showResult, step]);

  useEffect(() => {
    if (timeLeft === 0 && !showResult && step === "quiz") submitAnswer(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, showResult, step]);

  // ── Total time mode: timer global ──
  // Cuando el modo de la sesión es "total", iniciamos un countdown único al
  // entrar al quiz. Vive en `totalTimeLeft` y NO se resetea entre preguntas.
  // Al llegar a 0 se forza el final del quiz: lo que el estudiante haya
  // contestado cuenta, lo que no, queda como sin responder.
  //
  // IMPORTANTE: el reset depende del session.id, no de "totalTimeLeft === null".
  // Si el estudiante lanza una sesión y luego otra sin refrescar la página, el
  // valor viejo persistía y el countdown global quedaba activo aunque la nueva
  // sesión fuera per_question. Re-inicializamos en cada cambio de sesión Y
  // forzamos a null cuando el modo no es total.
  useEffect(() => {
    if (step !== "quiz") return;
    const mode = session?.session_settings?.time_mode;
    const totalSec = session?.session_settings?.time_limit;
    if (mode === "total" && totalSec > 0) {
      setTotalTimeLeft(totalSec);
    } else {
      // Modo per_question, o practice, o sin valor: aseguramos que NO haya
      // countdown global colgado de una sesión anterior.
      setTotalTimeLeft(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, session?.id, session?.session_settings?.time_mode, session?.session_settings?.time_limit]);

  // Decremento del timer global cada segundo mientras dure el quiz.
  useEffect(() => {
    if (step !== "quiz" || totalTimeLeft === null || totalTimeLeft <= 0) return;
    const tm = setTimeout(() => setTotalTimeLeft(s => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(tm);
  }, [totalTimeLeft, step]);

  // Al llegar a 0 en modo total → forzamos el cierre del quiz. Si el estudiante
  // estaba mostrando el resultado de la última, no hacemos nada (ya estaba a
  // punto de ver results); si estaba en una pregunta sin responder, hacemos
  // submit null y saltamos directo a results.
  //
  // GUARD CRÍTICO: si el modo de la sesión actual NO es total, este efecto NO
  // debe correr aunque totalTimeLeft sea 0. Eso puede pasar transitoriamente
  // cuando el estudiante viene de una sesión total previa y entra a una
  // per_question — el reset de totalTimeLeft a null corre, pero React puede
  // ejecutar este efecto antes con el valor viejo en cache, causando un
  // setCurrent erróneo que tira "No questions available".
  useEffect(() => {
    if (totalTimeLeft !== 0) return;
    if (step !== "quiz") return;
    const mode = session?.session_settings?.time_mode;
    if (mode !== "total") return;
    if (!showResult) submitAnswer(null);
    setCurrent(questions.length - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalTimeLeft, step]);

  // ── PR 15: mark the participant as completed when they reach the
  // results screen. The teacher's LiveResults view subscribes to this
  // column and shows a ✓ next to each finished student. When ALL
  // participants are completed, the session auto-closes.
  //
  // "Reached the results screen" is the right marker because:
  //   - It covers students who answered every question
  //   - It covers students who skipped/timed-out the last ones
  //   - It covers late joiners who eventually finish
  //
  // We don't track partial progress here — that's what the responses
  // table is for. This is purely a "they're done with their session"
  // signal.
  useEffect(() => {
    if (step !== "results") return;
    if (!participant?.id) return; // can't mark a non-existent participant
    if (isPractice) return;       // practice mode has no live session to close
    let cancelled = false;
    (async () => {
      try {
        await supabase
          .from("session_participants")
          .update({ completed_at: new Date().toISOString() })
          .eq("id", participant.id)
          .is("completed_at", null); // idempotent — only set on first arrival
        // Soft fail by design: if the update errors (network, RLS edge case),
        // the student's experience is unaffected. The teacher just doesn't
        // see the ✓ for this student. Better than blocking the results UI.
      } catch (_) { /* swallow */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, participant?.id, isPractice]);

  // ── Phase 3: when student reaches results, evaluate avatar unlocks ──
  useEffect(() => {
    if (step !== "results") return;
    if (!profile?.id) return; // anonymous students don't earn unlocks
    let cancelled = false;
    (async () => {
      try {
        // Practice mode: persist progress to student_topic_progress so the
        // spaced-repetition engine sees these answers even though there's
        // no live session.
        if (isPractice && session?.class_id && session?.topic) {
          const graded = answers.filter(a => a?.isCorrect !== null && a?.isCorrect !== undefined);
          const correct = graded.filter(a => a.isCorrect).length;
          if (graded.length > 0) {
            const { updateStudentRetention } = await import("../lib/spaced-repetition");
            await updateStudentRetention({
              classId: session.class_id,
              studentName: profile.full_name,
              studentId: profile.id,
              topic: session.topic,
              totalQuestions: graded.length,
              correctAnswers: correct,
            });
          }
        }
        const granted = await checkAndGrantUnlocks(profile.id);
        if (!cancelled && granted.length > 0) {
          setNewUnlocks(granted);
          setShowingUnlock(granted[0]);
        }
      } catch (e) {
        // Silent — unlocks shouldn't break the results screen.
      }
    })();
    return () => { cancelled = true; };
  }, [step, profile?.id]);

  // Advance through the unlock queue when one is dismissed.
  const dismissCurrentUnlock = () => {
    setNewUnlocks(prev => {
      const rest = prev.slice(1);
      setShowingUnlock(rest[0] || null);
      return rest;
    });
  };

  // ── Reset per-question state on question change ──
  useEffect(() => {
    setTimeLeft(timeLimit);
    setShowResult(false);
    setResultAnim("");
    setMcqSelected(null);
    setTfSelected(null);
    setFillText("");
    setFreeText("");
    setSentenceText("");
    setSliderValue(null);
    setOrderPicked([]);
    setMatchPicks({});
    setMatchActiveLeft(null);
  }, [current, timeLimit]);

  // Guest auto-redirect: when the teacher ends the session before the guest
  // has answered anything, there's nothing to show — bounce them back to the
  // public home after a short delay so they can join another session.
  useEffect(() => {
    if (!isGuest) return;
    if (!endedByTeacher) return;
    if (answers.length > 0) return;
    if (step !== "results") return;
    const t = setTimeout(() => {
      try { clearGuestSession(guestPin); } catch (_) {}
      window.location.href = "/";
    }, 2000);
    return () => clearTimeout(t);
  }, [isGuest, endedByTeacher, answers.length, step, guestPin]);

  const handleJoin = async () => {
    if (pin.length !== 6 || !name.trim()) return;
    setError("");
    const { data: sess, error: findErr } = await supabase.from("sessions").select("*").eq("pin", pin).in("status", ["lobby", "active"]).single();
    if (findErr || !sess) { setError(t.notFound); return; }

    // ── Reconnect path: guest already has a token from localStorage ──
    // Skip the INSERT and just fetch their existing row. If they were kicked
    // or the row doesn't exist anymore, hand control back to the parent.
    if (isGuest && guestToken) {
      if (!sess.allow_guests) { setError(t.notFound); return; }
      const { data: existing } = await supabase
        .from("session_participants")
        .select("*")
        .eq("session_id", sess.id)
        .eq("guest_token", guestToken)
        .maybeSingle();
      if (!existing) {
        // Token doesn't match any participant — treat as fresh join
        if (onGuestKicked) onGuestKicked("notFound");
        return;
      }
      if (existing.is_kicked) {
        if (onGuestKicked) onGuestKicked("kicked");
        return;
      }
      setParticipant(existing);
      setSession(sess);
      setStep(sess.status === "active" ? "quiz" : "waiting");
      return;
    }

    let insertData = { session_id: sess.id, student_name: name.trim() };

    if (isGuest) {
      // Block guests from sessions where guests aren't allowed
      if (!sess.allow_guests) { setError(t.notFound); return; }
      const token = generateGuestToken();
      insertData = {
        session_id: sess.id,
        student_name: name.trim(), // legacy column kept populated for older queries
        guest_name: name.trim(),
        guest_token: token,
        is_guest: true,
        student_id: null,
      };
      // Persist locally so a page refresh can reconnect to the same row
      saveGuestSession({ pin: sess.pin, sessionId: sess.id, token, name: name.trim() });
    } else if (profile?.id) {
      // Persist student_id when the user is logged in — required for unlock tracking.
      insertData.student_id = profile.id;
    }

    // PR 16: pre-insert rejoin lookup. Without this, every time the user
    // hits "Join" they create a NEW row, accumulating duplicates in the
    // lobby (a user could appear 3 times if they joined 3 times). The
    // previous code relied on a 23505 unique violation that never fired
    // because no unique constraint exists on session_participants.
    //
    // Lookup priority:
    //   1. student_id (authenticated user — strongest match)
    //   2. guest_token (guest who already had a session_token saved locally)
    //   3. student_name as last resort (guest joining fresh on a new device
    //      with no token yet, but with a name that matches an existing row
    //      from earlier — accept it to prevent dupes; the worst case is two
    //      different students with the same name share a row, which is an
    //      edge case we accept over the much more common rejoin scenario)
    let existing = null;
    if (insertData.student_id) {
      const { data } = await supabase
        .from("session_participants")
        .select("*")
        .eq("session_id", sess.id)
        .eq("student_id", insertData.student_id)
        .maybeSingle();
      existing = data;
    } else if (insertData.guest_token) {
      const { data } = await supabase
        .from("session_participants")
        .select("*")
        .eq("session_id", sess.id)
        .eq("guest_token", insertData.guest_token)
        .maybeSingle();
      existing = data;
    }
    if (!existing) {
      // Fallback: name-based lookup for guests without a token match
      const { data } = await supabase
        .from("session_participants")
        .select("*")
        .eq("session_id", sess.id)
        .eq("student_name", name.trim())
        .limit(1)
        .maybeSingle();
      existing = data;
    }

    if (existing) {
      // Reuse the existing row. If it was kicked, refuse re-entry.
      if (existing.is_kicked) {
        setError(t.notFound);
        return;
      }
      setParticipant(existing);
      setSession(sess);
      setStep(sess.status === "active" ? "quiz" : "waiting");
      return;
    }

    const { data: part, error: joinErr } = await supabase.from("session_participants").insert(insertData).select().single();
    if (joinErr) {
      if (joinErr.code === "23505") {
        // Belt-and-suspenders: if somehow we still race into a duplicate,
        // fetch by name and reuse.
        const { data: raceWinner } = await supabase.from("session_participants").select("*").eq("session_id", sess.id).eq("student_name", name.trim()).single();
        setParticipant(raceWinner);
      } else { setError(joinErr.message); return; }
    } else { setParticipant(part); }
    setSession(sess);
    setStep(sess.status === "active" ? "quiz" : "waiting");
  };

  // Single submit path used by every activity type (and timeout).
  const submitAnswer = async (raw) => {
    if (showResult) return;
    // evaluateAnswer now returns the full scoring tuple. We persist points,
    // maxPoints, needsReview alongside the legacy is_correct so existing
    // code (spaced repetition, live UI) keeps working while new code can
    // use the granular scoring for partial credit on Match/Order.
    const { points, maxPoints, isCorrect, stored, needsReview } = evaluateAnswer(q, qType, raw);
    setLastIsCorrect(isCorrect);
    setShowResult(true);
    // Animation: bounce on correct OR ungraded-submitted (positive feedback either way),
    // shake only on actual incorrect.
    setResultAnim(isCorrect === false ? "shake" : "bounce");
    // Keep the full scoring tuple in local state so the end-of-session
    // "see correct answers" view can show "3 / 4 pairs correct" without
    // re-grading.
    setAnswers(prev => [...prev, { isCorrect, raw, points, maxPoints, needsReview }]);
    if (participant) {
      try {
        const insertData = {
          session_id: session.id,
          participant_id: participant.id,
          question_index: current,
          answer: stored,
          // is_correct stays NOT NULL for back-compat. Ungraded free-text
          // counts as participation (true) for now; the teacher's review
          // will flip it later if they mark it incorrect.
          is_correct: isCorrect === null ? true : isCorrect,
          // New granular scoring. For free/open these start at 0/2; the
          // teacher's review updates them via teacherGradeToPoints.
          points,
          max_points: maxPoints,
          needs_review: needsReview,
          // Si no hay timer (modo total, practice apagado), no podemos medir
          // time_taken_ms — guardamos 0. La métrica se mantiene válida solo
          // cuando hay timer per-question.
          time_taken_ms: (timeLimit && timeLeft != null) ? (timeLimit - timeLeft) * 1000 : 0,
        };
        // For guests, attach the guest_token so the row passes the RLS policy
        // and can be linked back to the right participant.
        if (isGuest && participant.guest_token) {
          insertData.guest_token = participant.guest_token;
        }
        // PR 14: upsert (not insert) to handle the case where a student
        // left and re-joined the session — they may re-answer a question
        // they already answered. Without upsert this used to create a
        // duplicate row, doubling their leaderboard points. With upsert
        // the new answer overwrites the old one, treating re-entry as
        // a correction. The (session_id, participant_id, question_index)
        // unique constraint was added in supabase/phase14_responses_unique.sql.
        await supabase.from("responses").upsert(insertData, {
          onConflict: "session_id,participant_id,question_index",
        });
      } catch (_) { /* swallow – UI already reflects state */ }
    }
  };

  // ── Per-type handlers ──
  const handleMcq = (idx) => {
    if (showResult) return;
    // Single-correct path (legacy + simple): submit immediately on click.
    if (!Array.isArray(q?.correct)) {
      setMcqSelected(idx);
      submitAnswer(idx);
      return;
    }
    // Multi-correct: toggle in selection set, do NOT submit yet — student presses "Submit".
    setMcqSelected(prev => {
      const set = new Set(Array.isArray(prev) ? prev : []);
      if (set.has(idx)) set.delete(idx); else set.add(idx);
      return Array.from(set).sort((a, b) => a - b);
    });
  };

  const handleMcqSubmit = () => {
    if (showResult) return;
    const sel = Array.isArray(mcqSelected) ? mcqSelected : [];
    if (sel.length === 0) return;
    submitAnswer(sel);
  };

  const handleTf  = (val) => { if (showResult) return; setTfSelected(val);  submitAnswer(val); };

  const handleFreeSubmit = () => {
    if (showResult) return;
    submitAnswer(freeText);
  };

  const handleFillSubmit = () => {
    if (showResult || !fillText.trim()) return;
    submitAnswer(fillText);
  };

  const handleSentenceSubmit = () => {
    if (showResult || !sentenceText.trim()) return;
    submitAnswer(sentenceText);
  };

  const handleSliderSubmit = () => {
    if (showResult) return;
    const val = sliderValue ?? Math.round(((q?.min ?? 0) + (q?.max ?? 100)) / 2);
    submitAnswer(val);
  };

  const handleOrderPick = (item) => {
    if (showResult) return;
    if (orderPicked.includes(item)) return;
    const next = [...orderPicked, item];
    setOrderPicked(next);
    if (next.length === (q.items?.length || 0)) submitAnswer(next);
  };
  const handleOrderUndo = () => {
    if (showResult) return;
    setOrderPicked(prev => prev.slice(0, -1));
  };

  const handleMatchLeft = (left) => {
    if (showResult) return;
    if (matchPicks[left]) return;
    setMatchActiveLeft(left === matchActiveLeft ? null : left);
  };
  const handleMatchRight = (right) => {
    if (showResult) return;
    if (!matchActiveLeft) return;
    if (Object.values(matchPicks).includes(right)) return;
    const next = { ...matchPicks, [matchActiveLeft]: right };
    setMatchPicks(next);
    setMatchActiveLeft(null);
    if (Object.keys(next).length === (q.pairs?.length || 0)) submitAnswer(next);
  };
  const handleMatchUndo = (left) => {
    if (showResult) return;
    const { [left]: _, ...rest } = matchPicks;
    setMatchPicks(rest);
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) setStep("results");
    else setCurrent(c => c + 1);
  };

  // PR 20.2.4: exit handler for live quiz. Reuses the same state reset
  // as the "Join another session" button on the results page. Practice
  // mode has its own onPracticeExit prop (kept separate).
  const handleExitQuiz = () => {
    if (!confirm(t.exitQuizConfirm)) return;
    if (isPractice && onPracticeExit) {
      onPracticeExit();
      return;
    }
    // Live: reset to the join screen
    setStep("join");
    setPin("");
    setName(profile?.full_name || "");
    setAnswers([]);
    setCurrent(0);
    setSession(null);
    setParticipant(null);
    setEndedByTeacher(false);
    setShowReview(false);
    setMcqSelected(null);
    setLobbyThemeId(null);
    setDeckSection(null);
  };

  // ── Joining (guest auto-join in flight) ──
  if (step === "joining") return (
    <>
      <style>{css}</style>
      <div style={{ maxWidth: 380, margin: "0 auto", padding: "100px 20px", textAlign: "center" }}>
        <div className="fade-up" style={{ display: "inline-flex", marginBottom: 16 }}><LogoMark size={48} /></div>
        <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 8, fontFamily: "'Outfit',sans-serif" }}>{t.joining || "Joining..."}</p>
        {error && (
          <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, background: C.redSoft, color: C.red, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "'Outfit',sans-serif" }}>
            <CIcon name="warning" size={14} inline /> {error}
          </div>
        )}
      </div>
    </>
  );

  // ── Join ──
  if (step === "join") return (
    <>
      <style>{css}</style>
      <div style={{ maxWidth: 380, margin: "0 auto", padding: "60px 20px" }}>
        <div className="fade-up" style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "inline-flex", marginBottom: 12 }}><LogoMark size={48} /></div>
          <h1 style={{ fontFamily: "'Outfit'", fontSize: 24, fontWeight: 700 }}>{t.joinSession}</h1>
        </div>
        <div className="fade-up" style={{ background: C.bg, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24, animationDelay: ".1s" }}>
          {error && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: C.redSoft, color: C.red, fontSize: 13, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <CIcon name="warning" size={14} inline /> {error}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.sessionPin}</label>
              <input className="sj-input" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000"
                onKeyDown={e => e.key === "Enter" && isLoggedIn && handleJoin()}
                style={{ ...inp, textAlign: "center", fontSize: 32, fontFamily: MONO, fontWeight: 700, letterSpacing: ".15em", padding: 16 }} />
            </div>
            {isLoggedIn ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", borderRadius: 10,
                background: C.bgSoft, border: `1px solid ${C.border}`,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: 700, fontSize: 13, flexShrink: 0,
                }}>{(profile.full_name || "?").trim().charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.2 }}>{t.joiningAs}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.full_name}</div>
                </div>
              </div>
            ) : (
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.yourName}</label>
                <input className="sj-input" value={name} onChange={e => setName(e.target.value)} placeholder={t.namePlaceholder} style={inp}
                  onKeyDown={e => e.key === "Enter" && handleJoin()} />
              </div>
            )}
            <button className="sj-btn" onClick={handleJoin} disabled={pin.length !== 6 || !name.trim()} style={{
              width: "100%", padding: 14, borderRadius: 10, fontSize: 16, fontWeight: 600,
              background: pin.length === 6 && name.trim() ? `linear-gradient(135deg, ${C.accent}, ${C.purple})` : C.border,
              color: "#fff", opacity: pin.length === 6 && name.trim() ? 1 : 0.4,
            }}>{t.join}</button>
          </div>
        </div>
      </div>
    </>
  );

  // ── Waiting ──
  if (step === "waiting") return (
    <>
      <style>{css}</style>
      <div style={{ maxWidth: 400, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
        <div className="fade-up">
          <div style={{ width: 64, height: 64, borderRadius: 16, background: C.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", animation: "pulse 2s infinite" }}>
            <CIcon name="clock" size={30} inline />
          </div>
          <h2 style={{ fontFamily: "'Outfit'", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{t.youreIn}</h2>
          <p style={{ color: C.textSecondary, fontSize: 15 }}>{t.waitingFor} <strong>{session.topic}</strong> {t.toStart}</p>
          <p style={{ color: C.textMuted, fontSize: 13, marginTop: 10 }}>{t.pin}: {session.pin}</p>
          <div style={{ marginTop: 24, display: "flex", gap: 6, justifyContent: "center" }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: C.accent, animation: `pulse 1.2s infinite ${i * .2}s` }} />)}
          </div>
        </div>
      </div>
    </>
  );

  // ── Quiz ──
  if (step === "quiz") {
    if (!q) return <><style>{css}</style><p style={{ textAlign: "center", padding: 40, color: C.textMuted }}>{t.noQuestions}</p></>;
    const isLast = current === questions.length - 1;
    // Si no hay timer (modo total live, o practice apagado), pct/timerCol no
    // se usan — protegemos contra NaN.
    const hasTimer = typeof timeLimit === "number" && timeLimit > 0;
    const pct = hasTimer && timeLeft > 0 ? (timeLeft / timeLimit) * 100 : 0;
    const timerCol = pct > 50 ? C.green : pct > 25 ? C.orange : C.red;

    // PR 10: section theme — drives the quiz visual identity (bg tint,
    // accent for progress bar / selected option, header label).
    // Falls back to the default theme when deckSection is null (legacy
    // decks or fetch failed).
    const theme = getSectionTheme(deckSection);
    const sectionLabel = getSectionLabel(deckSection, l);

    // ─── PR 20.2: NEW THEMED RENDER (Calm + Pop only) ─────────────────
    //
    // For live sessions where a theme is resolved AND the question is a
    // single-correct MCQ with text options, render the new "stage" layout
    // from student-prototype.html. For everything else (multi-correct,
    // fill-blank, sliders, true/false, image options, practice mode
    // without theme) we fall through to the legacy render below which
    // is fully feature-complete and unchanged.
    //
    // Themes active in this PR: 'calm', 'pop'. 'ocean' and 'mono' have
    // CSS but aren't selectable yet — when class.lobby_theme is set to
    // them via SQL they still render, just no UI exposes the choice.
    const themedRenderEligible =
      !isPractice &&
      lobbyThemeId &&
      ['calm', 'pop'].includes(lobbyThemeId) &&
      qType === 'mcq' &&
      Array.isArray(q?.options) &&
      !Array.isArray(q?.correct) && // single-correct only
      q.options.every(o => typeof o === 'string' || (typeof o === 'object' && !o?.image_url));

    if (themedRenderEligible) {
      const totalScore = answers.reduce((s, a) => s + (a?.points || 0), 0);
      const studentInitial = (participant?.student_name || "?").trim().charAt(0).toUpperCase() || "?";
      const studentDisplayName = participant?.student_name || "—";
      const sessionTitle = session?.deck_title || "—";
      const className = session?.class_name || "";
      const circumference = 2 * Math.PI * 44;
      const ringOffset = hasTimer && timeLimit > 0
        ? circumference * (1 - Math.max(0, timeLeft) / timeLimit)
        : 0;
      const progress = ((current + 1) / questions.length) * 100;
      const stageLabel = sectionLabel || (deckSection ? deckSection : "Quiz");

      const handleTileClick = (idx) => {
        if (showResult) return;
        handleMcq(idx);
      };

      return (
        <>
          <style>{css}</style>
          <div className="stage-page">
            <div className="stage-wrap">
              <div className="stage" data-theme={lobbyThemeId}>
                <div className="top-strip">
                  <div className="brand-area">
                    {/* PR 20.2.4: exit button — first thing in the strip
                        so a student who entered wrong can always escape.
                        Confirm prevents accidental exits mid-quiz. */}
                    <button
                      className="stage-exit-btn"
                      onClick={handleExitQuiz}
                      title={t.exitPractice}
                      aria-label={t.exitPractice}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                    <span className="brand-name">Clasloop</span>
                    <div className="session-info">
                      <span className="section-pill">{stageLabel}</span>
                      <span className="dot"></span>
                      <span>{sessionTitle}</span>
                      {className && (
                        <>
                          <span className="dot"></span>
                          <span>{className}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="student-block">
                    <div className="student-meta-text">
                      <div className="student-name-top">{studentDisplayName}</div>
                      <div className="student-class">{totalScore.toLocaleString()} pts</div>
                    </div>
                    <div className="student-avatar">{studentInitial}</div>
                  </div>
                </div>

                <div className="content">
                  <div className="question-state">
                    <div className="question-main">
                      <div className="question-meta">
                        <span className="q-counter">
                          <strong>{t.pregunta || "Pregunta"} {current + 1}</strong> {t.de || "de"} {questions.length}
                        </span>
                        <div className="q-progress">
                          <div className="q-progress-fill" style={{ width: `${progress}%` }}></div>
                        </div>
                      </div>

                      <div className="question-prompt-label">{t.elegiRespuesta || "Elegí la respuesta"}</div>
                      <div className="question-text-tablet" style={{ whiteSpace: "pre-wrap" }}>{q.q}</div>

                      <div className="answers-grid">
                        {q.options.map((o, i) => {
                          const optText = typeof o === "string" ? o : (o?.text || "");
                          const letter = String.fromCharCode(65 + i);
                          const selected = mcqSelected === i;
                          // PR 20.2.4: reveal states after submit.
                          // - is-correct: the right answer (green glow)
                          // - is-wrong: student picked wrong (red glow)
                          // - is-dimmed: not picked + not the correct one
                          let revealClass = '';
                          if (showResult) {
                            const isCorrectOption = i === q.correct;
                            const studentPickedThis = selected;
                            if (isCorrectOption) revealClass = 'is-correct';
                            else if (studentPickedThis) revealClass = 'is-wrong';
                            else revealClass = 'is-dimmed';
                          }
                          return (
                            <button
                              key={i}
                              className={`answer-tile ${selected ? 'selected' : ''} ${revealClass}`}
                              onClick={() => handleTileClick(i)}
                              disabled={showResult}
                            >
                              <div className="tile-letter">{letter}</div>
                              <div className="tile-text">{optText}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="question-rail">
                      {hasTimer && (
                        <div>
                          <div className="timer-ring-big">
                            <svg viewBox="0 0 100 100">
                              <circle className="timer-track" cx="50" cy="50" r="44"/>
                              <circle
                                className="timer-fill"
                                cx="50" cy="50" r="44"
                                strokeDasharray={circumference}
                                strokeDashoffset={ringOffset}
                              />
                            </svg>
                            <div className="timer-num">{Math.max(0, timeLeft)}</div>
                          </div>
                          <div className="timer-caption">{t.segundos || "segundos"}</div>
                        </div>
                      )}

                      {hasTimer && <div className="rail-divider"></div>}

                      <div className="rail-stat">
                        <div className="rail-stat-label">{t.tuPuntaje || "Tu puntaje"}</div>
                        <div className="rail-stat-value">{totalScore.toLocaleString()}</div>
                      </div>

                      <div className="rail-stat">
                        <div className="rail-stat-label">{t.pregunta || "Pregunta"}</div>
                        <div className="rail-stat-value">{current + 1}/{questions.length}</div>
                      </div>

                      {/* PR 20.2.4: Next/Results button only appears once
                          the student has submitted. Uses handleNext which
                          is the same handler the legacy render uses. */}
                      {showResult && (
                        <button className="stage-next-btn" onClick={handleNext}>
                          {current + 1 >= questions.length
                            ? (t.seeResults || "See results")
                            : (t.next || "Next")}
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M13 6l6 6-6 6"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      );
    }
    // ─── End of themed render. Falls through to legacy render below. ──

    return (
      <>
        <style>{css}</style>
        {/* Section-tinted page background. Mounted as a fixed div behind
            the content so it covers the viewport even on short pages.
            Uses the theme.bg color which adapts to light/dark mode and
            section type. The student's "this is a warmup / exit ticket /
            review" feeling comes mostly from this tint. */}
        <div style={{
          position: "fixed", inset: 0,
          background: theme.bg,
          zIndex: -1,
          transition: "background .25s ease",
        }} />
        {/* Total mode countdown bar — fijo arriba mientras hay tiempo. */}
        {totalTimeLeft !== null && totalTimeLeft > 0 && (() => {
          const totalSec = session?.session_settings?.time_limit || 1;
          const pct = Math.max(0, (totalTimeLeft / totalSec) * 100);
          const mm = Math.floor(totalTimeLeft / 60);
          const ss = totalTimeLeft % 60;
          const lowTime = totalTimeLeft <= 30; // últimos 30s warn
          return (
            <div style={{
              position: "sticky", top: 0, zIndex: 30,
              background: C.bg,
              borderBottom: `1px solid ${C.border}`,
            }}>
              <div style={{ maxWidth: 480, margin: "0 auto", padding: "10px 20px 8px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: C.textSecondary, fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5 }}>{t.totalTimeLabel}</span>
                  <span style={{
                    fontSize: 14, fontWeight: 700, fontFamily: MONO,
                    color: lowTime ? C.red : C.text,
                  }}>{String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}</span>
                </div>
                <div style={{ width: "100%", height: 4, background: C.bgSoft, borderRadius: 4 }}>
                  <div style={{
                    width: `${pct}%`, height: "100%", borderRadius: 4,
                    background: lowTime ? C.red : C.accent,
                    transition: "width 1s linear, background .3s ease",
                  }} />
                </div>
              </div>
            </div>
          );
        })()}
        <div style={{ maxWidth: 480, margin: "0 auto", padding: 20 }}>
          {/* PR 11.1: Exit button — moved inside the quiz flow because
              the previous fixed-position version was hidden under the
              sidebar (sidebar is z-index 60, fixed left). Now it sits
              above the section header, aligned left, as a normal
              flow element. Always visible regardless of viewport size
              or sidebar state. Practice mode only — in live sessions
              the teacher controls when it ends. */}
          {isPractice && onPracticeExit && (
            <button
              onClick={() => {
                if (answers.length > 0) {
                  if (!confirm(t.exitPracticeConfirm)) return;
                }
                onPracticeExit();
              }}
              style={{
                marginBottom: 14,
                padding: "6px 12px 6px 8px",
                borderRadius: 999,
                background: deckSection ? `${theme.tint}` : C.bgSoft,
                border: `1px solid ${deckSection ? `${theme.borderActive}33` : C.border}`,
                color: deckSection ? theme.onTint : C.textSecondary,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12.5,
                fontWeight: 500,
                fontFamily: "'Outfit', sans-serif",
                transition: "background .15s ease",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              {t.exitPractice}
            </button>
          )}
          {/* PR 10: Section header — visual identity tag. Tells the
              student "this is a warmup / exit ticket / review" via
              icon + label + background tint. Only renders if the
              deck has a section (legacy decks without one stay clean). */}
          {deckSection && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              marginBottom: 14, paddingBottom: 12,
              borderBottom: `0.5px solid ${theme.borderActive}22`,
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%",
                background: theme.iconBg,
                color: theme.iconFg,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <SectionIconSVG section={deckSection} color={theme.iconFg} size={16} />
              </div>
              <div style={{
                fontSize: 11.5, fontWeight: 600,
                color: theme.labelFg,
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                {sectionLabel}
              </div>
              <div style={{
                marginLeft: "auto",
                fontSize: 12,
                color: theme.onTint,
                opacity: 0.7,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 180,
              }}>
                {session?.topic || practiceDeck?.title || ""}
              </div>
            </div>
          )}
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: deckSection ? theme.onTint : C.textSecondary, opacity: deckSection ? 0.7 : 1, fontWeight: 500 }}>
              {current + 1} {t.of} {questions.length}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Toggle de timer en practice mode. Solo visible en practice;
                  en live el profe controla y el estudiante no decide.
                  Visual: stopwatch que se rellena cuando ON (accent) y queda
                  outline gris cuando OFF — mismo lenguaje que la estrella en
                  MyClasses (icono con cuerpo que se ilumina, no solo cambia
                  color de borde). */}
              {isPractice && (
                <button
                  onClick={() => setPracticeTimerOn(v => !v)}
                  title={practiceTimerOn ? t.timerOnTip : t.timerOffTip}
                  aria-label={practiceTimerOn ? t.timerOnTip : t.timerOffTip}
                  style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: practiceTimerOn ? C.accentSoft : C.bgSoft,
                    border: `1px solid ${practiceTimerOn ? C.accent + "44" : C.border}`,
                    cursor: "pointer", padding: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all .15s ease",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={practiceTimerOn ? C.accent : "none"} stroke={practiceTimerOn ? C.accent : C.textMuted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="10" y1="2" x2="14" y2="2" />
                    <line x1="12" y1="2" x2="12" y2="5" />
                    <circle cx="12" cy="14" r="7.5" />
                    <line x1="12" y1="14" x2="12" y2="9.5" stroke={practiceTimerOn ? "#fff" : C.textMuted} />
                    <line x1="12" y1="14" x2="15.2" y2="14" stroke={practiceTimerOn ? "#fff" : C.textMuted} />
                  </svg>
                </button>
              )}
              {/* Círculo countdown — solo si hay timer per-question activo. En
                  modo total el countdown es global y se muestra arriba (no acá).
                  En practice apagado simplemente no hay círculo. */}
              {hasTimer && (
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  // PR 10: track uses theme.tint so it blends with the
                  // section-tinted page bg instead of looking like a
                  // floating gray ring on the warmup orange surface.
                  background: `conic-gradient(${timerCol} ${pct}%, ${deckSection ? theme.tint : C.bgSoft} ${pct}%)`,
                  display: "flex", alignItems: "center", justifyContent: "center", transition: "all .3s",
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%",
                    // Inner circle uses the page bg (so it looks "cut
                    // out" of the conic ring) — that's theme.bg now.
                    background: deckSection ? theme.bg : C.bg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 700, fontFamily: MONO, color: timerCol,
                  }}>{timeLeft}</div>
                </div>
              )}
            </div>
          </div>

          {/* Progress */}
          <div style={{
            width: "100%", height: 4,
            background: deckSection ? theme.accentSoft : C.bgSoft,
            borderRadius: 4, marginBottom: 28,
          }}>
            <div style={{
              width: `${((current + 1) / questions.length) * 100}%`,
              height: "100%", borderRadius: 4,
              // PR 10: progress uses the section accent (solid, not the
              // accent→purple gradient) so it reads as part of the
              // section's identity. Falls back to the original gradient
              // for legacy decks without a section.
              background: deckSection ? theme.accent : `linear-gradient(90deg, ${C.accent}, ${C.purple})`,
              transition: "width .4s ease",
            }} />
          </div>

          {/* Question */}
          <div className="fade-up" key={current}>
            {q.image_url && (
              <div style={{
                marginBottom: 16,
                borderRadius: 12,
                overflow: "hidden",
                background: C.bgSoft,
                border: `1px solid ${C.border}`,
              }}>
                <img
                  src={q.image_url}
                  alt=""
                  style={{
                    display: "block", width: "100%", maxHeight: 240,
                    objectFit: "contain", background: "#000",
                  }}
                />
              </div>
            )}
            <h2 style={{
              fontSize: 20, fontWeight: 600, textAlign: "center",
              marginBottom: 28, lineHeight: 1.5,
              whiteSpace: "pre-wrap", // preserve teacher's newlines
              // PR 10: text reads on the section-tinted bg
              color: deckSection ? theme.onTint : C.text,
            }}>{q.q}</h2>

            {/* ── MCQ (single or multi-correct, text or image options) ── */}
            {qType === "mcq" && Array.isArray(q.options) && (() => {
              const isMulti = Array.isArray(q.correct);
              const correctSet = new Set(isMulti ? q.correct : [q.correct]);
              const selectedSet = new Set(
                isMulti
                  ? (Array.isArray(mcqSelected) ? mcqSelected : [])
                  : (mcqSelected !== null && mcqSelected !== undefined ? [mcqSelected] : [])
              );
              return (
                <>
                  {isMulti && !showResult && (
                    <p style={{ fontSize: 12, color: C.textMuted, textAlign: "center", margin: "0 0 12px" }}>
                      {t.multipleCorrect}
                    </p>
                  )}
                  {/* PR 10: Vertical list of MCQ options instead of
                      the old 2x2 Kahoot-style grid. Each option is a
                      card with a letter circle (A/B/C/D) + the option
                      text/image, takes the full width, breathes more.
                      Selected options fill with the section accent so
                      "selected" reads as part of the section identity.
                      For showResult state: green = correct, red = wrong
                      (semantic, not theme — students need to read it
                      independent of section). */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {q.options.map((o, i) => {
                      const optText = typeof o === "string" ? o : (o?.text || "");
                      const optImg = (typeof o === "object" && o?.image_url) ? o.image_url : null;
                      const picked = selectedSet.has(i);
                      const isCorrect = correctSet.has(i);
                      const letter = String.fromCharCode(65 + i); // A, B, C, D
                      // Visual states:
                      //   showResult + correct → green fill
                      //   showResult + wrong picked → red fill
                      //   showResult + other → muted
                      //   !showResult + picked → section accent fill
                      //   !showResult + idle → soft surface card
                      let bg, fg, border, letterBg, letterFg, opacity = 1;
                      if (showResult) {
                        if (isCorrect) {
                          bg = C.green; fg = "#fff"; border = C.green;
                          letterBg = "rgba(255,255,255,0.25)"; letterFg = "#fff";
                        } else if (picked) {
                          bg = C.red; fg = "#fff"; border = C.red;
                          letterBg = "rgba(255,255,255,0.25)"; letterFg = "#fff";
                        } else {
                          bg = "transparent"; fg = theme.onTint; border = `${theme.borderActive}22`;
                          letterBg = "transparent"; letterFg = theme.onTint;
                          opacity = 0.4;
                        }
                      } else if (picked) {
                        bg = theme.accentSoft; fg = theme.onTint; border = theme.borderActive;
                        letterBg = theme.accent; letterFg = theme.onAccent;
                      } else {
                        // Idle option — uses a near-white surface so it
                        // contrasts with the tinted page bg. In dark
                        // mode this becomes the lifted "tint" color.
                        bg = theme.tint; fg = theme.onTint; border = `${theme.borderActive}22`;
                        letterBg = "transparent"; letterFg = theme.onTint;
                      }
                      return (
                        <button
                          key={i}
                          className="sj-option"
                          onClick={() => handleMcq(i)}
                          disabled={showResult}
                          style={{
                            padding: optImg ? "0" : "12px 14px",
                            borderRadius: 10,
                            border: `1.5px solid ${border}`,
                            background: bg,
                            color: fg,
                            opacity,
                            cursor: showResult ? "default" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            textAlign: "left",
                            fontSize: 14, fontWeight: 500, lineHeight: 1.4,
                            transition: "background .15s ease, border-color .15s ease, opacity .2s ease",
                            minHeight: optImg ? "auto" : 52,
                            overflow: "hidden",
                            position: "relative",
                          }}
                        >
                          {/* Letter circle on the left */}
                          <span style={{
                            flexShrink: 0,
                            width: 28, height: 28, borderRadius: "50%",
                            background: letterBg,
                            color: letterFg,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 700,
                            border: !picked && !showResult ? `1px solid ${theme.borderActive}33` : "none",
                          }}>
                            {letter}
                          </span>
                          {/* Option content */}
                          {optImg ? (
                            <div style={{
                              flex: 1, minHeight: 80,
                              backgroundImage: `url(${optImg})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                              margin: "8px 8px 8px 0",
                              borderRadius: 6,
                            }} />
                          ) : (
                            <span style={{ flex: 1 }}>{optText}</span>
                          )}
                          {/* Multi-correct: show check mark on selected */}
                          {isMulti && picked && !showResult && (
                            <span style={{
                              flexShrink: 0,
                              fontSize: 16, fontWeight: 800,
                              color: theme.accent,
                            }}>✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {isMulti && !showResult && (
                    <button
                      className="sj-btn"
                      onClick={handleMcqSubmit}
                      disabled={selectedSet.size === 0}
                      style={{
                        width: "100%", marginTop: 14, padding: 14, borderRadius: 10,
                        fontSize: 15, fontWeight: 600,
                        background: selectedSet.size > 0 ? theme.accent : (deckSection ? `${theme.borderActive}33` : C.border),
                        color: selectedSet.size > 0 ? theme.onAccent : C.textMuted,
                        opacity: selectedSet.size > 0 ? 1 : .6,
                        border: "none",
                      }}
                    >{t.submit}</button>
                  )}
                </>
              );
            })()}

            {/* ── True / False ── */}
            {qType === "tf" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { val: true,  label: t.true_,  baseColor: C.green },
                  { val: false, label: t.false_, baseColor: C.red   },
                ].map(({ val, label, baseColor }) => {
                  // PR 10: Idle TF buttons use the section theme
                  // (subtle, like idle MCQ options). Once an answer is
                  // submitted, semantic green/red takes over so right/
                  // wrong stays unmistakable. This keeps the section
                  // identity visible without breaking TF's color
                  // language.
                  let bg, fg, border, op = 1;
                  if (showResult) {
                    if (val === q.correct) {
                      bg = C.green; fg = "#fff"; border = C.green;
                    } else if (val === tfSelected) {
                      bg = C.red; fg = "#fff"; border = C.red;
                    } else {
                      bg = "transparent"; fg = theme.onTint; border = `${theme.borderActive}22`;
                      op = 0.4;
                    }
                  } else {
                    bg = theme.tint; fg = theme.onTint; border = `${theme.borderActive}33`;
                  }
                  return (
                    <button key={String(val)} className="sj-option" onClick={() => handleTf(val)} disabled={showResult} style={{
                      padding: "22px 14px", borderRadius: 12, fontSize: 17, fontWeight: 600,
                      background: bg, color: fg, border: `1.5px solid ${border}`,
                      opacity: op, minHeight: 80,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      cursor: showResult ? "default" : "pointer",
                      transition: "background .15s ease, border-color .15s ease",
                    }}>
                      <CIcon name={val ? "check" : "cross"} size={20} inline />
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── Fill in the Blank ── */}
            {qType === "fill" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input
                  className="sj-input"
                  value={fillText}
                  onChange={e => setFillText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleFillSubmit()}
                  placeholder={t.typeAnswer}
                  disabled={showResult}
                  autoFocus
                  style={{
                    ...inp,
                    fontSize: 18, padding: "14px 16px", textAlign: "center", fontWeight: 500,
                    background: showResult ? (lastIsCorrect ? C.greenSoft : C.redSoft) : (deckSection ? theme.tint : C.bg),
                    borderColor: showResult ? (lastIsCorrect ? C.green : C.red) : (deckSection ? `${theme.borderActive}44` : C.border),
                    color: showResult ? (lastIsCorrect ? C.green : C.red) : (deckSection ? theme.onTint : C.text),
                  }}
                />
                {!showResult && (
                  <button className="sj-btn" onClick={handleFillSubmit} disabled={!fillText.trim()} style={{
                    width: "100%", padding: 14, borderRadius: 10, fontSize: 15, fontWeight: 600,
                    background: fillText.trim() ? `linear-gradient(135deg, ${C.accent}, ${C.purple})` : C.border,
                    color: "#fff", opacity: fillText.trim() ? 1 : .5,
                  }}>{t.submit}</button>
                )}
                {showResult && !lastIsCorrect && q.answer && (
                  <div style={{ padding: "10px 14px", borderRadius: 8, background: C.greenSoft, fontSize: 13, color: C.green, textAlign: "center" }}>
                    <strong>{t.correctAnswer}:</strong> {q.answer}
                  </div>
                )}
              </div>
            )}

            {/* ── Order ── */}
            {qType === "order" && Array.isArray(q.items) && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <p style={{ fontSize: 12, color: C.textMuted, textAlign: "center", margin: 0 }}>{t.tapToOrder}</p>

                {/* Picked area (in pick order) */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, minHeight: 40 }}>
                  {orderPicked.map((item, j) => {
                    const correctItem = q.items[j];
                    const ok = showResult ? item === correctItem : null;
                    return (
                      <div key={`${item}-${j}`} className="pop-in" style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8,
                        background: showResult ? (ok ? C.greenSoft : C.redSoft) : C.accentSoft,
                        border: `1px solid ${showResult ? (ok ? C.green + "55" : C.red + "55") : C.accent + "33"}`,
                        fontSize: 14, fontWeight: 500,
                      }}>
                        <span style={{ width: 22, height: 22, borderRadius: 6, background: showResult ? (ok ? C.green : C.red) : C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{j + 1}</span>
                        <span style={{ flex: 1 }}>{item}</span>
                        {showResult && !ok && <span style={{ fontSize: 12, color: C.textMuted }}>→ {correctItem}</span>}
                      </div>
                    );
                  })}
                </div>

                {/* Pool of remaining items */}
                {!showResult && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {shuffledItems.filter(it => !orderPicked.includes(it)).map((item) => (
                      <button key={item} className="sj-chip" onClick={() => handleOrderPick(item)} style={{
                        padding: "10px 14px", borderRadius: 8, fontSize: 14, fontWeight: 500,
                        background: C.bg, color: C.text, border: `1px solid ${C.border}`,
                      }}>{item}</button>
                    ))}
                  </div>
                )}

                {!showResult && orderPicked.length > 0 && (
                  <button className="sj-btn sj-btn-secondary" onClick={handleOrderUndo} style={{
                    alignSelf: "center", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                    background: C.bg, color: C.textSecondary, border: `1px solid ${C.border}`,
                  }}>↶ {t.undo}</button>
                )}
              </div>
            )}

            {/* ── Match ── */}
            {qType === "match" && Array.isArray(q.pairs) && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <p style={{ fontSize: 12, color: C.textMuted, textAlign: "center", margin: 0 }}>{t.tapMatch}</p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {/* Left column */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {q.pairs.map((p) => {
                      const picked = matchPicks[p.left];
                      const isActive = matchActiveLeft === p.left;
                      let bg = C.bg, color = C.text, border = C.border;
                      if (showResult) {
                        const ok = picked === p.right;
                        bg = ok ? C.greenSoft : C.redSoft;
                        color = ok ? C.green : C.red;
                        border = ok ? C.green + "55" : C.red + "55";
                      } else if (isActive) {
                        bg = C.accentSoft; color = C.accent; border = C.accent;
                      } else if (picked) {
                        bg = C.purpleSoft; color = C.purple; border = C.purple + "55";
                      }
                      return (
                        <button
                          key={p.left}
                          className="sj-chip"
                          onClick={() => picked ? handleMatchUndo(p.left) : handleMatchLeft(p.left)}
                          disabled={showResult}
                          style={{
                            padding: "10px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                            background: bg, color, border: `1.5px solid ${border}`,
                            textAlign: "left", fontFamily: MONO,
                            cursor: showResult ? "default" : "pointer",
                          }}
                        >
                          {p.left}
                          {picked && !showResult && <span style={{ fontSize: 10, marginLeft: 6, opacity: .7 }}>✕</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Right column */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {shuffledRights.map((right) => {
                      const used = Object.values(matchPicks).includes(right);
                      let bg = C.bg, color = C.text, border = C.border, op = 1;
                      if (showResult) {
                        const pairedLeft = Object.entries(matchPicks).find(([_, r]) => r === right)?.[0];
                        const correctLeft = q.pairs.find(p => p.right === right)?.left;
                        const ok = pairedLeft && pairedLeft === correctLeft;
                        if (pairedLeft) {
                          bg = ok ? C.greenSoft : C.redSoft;
                          color = ok ? C.green : C.red;
                          border = ok ? C.green + "55" : C.red + "55";
                        } else {
                          op = .4;
                        }
                      } else if (used) {
                        op = .35;
                      } else if (matchActiveLeft) {
                        border = C.accent + "55";
                      }
                      return (
                        <button
                          key={right}
                          className="sj-chip"
                          onClick={() => handleMatchRight(right)}
                          disabled={showResult || used || !matchActiveLeft}
                          style={{
                            padding: "10px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                            background: bg, color, border: `1.5px solid ${border}`, opacity: op,
                            textAlign: "left",
                            cursor: (showResult || used || !matchActiveLeft) ? "default" : "pointer",
                          }}
                        >
                          {right}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── Free Text (ungraded) ── */}
            {qType === "free" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <textarea
                  className="sj-input"
                  value={freeText}
                  onChange={e => setFreeText(e.target.value)}
                  placeholder={t.typeAnswer}
                  disabled={showResult}
                  autoFocus
                  rows={5}
                  style={{
                    ...inp,
                    fontSize: 15, padding: "12px 14px",
                    minHeight: 120, resize: "vertical",
                    fontFamily: "'Outfit',sans-serif", lineHeight: 1.5,
                    background: showResult ? C.bgSoft : C.bg,
                  }}
                />
                {!showResult && (
                  <button className="sj-btn" onClick={handleFreeSubmit} style={{
                    width: "100%", padding: 14, borderRadius: 10, fontSize: 15, fontWeight: 600,
                    background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
                    color: "#fff",
                  }}>{t.submit}</button>
                )}
              </div>
            )}

            {/* ── Sentence Builder ── */}
            {qType === "sentence" && (() => {
              const required = String(q.required_word || "");
              const minWords = q.min_words ?? 3;
              const wordCount = (sentenceText.trim().match(/\S+/g) || []).length;
              const hasRequired = required ? sentenceText.toLowerCase().includes(required.toLowerCase()) : true;
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Hint pill */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "center" }}>
                    {required && (
                      <span style={{
                        padding: "6px 12px", borderRadius: 8,
                        background: hasRequired ? C.greenSoft : C.accentSoft,
                        color: hasRequired ? C.green : C.accent,
                        fontSize: 13, fontWeight: 600,
                        display: "inline-flex", alignItems: "center", gap: 6,
                        fontFamily: MONO,
                      }}>
                        {hasRequired && !showResult && <CIcon name="check" size={12} inline />}
                        {t.sentenceMustContain} <strong>{required}</strong>
                      </span>
                    )}
                    <span style={{
                      padding: "6px 12px", borderRadius: 8,
                      background: wordCount >= minWords ? C.greenSoft : C.bgSoft,
                      color: wordCount >= minWords ? C.green : C.textMuted,
                      fontSize: 13, fontWeight: 600,
                      display: "inline-flex", alignItems: "center", gap: 6,
                    }}>
                      {wordCount >= minWords && !showResult && <CIcon name="check" size={12} inline />}
                      {wordCount}/{minWords} {t.sentenceMustHaveWords}
                    </span>
                  </div>

                  <textarea
                    className="sj-input"
                    value={sentenceText}
                    onChange={e => setSentenceText(e.target.value)}
                    placeholder={t.writeYourSentence}
                    disabled={showResult}
                    autoFocus
                    rows={3}
                    style={{
                      ...inp,
                      fontSize: 16, padding: "12px 14px",
                      minHeight: 90, resize: "vertical",
                      fontFamily: "'Outfit',sans-serif", lineHeight: 1.5,
                      background: showResult ? (lastIsCorrect ? C.greenSoft : C.redSoft) : C.bg,
                      borderColor: showResult ? (lastIsCorrect ? C.green : C.red) : C.border,
                    }}
                  />
                  {!showResult && (
                    <button
                      className="sj-btn"
                      onClick={handleSentenceSubmit}
                      disabled={!sentenceText.trim()}
                      style={{
                        width: "100%", padding: 14, borderRadius: 10, fontSize: 15, fontWeight: 600,
                        background: sentenceText.trim() ? `linear-gradient(135deg, ${C.accent}, ${C.purple})` : C.border,
                        color: "#fff", opacity: sentenceText.trim() ? 1 : .5,
                      }}
                    >{t.submit}</button>
                  )}
                </div>
              );
            })()}

            {/* ── Slider ── */}
            {qType === "slider" && (() => {
              const min = Number.isFinite(q.min) ? q.min : 0;
              const max = Number.isFinite(q.max) ? q.max : 100;
              const correct = Number.isFinite(q.correct) ? q.correct : 50;
              const tol = Math.max(0, Number(q.tolerance) || 0);
              const unit = q.unit || "";
              const value = sliderValue ?? Math.round((min + max) / 2);
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <p style={{ fontSize: 12, color: C.textMuted, textAlign: "center", margin: 0 }}>{t.dragSliderHint}</p>

                  {/* Big value display */}
                  <div style={{
                    fontSize: 44, fontWeight: 800, fontFamily: MONO,
                    color: showResult ? (lastIsCorrect ? C.green : C.red) : C.accent,
                    textAlign: "center", lineHeight: 1.1,
                    transition: "color .15s ease",
                  }}>
                    {showResult ? value : value}
                    {unit && <span style={{ fontSize: 22, marginLeft: 4, color: C.textMuted }}>{unit}</span>}
                  </div>

                  <input
                    type="range"
                    className="sj-slider"
                    min={min}
                    max={max}
                    value={value}
                    onChange={e => setSliderValue(Number(e.target.value))}
                    disabled={showResult}
                  />

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.textMuted, fontFamily: MONO }}>
                    <span>{min}{unit}</span>
                    <span>{max}{unit}</span>
                  </div>

                  {showResult && (
                    <div style={{
                      padding: "10px 14px", borderRadius: 8, textAlign: "center",
                      background: lastIsCorrect ? C.greenSoft : C.redSoft,
                      color: lastIsCorrect ? C.green : C.red,
                      fontSize: 13, fontWeight: 600,
                    }}>
                      {t.correctAnswer}: <strong>{correct}{unit}</strong> {tol > 0 && `(±${tol}${unit})`}
                    </div>
                  )}

                  {!showResult && (
                    <button
                      className="sj-btn"
                      onClick={handleSliderSubmit}
                      style={{
                        width: "100%", padding: 14, borderRadius: 10, fontSize: 15, fontWeight: 600,
                        background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
                        color: "#fff",
                      }}
                    >{t.submit}</button>
                  )}
                </div>
              );
            })()}

            {/* ── Result banner + Next ── */}
            {showResult && (
              <div className={`pop-in ${resultAnim}`} style={{ textAlign: "center", marginTop: 24 }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 10,
                  background: lastIsCorrect === null ? C.accentSoft : (lastIsCorrect ? C.greenSoft : C.redSoft),
                  color: lastIsCorrect === null ? C.accent : (lastIsCorrect ? C.green : C.red),
                  fontSize: 15, fontWeight: 600, marginBottom: 16,
                }}>
                  <CIcon name={lastIsCorrect === null ? "check" : (lastIsCorrect ? "check" : "cross")} size={16} inline />
                  {lastIsCorrect === null ? t.submitted : (lastIsCorrect ? t.correct : t.incorrect)}
                </div>
                <br />
                <button className="sj-btn" onClick={handleNext} style={{
                  padding: "12px 28px", borderRadius: 10, fontSize: 15, fontWeight: 600,
                  background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, color: "#fff",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}>
                  {isLast ? t.seeResults : t.next}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // ── Results ──
  if (step === "results") {
    const graded = answers.filter(a => a?.isCorrect !== null && a?.isCorrect !== undefined);
    const correct = graded.filter(a => a.isCorrect).length;
    const incorrect = graded.length - correct;
    const ungraded = answers.length - graded.length;
    // Percentage only over graded items.
    const pct = graded.length > 0 ? Math.round((correct / graded.length) * 100) : 0;

    // ── Review branch: per-question detail view ─────────────────────────
    // Renders when the student tapped "See correct answers". Shows each
    // question with their submitted answer + the canonical correct
    // answer (or "pending review" for free-text). One scrollable page
    // — most quizzes are 5–15 questions, scrolling is fine. Cleaner than
    // a paginated flow that adds clicks.
    if (showReview) {
      return (
        <>
          <style>{css}</style>
          <div style={{ maxWidth: 480, margin: "0 auto", padding: "30px 16px 60px" }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 16,
            }}>
              <button
                onClick={() => setShowReview(false)}
                style={{
                  padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                  background: "transparent", color: C.textSecondary,
                  border: `1px solid ${C.border}`, cursor: "pointer",
                  fontFamily: "'Outfit',sans-serif",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {t.backToResults}
              </button>
              <span style={{ fontSize: 12, color: C.textMuted, fontFamily: "'Outfit',sans-serif" }}>
                {questions.length} · {pct}%
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {questions.map((qq, i) => {
                const a = answers[i];
                const qqType = qq?.type || "mcq";
                // Status: needs-review takes precedence; otherwise correct/incorrect.
                const isPending = a?.needsReview || qqType === "free" || qqType === "open";
                const isOk = !isPending && a?.isCorrect === true;
                const accent = isPending ? C.accent : (isOk ? C.green : C.red);
                const accentSoft = isPending ? C.accentSoft : (isOk ? C.greenSoft : C.redSoft);
                const correctText = describeCorrectAnswer(qq, qqType);
                const studentText = formatStudentAnswer(qq, qqType, a);
                return (
                  <div
                    key={i}
                    className="fade-up"
                    style={{
                      background: C.bg,
                      border: `1px solid ${C.border}`,
                      borderLeft: `3px solid ${accent}`,
                      borderRadius: 12,
                      padding: 14,
                      fontFamily: "'Outfit',sans-serif",
                    }}
                  >
                    {/* Header row: question number + status pill + points */}
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      marginBottom: 8, gap: 8,
                    }}>
                      <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, letterSpacing: ".03em" }}>
                        {t.reviewQuestion.replace("{n}", String(i + 1)).replace("{total}", String(questions.length))}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {a && typeof a.points === "number" && typeof a.maxPoints === "number" && !isPending && (
                          <span style={{
                            fontSize: 11, fontWeight: 600,
                            color: accent, background: accentSoft,
                            padding: "2px 8px", borderRadius: 999,
                          }}>
                            {t.pointsLabel.replace("{points}", String(a.points)).replace("{max}", String(a.maxPoints))}
                          </span>
                        )}
                        {isPending && (
                          <span style={{
                            fontSize: 11, fontWeight: 600,
                            color: C.accent, background: C.accentSoft,
                            padding: "2px 8px", borderRadius: 999,
                          }}>
                            ⏱ {t.pendingReview}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Question prompt */}
                    <div style={{
                      fontSize: 14, fontWeight: 600, color: C.text,
                      lineHeight: 1.45, marginBottom: 10,
                    }}>
                      {qq?.q || qq?.prompt || ""}
                    </div>

                    {/* Your answer */}
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 3, textTransform: "uppercase", letterSpacing: ".05em" }}>
                        {t.yourAnswer}
                      </div>
                      <div style={{
                        fontSize: 13,
                        color: studentText ? C.text : C.textMuted,
                        fontStyle: studentText ? "normal" : "italic",
                        lineHeight: 1.4,
                        wordBreak: "break-word",
                      }}>
                        {studentText || t.noAnswerSubmitted}
                      </div>
                    </div>

                    {/* Correct answer (or pending review hint for free-text) */}
                    {isPending ? (
                      <div style={{
                        marginTop: 8, padding: "8px 12px",
                        background: C.accentSoft,
                        borderRadius: 8, fontSize: 12,
                        color: C.text, lineHeight: 1.45,
                      }}>
                        {t.pendingReviewHint}
                      </div>
                    ) : (
                      correctText && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 3, textTransform: "uppercase", letterSpacing: ".05em" }}>
                            {t.correctAnswer}
                          </div>
                          <div style={{
                            fontSize: 13, color: C.green,
                            fontWeight: 500,
                            lineHeight: 1.4,
                            wordBreak: "break-word",
                          }}>
                            {correctText}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowReview(false)}
              style={{
                marginTop: 24, width: "100%", padding: "12px 16px",
                borderRadius: 10, fontSize: 14, fontWeight: 600,
                background: C.bg, color: C.textSecondary,
                border: `1px solid ${C.border}`, cursor: "pointer",
                fontFamily: "'Outfit',sans-serif",
              }}
            >
              {t.backToResults}
            </button>
          </div>
        </>
      );
    }

    // Special case: teacher ended the session before the student answered
    // anything. Show a clean "session ended" screen instead of empty stats.
    if (endedByTeacher && answers.length === 0) {
      return (
        <>
          <style>{css}</style>
          <div style={{ maxWidth: 400, margin: "0 auto", padding: "60px 20px", textAlign: "center" }}>
            <div className="fade-up" style={{ background: C.bg, borderRadius: 16, border: `1px solid ${C.border}`, padding: 32, boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: C.purpleSoft, color: C.purple,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                marginBottom: 16,
              }}>
                <CIcon name="hourglass" size={28} inline />
              </div>
              <h2 style={{ fontFamily: "'Outfit'", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{t.waitingEndedTitle}</h2>
              <p style={{ color: C.textSecondary, fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>{t.waitingEndedHint}</p>
              {isGuest ? (
                <div style={{
                  fontSize: 13, color: C.textMuted,
                  fontFamily: "'Outfit',sans-serif",
                  display: "inline-flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{
                    display: "inline-block", width: 12, height: 12,
                    border: `2px solid ${C.border}`, borderTopColor: C.accent,
                    borderRadius: "50%", animation: "sj-spin 0.8s linear infinite",
                  }} />
                  {t.returningHome}
                </div>
              ) : (
                <button onClick={() => {
                  setStep("join"); setPin(""); setName(profile?.full_name || ""); setAnswers([]); setCurrent(0); setSession(null); setParticipant(null); setEndedByTeacher(false); setShowReview(false);
                }} style={{
                  padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600,
                  background: C.accentSoft, color: C.accent, border: "none", cursor: "pointer",
                  fontFamily: "'Outfit',sans-serif",
                }}>{t.joinAnother}</button>
              )}
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <style>{css}</style>
        <div style={{ maxWidth: 400, margin: "0 auto", padding: "50px 20px", textAlign: "center" }}>
          {endedByTeacher && (
            <div className="fade-up" style={{
              background: C.orangeSoft, color: C.orange,
              padding: "10px 14px", borderRadius: 10,
              fontSize: 12, fontWeight: 600, marginBottom: 14,
              display: "flex", alignItems: "center", gap: 8, justifyContent: "center",
              fontFamily: "'Outfit',sans-serif",
            }}>
              <CIcon name="warning" size={14} inline /> {t.teacherEndedTitle}
            </div>
          )}
          <div className="fade-up" style={{ background: C.bg, borderRadius: 16, border: `1px solid ${C.border}`, padding: 32, boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
            <div className="pop-in" style={{ width: 80, height: 80, borderRadius: "50%", background: retCol(pct) + "14", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", border: `3px solid ${retCol(pct)}33` }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: retCol(pct), fontFamily: MONO }}>{graded.length > 0 ? `${pct}%` : "—"}</span>
            </div>
            <h2 style={{ fontFamily: "'Outfit'", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{t.sessionComplete}</h2>
            <p style={{ color: C.textSecondary, fontSize: 15, marginBottom: 20 }}>
              {endedByTeacher ? t.teacherEndedHint : (graded.length === 0 ? t.greatJob : (pct >= 70 ? t.greatJob : t.keepPracticing))}
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: 24, padding: "16px 0", borderTop: `1px solid ${C.border}`, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700, color: C.green, fontFamily: MONO }}>{correct}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{t.correctLabel}</div>
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700, color: C.red, fontFamily: MONO }}>{incorrect}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{t.incorrectLabel}</div>
              </div>
              {ungraded > 0 && (
                <div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: C.accent, fontFamily: MONO }}>{ungraded}</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>{t.notGraded}</div>
                </div>
              )}
            </div>

            {/* Per-question breakdown */}
            <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
              {questions.map((_, i) => {
                const a = answers[i];
                const ungradedItem = a?.isCorrect === null || a?.isCorrect === undefined;
                return (
                  <div key={i} style={{
                    width: 24, height: 24, borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: ungradedItem ? C.accentSoft : (a.isCorrect ? C.greenSoft : C.redSoft),
                    color: ungradedItem ? C.accent : (a.isCorrect ? C.green : C.red),
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{i + 1}</div>
                );
              })}
            </div>
          </div>

          {/* See correct answers — opens the per-question detail view.
              Always available when the session ran (graded or not). For
              free-text questions the review marks them as pending teacher
              review instead of showing a "correct answer", so even
              ungraded sessions benefit from seeing the prompt + their
              answer side by side. */}
          {answers.length > 0 && (
            <button
              onClick={() => setShowReview(true)}
              style={{
                marginTop: 18, padding: "12px 20px", borderRadius: 10,
                fontSize: 14, fontWeight: 600,
                background: C.accentSoft, color: C.accent,
                border: "none", cursor: "pointer",
                fontFamily: "'Outfit',sans-serif",
                width: "100%",
              }}
            >
              {t.seeAnswers}
            </button>
          )}

          <button className="sj-btn sj-btn-secondary" onClick={() => {
            if (isPractice && onPracticeExit) {
              onPracticeExit();
            } else if (isGuest) {
              // Guest mode: bounce back to the public home so they can pick
              // any code, instead of the unmounted reset path that doesn't
              // really work for guests (their entry point was /join).
              try { clearGuestSession(guestPin); } catch (_) {}
              window.location.href = "/";
            } else {
              setStep("join"); setPin(""); setName(profile?.full_name || ""); setAnswers([]); setCurrent(0); setSession(null); setShowReview(false);
            }
          }} style={{
            marginTop: 20, padding: "12px 24px", borderRadius: 10, fontSize: 14, fontWeight: 500,
            background: C.bg, color: C.textSecondary, border: `1px solid ${C.border}`,
          }}>{isPractice ? t.backToClass : t.joinAnother}</button>
        </div>

        {/* ── Unlock celebration overlay ── */}
        {showingUnlock && (
          <div className="sj-unlock-bg" style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(10, 10, 30, 0.85)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}>
            <div className="sj-unlock-card" style={{
              background: "#FFFFFF", borderRadius: 20,
              padding: "40px 28px 28px",
              maxWidth: 360, width: "100%",
              textAlign: "center",
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: showingUnlock.rarity === "legendary" ? "#BA7517" : showingUnlock.rarity === "rare" ? "#534AB7" : "#888780",
                marginBottom: 6,
              }}>
                {showingUnlock.rarity === "legendary" ? "✦ Legendary unlocked ✦"
                 : showingUnlock.rarity === "rare"    ? "✧ Rare unlocked ✧"
                 : "Unlocked"}
              </div>
              <h2 style={{
                fontSize: 24, fontWeight: 700, fontFamily: "'Outfit'",
                margin: "0 0 24px",
                color: "#191919",
              }}>{t.youUnlocked}</h2>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
                <Avatar id={showingUnlock.id} size={140} />
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Outfit'", marginBottom: 4 }}>
                {showingUnlock.name?.[pageLang] || showingUnlock.name?.en || showingUnlock.id}
              </div>
              <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 24 }}>
                {newUnlocks.length > 1 && `+${newUnlocks.length - 1} ${t.moreUnlocks}`}
              </div>
              <button
                onClick={dismissCurrentUnlock}
                style={{
                  padding: "12px 32px", borderRadius: 10,
                  fontSize: 14, fontWeight: 600,
                  background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
                  color: "#fff", border: "none",
                  cursor: "pointer",
                  fontFamily: "'Outfit',sans-serif",
                  width: "100%",
                }}
              >{newUnlocks.length > 1 ? t.next : t.awesome}</button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
