import { CIcon } from "../components/Icons";
import { useState, useEffect, useCallback } from "react";

const C = {
  bg: "#FFFFFF", bgSoft: "#F7F7F5", bgWarm: "#FAFAF8", surface: "#FFFFFF",
  card: "#FFFFFF", accent: "#2383E2", accentSoft: "#E8F0FE", accentDark: "#1B6EC2",
  green: "#0F7B6C", greenSoft: "#EEFBF5", orange: "#D9730D", orangeSoft: "#FFF3E0",
  red: "#E03E3E", redSoft: "#FDECEC", purple: "#6940A5", purpleSoft: "#F3EEFB",
  text: "#191919", textSecondary: "#6B6B6B", textMuted: "#9B9B9B",
  border: "#E8E8E4", shadow: "0 1px 3px rgba(0,0,0,0.04)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.05)",
};
const FONT = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const OPT_C = [{ bg: "#2383E2" }, { bg: "#0F7B6C" }, { bg: "#D9730D" }, { bg: "#6940A5" }];

// ─── Character / Avatar System ──────────────────────
const AVATARS = [
  // Free (unlocked from start)
  { id: "fox", emoji: "🦊", name: { en: "Fox", es: "Zorro", ko: "여우" }, unlock: 0, rarity: "free" },
  { id: "cat", emoji: "🐱", name: { en: "Cat", es: "Gato", ko: "고양이" }, unlock: 0, rarity: "free" },
  { id: "dog", emoji: "🐶", name: { en: "Dog", es: "Perro", ko: "강아지" }, unlock: 0, rarity: "free" },
  { id: "panda", emoji: "🐼", name: { en: "Panda", es: "Panda", ko: "판다" }, unlock: 0, rarity: "free" },
  { id: "bunny", emoji: "🐰", name: { en: "Bunny", es: "Conejo", ko: "토끼" }, unlock: 0, rarity: "free" },
  { id: "bear", emoji: "🐻", name: { en: "Bear", es: "Oso", ko: "곰" }, unlock: 0, rarity: "free" },
  // Level unlocks (common)
  { id: "owl", emoji: "🦉", name: { en: "Owl", es: "Búho", ko: "부엉이" }, unlock: 3, rarity: "common" },
  { id: "penguin", emoji: "🐧", name: { en: "Penguin", es: "Pingüino", ko: "펭귄" }, unlock: 5, rarity: "common" },
  { id: "koala", emoji: "🐨", name: { en: "Koala", es: "Koala", ko: "코알라" }, unlock: 7, rarity: "common" },
  { id: "tiger", emoji: "🐯", name: { en: "Tiger", es: "Tigre", ko: "호랑이" }, unlock: 10, rarity: "common" },
  // Rare (higher levels)
  { id: "unicorn", emoji: "🦄", name: { en: "Unicorn", es: "Unicornio", ko: "유니콘" }, unlock: 15, rarity: "rare" },
  { id: "dragon", emoji: "🐉", name: { en: "Dragon", es: "Dragón", ko: "용" }, unlock: 20, rarity: "rare" },
  { id: "phoenix", emoji: "🔥", name: { en: "Phoenix", es: "Fénix", ko: "불사조" }, unlock: 25, rarity: "rare" },
  // Legendary
  { id: "alien", emoji: "👾", name: { en: "Alien", es: "Alien", ko: "외계인" }, unlock: 30, rarity: "legendary" },
  { id: "robot", emoji: "🤖", name: { en: "Robot", es: "Robot", ko: "로봇" }, unlock: 40, rarity: "legendary" },
  { id: "astronaut", emoji: "🧑‍🚀", name: { en: "Astronaut", es: "Astronauta", ko: "우주비행사" }, unlock: 50, rarity: "legendary" },
];

const FRAMES = [
  { id: "none", name: { en: "None", es: "Ninguno", ko: "없음" }, unlock: 0, color: "transparent", style: "none" },
  { id: "blue", name: { en: "Ocean", es: "Océano", ko: "바다" }, unlock: 2, color: "#2383E2", style: "solid" },
  { id: "green", name: { en: "Forest", es: "Bosque", ko: "숲" }, unlock: 4, color: "#0F7B6C", style: "solid" },
  { id: "orange", name: { en: "Sunset", es: "Atardecer", ko: "석양" }, unlock: 6, color: "#D9730D", style: "solid" },
  { id: "purple", name: { en: "Galaxy", es: "Galaxia", ko: "은하" }, unlock: 8, color: "#6940A5", style: "solid" },
  { id: "gold", name: { en: "Gold", es: "Oro", ko: "금" }, unlock: 12, color: "#D4A017", style: "double" },
  { id: "rainbow", name: { en: "Rainbow", es: "Arcoíris", ko: "무지개" }, unlock: 18, color: "linear-gradient(135deg,#E03E3E,#D9730D,#DFAB01,#0F7B6C,#2383E2,#6940A5)", style: "gradient" },
  { id: "fire", name: { en: "Fire", es: "Fuego", ko: "불꽃" }, unlock: 25, color: "linear-gradient(135deg,#E03E3E,#D9730D,#DFAB01)", style: "gradient" },
  { id: "diamond", name: { en: "Diamond", es: "Diamante", ko: "다이아몬드" }, unlock: 35, color: "linear-gradient(135deg,#7EC8E3,#A4DDED,#E8F0FE,#7EC8E3)", style: "gradient" },
  { id: "cosmic", name: { en: "Cosmic", es: "Cósmico", ko: "우주" }, unlock: 50, color: "linear-gradient(135deg,#1a1a2e,#6940A5,#E03E3E,#D9730D)", style: "gradient" },
];

const RARITY_COLORS = {
  free: { bg: C.bgSoft, text: C.textMuted, label: { en: "Free", es: "Gratis", ko: "무료" } },
  common: { bg: C.accentSoft, text: C.accent, label: { en: "Common", es: "Común", ko: "일반" } },
  rare: { bg: C.purpleSoft, text: C.purple, label: { en: "Rare", es: "Raro", ko: "레어" } },
  legendary: { bg: C.orangeSoft, text: C.orange, label: { en: "Legendary", es: "Legendario", ko: "전설" } },
};

const AvatarDisplay = ({ emoji, frame, size = 48 }) => {
  const fr = FRAMES.find(f => f.id === frame) || FRAMES[0];
  const borderStyle = fr.style === "gradient"
    ? { background: fr.color, padding: 3 }
    : fr.style === "double"
    ? { border: `3px double ${fr.color}`, padding: 0 }
    : fr.style === "solid"
    ? { border: `3px solid ${fr.color}`, padding: 0 }
    : { border: `2px solid ${C.border}`, padding: 0 };

  return (
    <div style={{
      width: size + 8, height: size + 8, borderRadius: "50%",
      display: "flex", alignItems: "center", justifyContent: "center",
      ...borderStyle,
    }}>
      <div style={{
        width: size, height: size, borderRadius: "50%", background: C.bgSoft,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.5,
      }}>
        {emoji}
      </div>
    </div>
  );
};

const i18n = {
  en: {
    tagline: "Help your students actually remember what you teach",
    teacher: "I'm a Teacher", student: "I'm a Student",
    createSession: "New session", topic: "Topic",
    topicPlaceholder: "e.g. French Revolution, Quadratic Equations...",
    keyPoints: "Key points covered",
    keyPointsPlaceholder: "Main concepts you covered, one per line (optional)",
    grade: "Grade", subject: "Subject",
    generate: "Generate questions", generating: "Generating questions...",
    launch: "Launch session", enterPin: "Enter PIN", pinPlaceholder: "000000",
    yourName: "Your name", namePlaceholder: "Enter your name",
    join: "Join session", joinSession: "Join a session", question: "Question",
    next: "Next →", finish: "See results", correct: "Correct!", incorrect: "Incorrect",
    back: "← Back", dashboard: "Dashboard", studentsJoined: "students joined",
    startQuiz: "Start quiz", endSession: "End session",
    selectSubject: "Select...", selectGrade: "Select...",
    warmup: "Warmup", exitTicket: "Exit Ticket", liveResults: "Live results",
    questionOf: "{current} of {total}", sharePin: "Share this PIN with your students",
    greatJob: "Great job!", keepPracticing: "Keep practicing",
    sessionComplete: "Session complete", avgScore: "Avg. Score",
    strong: "Strong", medium: "Review", weak: "Weak",
    subjects: ["Math", "Science", "History", "Language", "Geography", "Art"],
    grades: ["6th", "7th", "8th", "9th", "10th", "11th", "12th"],
    dashboardTitle: "Retention Dashboard", overallRetention: "Overall retention",
    topicsTracked: "Topics tracked", sessionsRun: "Sessions this week",
    needsReview: "Needs review", topicHealth: "Topic health",
    suggestedReview: "Suggested for today", studentProgress: "Student progress",
    daysAgo: "days ago", today: "Today", reviewNow: "Review now",
    classOf: "students",
    // Student dashboard
    myProgress: "My Progress", myRetention: "My Retention",
    sessionsAttended: "Sessions attended", topicsLearned: "Topics learned",
    streak: "Day streak", studyNow: "Study now",
    myTopics: "My Topics", practiceMore: "Practice",
    recentActivity: "Recent Activity", answered: "answered",
    accuracy: "accuracy", minutesAgo: "min ago",
    hoursAgo: "h ago", strongTopics: "Strong topics", weakTopics: "Weak topics",
    noWeakTopics: "No weak topics — great work!",
    studyMode: "Study Mode", checkAnswer: "Check",
    nextQuestion: "Next →", studyComplete: "Practice complete!",
    backToDash: "Back to dashboard", questionsRight: "correct",
    keepGoing: "Keep going!", onFire: "You're on fire!",
    almostThere: "Almost there!", goodStart: "Good start!",
    levelUp: "Level up", xpPoints: "XP",
    dailyGoal: "Daily goal", questionsToday: "questions today",
  },
  es: {
    tagline: "Ayuda a tus alumnos a recordar lo que enseñas",
    teacher: "Soy Profesor", student: "Soy Estudiante",
    createSession: "Nueva sesión", topic: "Tema",
    topicPlaceholder: "ej. Revolución Francesa, Ecuaciones Cuadráticas...",
    keyPoints: "Puntos clave",
    keyPointsPlaceholder: "Conceptos principales, uno por línea (opcional)",
    grade: "Grado", subject: "Materia",
    generate: "Generar preguntas", generating: "Generando preguntas...",
    launch: "Lanzar sesión", enterPin: "Ingresa PIN", pinPlaceholder: "000000",
    yourName: "Tu nombre", namePlaceholder: "Escribe tu nombre",
    join: "Unirse", joinSession: "Unirse a sesión", question: "Pregunta",
    next: "Siguiente →", finish: "Ver resultados", correct: "¡Correcto!", incorrect: "Incorrecto",
    back: "← Volver", dashboard: "Panel", studentsJoined: "estudiantes",
    startQuiz: "Iniciar quiz", endSession: "Finalizar",
    selectSubject: "Seleccionar...", selectGrade: "Seleccionar...",
    warmup: "Warmup", exitTicket: "Exit Ticket", liveResults: "Resultados en vivo",
    questionOf: "{current} de {total}", sharePin: "Comparte este PIN con tus estudiantes",
    greatJob: "¡Excelente!", keepPracticing: "Sigue practicando",
    sessionComplete: "Sesión completa", avgScore: "Promedio",
    strong: "Fuerte", medium: "Repasar", weak: "Débil",
    subjects: ["Matemáticas", "Ciencias", "Historia", "Lengua", "Geografía", "Arte"],
    grades: ["6°", "7°", "8°", "9°", "10°", "11°", "12°"],
    dashboardTitle: "Panel de Retención", overallRetention: "Retención general",
    topicsTracked: "Temas registrados", sessionsRun: "Sesiones esta semana",
    needsReview: "Necesitan repaso", topicHealth: "Salud por tema",
    suggestedReview: "Sugerido para hoy", studentProgress: "Progreso por alumno",
    daysAgo: "días atrás", today: "Hoy", reviewNow: "Repasar ahora",
    classOf: "estudiantes",
    myProgress: "Mi Progreso", myRetention: "Mi Retención",
    sessionsAttended: "Sesiones asistidas", topicsLearned: "Temas aprendidos",
    streak: "Racha de días", studyNow: "Estudiar ahora",
    myTopics: "Mis Temas", practiceMore: "Practicar",
    recentActivity: "Actividad Reciente", answered: "respondidas",
    accuracy: "precisión", minutesAgo: "min atrás",
    hoursAgo: "h atrás", strongTopics: "Temas fuertes", weakTopics: "Temas débiles",
    noWeakTopics: "Sin temas débiles — ¡excelente!",
    studyMode: "Modo Estudio", checkAnswer: "Verificar",
    nextQuestion: "Siguiente →", studyComplete: "¡Práctica completa!",
    backToDash: "Volver al panel", questionsRight: "correctas",
    keepGoing: "¡Sigue así!", onFire: "¡Estás en racha!",
    almostThere: "¡Ya casi!", goodStart: "¡Buen inicio!",
    levelUp: "Sube de nivel", xpPoints: "XP",
    dailyGoal: "Meta diaria", questionsToday: "preguntas hoy",
  },
  ko: {
    tagline: "학생들이 배운 내용을 실제로 기억하도록",
    teacher: "교사입니다", student: "학생입니다",
    createSession: "새 세션", topic: "주제",
    topicPlaceholder: "예: 프랑스 혁명, 이차방정식...",
    keyPoints: "핵심 포인트",
    keyPointsPlaceholder: "다룬 주요 개념 (줄당 하나, 선택사항)",
    grade: "학년", subject: "과목",
    generate: "문제 생성", generating: "문제 생성 중...",
    launch: "세션 시작", enterPin: "PIN 입력", pinPlaceholder: "000000",
    yourName: "이름", namePlaceholder: "이름을 입력하세요",
    join: "참여", joinSession: "세션 참여", question: "문제",
    next: "다음 →", finish: "결과 보기", correct: "정답!", incorrect: "오답",
    back: "← 뒤로", dashboard: "대시보드", studentsJoined: "명 참여",
    startQuiz: "퀴즈 시작", endSession: "세션 종료",
    selectSubject: "선택...", selectGrade: "선택...",
    warmup: "워밍업", exitTicket: "마무리 퀴즈", liveResults: "실시간 결과",
    questionOf: "{total}개 중 {current}", sharePin: "이 PIN을 학생들과 공유하세요",
    greatJob: "잘했어요!", keepPracticing: "더 연습해봐요",
    sessionComplete: "세션 완료", avgScore: "평균",
    strong: "강함", medium: "복습 필요", weak: "약함",
    subjects: ["수학", "과학", "역사", "국어", "지리", "미술"],
    grades: ["중1", "중2", "중3", "고1", "고2", "고3", "대1"],
    dashboardTitle: "기억률 대시보드", overallRetention: "전체 기억률",
    topicsTracked: "추적 중인 주제", sessionsRun: "이번 주 세션",
    needsReview: "복습 필요", topicHealth: "주제별 상태",
    suggestedReview: "오늘 추천 복습", studentProgress: "학생별 진도",
    daysAgo: "일 전", today: "오늘", reviewNow: "지금 복습",
    classOf: "명",
    myProgress: "내 진도", myRetention: "내 기억률",
    sessionsAttended: "참여한 세션", topicsLearned: "배운 주제",
    streak: "연속 일수", studyNow: "지금 공부",
    myTopics: "내 주제", practiceMore: "연습",
    recentActivity: "최근 활동", answered: "응답",
    accuracy: "정확도", minutesAgo: "분 전",
    hoursAgo: "시간 전", strongTopics: "강한 주제", weakTopics: "약한 주제",
    noWeakTopics: "약한 주제 없음 — 잘하고 있어요!",
    studyMode: "학습 모드", checkAnswer: "확인",
    nextQuestion: "다음 →", studyComplete: "연습 완료!",
    backToDash: "대시보드로", questionsRight: "정답",
    keepGoing: "계속 가자!", onFire: "불타고 있어!",
    almostThere: "거의 다 됐어!", goodStart: "좋은 시작!",
    levelUp: "레벨 업", xpPoints: "XP",
    dailyGoal: "오늘 목표", questionsToday: "오늘 푼 문제",
  },
};

const SQ = {
  en: [
    { q: "What year did the French Revolution begin?", options: ["1776", "1789", "1804", "1815"], correct: 1 },
    { q: "What was the main cause of the French Revolution?", options: ["Religious conflict", "Social inequality & financial crisis", "Foreign invasion", "Natural disaster"], correct: 1 },
    { q: "What document declared the rights of citizens?", options: ["Magna Carta", "Declaration of the Rights of Man", "Treaty of Versailles", "Code Napoleon"], correct: 1 },
    { q: "Which estate had the least power despite being the majority?", options: ["First Estate", "Second Estate", "Third Estate", "The monarchy"], correct: 2 },
    { q: "What event symbolically started the Revolution?", options: ["Execution of Louis XVI", "Storming of the Bastille", "Tennis Court Oath", "Reign of Terror"], correct: 1 },
  ],
  es: [
    { q: "¿En qué año comenzó la Revolución Francesa?", options: ["1776", "1789", "1804", "1815"], correct: 1 },
    { q: "¿Cuál fue la causa principal?", options: ["Conflicto religioso", "Desigualdad social y crisis financiera", "Invasión extranjera", "Desastre natural"], correct: 1 },
    { q: "¿Qué documento declaró los derechos de los ciudadanos?", options: ["Carta Magna", "Declaración de los Derechos del Hombre", "Tratado de Versalles", "Código Napoleón"], correct: 1 },
    { q: "¿Qué estamento tenía menos poder siendo mayoría?", options: ["Primer Estado", "Segundo Estado", "Tercer Estado", "La monarquía"], correct: 2 },
    { q: "¿Qué evento inició simbólicamente la Revolución?", options: ["Ejecución de Luis XVI", "Toma de la Bastilla", "Juramento del Juego de Pelota", "Reinado del Terror"], correct: 1 },
  ],
  ko: [
    { q: "프랑스 혁명은 몇 년에 시작되었나요?", options: ["1776년", "1789년", "1804년", "1815년"], correct: 1 },
    { q: "프랑스 혁명의 주요 원인은?", options: ["종교 갈등", "사회적 불평등과 재정 위기", "외국의 침략", "자연재해"], correct: 1 },
    { q: "시민의 권리를 선언한 문서는?", options: ["대헌장", "인간과 시민의 권리 선언", "베르사유 조약", "나폴레옹 법전"], correct: 1 },
    { q: "다수임에도 권력이 가장 적었던 신분은?", options: ["제1신분", "제2신분", "제3신분", "왕실"], correct: 2 },
    { q: "혁명의 상징적 시작 사건은?", options: ["루이 16세 처형", "바스티유 습격", "테니스코트의 서약", "공포정치"], correct: 1 },
  ],
};

const MOCK = {
  overallRetention: 72, topicsTracked: 12, sessionsThisWeek: 5, needsReview: 3,
  topics: [
    { name: { en: "French Revolution", es: "Revolución Francesa", ko: "프랑스 혁명" }, retention: 89, lastDays: 1, trend: "up" },
    { name: { en: "Quadratic Equations", es: "Ecuaciones Cuadráticas", ko: "이차방정식" }, retention: 74, lastDays: 3, trend: "stable" },
    { name: { en: "Photosynthesis", es: "Fotosíntesis", ko: "광합성" }, retention: 45, lastDays: 8, trend: "down" },
    { name: { en: "Cell Division", es: "División Celular", ko: "세포 분열" }, retention: 38, lastDays: 12, trend: "down" },
    { name: { en: "World War II", es: "Segunda Guerra Mundial", ko: "제2차 세계대전" }, retention: 82, lastDays: 2, trend: "up" },
    { name: { en: "Linear Functions", es: "Funciones Lineales", ko: "일차함수" }, retention: 61, lastDays: 5, trend: "down" },
  ],
  students: [
    { name: "Sofía M.", avg: 85, weak: 1 }, { name: "Carlos R.", avg: 72, weak: 2 },
    { name: "Minjun K.", avg: 91, weak: 0 }, { name: "Emma W.", avg: 58, weak: 3 },
    { name: "Diego L.", avg: 67, weak: 2 }, { name: "Yuna P.", avg: 79, weak: 1 },
    { name: "Lucas G.", avg: 44, weak: 4 }, { name: "Valentina S.", avg: 88, weak: 0 },
  ],
  suggested: [
    { name: { en: "Photosynthesis", es: "Fotosíntesis", ko: "광합성" }, retention: 45, reason: { en: "8 days since last review", es: "8 días sin repaso", ko: "마지막 복습 8일 전" } },
    { name: { en: "Cell Division", es: "División Celular", ko: "세포 분열" }, retention: 38, reason: { en: "Low retention, only 1 session", es: "Retención baja, solo 1 sesión", ko: "낮은 기억률, 1회 세션" } },
  ],
};

const genPIN = () => String(Math.floor(100000 + Math.random() * 900000));
const retCol = (v) => v >= 70 ? C.green : v >= 40 ? C.orange : C.red;

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  html{font-size:15px}
  body{font-family:${FONT};background:${C.bgSoft};color:${C.text};-webkit-font-smoothing:antialiased}
  ::selection{background:${C.accentSoft};color:${C.accent}}
  input,select,textarea{font-family:${FONT};background:${C.bg};border:1px solid ${C.border};color:${C.text};padding:10px 14px;border-radius:8px;font-size:14px;width:100%;outline:none;transition:border-color .15s,box-shadow .15s}
  input:focus,select:focus,textarea:focus{border-color:${C.accent};box-shadow:0 0 0 3px ${C.accentSoft}}
  input::placeholder,textarea::placeholder{color:${C.textMuted}}
  textarea{resize:vertical;min-height:88px}
  select{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%239B9B9B' stroke-width='1.5'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:32px}
  button{font-family:${FONT};cursor:pointer;border:none;outline:none;transition:all .15s}
  button:active{transform:scale(.98)}
  @keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  @keyframes si{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
  .fi{animation:fi .3s ease-out both}
  .f1{animation:fi .3s ease-out .05s both}
  .f2{animation:fi .3s ease-out .1s both}
  .f3{animation:fi .3s ease-out .15s both}
`;

// ─── Primitives ─────────────────────────────────────
const Logo = ({ s = 22 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{ width: s + 4, height: s + 4, borderRadius: 8, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={s * .6} height={s * .6} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="1.8"/>
        <path d="M12 8v4l2.5 2.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
    <span style={{ fontSize: s * .75, fontWeight: 700, color: C.text, letterSpacing: "-.03em" }}>clasloop</span>
  </div>
);

const Btn = ({ children, v = "primary", onClick, disabled, style = {}, full }) => {
  const base = { padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 500, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, width: full ? "100%" : "auto", opacity: disabled ? .4 : 1, pointerEvents: disabled ? "none" : "auto" };
  const vs = { primary: { background: C.accent, color: "#fff" }, secondary: { background: C.bg, color: C.text, border: `1px solid ${C.border}` }, danger: { background: C.redSoft, color: C.red }, ghost: { background: "transparent", color: C.textSecondary, padding: "8px 4px" }, accent: { background: C.accentSoft, color: C.accent } };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...vs[v], ...style }}>{children}</button>;
};

const Card = ({ children, style = {}, className = "" }) => (
  <div className={className} style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, boxShadow: C.shadow, ...style }}>{children}</div>
);

const LangSw = ({ lang, setLang }) => (
  <div style={{ display: "flex", gap: 2, background: C.bgSoft, borderRadius: 8, padding: 3, border: `1px solid ${C.border}` }}>
    {[["en", "EN"], ["es", "ES"], ["ko", "한"]].map(([c, l]) => (
      <button key={c} onClick={() => setLang(c)} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: lang === c ? C.bg : "transparent", color: lang === c ? C.text : C.textMuted, boxShadow: lang === c ? C.shadow : "none" }}>{l}</button>
    ))}
  </div>
);

const Bar = ({ value, max = 100, color = C.accent, h = 6 }) => (
  <div style={{ width: "100%", height: h, background: C.bgSoft, borderRadius: h }}>
    <div style={{ width: `${Math.min((value / max) * 100, 100)}%`, height: "100%", borderRadius: h, background: color, transition: "width .5s ease" }} />
  </div>
);

const Timer = ({ sec, total }) => {
  const pct = total > 0 ? (sec / total) * 100 : 0;
  const col = pct > 50 ? C.green : pct > 25 ? C.orange : C.red;
  return (
    <div style={{ width: 40, height: 40, borderRadius: "50%", background: `conic-gradient(${col} ${pct}%, ${C.bgSoft} ${pct}%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, fontFamily: MONO, color: col }}>{sec}</div>
    </div>
  );
};

const Nav = ({ lang, setLang, onBack, right }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: `1px solid ${C.border}`, background: C.bg, position: "sticky", top: 0, zIndex: 10 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {onBack && <Btn v="ghost" onClick={onBack} style={{ padding: "6px 0", fontSize: 13 }}>←</Btn>}
      <Logo s={20} />
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{right}<LangSw lang={lang} setLang={setLang} /></div>
  </div>
);

const Stat = ({ label, value, color = C.accent }) => (
  <div style={{ padding: "16px 18px", borderRadius: 10, background: C.bg, border: `1px solid ${C.border}`, flex: 1, minWidth: 130 }}>
    <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4, fontWeight: 500 }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: MONO, lineHeight: 1 }}>{value}</div>
  </div>
);

// ─── Screens ────────────────────────────────────────

const Home = ({ t, setRole, lang, setLang }) => (
  <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
    <div style={{ padding: "14px 24px", display: "flex", justifyContent: "flex-end" }}><LangSw lang={lang} setLang={setLang} /></div>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="fi" style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><Logo s={36} /></div>
        <p style={{ color: C.textSecondary, fontSize: 16, maxWidth: 340, margin: "0 auto", lineHeight: 1.5 }}>{t.tagline}</p>
      </div>
      <div className="f1" style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <Btn onClick={() => setRole("teacher")} style={{ minWidth: 180, padding: "14px 28px" }}>{t.teacher}</Btn>
        <Btn v="secondary" onClick={() => setRole("student")} style={{ minWidth: 180, padding: "14px 28px" }}>{t.student}</Btn>
      </div>
      <p className="f2" style={{ marginTop: 48, color: C.textMuted, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.green, display: "inline-block" }} />Prototype v0.2
      </p>
    </div>
  </div>
);

const Create = ({ t, lang, setLang, onLaunch, onBack, onDash }) => {
  const [topic, setTopic] = useState(""); const [kp, setKp] = useState("");
  const [grade, setGrade] = useState(""); const [subj, setSubj] = useState("");
  const [type, setType] = useState("warmup"); const [step, setStep] = useState("form");
  const [qs, setQs] = useState([]);

  const gen = () => { setStep("gen"); setTimeout(() => { setQs(SQ[lang] || SQ.en); setStep("preview"); }, 1800); };

  if (step === "gen") return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
      <div className="fi" style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: C.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", animation: "pulse 1.5s infinite" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
        </div>
        <p style={{ fontSize: 15, fontWeight: 500 }}>{t.generating}</p>
        <p style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>{topic}</p>
      </div>
    </div>
  );

  if (step === "preview") return (
    <div style={{ minHeight: "100vh", background: C.bgSoft }}>
      <Nav lang={lang} setLang={setLang} onBack={() => setStep("form")} />
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 20px" }}>
        <div className="fi" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>{topic}</h2>
          <p style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>{qs.length} {t.question.toLowerCase()}s · {type === "warmup" ? t.warmup : t.exitTicket}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {qs.map((q, i) => (
            <Card key={i} className={`f${Math.min(i + 1, 3)}`} style={{ padding: 16 }}>
              <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>{t.question} {i + 1}</p>
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 10, lineHeight: 1.4 }}>{q.q}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {q.options.map((o, j) => (
                  <div key={j} style={{ padding: "7px 10px", borderRadius: 6, fontSize: 13, background: j === q.correct ? C.greenSoft : C.bgSoft, border: `1px solid ${j === q.correct ? C.green + "33" : "transparent"}`, color: j === q.correct ? C.green : C.textSecondary, fontWeight: j === q.correct ? 500 : 400 }}>{o}</div>
                ))}
              </div>
            </Card>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <Btn v="secondary" onClick={() => setStep("form")} style={{ flex: 1 }}>{t.back}</Btn>
          <Btn onClick={() => onLaunch({ topic, questions: qs, sessionType: type })} style={{ flex: 2 }}>{t.launch}</Btn>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bgSoft }}>
      <Nav lang={lang} setLang={setLang} onBack={onBack} right={<Btn v="accent" onClick={onDash} style={{ fontSize: 13, padding: "6px 14px" }}>{t.dashboard}</Btn>} />
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 20px" }}>
        <h2 className="fi" style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>{t.createSession}</h2>
        <div className="f1" style={{ display: "flex", gap: 6, marginBottom: 22 }}>
          {["warmup", "exitTicket"].map((tp) => (
            <button key={tp} onClick={() => setType(tp)} style={{ flex: 1, padding: 10, borderRadius: 8, fontSize: 13, fontWeight: 500, background: type === tp ? C.accentSoft : C.bg, color: type === tp ? C.accent : C.textSecondary, border: `1px solid ${type === tp ? C.accent + "33" : C.border}` }}>
              {tp === "warmup" ? <><CIcon name="warmup" size={14} inline /> {t.warmup}</> : <><CIcon name="ticket" size={14} inline /> {t.exitTicket}</>}
            </button>
          ))}
        </div>
        <div className="f2" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.topic}</label><input value={topic} onChange={e => setTopic(e.target.value)} placeholder={t.topicPlaceholder} /></div>
          <div><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.keyPoints}</label><textarea value={kp} onChange={e => setKp(e.target.value)} placeholder={t.keyPointsPlaceholder} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.grade}</label><select value={grade} onChange={e => setGrade(e.target.value)}><option value="">{t.selectGrade}</option>{t.grades.map(g => <option key={g}>{g}</option>)}</select></div>
            <div><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.subject}</label><select value={subj} onChange={e => setSubj(e.target.value)}><option value="">{t.selectSubject}</option>{t.subjects.map(s => <option key={s}>{s}</option>)}</select></div>
          </div>
        </div>
        <div className="f3" style={{ marginTop: 24 }}><Btn full onClick={gen} disabled={!topic.trim() || !grade || !subj}>{t.generate}</Btn></div>
      </div>
    </div>
  );
};

const Lobby = ({ t, lang, setLang, session, students, onStart, onBack }) => (
  <div style={{ minHeight: "100vh", background: C.bgSoft }}>
    <Nav lang={lang} setLang={setLang} onBack={onBack} />
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "48px 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <p className="fi" style={{ color: C.textSecondary, fontSize: 13, marginBottom: 8 }}>{t.sharePin}</p>
      <div className="fi" style={{ fontSize: 48, fontWeight: 800, letterSpacing: ".12em", fontFamily: MONO, color: C.accent, marginBottom: 4 }}>{session.pin}</div>
      <p className="fi" style={{ color: C.textMuted, fontSize: 13, marginBottom: 32 }}>clasloop.com/join</p>
      <Card className="f1" style={{ width: "100%", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: C.textMuted }}>{session.topic}</p>
        <div style={{ fontSize: 36, fontWeight: 700, color: C.accent, fontFamily: MONO, margin: "12px 0 4px" }}>{students.length}</div>
        <p style={{ fontSize: 13, color: C.textSecondary }}>{t.studentsJoined}</p>
        {students.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", marginTop: 14 }}>
          {students.map((s, i) => <span key={i} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, background: C.bgSoft, color: C.textSecondary, border: `1px solid ${C.border}`, animation: `si .2s ease-out ${i * .05}s both` }}>{s.name}</span>)}
        </div>}
      </Card>
      <div className="f2" style={{ display: "flex", gap: 10, marginTop: 20, width: "100%" }}>
        <Btn v="secondary" onClick={onBack} style={{ flex: 1 }}>{t.back}</Btn>
        <Btn onClick={onStart} disabled={students.length === 0} style={{ flex: 2 }}>{t.startQuiz}</Btn>
      </div>
    </div>
  </div>
);

const Live = ({ t, lang, setLang, session, students, onEnd }) => {
  const tQ = session.questions.length;
  const res = students.map(s => ({ ...s, correct: s.answers ? s.answers.filter((a, i) => a === session.questions[i]?.correct).length : 0 }));
  const avg = res.length > 0 ? Math.round(res.reduce((s, r) => s + r.correct, 0) / res.length / tQ * 100) : 0;
  return (
    <div style={{ minHeight: "100vh", background: C.bgSoft }}>
      <Nav lang={lang} setLang={setLang} onBack={onEnd} right={<Btn v="danger" onClick={onEnd} style={{ fontSize: 12, padding: "6px 12px" }}>{t.endSession}</Btn>} />
      <div style={{ maxWidth: 560, margin: "0 auto", padding: 20 }}>
        <Card className="fi" style={{ textAlign: "center", marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 2 }}>{t.liveResults} · {session.topic}</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 12 }}>
            <div><div style={{ fontSize: 32, fontWeight: 700, color: C.accent, fontFamily: MONO }}>{students.length}</div><div style={{ fontSize: 11, color: C.textMuted }}>{t.studentsJoined}</div></div>
            <div><div style={{ fontSize: 32, fontWeight: 700, color: retCol(avg), fontFamily: MONO }}>{avg}%</div><div style={{ fontSize: 11, color: C.textMuted }}>{t.avgScore}</div></div>
          </div>
        </Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {res.sort((a, b) => b.correct - a.correct).map((s, i) => {
            const pct = tQ > 0 ? (s.correct / tQ) * 100 : 0; const col = retCol(pct);
            return (
              <Card key={i} className={`f${Math.min(i + 1, 3)}`} style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.textMuted, width: 20, textAlign: "center" }}>{i + 1}</span>
                <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{s.name}</div><Bar value={s.correct} max={tQ} color={col} h={4} /></div>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: MONO, color: col }}>{s.correct}/{tQ}</span>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Dash = ({ t, lang, setLang, onBack, onCreate }) => {
  const d = MOCK;
  const tI = (tr) => tr === "up" ? "↑" : tr === "down" ? "↓" : "→";
  const tC = (tr) => tr === "up" ? C.green : tr === "down" ? C.red : C.textMuted;
  return (
    <div style={{ minHeight: "100vh", background: C.bgSoft }}>
      <Nav lang={lang} setLang={setLang} onBack={onBack} right={<Btn onClick={onCreate} style={{ fontSize: 13, padding: "6px 14px" }}>+ {t.createSession}</Btn>} />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px" }}>
        <h2 className="fi" style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>{t.dashboardTitle}</h2>

        <div className="f1" style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <Stat label={t.overallRetention} value={`${d.overallRetention}%`} color={retCol(d.overallRetention)} />
          <Stat label={t.topicsTracked} value={d.topicsTracked} color={C.accent} />
          <Stat label={t.sessionsRun} value={d.sessionsThisWeek} color={C.purple} />
          <Stat label={t.needsReview} value={d.needsReview} color={C.red} />
        </div>

        {d.suggested.length > 0 && (
          <Card className="f2" style={{ marginBottom: 16, borderLeft: `3px solid ${C.orange}` }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}><CIcon name="speed" size={14} inline /> {t.suggestedReview}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {d.suggested.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, background: C.bgSoft }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{s.name[lang]}</div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{s.reason[lang]}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, fontFamily: MONO, color: retCol(s.retention) }}>{s.retention}%</span>
                    <Btn v="accent" style={{ fontSize: 12, padding: "5px 10px" }}>{t.reviewNow}</Btn>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="f3" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>{t.topicHealth}</h3>
            <span style={{ fontSize: 12, color: C.textMuted }}>{d.topics.length} topics</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {d.topics.sort((a, b) => a.retention - b.retention).map((tp, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, background: C.bgSoft }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: retCol(tp.retention), flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{tp.name[lang]}</div>
                  <Bar value={tp.retention} max={100} color={retCol(tp.retention)} h={4} />
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: MONO, color: retCol(tp.retention) }}>
                    {tp.retention}%<span style={{ fontSize: 11, color: tC(tp.trend), marginLeft: 4 }}>{tI(tp.trend)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{tp.lastDays === 1 ? t.today : `${tp.lastDays} ${t.daysAgo}`}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="f3">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>{t.studentProgress}</h3>
            <span style={{ fontSize: 12, color: C.textMuted }}>{d.students.length} {t.classOf}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {d.students.sort((a, b) => b.avg - a.avg).map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderRadius: 8, background: i % 2 === 0 ? C.bgSoft : "transparent" }}>
                <span style={{ fontSize: 12, color: C.textMuted, width: 18, textAlign: "right" }}>{i + 1}</span>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: retCol(s.avg) + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: retCol(s.avg), flexShrink: 0 }}>{s.name[0]}</div>
                <div style={{ flex: 1 }}><span style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</span></div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {s.weak > 0 && <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: C.redSoft, color: C.red }}>{s.weak} {t.weak.toLowerCase()}</span>}
                  <span style={{ fontSize: 13, fontWeight: 700, fontFamily: MONO, color: retCol(s.avg), width: 40, textAlign: "right" }}>{s.avg}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

const Join = ({ t, lang, setLang, onJoin, onBack }) => {
  const [pin, setPin] = useState(""); const [name, setName] = useState("");
  return (
    <div style={{ minHeight: "100vh", background: C.bgSoft }}>
      <Nav lang={lang} setLang={setLang} onBack={onBack} />
      <div style={{ maxWidth: 380, margin: "0 auto", padding: "48px 20px" }}>
        <Card className="fi">
          <h2 style={{ fontSize: 18, fontWeight: 600, textAlign: "center", marginBottom: 20 }}>{t.joinSession}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.enterPin}</label><input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder={t.pinPlaceholder} style={{ textAlign: "center", fontSize: 28, fontFamily: MONO, fontWeight: 700, letterSpacing: ".15em", padding: 12 }} /></div>
            <div><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.yourName}</label><input value={name} onChange={e => setName(e.target.value)} placeholder={t.namePlaceholder} /></div>
            <Btn full onClick={() => onJoin(pin, name)} disabled={pin.length !== 6 || !name.trim()}>{t.join}</Btn>
          </div>
        </Card>
      </div>
    </div>
  );
};

const Quiz = ({ t, lang, setLang, questions, onFinish }) => {
  const [cur, setCur] = useState(0); const [ans, setAns] = useState([]);
  const [sel, setSel] = useState(null); const [show, setShow] = useState(false);
  const [time, setTime] = useState(15);
  const q = questions[cur]; const last = cur === questions.length - 1;

  useEffect(() => { setTime(15); setSel(null); setShow(false); }, [cur]);
  useEffect(() => { if (show || time <= 0) return; const t2 = setTimeout(() => setTime(t => t - 1), 1000); return () => clearTimeout(t2); }, [time, show]);
  useEffect(() => { if (time === 0 && !show) pick(-1); }, [time, show]);

  const pick = (i) => { if (show) return; setSel(i); setShow(true); setAns(p => [...p, i]); };
  const nxt = () => { last ? onFinish([...ans]) : setCur(c => c + 1); };
  const ok = sel === q.correct;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 13, color: C.textSecondary }}>{t.questionOf.replace("{current}", cur + 1).replace("{total}", questions.length)}</span>
        <Timer sec={time} total={15} />
      </div>
      <Bar value={cur + 1} max={questions.length} h={3} />
      <div className="fi" key={cur} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 20px", maxWidth: 480, margin: "0 auto", width: "100%" }}>
        <h2 style={{ fontSize: 19, fontWeight: 600, textAlign: "center", marginBottom: 28, lineHeight: 1.5 }}>{q.q}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {q.options.map((o, i) => {
            let bg = OPT_C[i].bg, op = 1;
            if (show) { bg = i === q.correct ? C.green : i === sel ? C.red : "#ccc"; op = i === q.correct || i === sel ? 1 : .3; }
            return <button key={i} onClick={() => pick(i)} disabled={show} style={{ padding: "16px 14px", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#fff", background: bg, opacity: op, transition: "all .2s", lineHeight: 1.3, minHeight: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>{o}</button>;
          })}
        </div>
        {show && <div className="fi" style={{ textAlign: "center", marginTop: 24 }}>
          <span style={{ display: "inline-block", padding: "8px 16px", borderRadius: 8, background: ok ? C.greenSoft : C.redSoft, color: ok ? C.green : C.red, fontSize: 14, fontWeight: 600, marginBottom: 14 }}>{ok ? "✓ " + t.correct : "✗ " + t.incorrect}</span>
          <br /><Btn onClick={nxt}>{last ? t.finish : t.next}</Btn>
        </div>}
      </div>
    </div>
  );
};

const Results = ({ t, questions, answers, onBack }) => {
  const correct = answers.filter((a, i) => a === questions[i]?.correct).length;
  const pct = Math.round((correct / questions.length) * 100);
  const col = retCol(pct);
  return (
    <div style={{ minHeight: "100vh", background: C.bgSoft, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <Card className="fi" style={{ width: "100%", maxWidth: 400, textAlign: "center" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: col + "14", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: col, fontFamily: MONO }}>{pct}%</span>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 2 }}>{t.sessionComplete}</h2>
        <p style={{ color: C.textSecondary, fontSize: 14, marginBottom: 16 }}>{pct >= 70 ? t.greatJob : t.keepPracticing}</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, padding: "14px 0", borderTop: `1px solid ${C.border}` }}>
          <div><div style={{ fontSize: 22, fontWeight: 700, color: C.green, fontFamily: MONO }}>{correct}</div><div style={{ fontSize: 11, color: C.textMuted }}>{t.correct}</div></div>
          <div><div style={{ fontSize: 22, fontWeight: 700, color: C.red, fontFamily: MONO }}>{questions.length - correct}</div><div style={{ fontSize: 11, color: C.textMuted }}>{t.incorrect}</div></div>
        </div>
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 4 }}>
          {questions.map((q, i) => {
            const ok = answers[i] === q.correct;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 6, background: ok ? C.greenSoft : C.redSoft, textAlign: "left" }}>
                <span style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, background: ok ? C.green : C.red, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{ok ? "✓" : "✗"}</span>
                <span style={{ fontSize: 12, color: C.text, lineHeight: 1.3 }}>{q.q}</span>
              </div>
            );
          })}
        </div>
      </Card>
      <Btn v="secondary" onClick={onBack} style={{ marginTop: 16 }}>{t.back}</Btn>
    </div>
  );
};

// ─── Student Mock Data ──────────────────────────────
const STU_MOCK = {
  name: "Carlos R.",
  avatar: "fox",
  frame: "purple",
  xp: 1240,
  level: 7,
  streak: 5,
  dailyGoal: 10,
  dailyDone: 6,
  retention: 72,
  sessionsAttended: 18,
  topicsLearned: 8,
  topics: [
    { name: { en: "French Revolution", es: "Revolución Francesa", ko: "프랑스 혁명" }, retention: 92, lastDays: 0, sessions: 4, status: "strong" },
    { name: { en: "World War II", es: "Segunda Guerra Mundial", ko: "제2차 세계대전" }, retention: 85, lastDays: 1, sessions: 5, status: "strong" },
    { name: { en: "Quadratic Equations", es: "Ecuaciones Cuadráticas", ko: "이차방정식" }, retention: 74, lastDays: 2, sessions: 3, status: "medium" },
    { name: { en: "Linear Functions", es: "Funciones Lineales", ko: "일차함수" }, retention: 61, lastDays: 4, sessions: 2, status: "medium" },
    { name: { en: "Photosynthesis", es: "Fotosíntesis", ko: "광합성" }, retention: 42, lastDays: 7, sessions: 2, status: "weak" },
    { name: { en: "Cell Division", es: "División Celular", ko: "세포 분열" }, retention: 35, lastDays: 10, sessions: 1, status: "weak" },
  ],
  activity: [
    { type: "warmup", topic: { en: "French Revolution", es: "Revolución Francesa", ko: "프랑스 혁명" }, score: 5, total: 5, time: 15 },
    { type: "exitTicket", topic: { en: "Quadratic Equations", es: "Ecuaciones Cuadráticas", ko: "이차방정식" }, score: 3, total: 5, time: 45 },
    { type: "study", topic: { en: "Photosynthesis", es: "Fotosíntesis", ko: "광합성" }, score: 4, total: 6, time: 120 },
    { type: "warmup", topic: { en: "World War II", es: "Segunda Guerra Mundial", ko: "제2차 세계대전" }, score: 4, total: 5, time: 180 },
  ],
};

const STUDY_QS = {
  en: [
    { q: "What is the process by which plants convert sunlight into energy?", options: ["Respiration", "Photosynthesis", "Fermentation", "Osmosis"], correct: 1 },
    { q: "Which organelle is responsible for photosynthesis?", options: ["Mitochondria", "Nucleus", "Chloroplast", "Ribosome"], correct: 2 },
    { q: "What gas do plants absorb during photosynthesis?", options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], correct: 2 },
    { q: "What is the main product of photosynthesis?", options: ["Protein", "Glucose", "Fat", "DNA"], correct: 1 },
    { q: "Where does the light-dependent reaction occur?", options: ["Stroma", "Cytoplasm", "Thylakoid membrane", "Cell wall"], correct: 2 },
  ],
  es: [
    { q: "¿Cuál es el proceso por el que las plantas convierten la luz solar en energía?", options: ["Respiración", "Fotosíntesis", "Fermentación", "Ósmosis"], correct: 1 },
    { q: "¿Qué orgánulo es responsable de la fotosíntesis?", options: ["Mitocondria", "Núcleo", "Cloroplasto", "Ribosoma"], correct: 2 },
    { q: "¿Qué gas absorben las plantas durante la fotosíntesis?", options: ["Oxígeno", "Nitrógeno", "Dióxido de carbono", "Hidrógeno"], correct: 2 },
    { q: "¿Cuál es el producto principal de la fotosíntesis?", options: ["Proteína", "Glucosa", "Grasa", "ADN"], correct: 1 },
    { q: "¿Dónde ocurre la reacción dependiente de la luz?", options: ["Estroma", "Citoplasma", "Membrana tilacoide", "Pared celular"], correct: 2 },
  ],
  ko: [
    { q: "식물이 햇빛을 에너지로 전환하는 과정은?", options: ["호흡", "광합성", "발효", "삼투"], correct: 1 },
    { q: "광합성을 담당하는 세포 소기관은?", options: ["미토콘드리아", "핵", "엽록체", "리보솜"], correct: 2 },
    { q: "광합성 중 식물이 흡수하는 기체는?", options: ["산소", "질소", "이산화탄소", "수소"], correct: 2 },
    { q: "광합성의 주요 산물은?", options: ["단백질", "포도당", "지방", "DNA"], correct: 1 },
    { q: "명반응이 일어나는 곳은?", options: ["스트로마", "세포질", "틸라코이드 막", "세포벽"], correct: 2 },
  ],
};

// ─── Student Dashboard ──────────────────────────────
const StudentDash = ({ t, lang, setLang, onBack, onStudy, onJoinSession }) => {
  const d = STU_MOCK;
  const goalPct = Math.round((d.dailyDone / d.dailyGoal) * 100);
  const strong = d.topics.filter(tp => tp.status === "strong");
  const weak = d.topics.filter(tp => tp.status === "weak");
  const medium = d.topics.filter(tp => tp.status === "medium");
  const currentAvatar = AVATARS.find(a => a.id === d.avatar);
  const [showCollection, setShowCollection] = useState(false);

  if (showCollection) {
    return (
      <div style={{ minHeight: "100vh", background: C.bgSoft }}>
        <Nav lang={lang} setLang={setLang} onBack={() => setShowCollection(false)} />
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px" }}>
          <h2 className="fi" style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
            {lang === "en" ? "My Collection" : lang === "es" ? "Mi Colección" : "내 컬렉션"}
          </h2>
          <p className="fi" style={{ fontSize: 13, color: C.textSecondary, marginBottom: 20 }}>
            {lang === "en" ? `Level ${d.level} — ${AVATARS.filter(a => a.unlock <= d.level).length}/${AVATARS.length} characters, ${FRAMES.filter(f => f.unlock <= d.level).length}/${FRAMES.length} frames unlocked`
            : lang === "es" ? `Nivel ${d.level} — ${AVATARS.filter(a => a.unlock <= d.level).length}/${AVATARS.length} personajes, ${FRAMES.filter(f => f.unlock <= d.level).length}/${FRAMES.length} marcos desbloqueados`
            : `레벨 ${d.level} — 캐릭터 ${AVATARS.filter(a => a.unlock <= d.level).length}/${AVATARS.length}개, 프레임 ${FRAMES.filter(f => f.unlock <= d.level).length}/${FRAMES.length}개 잠금 해제`}
          </p>

          {/* Characters */}
          <Card className="f1" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
              {lang === "en" ? "Characters" : lang === "es" ? "Personajes" : "캐릭터"}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 10 }}>
              {AVATARS.map((av) => {
                const unlocked = d.level >= av.unlock;
                const isActive = d.avatar === av.id;
                const r = RARITY_COLORS[av.rarity];
                return (
                  <div key={av.id} style={{
                    padding: "12px 8px", borderRadius: 10, textAlign: "center",
                    background: isActive ? C.accentSoft : C.bgSoft,
                    border: `1.5px solid ${isActive ? C.accent : "transparent"}`,
                    opacity: unlocked ? 1 : 0.4,
                    cursor: unlocked ? "pointer" : "default",
                    transition: "all .15s",
                  }}>
                    <div style={{ fontSize: 32, marginBottom: 4, filter: unlocked ? "none" : "grayscale(1)" }}>
                      {unlocked ? av.emoji : "?"}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: unlocked ? C.text : C.textMuted, marginBottom: 3 }}>
                      {av.name[lang]}
                    </div>
                    <span style={{
                      fontSize: 10, padding: "1px 6px", borderRadius: 4,
                      background: r.bg, color: r.text, fontWeight: 500,
                    }}>{r.label[lang]}</span>
                    {!unlocked && <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>Lv.{av.unlock}</div>}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Frames */}
          <Card className="f2">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
              {lang === "en" ? "Frames" : lang === "es" ? "Marcos" : "프레임"}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 10 }}>
              {FRAMES.map((fr) => {
                const unlocked = d.level >= fr.unlock;
                const isActive = d.frame === fr.id;
                return (
                  <div key={fr.id} style={{
                    padding: "12px 8px", borderRadius: 10, textAlign: "center",
                    background: isActive ? C.accentSoft : C.bgSoft,
                    border: `1.5px solid ${isActive ? C.accent : "transparent"}`,
                    opacity: unlocked ? 1 : 0.4,
                    cursor: unlocked ? "pointer" : "default",
                  }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
                      <AvatarDisplay emoji={currentAvatar?.emoji || "🦊"} frame={fr.id} size={36} />
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: unlocked ? C.text : C.textMuted }}>
                      {fr.name[lang]}
                    </div>
                    {!unlocked && <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>Lv.{fr.unlock}</div>}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bgSoft }}>
      <Nav lang={lang} setLang={setLang} onBack={onBack} />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px" }}>

        {/* Header with avatar and XP */}
        <div className="fi" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div onClick={() => setShowCollection(true)} style={{ cursor: "pointer", transition: "transform .15s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
              <AvatarDisplay emoji={currentAvatar?.emoji || "🦊"} frame={d.frame} size={48} />
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>{d.name}</h2>
              <p style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>{t.myProgress}</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div onClick={() => setShowCollection(true)} style={{ padding: "6px 12px", borderRadius: 20, background: C.purpleSoft, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.purple }}>Lv.{d.level}</span>
            </div>
            <div style={{ padding: "6px 12px", borderRadius: 20, background: C.orangeSoft, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.orange }}><CIcon name="fire" size={12} inline /> {d.streak}</span>
            </div>
          </div>
        </div>

        {/* Daily goal + Study button */}
        <Card className="f1" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: C.textSecondary }}>{t.dailyGoal}</p>
              <p style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{d.dailyDone}/{d.dailyGoal} {t.questionsToday}</p>
            </div>
            <Btn v="secondary" onClick={onJoinSession} style={{ padding: "10px 16px" }}>{t.joinSession}</Btn>
            <Btn onClick={() => onStudy()} style={{ padding: "10px 20px" }}>{t.studyNow}</Btn>
          </div>
          <div style={{ width: "100%", height: 10, background: C.bgSoft, borderRadius: 10, overflow: "hidden" }}>
            <div style={{
              width: `${Math.min(goalPct, 100)}%`, height: "100%", borderRadius: 10,
              background: goalPct >= 100 ? C.green : `linear-gradient(90deg, ${C.accent}, ${C.purple})`,
              transition: "width .5s ease",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontSize: 11, color: C.textMuted }}>{goalPct}%</span>
            <span style={{ fontSize: 11, color: C.textMuted }}>{d.xp} {t.xpPoints}</span>
          </div>
        </Card>

        {/* Next unlock teaser */}
        {(() => {
          const nextAvatar = AVATARS.find(a => a.unlock > d.level);
          const nextFrame = FRAMES.find(f => f.unlock > d.level);
          const next = nextAvatar && (!nextFrame || nextAvatar.unlock <= nextFrame.unlock) ? nextAvatar : nextFrame;
          if (!next) return null;
          const levelsLeft = next.unlock - d.level;
          const isAvatar = AVATARS.includes(next);
          return (
            <div className="f1" onClick={() => setShowCollection(true)} style={{
              padding: "12px 16px", borderRadius: 10, marginBottom: 16, cursor: "pointer",
              background: `linear-gradient(135deg, ${C.purpleSoft}, ${C.accentSoft})`,
              border: `1px solid ${C.purple}22`,
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <span style={{ fontSize: 28 }}>{isAvatar ? next.emoji : <CIcon name="art" size={16} inline />}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.purple }}>
                  {lang === "en" ? `Next unlock: ${next.name[lang]}` : lang === "es" ? `Próximo: ${next.name[lang]}` : `다음 잠금 해제: ${next.name[lang]}`}
                </div>
                <div style={{ fontSize: 12, color: C.textSecondary }}>
                  {lang === "en" ? `${levelsLeft} level${levelsLeft > 1 ? "s" : ""} away` : lang === "es" ? `Faltan ${levelsLeft} nivel${levelsLeft > 1 ? "es" : ""}` : `${levelsLeft}레벨 남음`}
                </div>
              </div>
              <span style={{ fontSize: 13, color: C.textMuted }}>→</span>
            </div>
          );
        })()}

        {/* Stats row */}
        <div className="f1" style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <Stat label={t.myRetention} value={`${d.retention}%`} color={retCol(d.retention)} />
          <Stat label={t.sessionsAttended} value={d.sessionsAttended} color={C.accent} />
          <Stat label={t.topicsLearned} value={d.topicsLearned} color={C.purple} />
        </div>

        {/* Weak topics — needs practice */}
        {weak.length > 0 && (
          <Card className="f2" style={{ marginBottom: 16, borderLeft: `3px solid ${C.red}` }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}><CIcon name="target" size={14} inline /> {t.weakTopics}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {weak.map((tp, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, background: C.redSoft }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{tp.name[lang]}</div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{tp.lastDays} {t.daysAgo} · {tp.sessions} sessions</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, fontFamily: MONO, color: C.red }}>{tp.retention}%</span>
                    <Btn v="accent" onClick={() => onStudy(tp.name)} style={{ fontSize: 12, padding: "5px 10px" }}>{t.practiceMore}</Btn>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* All topics */}
        <Card className="f2" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{t.myTopics}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {d.topics.sort((a, b) => a.retention - b.retention).map((tp, i) => {
              const col = retCol(tp.retention);
              const statusLabel = tp.status === "strong" ? t.strong : tp.status === "medium" ? t.medium : t.weak;
              const statusBg = tp.status === "strong" ? C.greenSoft : tp.status === "medium" ? C.orangeSoft : C.redSoft;
              const statusCol = tp.status === "strong" ? C.green : tp.status === "medium" ? C.orange : C.red;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, background: C.bgSoft }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: col, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{tp.name[lang]}</div>
                    <Bar value={tp.retention} max={100} color={col} h={4} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: statusBg, color: statusCol, fontWeight: 500 }}>{statusLabel}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, fontFamily: MONO, color: col, width: 36, textAlign: "right" }}>{tp.retention}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="f3">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{t.recentActivity}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {d.activity.map((a, i) => {
              const pct = Math.round((a.score / a.total) * 100);
              const col = retCol(pct);
              const icon = a.type === "warmup" ? "warmup" : a.type === "exitTicket" ? "ticket" : "book";
              const label = a.type === "warmup" ? t.warmup : a.type === "exitTicket" ? t.exitTicket : t.studyMode;
              const timeLabel = a.time < 60 ? `${a.time} ${t.minutesAgo}` : `${Math.round(a.time / 60)} ${t.hoursAgo}`;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: i % 2 === 0 ? C.bgSoft : "transparent" }}>
                  <span style={{ fontSize: 18 }}><CIcon name={icon} size={16} inline /></span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{a.topic[lang]}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>{label} · {timeLabel}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 14, fontWeight: 700, fontFamily: MONO, color: col }}>{a.score}/{a.total}</span>
                    <div style={{ fontSize: 11, color: C.textMuted }}>{pct}% {t.accuracy}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

      </div>
    </div>
  );
};

// ─── Study Mode (autonomous practice) ───────────────
const StudyMode = ({ t, lang, setLang, onBack }) => {
  const questions = STUDY_QS[lang] || STUDY_QS.en;
  const [cur, setCur] = useState(0);
  const [ans, setAns] = useState([]);
  const [sel, setSel] = useState(null);
  const [show, setShow] = useState(false);
  const [done, setDone] = useState(false);

  const q = questions[cur];
  const last = cur === questions.length - 1;

  const pick = (i) => { if (show) return; setSel(i); setShow(true); setAns(p => [...p, i]); };
  const nxt = () => {
    if (last) { setDone(true); return; }
    setCur(c => c + 1); setSel(null); setShow(false);
  };

  if (done) {
    const correct = ans.filter((a, i) => a === questions[i]?.correct).length;
    const pct = Math.round((correct / questions.length) * 100);
    const col = retCol(pct);
    const msg = pct >= 90 ? t.onFire : pct >= 70 ? t.keepGoing : pct >= 50 ? t.almostThere : t.goodStart;
    const xpEarned = correct * 10;
    return (
      <div style={{ minHeight: "100vh", background: C.bgSoft, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <Card className="fi" style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{pct >= 70 ? <CIcon name="check" size={32} inline /> : pct >= 50 ? <CIcon name="levelup" size={32} inline /> : <CIcon name="book" size={32} inline />}</div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{t.studyComplete}</h2>
          <p style={{ color: C.textSecondary, fontSize: 14, marginBottom: 16 }}>{msg}</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 20, padding: "14px 0", borderTop: `1px solid ${C.border}` }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: col, fontFamily: MONO }}>{correct}/{questions.length}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>{t.questionsRight}</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: C.purple, fontFamily: MONO }}>+{xpEarned}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>{t.xpPoints}</div>
            </div>
          </div>
        </Card>
        <Btn v="secondary" onClick={onBack} style={{ marginTop: 16 }}>{t.backToDash}</Btn>
      </div>
    );
  }

  const ok = sel === q?.correct;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      <Nav lang={lang} setLang={setLang} onBack={onBack}
        right={<span style={{ fontSize: 13, color: C.textSecondary }}>{t.studyMode}</span>}
      />
      <Bar value={cur + 1} max={questions.length} h={3} />
      <div className="fi" key={cur} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 20px", maxWidth: 480, margin: "0 auto", width: "100%" }}>
        <p style={{ fontSize: 12, color: C.textMuted, textAlign: "center", marginBottom: 6 }}>
          {t.questionOf.replace("{current}", cur + 1).replace("{total}", questions.length)}
        </p>
        <h2 style={{ fontSize: 19, fontWeight: 600, textAlign: "center", marginBottom: 28, lineHeight: 1.5 }}>{q.q}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {q.options.map((o, i) => {
            let bg = OPT_C[i].bg, op = 1;
            if (show) { bg = i === q.correct ? C.green : i === sel ? C.red : "#ccc"; op = i === q.correct || i === sel ? 1 : .3; }
            return <button key={i} onClick={() => pick(i)} disabled={show} style={{ padding: "16px 14px", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#fff", background: bg, opacity: op, transition: "all .2s", lineHeight: 1.3, minHeight: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>{o}</button>;
          })}
        </div>
        {show && <div className="fi" style={{ textAlign: "center", marginTop: 24 }}>
          <span style={{ display: "inline-block", padding: "8px 16px", borderRadius: 8, background: ok ? C.greenSoft : C.redSoft, color: ok ? C.green : C.red, fontSize: 14, fontWeight: 600, marginBottom: 14 }}>{ok ? "✓ " + t.correct : "✗ " + t.incorrect}</span>
          <br /><Btn onClick={nxt}>{last ? t.finish : t.nextQuestion}</Btn>
        </div>}
      </div>
    </div>
  );
};

// ─── App ────────────────────────────────────────────
export default function App() {
  const [lang, setLang] = useState("en");
  const [scr, setScr] = useState("home");
  const [ses, setSes] = useState(null);
  const [stu, setStu] = useState([]);
  const [sAns, setSAns] = useState([]);
  const t = i18n[lang];

  const simStu = useCallback(() => {
    const n = ["Sofía M.", "Carlos R.", "Minjun K.", "Emma W.", "Diego L.", "Yuna P.", "Lucas G.", "Valentina S."];
    let i = 0;
    const iv = setInterval(() => { if (i < n.length) { setStu(p => [...p, { name: n[i], answers: [] }]); i++; } else clearInterval(iv); }, 700);
    return () => clearInterval(iv);
  }, []);

  const launch = (d) => { setSes({ ...d, pin: genPIN() }); setStu([]); setScr("lobby"); setTimeout(() => simStu(), 400); };
  const start = () => {
    setScr("live");
    ses.questions.forEach((q, qi) => { stu.forEach((_, si) => {
      setTimeout(() => { setStu(p => { const u = [...p]; if (u[si]) { const a = [...(u[si].answers || [])]; a[qi] = Math.random() > .3 ? q.correct : (q.correct + 1) % 4; u[si] = { ...u[si], answers: a }; } return u; }); }, (qi + 1) * 1800 + si * 400 + Math.random() * 800);
    }); });
  };
  const home = () => { setScr("home"); setSes(null); setStu([]); setSAns([]); };

  return (
    <>
      <style>{css}</style>
      {scr === "home" && <Home t={t} lang={lang} setLang={setLang} setRole={r => setScr(r === "teacher" ? "create" : "stuDash")} />}
      {scr === "create" && <Create t={t} lang={lang} setLang={setLang} onLaunch={launch} onBack={home} onDash={() => setScr("dash")} />}
      {scr === "dash" && <Dash t={t} lang={lang} setLang={setLang} onBack={() => setScr("create")} onCreate={() => setScr("create")} />}
      {scr === "lobby" && <Lobby t={t} lang={lang} setLang={setLang} session={ses} students={stu} onStart={start} onBack={home} />}
      {scr === "live" && <Live t={t} lang={lang} setLang={setLang} session={ses} students={stu} onEnd={home} />}
      {scr === "join" && <Join t={t} lang={lang} setLang={setLang} onJoin={(p, n) => { setSes({ pin: p, topic: "Demo", questions: SQ[lang] || SQ.en, sessionType: "warmup" }); setScr("quiz"); }} onBack={home} />}
      {scr === "stuDash" && <StudentDash t={t} lang={lang} setLang={setLang} onBack={home} onStudy={() => setScr("study")} onJoinSession={() => setScr("join")} />}
      {scr === "study" && <StudyMode t={t} lang={lang} setLang={setLang} onBack={() => setScr("stuDash")} />}
      {scr === "quiz" && ses && <Quiz t={t} lang={lang} setLang={setLang} questions={ses.questions} onFinish={a => { setSAns(a); setScr("results"); }} />}
      {scr === "results" && ses && <Results t={t} questions={ses.questions} answers={sAns} onBack={home} />}
    </>
  );
}
