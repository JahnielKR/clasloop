import { CIcon } from "../components/Icons";
import { useState, useCallback } from "react";

const C = {
  bg: "#FFFFFF", bgSoft: "#F7F7F5", accent: "#2383E2", accentSoft: "#E8F0FE",
  green: "#0F7B6C", greenSoft: "#EEFBF5", orange: "#D9730D", orangeSoft: "#FFF3E0",
  red: "#E03E3E", redSoft: "#FDECEC", purple: "#6940A5", purpleSoft: "#F3EEFB",
  text: "#191919", textSecondary: "#6B6B6B", textMuted: "#9B9B9B",
  border: "#E8E8E4", shadow: "0 1px 3px rgba(0,0,0,0.04)",
};
const MONO = "'JetBrains Mono', monospace";
const OPT_C = ["#2383E2", "#0F7B6C", "#D9730D", "#6940A5"];

const ACTIVITY_TYPES = [
  { id: "mcq", icon: "mcq", label: { en: "Multiple Choice", es: "Opción Múltiple", ko: "객관식" } },
  { id: "tf", icon: "truefalse", label: { en: "True / False", es: "Verdadero / Falso", ko: "참 / 거짓" } },
  { id: "fill", icon: "fillblank", label: { en: "Fill in the Blank", es: "Completar Espacio", ko: "빈칸 채우기" } },
  { id: "order", icon: "ordering", label: { en: "Put in Order", es: "Ordenar", ko: "순서 맞추기" } },
  { id: "match", icon: "matching", label: { en: "Matching Pairs", es: "Emparejar", ko: "짝 맞추기" } },
];

const i18n = {
  en: {
    title: "AI Question Generator",
    subtitle: "Generate real questions with Claude AI",
    topic: "Topic",
    topicPlaceholder: "e.g. French Revolution, Photosynthesis...",
    keyPoints: "Key points",
    keyPointsPlaceholder: "Main concepts covered (one per line)",
    grade: "Grade",
    subject: "Subject",
    selectGrade: "Select...",
    selectSubject: "Select...",
    activityType: "Activity type",
    numQuestions: "Number of questions",
    language: "Question language",
    generate: "Generate with AI",
    generating: "AI is thinking...",
    generatingDesc: "Claude is creating questions about",
    preview: "Preview",
    regenerate: "↻ Regenerate",
    useThese: "Use these questions",
    editQuestion: "Edit",
    deleteQuestion: "Remove",
    addQuestion: "+ Add question",
    question: "Question",
    correct: "Correct answer",
    options: "Options",
    statement: "Statement",
    answer: "Answer",
    items: "Items (in correct order)",
    leftColumn: "Left column",
    rightColumn: "Right column",
    error: "Something went wrong. Please try again.",
    tokenCost: "Estimated cost",
    subjects: ["Math", "Science", "History", "Language", "Geography", "Art", "Music", "Other"],
    grades: ["6th", "7th", "8th", "9th", "10th", "11th", "12th"],
    langs: ["English", "Spanish", "Korean"],
    warmup: "Warmup",
    exitTicket: "Exit Ticket",
    sessionType: "Session type",
    back: "← Back",
    looksGood: "Looks good!",
    saved: "Questions saved!",
  },
  es: {
    title: "Generador de Preguntas IA",
    subtitle: "Genera preguntas reales con Claude IA",
    topic: "Tema",
    topicPlaceholder: "ej. Revolución Francesa, Fotosíntesis...",
    keyPoints: "Puntos clave",
    keyPointsPlaceholder: "Conceptos principales (uno por línea)",
    grade: "Grado",
    subject: "Materia",
    selectGrade: "Seleccionar...",
    selectSubject: "Seleccionar...",
    activityType: "Tipo de actividad",
    numQuestions: "Número de preguntas",
    language: "Idioma de preguntas",
    generate: "Generar con IA",
    generating: "La IA está pensando...",
    generatingDesc: "Claude está creando preguntas sobre",
    preview: "Vista previa",
    regenerate: "↻ Regenerar",
    useThese: "Usar estas preguntas",
    editQuestion: "Editar",
    deleteQuestion: "Eliminar",
    addQuestion: "+ Agregar pregunta",
    question: "Pregunta",
    correct: "Respuesta correcta",
    options: "Opciones",
    statement: "Afirmación",
    answer: "Respuesta",
    items: "Elementos (en orden correcto)",
    leftColumn: "Columna izquierda",
    rightColumn: "Columna derecha",
    error: "Algo salió mal. Intenta de nuevo.",
    tokenCost: "Costo estimado",
    subjects: ["Matemáticas", "Ciencias", "Historia", "Lengua", "Geografía", "Arte", "Música", "Otra"],
    grades: ["6°", "7°", "8°", "9°", "10°", "11°", "12°"],
    langs: ["Inglés", "Español", "Coreano"],
    warmup: "Warmup",
    exitTicket: "Exit Ticket",
    sessionType: "Tipo de sesión",
    back: "← Volver",
    looksGood: "¡Se ve bien!",
    saved: "¡Preguntas guardadas!",
  },
  ko: {
    title: "AI 문제 생성기",
    subtitle: "Claude AI로 실제 문제를 생성하세요",
    topic: "주제",
    topicPlaceholder: "예: 프랑스 혁명, 광합성...",
    keyPoints: "핵심 포인트",
    keyPointsPlaceholder: "다룬 주요 개념 (줄당 하나)",
    grade: "학년",
    subject: "과목",
    selectGrade: "선택...",
    selectSubject: "선택...",
    activityType: "활동 유형",
    numQuestions: "문제 수",
    language: "문제 언어",
    generate: "AI로 생성",
    generating: "AI가 생각 중...",
    generatingDesc: "Claude가 문제를 만들고 있습니다:",
    preview: "미리보기",
    regenerate: "↻ 재생성",
    useThese: "이 문제 사용",
    editQuestion: "편집",
    deleteQuestion: "삭제",
    addQuestion: "+ 문제 추가",
    question: "문제",
    correct: "정답",
    options: "선택지",
    statement: "명제",
    answer: "답",
    items: "항목 (올바른 순서)",
    leftColumn: "왼쪽 열",
    rightColumn: "오른쪽 열",
    error: "문제가 발생했습니다. 다시 시도하세요.",
    tokenCost: "예상 비용",
    subjects: ["수학", "과학", "역사", "국어", "지리", "미술", "음악", "기타"],
    grades: ["중1", "중2", "중3", "고1", "고2", "고3", "대1"],
    langs: ["영어", "스페인어", "한국어"],
    warmup: "워밍업",
    exitTicket: "마무리 퀴즈",
    sessionType: "세션 유형",
    back: "← 뒤로",
    looksGood: "좋아 보여요!",
    saved: "문제가 저장되었습니다!",
  },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'DM Sans',sans-serif;background:${C.bgSoft};color:${C.text};-webkit-font-smoothing:antialiased}
  ::selection{background:${C.accentSoft};color:${C.accent}}
  input,select,textarea{font-family:'DM Sans',sans-serif;background:${C.bg};border:1px solid ${C.border};color:${C.text};padding:10px 14px;border-radius:8px;font-size:14px;width:100%;outline:none;transition:border-color .15s,box-shadow .15s}
  input:focus,select:focus,textarea:focus{border-color:${C.accent};box-shadow:0 0 0 3px ${C.accentSoft}}
  input::placeholder,textarea::placeholder{color:${C.textMuted}}
  textarea{resize:vertical;min-height:80px}
  select{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%239B9B9B' stroke-width='1.5'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:32px}
  button{font-family:'DM Sans',sans-serif;cursor:pointer;border:none;outline:none;transition:all .15s}
  button:active{transform:scale(.97)}
  @keyframes fi{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  @keyframes dots{0%{content:"."}33%{content:".."}66%{content:"..."}}
  .fi{animation:fi .3s ease-out both}
  .f1{animation:fi .3s ease-out .05s both}
  .f2{animation:fi .3s ease-out .1s both}
`;

const Logo = ({ s = 20 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{ width: s+4, height: s+4, borderRadius: 7, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={s*.6} height={s*.6} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="1.8"/><path d="M12 8v4l2.5 2.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </div>
    <span style={{ fontSize: s*.75, fontWeight: 700, letterSpacing: "-.03em" }}>clasloop</span>
  </div>
);

const LangSw = ({ lang, setLang }) => (
  <div style={{ display: "flex", gap: 2, background: C.bgSoft, borderRadius: 8, padding: 3, border: `1px solid ${C.border}` }}>
    {[["en","EN"],["es","ES"],["ko","한"]].map(([c,l]) => (
      <button key={c} onClick={() => setLang(c)} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: lang===c?C.bg:"transparent", color: lang===c?C.text:C.textMuted }}>{l}</button>
    ))}
  </div>
);

// ─── Prompt Builder ─────────────────────────────────
function buildPrompt({ topic, keyPoints, grade, subject, activityType, numQuestions, questionLang }) {
  const langMap = { en: "English", es: "Spanish", ko: "Korean" };
  const typeInstructions = {
    mcq: `Generate multiple choice questions with exactly 4 options each. Mark the correct answer index (0-3).
Format: { "q": "question text", "options": ["A", "B", "C", "D"], "correct": 0 }`,
    tf: `Generate true/false statements. Mix true and false statements roughly equally.
Format: { "q": "statement text", "correct": true/false }`,
    fill: `Generate fill-in-the-blank questions. Use _____ to mark the blank in the question.
Format: { "q": "The _____ is the powerhouse of the cell.", "answer": "mitochondria" }`,
    order: `Generate one ordering/sequence question with 4-6 items that must be put in the correct chronological or logical order.
Format: { "q": "Put these events in order:", "items": ["First event", "Second event", "Third event", "Fourth event"] }`,
    match: `Generate matching pairs (4-5 pairs). Left items should be matched with right items.
Format: { "q": "Match the dates with events:", "pairs": [{"left": "1789", "right": "Storming of the Bastille"}, ...] }`,
  };

  return `You are Clasloop, an AI assistant for teachers that generates review questions for spaced repetition.

Generate ${numQuestions} ${activityType === "order" || activityType === "match" ? "question(s)" : "questions"} about the following topic:

Topic: ${topic}
${keyPoints ? `Key points covered:\n${keyPoints}` : ""}
Grade level: ${grade}
Subject: ${subject}

${typeInstructions[activityType]}

IMPORTANT RULES:
- Write all questions in ${langMap[questionLang]}
- Questions must be appropriate for ${grade} grade level
- Questions should test recall and understanding, not just recognition
- Vary difficulty: include some easy, some medium, some challenging
- Make questions specific to the topic and key points provided
- Do NOT include any explanations, just the JSON array

Respond with ONLY a valid JSON array of questions. No markdown, no backticks, no explanation. Just the raw JSON array.`;
}

// ─── API Call ───────────────────────────────────────
async function generateQuestions({ topic, keyPoints, grade, subject, activityType, numQuestions, questionLang }) {
  const prompt = buildPrompt({ topic, keyPoints, grade, subject, activityType, numQuestions, questionLang });

  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
    }),
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);

  const data = await response.json();
  const text = data.content
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("");

  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ─── Question Preview Components ────────────────────
const MCQPreview = ({ q, i }) => (
  <div style={{ marginTop: 8 }}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
      {q.options.map((o, j) => (
        <div key={j} style={{
          padding: "7px 10px", borderRadius: 6, fontSize: 13,
          background: j === q.correct ? C.greenSoft : C.bgSoft,
          border: `1px solid ${j === q.correct ? C.green + "33" : "transparent"}`,
          color: j === q.correct ? C.green : C.textSecondary,
          fontWeight: j === q.correct ? 500 : 400,
        }}>{o}</div>
      ))}
    </div>
  </div>
);

const TFPreview = ({ q }) => (
  <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
    <span style={{
      padding: "4px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600,
      background: q.correct ? C.greenSoft : C.bgSoft,
      color: q.correct ? C.green : C.textMuted,
      border: `1px solid ${q.correct ? C.green + "33" : C.border}`,
    }}>✓ True</span>
    <span style={{
      padding: "4px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600,
      background: !q.correct ? C.redSoft : C.bgSoft,
      color: !q.correct ? C.red : C.textMuted,
      border: `1px solid ${!q.correct ? C.red + "33" : C.border}`,
    }}>✗ False</span>
  </div>
);

const FillPreview = ({ q }) => (
  <div style={{ marginTop: 8, padding: "6px 12px", borderRadius: 6, background: C.greenSoft, fontSize: 13, color: C.green, fontWeight: 500 }}>
    Answer: {q.answer}
  </div>
);

const OrderPreview = ({ q }) => (
  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
    {q.items.map((item, j) => (
      <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, background: C.bgSoft, fontSize: 13 }}>
        <span style={{ width: 20, height: 20, borderRadius: 5, background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{j + 1}</span>
        {item}
      </div>
    ))}
  </div>
);

const MatchPreview = ({ q }) => (
  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
    {q.pairs.map((p, j) => (
      <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, background: C.bgSoft, fontSize: 13 }}>
        <span style={{ fontWeight: 600, color: C.accent, fontFamily: MONO }}>{p.left}</span>
        <span style={{ color: C.textMuted }}>→</span>
        <span style={{ color: C.textSecondary }}>{p.right}</span>
      </div>
    ))}
  </div>
);

const PREVIEW_MAP = { mcq: MCQPreview, tf: TFPreview, fill: FillPreview, order: OrderPreview, match: MatchPreview };

// ─── Main App ───────────────────────────────────────
export default function App() {
  const [lang, setLang] = useState("en");
  const [topic, setTopic] = useState("");
  const [keyPoints, setKeyPoints] = useState("");
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [activityType, setActivityType] = useState("mcq");
  const [numQuestions, setNumQuestions] = useState(5);
  const [questionLang, setQuestionLang] = useState("en");
  const [step, setStep] = useState("form"); // form | generating | preview | saved
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState(null);

  const d = i18n[lang];
  const canGenerate = topic.trim() && grade && subject;

  const handleGenerate = useCallback(async () => {
    setStep("generating");
    setError(null);
    try {
      const qs = await generateQuestions({ topic, keyPoints, grade, subject, activityType, numQuestions, questionLang });
      setQuestions(qs);
      setStep("preview");
    } catch (err) {
      console.error(err);
      setError(err.message);
      setStep("form");
    }
  }, [topic, keyPoints, grade, subject, activityType, numQuestions, questionLang]);

  const handleDelete = (idx) => setQuestions(q => q.filter((_, i) => i !== idx));

  const PreviewComponent = PREVIEW_MAP[activityType];

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: "100vh", background: C.bgSoft }}>
        <div style={{ padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: C.bg, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10 }}>
          <Logo /><LangSw lang={lang} setLang={setLang} />
        </div>

        <div style={{ maxWidth: 580, margin: "0 auto", padding: "28px 20px" }}>

          {/* ── Generating ── */}
          {step === "generating" && (
            <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div className="fi" style={{ textAlign: "center" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14, background: C.accentSoft,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 20px", animation: "pulse 1.5s infinite",
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
                </div>
                <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{d.generating}</p>
                <p style={{ fontSize: 14, color: C.textSecondary }}>{d.generatingDesc} <strong>{topic}</strong></p>
                <div style={{ marginTop: 20, display: "flex", gap: 4, justifyContent: "center" }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 8, height: 8, borderRadius: "50%", background: C.accent,
                      animation: `pulse 1s infinite ${i * .2}s`,
                    }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Form ── */}
          {step === "form" && (
            <>
              <div className="fi" style={{ marginBottom: 24 }}>
                <h1 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 26, fontWeight: 400, marginBottom: 4, letterSpacing: "-.01em" }}><CIcon name="brain" size={20} inline /> {d.title}</h1>
                <p style={{ fontSize: 14, color: C.textSecondary }}>{d.subtitle}</p>
              </div>

              {error && (
                <div className="fi" style={{ padding: "12px 16px", borderRadius: 8, background: C.redSoft, color: C.red, fontSize: 13, marginBottom: 16, border: `1px solid ${C.red}22` }}>
                  <CIcon name="warning" size={14} inline /> {d.error} <span style={{ fontSize: 11, color: C.textMuted, display: "block", marginTop: 4 }}>{error}</span>
                </div>
              )}

              <div className="f1" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Topic */}
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{d.topic} *</label>
                  <input value={topic} onChange={e => setTopic(e.target.value)} placeholder={d.topicPlaceholder} />
                </div>

                {/* Key points */}
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{d.keyPoints}</label>
                  <textarea value={keyPoints} onChange={e => setKeyPoints(e.target.value)} placeholder={d.keyPointsPlaceholder} />
                </div>

                {/* Grade + Subject */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{d.grade} *</label>
                    <select value={grade} onChange={e => setGrade(e.target.value)}>
                      <option value="">{d.selectGrade}</option>
                      {d.grades.map(g => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{d.subject} *</label>
                    <select value={subject} onChange={e => setSubject(e.target.value)}>
                      <option value="">{d.selectSubject}</option>
                      {d.subjects.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Activity type */}
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 8 }}>{d.activityType}</label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {ACTIVITY_TYPES.map(t => (
                      <button key={t.id} onClick={() => setActivityType(t.id)} style={{
                        padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                        background: activityType === t.id ? C.accentSoft : C.bg,
                        color: activityType === t.id ? C.accent : C.textSecondary,
                        border: `1px solid ${activityType === t.id ? C.accent + "33" : C.border}`,
                        display: "flex", alignItems: "center", gap: 6,
                      }}><CIcon name={t.icon} size={16} inline /> {t.label[lang]}</button>
                    ))}
                  </div>
                </div>

                {/* Num questions + Language */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{d.numQuestions}</label>
                    <div style={{ display: "flex", gap: 4 }}>
                      {[3, 5, 8, 10].map(n => (
                        <button key={n} onClick={() => setNumQuestions(n)} style={{
                          flex: 1, padding: "8px", borderRadius: 6, fontSize: 14, fontWeight: 600,
                          background: numQuestions === n ? C.accentSoft : C.bg,
                          color: numQuestions === n ? C.accent : C.textMuted,
                          border: `1px solid ${numQuestions === n ? C.accent + "33" : C.border}`,
                          fontFamily: MONO,
                        }}>{n}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{d.language}</label>
                    <div style={{ display: "flex", gap: 4 }}>
                      {[["en", "EN"], ["es", "ES"], ["ko", "한"]].map(([c, l]) => (
                        <button key={c} onClick={() => setQuestionLang(c)} style={{
                          flex: 1, padding: "8px", borderRadius: 6, fontSize: 13, fontWeight: 600,
                          background: questionLang === c ? C.accentSoft : C.bg,
                          color: questionLang === c ? C.accent : C.textMuted,
                          border: `1px solid ${questionLang === c ? C.accent + "33" : C.border}`,
                        }}>{l}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Cost estimate */}
                <div style={{ padding: "10px 14px", borderRadius: 8, background: C.bgSoft, fontSize: 12, color: C.textMuted, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>{d.tokenCost}</span>
                  <span style={{ fontFamily: MONO, fontWeight: 600, color: C.green }}>~$0.02</span>
                </div>
              </div>

              <div className="f2" style={{ marginTop: 24 }}>
                <button onClick={handleGenerate} disabled={!canGenerate} style={{
                  width: "100%", padding: "14px", borderRadius: 10, fontSize: 15, fontWeight: 600,
                  background: canGenerate ? `linear-gradient(135deg, ${C.accent}, ${C.purple})` : C.border,
                  color: "#fff", opacity: canGenerate ? 1 : .4,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                  <CIcon name="brain" size={16} inline /> {d.generate}
                </button>
              </div>
            </>
          )}

          {/* ── Preview ── */}
          {step === "preview" && (
            <>
              <div className="fi" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 600 }}>{d.preview}</h2>
                  <p style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>
                    {topic} · {questions.length} {d.question.toLowerCase()}s · {ACTIVITY_TYPES.find(t => t.id === activityType)?.icon}
                  </p>
                </div>
                <button onClick={handleGenerate} style={{
                  padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                  background: C.bgSoft, color: C.textSecondary, border: `1px solid ${C.border}`,
                }}>{d.regenerate}</button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {questions.map((q, i) => (
                  <div key={i} className={`fi`} style={{
                    background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`,
                    padding: 16, boxShadow: C.shadow, animationDelay: `${i * .04}s`,
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: C.textMuted }}>{d.question} {i + 1}</span>
                      <button onClick={() => handleDelete(i)} style={{ fontSize: 11, color: C.red, background: "transparent" }}>✕</button>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4 }}>{q.q}</p>
                    {PreviewComponent && <PreviewComponent q={q} i={i} />}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button onClick={() => setStep("form")} style={{
                  flex: 1, padding: "12px", borderRadius: 8, fontSize: 14, fontWeight: 500,
                  background: C.bg, color: C.textSecondary, border: `1px solid ${C.border}`,
                }}>{d.back}</button>
                <button onClick={() => setStep("saved")} style={{
                  flex: 2, padding: "12px", borderRadius: 8, fontSize: 14, fontWeight: 600,
                  background: C.accent, color: "#fff",
                }}>{d.useThese} ✓</button>
              </div>
            </>
          )}

          {/* ── Saved ── */}
          {step === "saved" && (
            <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div className="fi" style={{ textAlign: "center" }}>
                <div style={{
                  width: 64, height: 64, borderRadius: "50%", background: C.greenSoft,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px", fontSize: 28,
                }}>✓</div>
                <h2 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 24, fontWeight: 400, marginBottom: 6 }}>{d.looksGood}</h2>
                <p style={{ color: C.textSecondary, fontSize: 15, marginBottom: 24 }}>
                  {questions.length} {d.question.toLowerCase()}s {d.saved.toLowerCase()}
                </p>
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <button onClick={() => { setQuestions([]); setStep("form"); }} style={{
                    padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 500,
                    background: C.bg, color: C.textSecondary, border: `1px solid ${C.border}`,
                  }}>{d.lang === "en" ? "Create another" : d.lang === "es" ? "Crear otro" : "다른 것 만들기"}</button>
                  <button style={{
                    padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600,
                    background: C.accent, color: "#fff",
                  }}>{d.lang === "en" ? "Launch session →" : d.lang === "es" ? "Lanzar sesión →" : "세션 시작 →"}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
