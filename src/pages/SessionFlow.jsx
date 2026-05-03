import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { generateQuestions, SUPPORTED_FILES } from "../lib/ai";
import { processSessionResults, getReviewSuggestions, getClassRetentionOverview } from "../lib/spaced-repetition";
import { CIcon } from "../components/Icons";

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
const GRADES = ["6th", "7th", "8th", "9th", "10th", "11th", "12th"];

// ─── i18n ───────────────────────────────────────────
const i18n = {
  en: {
    pageTitle: "Sessions", yourClasses: "Your Classes", yourClassesSub: "Select a class to create a session, or create a new one.",
    createNewClass: "Create new class", className: "Class name", classPlaceholder: "e.g. 8th Grade History",
    grade: "Grade", subject: "Subject", createClass: "Create Class", creating: "Creating...",
    suggestedToday: "Suggested for today", reviewNow: "Review now", today: "today", daysAgo: "d ago", more: "more",
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
    cancel: "Cancel", startQuiz: "Start Quiz",
    liveResults: "Live Results", endSession: "End Session", students: "students", average: "average",
    waitingResponses: "Waiting for responses...", loadingClasses: "Loading classes...", loading: "Loading...",
    fileTooLarge: "File too large. Max",
    editClass: "Edit", deleteClass: "Delete", deleteConfirm: "Delete this class? This cannot be undone.",
    confirmDelete: "Yes, delete", cancelDelete: "Cancel", saveClass: "Save", newSessionBtn: "New session",
    editingClass: "Edit class", students: "students",
  },
  es: {
    pageTitle: "Sesiones", yourClasses: "Tus Clases", yourClassesSub: "Selecciona una clase para crear una sesión, o crea una nueva.",
    createNewClass: "Crear nueva clase", className: "Nombre de la clase", classPlaceholder: "ej. Historia 8° Grado",
    grade: "Grado", subject: "Materia", createClass: "Crear Clase", creating: "Creando...",
    suggestedToday: "Sugerido para hoy", reviewNow: "Repasar ahora", today: "hoy", daysAgo: "d atrás", more: "más",
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
    cancel: "Cancelar", startQuiz: "Iniciar Quiz",
    liveResults: "Resultados en Vivo", endSession: "Terminar Sesión", students: "estudiantes", average: "promedio",
    waitingResponses: "Esperando respuestas...", loadingClasses: "Cargando clases...", loading: "Cargando...",
    fileTooLarge: "Archivo muy grande. Máx",
    editClass: "Editar", deleteClass: "Eliminar", deleteConfirm: "¿Eliminar esta clase? No se puede deshacer.",
    confirmDelete: "Sí, eliminar", cancelDelete: "Cancelar", saveClass: "Guardar", newSessionBtn: "Nueva sesión",
    editingClass: "Editar clase", students: "estudiantes",
  },
  ko: {
    pageTitle: "세션", yourClasses: "내 수업", yourClassesSub: "수업을 선택하여 세션을 만들거나 새 수업을 만드세요.",
    createNewClass: "새 수업 만들기", className: "수업 이름", classPlaceholder: "예: 중2 역사",
    grade: "학년", subject: "과목", createClass: "수업 만들기", creating: "생성 중...",
    suggestedToday: "오늘 추천 복습", reviewNow: "지금 복습", today: "오늘", daysAgo: "일 전", more: "더보기",
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
    cancel: "취소", startQuiz: "퀴즈 시작",
    liveResults: "실시간 결과", endSession: "세션 종료", students: "학생", average: "평균",
    waitingResponses: "응답 대기 중...", loadingClasses: "수업 로딩 중...", loading: "로딩...",
    fileTooLarge: "파일이 너무 큽니다. 최대",
    editClass: "편집", deleteClass: "삭제", deleteConfirm: "이 수업을 삭제하시겠습니까? 되돌릴 수 없습니다.",
    confirmDelete: "네, 삭제", cancelDelete: "취소", saveClass: "저장", newSessionBtn: "새 세션",
    editingClass: "수업 편집", students: "학생",
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
  const [editing, setEditing] = useState(null); // class id being edited
  const [editName, setEditName] = useState("");
  const [editGrade, setEditGrade] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [deleting, setDeleting] = useState(null); // class id confirming delete

  useEffect(() => { loadClasses(); }, [userId]);

  const loadClasses = async () => {
    const { data } = await supabase.from("classes").select("*").eq("teacher_id", userId).order("created_at", { ascending: false });
    setClasses(data || []);
    setLoading(false);
    if (data) {
      for (const cls of data) {
        const overview = await getClassRetentionOverview(cls.id);
        setRetention(prev => ({ ...prev, [cls.id]: overview }));
        const sug = await getReviewSuggestions(cls.id);
        setSuggestions(prev => ({ ...prev, [cls.id]: sug }));
      }
    }
  };

  const createClass = async () => {
    if (!name || !grade || !subject) return;
    setCreating(true);
    const code = subject.slice(0, 4).toUpperCase() + "-" + grade.replace(/[^0-9]/g, "") + String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const { data, error } = await supabase.from("classes").insert({ teacher_id: userId, name, grade, subject, class_code: code }).select().single();
    if (!error && data) { setClasses(prev => [data, ...prev]); setName(""); setGrade(""); setSubject(""); }
    setCreating(false);
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

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h2 style={{ fontFamily: "'Outfit'", fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{t.yourClasses}</h2>
      <p style={{ fontSize: 14, color: C.textSecondary, marginBottom: 20 }}>{t.yourClassesSub}</p>

      {/* Review suggestions */}
      {Object.entries(suggestions).map(([classId, sug]) => {
        if (!sug || sug.length === 0) return null;
        const cls = classes.find(c => c.id === classId);
        if (!cls) return null;
        return (
          <Card key={`sug-${classId}`} style={{ marginBottom: 16, padding: 16, borderLeft: `3px solid ${C.orange}`, background: C.orangeSoft + "33" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.orange, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <CIcon name="clock" size={16} inline /> {t.suggestedToday} — {cls.name}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {sug.slice(0, 3).map((st, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: 6, background: C.bg }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{st.topic}</span>
                    <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 8 }}>{st.days_since_review === 0 ? t.today : `${st.days_since_review}${t.daysAgo}`}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, fontFamily: MONO, color: retCol(st.current_retention), minWidth: 36, textAlign: "right" }}>{st.current_retention}%</span>
                </div>
              ))}
            </div>
            <Btn onClick={() => onClassReady(cls, sug[0]?.topic)} style={{ marginTop: 10, fontSize: 12, padding: "6px 14px" }}>{t.reviewNow}</Btn>
          </Card>
        );
      })}

      {/* Class list */}
      {classes.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {classes.map(cls => {
            const ret = retention[cls.id];
            const isEditing = editing === cls.id;
            const isDeleting = deleting === cls.id;

            // Delete confirmation
            if (isDeleting) return (
              <Card key={cls.id} style={{ padding: 16, borderLeft: `3px solid ${C.red}` }}>
                <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>{t.deleteConfirm}</p>
                <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 14 }}>{cls.name} · {cls.grade} · {cls.subject}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setDeleting(null)} style={{ flex: 1, padding: "8px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: C.bg, color: C.textSecondary, border: `1px solid ${C.border}`, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{t.cancelDelete}</button>
                  <button onClick={() => doDelete(cls.id)} style={{ flex: 1, padding: "8px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: C.red, color: "#fff", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{t.confirmDelete}</button>
                </div>
              </Card>
            );

            // Edit form
            if (isEditing) return (
              <Card key={cls.id} style={{ padding: 16, borderLeft: `3px solid ${C.accent}` }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.accent, marginBottom: 12 }}>{t.editingClass}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input value={editName} onChange={e => setEditName(e.target.value)} className="cl-input" style={inp} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <select value={editGrade} onChange={e => setEditGrade(e.target.value)} className="cl-select" style={sel}>{GRADES.map(g => <option key={g}>{g}</option>)}</select>
                    <select value={editSubject} onChange={e => setEditSubject(e.target.value)} className="cl-select" style={sel}>{SUBJECTS.map(s => <option key={s}>{s}</option>)}</select>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setEditing(null)} style={{ flex: 1, padding: "8px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: C.bg, color: C.textSecondary, border: `1px solid ${C.border}`, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{t.cancelDelete}</button>
                    <Btn onClick={() => saveEdit(cls.id)} style={{ flex: 1, padding: "8px", fontSize: 13 }}>{t.saveClass}</Btn>
                  </div>
                </div>
              </Card>
            );

            // Normal card
            return (
              <Card key={cls.id} style={{ padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{cls.name}</div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{cls.grade} · {cls.subject}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {ret && ret.topics.length > 0 && <span style={{ fontSize: 14, fontWeight: 700, fontFamily: MONO, color: retCol(ret.average) }}>{ret.average}%</span>}
                    <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: C.accent, padding: "3px 7px", background: C.accentSoft, borderRadius: 5 }}>{cls.class_code}</span>
                  </div>
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
                  <Btn onClick={() => onClassReady(cls)} style={{ flex: 1, fontSize: 13, padding: "7px 12px" }}>
                    <CIcon name="rocket" size={14} inline /> {t.newSessionBtn}
                  </Btn>
                  <button className="cl-action" onClick={(e) => startEdit(cls, e)} style={{ padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, background: C.bg, color: C.textSecondary, border: `1px solid ${C.border}`, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{t.editClass}</button>
                  <button className="cl-action-delete" onClick={(e) => confirmDelete(cls.id, e)} style={{ padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, background: C.bg, color: C.red, border: `1px solid ${C.redSoft}`, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{t.deleteClass}</button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create class */}
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
          <CIcon name="plus" size={18} inline /> {t.createNewClass}
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={t.classPlaceholder} className="cl-input" style={inp} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <select value={grade} onChange={e => setGrade(e.target.value)} className="cl-select" style={sel}><option value="">{t.grade}...</option>{GRADES.map(g => <option key={g}>{g}</option>)}</select>
            <select value={subject} onChange={e => setSubject(e.target.value)} className="cl-select" style={sel}><option value="">{t.subject}...</option>{SUBJECTS.map(s => <option key={s}>{s}</option>)}</select>
          </div>
          <Btn full onClick={createClass} disabled={!name || !grade || !subject || creating}>{creating ? t.creating : t.createClass}</Btn>
        </div>
      </Card>
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
function CreateSession({ cls, userId, onSessionCreated, onBack, t, lang, reviewTopic }) {
  const [topic, setTopic] = useState(reviewTopic || "");
  const [keyPoints, setKeyPoints] = useState("");
  const [sessionType, setSessionType] = useState("warmup");
  const [activityType, setActivityType] = useState("mcq");
  const [numQuestions, setNumQuestions] = useState(5);
  const [customNum, setCustomNum] = useState("");
  const [step, setStep] = useState("form");
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState("");
  const [inputMode, setInputMode] = useState("text");
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [deckSaved, setDeckSaved] = useState(false);
  const fileRef = useRef(null);

  // Auto-generate if reviewTopic is provided
  const [autoGenerate, setAutoGenerate] = useState(!!reviewTopic);

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
      const qs = await generateQuestions({ topic, keyPoints, grade: cls.grade, subject: cls.subject, activityType, numQuestions, language: lang, file: inputMode === "file" ? file : null });
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
      author_id: userId, title: topic, description: keyPoints || "",
      subject: cls.subject, grade: cls.grade, language: lang,
      questions: questions.map(q => ({ ...q, type: activityType })),
      tags: [cls.subject.toLowerCase(), activityType], is_public: false,
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
      <button className="cl-back" onClick={() => setStep("form")} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: C.accent, background: C.accentSoft, border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif", marginBottom: 16 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12L11 6M5 12L11 18" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        {t.edit}
      </button>
      <h2 style={{ fontFamily: "'Outfit'", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{topic}</h2>
      <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 16 }}>{questions.length} {t.questions} · {ACTIVITY_TYPES.find(a => a.id === activityType)?.label[lang] || activityType} · {cls.name}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {questions.map((q, i) => (
          <Card key={i} style={{ padding: 16 }}>
            <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>Q{i + 1}</p>
            <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 10, lineHeight: 1.4 }}>{q.q}</p>

            {/* MCQ */}
            {q.options && activityType === "mcq" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {q.options.map((o, j) => (
                  <div key={j} className="cl-option" style={{ padding: "7px 10px", borderRadius: 6, fontSize: 13, background: j === q.correct ? C.greenSoft : C.bgSoft, color: j === q.correct ? C.green : C.textSecondary, fontWeight: j === q.correct ? 500 : 400, border: `1px solid ${j === q.correct ? C.green + "33" : "transparent"}` }}>{o}</div>
                ))}
              </div>
            )}

            {/* True/False */}
            {activityType === "tf" && (
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ padding: "6px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600, background: q.correct === true ? C.greenSoft : C.bgSoft, color: q.correct === true ? C.green : C.textMuted, border: `1px solid ${q.correct === true ? C.green + "33" : C.border}` }}>True</div>
                <div style={{ padding: "6px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600, background: q.correct === false ? C.greenSoft : C.bgSoft, color: q.correct === false ? C.green : C.textMuted, border: `1px solid ${q.correct === false ? C.green + "33" : C.border}` }}>False</div>
              </div>
            )}

            {/* Fill in the Blank */}
            {activityType === "fill" && q.answer && (
              <div style={{ padding: "6px 12px", borderRadius: 6, background: C.greenSoft, fontSize: 13, color: C.green, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <CIcon name="check" size={12} inline /> {q.answer}
              </div>
            )}

            {/* Ordering */}
            {activityType === "order" && q.items && (
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
            {activityType === "match" && q.pairs && (
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

            {/* Fallback for MCQ-like with options but different activityType */}
            {q.options && activityType !== "mcq" && activityType !== "tf" && !q.items && !q.pairs && !q.answer && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {q.options.map((o, j) => (
                  <div key={j} className="cl-option" style={{ padding: "7px 10px", borderRadius: 6, fontSize: 13, background: j === q.correct ? C.greenSoft : C.bgSoft, color: j === q.correct ? C.green : C.textSecondary, fontWeight: j === q.correct ? 500 : 400, border: `1px solid ${j === q.correct ? C.green + "33" : "transparent"}` }}>{o}</div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <Btn v="secondary" onClick={handleGenerate} style={{ flex: 1 }}><CIcon name="refresh" size={14} inline /> {t.regenerate}</Btn>
        <Btn onClick={handleLaunch} style={{ flex: 2 }}><CIcon name="rocket" size={16} inline /> {t.launchSession}</Btn>
      </div>
      <div style={{ marginTop: 10 }}>
        <button className="cl-pill" onClick={handleSaveAsDeck} disabled={deckSaved} style={{ width: "100%", padding: 10, borderRadius: 8, fontSize: 13, fontWeight: 500, background: deckSaved ? C.greenSoft : C.bgSoft, color: deckSaved ? C.green : C.textSecondary, border: `1px solid ${deckSaved ? C.green + "33" : C.border}`, cursor: "pointer", fontFamily: "'Outfit',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          {deckSaved ? <><CIcon name="check" size={14} inline /> {t.deckSaved}</> : <><CIcon name="book" size={14} inline /> {t.saveAsDeck}</>}
        </button>
      </div>
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
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.numQuestions}</label>
          <div style={{ display: "flex", gap: 4 }}>
            {[3, 5, 10, 15, 20].map(n => (
              <button key={n} className="cl-num" onClick={() => { setNumQuestions(n); setCustomNum(""); }} style={{ flex: 1, padding: 8, borderRadius: 6, fontSize: 14, fontWeight: 600, background: numQuestions === n && !customNum ? C.accentSoft : C.bg, color: numQuestions === n && !customNum ? C.accent : C.textMuted, border: `1px solid ${numQuestions === n && !customNum ? C.accent + "33" : C.border}`, fontFamily: MONO, cursor: "pointer" }}>{n}</button>
            ))}
            <input className="cl-input" value={customNum} onChange={e => { const v = e.target.value.replace(/\D/g, ""); setCustomNum(v); if (v) setNumQuestions(parseInt(v) || 5); }} placeholder="#" style={{ ...inp, width: 52, flex: "none", textAlign: "center", fontFamily: MONO, fontWeight: 600, fontSize: 14, padding: 8 }} />
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

// ─── Main Export ─────────────────────────────────────
export default function SessionFlow({ lang = "en", setLang }) {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState("classes");
  const [selectedClass, setSelectedClass] = useState(null);
  const [session, setSession] = useState(null);
  const [reviewTopic, setReviewTopic] = useState(null);
  const t = i18n[lang] || i18n.en;

  useEffect(() => { supabase.auth.getUser().then(({ data: { user } }) => setUser(user)); }, []);

  if (!user) return <p style={{ padding: 40, color: C.textMuted, textAlign: "center" }}>{t.loading}</p>;

  return (
    <div style={{ padding: "28px 20px" }}>
      <style>{interactiveCSS}</style>
      <PageHeader title={t.pageTitle} icon="pin" lang={lang} setLang={setLang || (() => {})} />

      {step === "classes" && <ClassSetup userId={user.id} onClassReady={(cls, topic) => { setSelectedClass(cls); setReviewTopic(topic || null); setStep("create"); }} t={t} />}
      {step === "create" && selectedClass && <CreateSession cls={selectedClass} userId={user.id} onSessionCreated={(s) => { setSession(s); setStep("lobby"); }} onBack={() => { setStep("classes"); setReviewTopic(null); }} t={t} lang={lang} reviewTopic={reviewTopic} />}
      {step === "lobby" && session && <SessionLobby session={session} onStart={() => setStep("live")} onEnd={() => { setSession(null); setStep("classes"); }} t={t} />}
      {step === "live" && session && <LiveResults session={session} onEnd={() => { setSession(null); setStep("classes"); }} t={t} />}
    </div>
  );
}
