import { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { LogoMark, CIcon } from "../components/Icons";
import { Avatar } from "../components/Avatars";
import { checkAndGrantUnlocks } from "../lib/unlock-checker";
import { generateGuestToken, saveGuestSession, validateGuestName, clearGuestSession } from "../lib/guest-session";
import { C, MONO } from "../components/tokens";
import { resolveTimeLimit } from "../lib/time-limits";
import { getPracticeTimerPref, setPracticeTimerPref } from "../lib/practice-timer-pref";

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
    joinAnother: "Join another session", noQuestions: "No questions available",
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
    joinAnother: "Unirse a otra sesión", noQuestions: "No hay preguntas",
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
    joinAnother: "다른 세션 참여", noQuestions: "문제가 없습니다",
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

// Loose comparison for fill-in-the-blank: trim, lowercase, collapse whitespace.
const normFill = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

// Evaluate correctness + return value to persist in responses.answer (jsonb).
// isCorrect can be true/false for graded types, or null for free-text (ungraded).
const evaluateAnswer = (q, type, raw) => {
  if (raw === null || raw === undefined || (Array.isArray(raw) && raw.length === 0)) {
    // Free text: empty submission is still considered submitted (ungraded).
    if (type === "free") return { isCorrect: null, stored: "" };
    return { isCorrect: false, stored: null };
  }
  switch (type) {
    case "tf":
      return { isCorrect: raw === q.correct, stored: raw };
    case "fill": {
      const candidates = [q.answer, ...(Array.isArray(q.alternatives) ? q.alternatives : [])]
        .filter(Boolean)
        .map(normFill);
      const ok = candidates.includes(normFill(raw));
      return { isCorrect: ok, stored: String(raw) };
    }
    case "order": {
      const items = q.items || [];
      const ok = Array.isArray(raw) && raw.length === items.length && raw.every((v, i) => v === items[i]);
      return { isCorrect: ok, stored: raw };
    }
    case "match": {
      const pairs = q.pairs || [];
      const ok = pairs.length > 0 && pairs.every((p) => raw && raw[p.left] === p.right);
      return { isCorrect: ok, stored: raw };
    }
    case "free":
      return { isCorrect: null, stored: String(raw) };
    case "sentence": {
      const text = String(raw || "");
      const required = String(q.required_word || "").trim().toLowerCase();
      const minWords = Number.isFinite(q.min_words) ? q.min_words : 3;
      const wordCount = (text.trim().match(/\S+/g) || []).length;
      const containsRequired = required ? text.toLowerCase().includes(required) : true;
      const ok = containsRequired && wordCount >= minWords;
      return { isCorrect: ok, stored: text };
    }
    case "slider": {
      const value = Number(raw);
      if (!Number.isFinite(value)) return { isCorrect: false, stored: null };
      const target = Number(q.correct);
      const tol = Math.max(0, Number(q.tolerance) || 0);
      const ok = Math.abs(value - target) <= tol;
      return { isCorrect: ok, stored: value };
    }
    case "mcq":
    default: {
      // Multi-correct: q.correct is an array → require exact set match (no partial credit).
      if (Array.isArray(q.correct)) {
        const got = Array.isArray(raw) ? raw : [raw];
        const need = q.correct;
        const ok = got.length === need.length && got.every(v => need.includes(v));
        return { isCorrect: ok, stored: got };
      }
      return { isCorrect: raw === q.correct, stored: raw };
    }
  }
};

export default function StudentJoin({ lang: pageLang = "en", profile = null, practiceDeck = null, onPracticeExit = null, guestMode = false, guestPin = "", guestName = "", guestToken = "", onGuestKicked = null, prefilledPin = "" }) {
  // Practice mode: start straight in the quiz with the deck's questions, no PIN, no live session.
  const isPractice = Boolean(practiceDeck);
  // Guest mode: prefilled pin + name from the /join page; no profile linkage.
  const isGuest = Boolean(guestMode);

  const [step, setStep] = useState(isPractice ? "quiz" : (isGuest ? "joining" : "join"));
  const [pin, setPin] = useState(isGuest ? guestPin : (prefilledPin || ""));
  const [name, setName] = useState(isGuest ? guestName : (profile?.full_name || ""));
  const isLoggedIn = !isGuest && Boolean(profile?.full_name);
  const [error, setError] = useState("");
  const [session, setSession] = useState(isPractice
    ? { id: `practice-${practiceDeck.id}`, questions: practiceDeck.questions || [], topic: practiceDeck.title, class_id: practiceDeck.class_id, status: "active", _isPractice: true }
    : null);
  const [participant, setParticipant] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]); // [{ isCorrect, raw }]
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

    const { data: part, error: joinErr } = await supabase.from("session_participants").insert(insertData).select().single();
    if (joinErr) {
      if (joinErr.code === "23505") {
        // Re-join: same student_name, same session — fetch existing row
        const { data: existing } = await supabase.from("session_participants").select("*").eq("session_id", sess.id).eq("student_name", name.trim()).single();
        setParticipant(existing);
      } else { setError(joinErr.message); return; }
    } else { setParticipant(part); }
    setSession(sess);
    setStep(sess.status === "active" ? "quiz" : "waiting");
  };

  // Single submit path used by every activity type (and timeout).
  const submitAnswer = async (raw) => {
    if (showResult) return;
    const { isCorrect, stored } = evaluateAnswer(q, qType, raw);
    setLastIsCorrect(isCorrect);
    setShowResult(true);
    // Animation: bounce on correct OR ungraded-submitted (positive feedback either way),
    // shake only on actual incorrect.
    setResultAnim(isCorrect === false ? "shake" : "bounce");
    setAnswers(prev => [...prev, { isCorrect, raw }]);
    if (participant) {
      try {
        const insertData = {
          session_id: session.id,
          participant_id: participant.id,
          question_index: current,
          answer: stored,
          // DB column is NOT NULL boolean; treat ungraded (null) as `true` so the
          // submission still counts toward participation. The client distinguishes
          // graded vs ungraded via the question type, not this column.
          is_correct: isCorrect === null ? true : isCorrect,
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
        await supabase.from("responses").insert(insertData);
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

    return (
      <>
        <style>{css}</style>
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
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: C.textSecondary, fontWeight: 500 }}>
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
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: `conic-gradient(${timerCol} ${pct}%, ${C.bgSoft} ${pct}%)`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .3s" }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, fontFamily: MONO, color: timerCol }}>{timeLeft}</div>
                </div>
              )}
            </div>
          </div>

          {/* Progress */}
          <div style={{ width: "100%", height: 4, background: C.bgSoft, borderRadius: 4, marginBottom: 28 }}>
            <div style={{ width: `${((current + 1) / questions.length) * 100}%`, height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${C.accent}, ${C.purple})`, transition: "width .4s ease" }} />
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
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {q.options.map((o, i) => {
                      const optText = typeof o === "string" ? o : (o?.text || "");
                      const optImg = (typeof o === "object" && o?.image_url) ? o.image_url : null;
                      const picked = selectedSet.has(i);
                      const isCorrect = correctSet.has(i);
                      let bg = OPT_C[i % OPT_C.length], op = 1, ring = "transparent";
                      if (showResult) {
                        bg = isCorrect ? C.green : (picked ? C.red : "#ccc");
                        op = (isCorrect || picked) ? 1 : .3;
                      } else if (isMulti) {
                        ring = picked ? "#fff" : "transparent";
                      }
                      return (
                        <button
                          key={i}
                          className="sj-option"
                          onClick={() => handleMcq(i)}
                          disabled={showResult}
                          style={{
                            padding: optImg ? 0 : "18px 14px",
                            borderRadius: 12, fontSize: 15, fontWeight: 600, color: "#fff",
                            background: bg, opacity: op, lineHeight: 1.3, minHeight: 64,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: showResult ? "default" : "pointer",
                            position: "relative",
                            overflow: "hidden",
                            outline: isMulti ? `3px solid ${ring}` : "none",
                            outlineOffset: -3,
                          }}
                        >
                          {optImg ? (
                            <div style={{ width: "100%", height: 100, backgroundImage: `url(${optImg})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                          ) : (
                            <span>{optText}</span>
                          )}
                          {isMulti && !showResult && (
                            <span style={{
                              position: "absolute", top: 8, right: 8,
                              width: 22, height: 22, borderRadius: 6,
                              background: picked ? "#fff" : "rgba(255,255,255,0.25)",
                              color: bg, display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 13, fontWeight: 800,
                            }}>{picked ? "✓" : ""}</span>
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
                        background: selectedSet.size > 0 ? `linear-gradient(135deg, ${C.accent}, ${C.purple})` : C.border,
                        color: "#fff", opacity: selectedSet.size > 0 ? 1 : .5,
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
                  let bg = baseColor, op = 1;
                  if (showResult) {
                    bg = val === q.correct ? C.green : val === tfSelected ? C.red : "#ccc";
                    op = val === q.correct || val === tfSelected ? 1 : .3;
                  }
                  return (
                    <button key={String(val)} className="sj-option" onClick={() => handleTf(val)} disabled={showResult} style={{
                      padding: "22px 14px", borderRadius: 12, fontSize: 17, fontWeight: 700, color: "#fff",
                      background: bg, opacity: op, minHeight: 80,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      cursor: showResult ? "default" : "pointer",
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
                    background: showResult ? (lastIsCorrect ? C.greenSoft : C.redSoft) : C.bg,
                    borderColor: showResult ? (lastIsCorrect ? C.green : C.red) : C.border,
                    color: showResult ? (lastIsCorrect ? C.green : C.red) : C.text,
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
                  setStep("join"); setPin(""); setName(profile?.full_name || ""); setAnswers([]); setCurrent(0); setSession(null); setParticipant(null); setEndedByTeacher(false);
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
              setStep("join"); setPin(""); setName(profile?.full_name || ""); setAnswers([]); setCurrent(0); setSession(null);
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
