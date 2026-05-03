import { useState, useCallback } from "react";
import { CIcon } from "../components/Icons";

const C = {
  bg: "#FFFFFF", bgSoft: "#F7F7F5", accent: "#2383E2", accentSoft: "#E8F0FE",
  green: "#0F7B6C", greenSoft: "#EEFBF5", orange: "#D9730D", orangeSoft: "#FFF3E0",
  red: "#E03E3E", redSoft: "#FDECEC", purple: "#6940A5", purpleSoft: "#F3EEFB",
  text: "#191919", textSecondary: "#6B6B6B", textMuted: "#9B9B9B",
  border: "#E8E8E4", shadow: "0 1px 3px rgba(0,0,0,0.04)",
};
const MONO = "'JetBrains Mono', monospace";

const ACTIVITY_TYPES = [
  { id: "mcq", icon: "mcq", label: { en: "Multiple Choice", es: "Opción Múltiple", ko: "객관식" } },
  { id: "tf", icon: "truefalse", label: { en: "True / False", es: "Verdadero / Falso", ko: "참 / 거짓" } },
  { id: "fill", icon: "fillblank", label: { en: "Fill in the Blank", es: "Completar", ko: "빈칸 채우기" } },
  { id: "order", icon: "ordering", label: { en: "Put in Order", es: "Ordenar", ko: "순서 맞추기" } },
  { id: "match", icon: "matching", label: { en: "Matching Pairs", es: "Emparejar", ko: "짝 맞추기" } },
];

// ─── i18n ───────────────────────────────────────────
const i18n = {
  en: {
    pageTitle: "AI Generator", subtitle: "Generate review questions with Claude AI",
    topic: "Topic", topicPlaceholder: "e.g. French Revolution, Photosynthesis...",
    keyPoints: "Key points", keyPointsPlaceholder: "Main concepts covered (one per line)",
    grade: "Grade", subject: "Subject", select: "Select...",
    activityType: "Activity type", numQuestions: "Number of questions", questionLang: "Question language",
    generate: "Generate with AI", generating: "AI is thinking...", generatingDesc: "Claude is creating questions about",
    preview: "Preview", regenerate: "Regenerate", useThese: "Use these questions", back: "Back",
    question: "Question", correct: "Correct", answer: "Answer",
    error: "Something went wrong. Please try again.", cost: "Estimated cost",
    saved: "Questions saved!", looksGood: "Looks good!", createAnother: "Create another", launchSession: "Launch session",
    subjects: ["Math", "Science", "History", "Language", "Geography", "Art", "Music", "Other"],
    grades: ["6th", "7th", "8th", "9th", "10th", "11th", "12th"],
    remove: "Remove",
  },
  es: {
    pageTitle: "Generador IA", subtitle: "Genera preguntas de repaso con Claude IA",
    topic: "Tema", topicPlaceholder: "ej. Revolución Francesa, Fotosíntesis...",
    keyPoints: "Puntos clave", keyPointsPlaceholder: "Conceptos principales (uno por línea)",
    grade: "Grado", subject: "Materia", select: "Seleccionar...",
    activityType: "Tipo de actividad", numQuestions: "Número de preguntas", questionLang: "Idioma de preguntas",
    generate: "Generar con IA", generating: "La IA está pensando...", generatingDesc: "Claude está creando preguntas sobre",
    preview: "Vista previa", regenerate: "Regenerar", useThese: "Usar estas preguntas", back: "Volver",
    question: "Pregunta", correct: "Correcto", answer: "Respuesta",
    error: "Algo salió mal. Intenta de nuevo.", cost: "Costo estimado",
    saved: "Preguntas guardadas!", looksGood: "Se ve bien!", createAnother: "Crear otro", launchSession: "Lanzar sesión",
    subjects: ["Matemáticas", "Ciencias", "Historia", "Lengua", "Geografía", "Arte", "Música", "Otra"],
    grades: ["6°", "7°", "8°", "9°", "10°", "11°", "12°"],
    remove: "Eliminar",
  },
  ko: {
    pageTitle: "AI 생성기", subtitle: "Claude AI로 복습 문제를 생성하세요",
    topic: "주제", topicPlaceholder: "예: 프랑스 혁명, 광합성...",
    keyPoints: "핵심 포인트", keyPointsPlaceholder: "다룬 주요 개념 (줄당 하나)",
    grade: "학년", subject: "과목", select: "선택...",
    activityType: "활동 유형", numQuestions: "문제 수", questionLang: "문제 언어",
    generate: "AI로 생성", generating: "AI가 생각 중...", generatingDesc: "Claude가 문제를 만들고 있습니다:",
    preview: "미리보기", regenerate: "재생성", useThese: "이 문제 사용", back: "뒤로",
    question: "문제", correct: "정답", answer: "답",
    error: "문제가 발생했습니다. 다시 시도하세요.", cost: "예상 비용",
    saved: "문제가 저장되었습니다!", looksGood: "좋아 보여요!", createAnother: "다른 것 만들기", launchSession: "세션 시작",
    subjects: ["수학", "과학", "역사", "국어", "지리", "미술", "음악", "기타"],
    grades: ["중1", "중2", "중3", "고1", "고2", "고3", "대1"],
    remove: "삭제",
  },
};

// ─── CSS ────────────────────────────────────────────
const css = `
  .ai-btn { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .ai-btn:hover { transform: translateY(-1px); filter: brightness(1.05); }
  .ai-btn:active { transform: translateY(0) scale(.97); }
  .ai-btn-secondary:hover { background: #E8F0FE !important; border-color: #2383E244 !important; color: #2383E2 !important; }
  .ai-btn-danger:hover { background: #E03E3E !important; color: #fff !important; }
  .ai-pill { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .ai-pill:hover { background: #E8F0FE !important; border-color: #2383E244 !important; color: #2383E2 !important; }
  .ai-pill:active { transform: scale(.96); }
  .ai-num { transition: all .15s ease; cursor: pointer; border: none; font-family: ${MONO}; }
  .ai-num:hover { background: #E8F0FE !important; border-color: #2383E244 !important; color: #2383E2 !important; }
  .ai-card { transition: all .2s ease; }
  .ai-card:hover { border-color: #2383E233 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .ai-option { transition: all .15s ease; }
  .ai-option:hover { border-color: #2383E244 !important; background: #FAFBFF !important; }
  .ai-lang { transition: all .12s ease; cursor: pointer; }
  .ai-lang:hover { background: #E8F0FE !important; color: #2383E2 !important; }
  .ai-input { transition: border-color .15s, box-shadow .15s; }
  .ai-input:hover { border-color: #2383E266 !important; }
  .ai-input:focus { border-color: #2383E2 !important; box-shadow: 0 0 0 3px #E8F0FE !important; }
  .ai-back { transition: all .15s ease; }
  .ai-back:hover { background: #E8F0FE !important; }
  .ai-back:active { transform: scale(.96); }
  .ai-remove { transition: all .15s ease; }
  .ai-remove:hover { background: #FDECEC !important; color: #E03E3E !important; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
  .fade-up { animation: fadeUp .3s ease-out both; }
`;

const inp = { fontFamily: "'Outfit',sans-serif", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: "10px 14px", borderRadius: 8, fontSize: 14, width: "100%", outline: "none" };
const sel = { ...inp, cursor: "pointer", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%239B9B9B' stroke-width='1.5'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 32 };

// ─── Prompt Builder ─────────────────────────────────
function buildPrompt({ topic, keyPoints, grade, subject, activityType, numQuestions, questionLang }) {
  const langMap = { en: "English", es: "Spanish", ko: "Korean" };
  const types = {
    mcq: `Multiple choice with 4 options. Format: { "q": "question", "options": ["A","B","C","D"], "correct": 0 }`,
    tf: `True/false statements. Format: { "q": "statement", "correct": true }`,
    fill: `Fill in the blank. Format: { "q": "The _____ is...", "answer": "word" }`,
    order: `Ordering question. Format: { "q": "Put in order:", "items": ["First","Second","Third","Fourth"] }`,
    match: `Matching pairs. Format: { "q": "Match:", "pairs": [{"left":"A","right":"B"}, ...] }`,
  };
  return `You are Clasloop. Generate ${numQuestions} ${activityType} questions.\n\nTopic: ${topic}\n${keyPoints ? `Key points:\n${keyPoints}\n` : ""}Grade: ${grade}\nSubject: ${subject}\n\n${types[activityType]}\n\nRules: Write in ${langMap[questionLang]}. Appropriate for ${grade}. Vary difficulty. Be specific.\n\nRespond with ONLY a valid JSON array. No markdown, no backticks.`;
}

// ─── API Call ───────────────────────────────────────
async function callAI({ topic, keyPoints, grade, subject, activityType, numQuestions, questionLang }) {
  const prompt = buildPrompt({ topic, keyPoints, grade, subject, activityType, numQuestions, questionLang });
  const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: prompt }], max_tokens: 1500 }) });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  const text = data.content.filter(i => i.type === "text").map(i => i.text).join("");
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

// ─── Question Previews ──────────────────────────────
const MCQPreview = ({ q }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
    {q.options.map((o, j) => (
      <div key={j} className="ai-option" style={{ padding: "7px 10px", borderRadius: 6, fontSize: 13, background: j === q.correct ? C.greenSoft : C.bgSoft, color: j === q.correct ? C.green : C.textSecondary, fontWeight: j === q.correct ? 500 : 400, border: `1px solid ${j === q.correct ? C.green + "33" : "transparent"}` }}>{o}</div>
    ))}
  </div>
);

const TFPreview = ({ q }) => (
  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
    <span className="ai-option" style={{ padding: "4px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600, background: q.correct ? C.greenSoft : C.bgSoft, color: q.correct ? C.green : C.textMuted, border: `1px solid ${q.correct ? C.green + "33" : C.border}` }}>
      <CIcon name="check" size={12} inline /> True
    </span>
    <span className="ai-option" style={{ padding: "4px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600, background: !q.correct ? C.redSoft : C.bgSoft, color: !q.correct ? C.red : C.textMuted, border: `1px solid ${!q.correct ? C.red + "33" : C.border}` }}>
      <CIcon name="cross" size={12} inline /> False
    </span>
  </div>
);

const FillPreview = ({ q }) => (
  <div style={{ marginTop: 8, padding: "6px 12px", borderRadius: 6, background: C.greenSoft, fontSize: 13, color: C.green, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
    <CIcon name="check" size={12} inline /> {q.answer}
  </div>
);

const OrderPreview = ({ q }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
    {q.items.map((item, j) => (
      <div key={j} className="ai-option" style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, background: C.bgSoft, fontSize: 13 }}>
        <span style={{ width: 20, height: 20, borderRadius: 5, background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{j + 1}</span>
        {item}
      </div>
    ))}
  </div>
);

const MatchPreview = ({ q }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
    {q.pairs.map((p, j) => (
      <div key={j} className="ai-option" style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, background: C.bgSoft, fontSize: 13 }}>
        <span style={{ fontWeight: 600, color: C.accent, fontFamily: MONO }}>{p.left}</span>
        <span style={{ color: C.textMuted }}>→</span>
        <span style={{ color: C.textSecondary }}>{p.right}</span>
      </div>
    ))}
  </div>
);

const PREVIEW = { mcq: MCQPreview, tf: TFPreview, fill: FillPreview, order: OrderPreview, match: MatchPreview };

// ─── Page Header ────────────────────────────────────
function PageHeader({ title, icon, lang, setLang }) {
  return (
    <div style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, padding: "14px 28px", margin: "-28px -20px 24px -20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CIcon name={icon} size={28} />
          <h1 style={{ fontFamily: "'Outfit'", fontSize: 18, fontWeight: 700 }}>{title}</h1>
        </div>
        <div style={{ display: "flex", gap: 2, background: C.bgSoft, borderRadius: 8, padding: 3 }}>
          {[["en", "EN"], ["es", "ES"], ["ko", "한"]].map(([c, l]) => (
            <button key={c} className="ai-lang" onClick={() => setLang(c)} style={{
              padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: lang === c ? C.bg : "transparent", color: lang === c ? C.text : C.textMuted,
              border: "none", boxShadow: lang === c ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
            }}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────
export default function AIGenerator({ lang: pageLang = "en", setLang: pageSetLang }) {
  const [lang, setLangLocal] = useState(pageLang);
  const setLang = pageSetLang || setLangLocal;
  const [topic, setTopic] = useState("");
  const [keyPoints, setKeyPoints] = useState("");
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [activityType, setActivityType] = useState("mcq");
  const [numQuestions, setNumQuestions] = useState(5);
  const [questionLang, setQuestionLang] = useState(pageLang);
  const [step, setStep] = useState("form");
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState(null);

  const t = i18n[pageLang || lang] || i18n.en;
  const canGenerate = topic.trim() && grade && subject;

  const handleGenerate = useCallback(async () => {
    setStep("generating"); setError(null);
    try {
      const qs = await callAI({ topic, keyPoints, grade, subject, activityType, numQuestions, questionLang });
      setQuestions(qs); setStep("preview");
    } catch (err) { console.error(err); setError(err.message); setStep("form"); }
  }, [topic, keyPoints, grade, subject, activityType, numQuestions, questionLang]);

  const Preview = PREVIEW[activityType];

  return (
    <div style={{ padding: "28px 20px" }}>
      <style>{css}</style>
      <PageHeader title={t.pageTitle} icon="brain" lang={pageLang || lang} setLang={setLang} />

      <div style={{ maxWidth: 560, margin: "0 auto" }}>

        {/* ── Generating ── */}
        {step === "generating" && (
          <div style={{ minHeight: "50vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div className="fade-up" style={{ textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: C.purpleSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", animation: "pulse 1.5s infinite" }}>
                <CIcon name="brain" size={28} inline />
              </div>
              <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{t.generating}</p>
              <p style={{ fontSize: 14, color: C.textSecondary }}>{t.generatingDesc} <strong>{topic}</strong></p>
              <div style={{ marginTop: 20, display: "flex", gap: 4, justifyContent: "center" }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: C.accent, animation: `pulse 1s infinite ${i * .2}s` }} />)}
              </div>
            </div>
          </div>
        )}

        {/* ── Form ── */}
        {step === "form" && (
          <div className="fade-up">
            <p style={{ fontSize: 14, color: C.textSecondary, marginBottom: 24 }}>{t.subtitle}</p>

            {error && (
              <div style={{ padding: "12px 16px", borderRadius: 8, background: C.redSoft, color: C.red, fontSize: 13, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
                <CIcon name="warning" size={14} inline /> {t.error}
                <span style={{ fontSize: 11, color: C.textMuted, display: "block", marginTop: 2 }}>{error}</span>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.topic} *</label>
                <input className="ai-input" value={topic} onChange={e => setTopic(e.target.value)} placeholder={t.topicPlaceholder} style={inp} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.keyPoints}</label>
                <textarea className="ai-input" value={keyPoints} onChange={e => setKeyPoints(e.target.value)} placeholder={t.keyPointsPlaceholder} style={{ ...inp, minHeight: 80, resize: "vertical" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.grade} *</label>
                  <select className="ai-input" value={grade} onChange={e => setGrade(e.target.value)} style={sel}>
                    <option value="">{t.select}</option>
                    {t.grades.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.subject} *</label>
                  <select className="ai-input" value={subject} onChange={e => setSubject(e.target.value)} style={sel}>
                    <option value="">{t.select}</option>
                    {t.subjects.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 8 }}>{t.activityType}</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {ACTIVITY_TYPES.map(at => (
                    <button key={at.id} className="ai-pill" onClick={() => setActivityType(at.id)} style={{
                      padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                      background: activityType === at.id ? C.accentSoft : C.bg,
                      color: activityType === at.id ? C.accent : C.textSecondary,
                      border: `1px solid ${activityType === at.id ? C.accent + "33" : C.border}`,
                      display: "flex", alignItems: "center", gap: 6,
                    }}><CIcon name={at.icon} size={16} inline /> {at.label[pageLang || lang]}</button>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.numQuestions}</label>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[3, 5, 8, 10].map(n => (
                      <button key={n} className="ai-num" onClick={() => setNumQuestions(n)} style={{
                        flex: 1, padding: 8, borderRadius: 6, fontSize: 14, fontWeight: 600,
                        background: numQuestions === n ? C.accentSoft : C.bg,
                        color: numQuestions === n ? C.accent : C.textMuted,
                        border: `1px solid ${numQuestions === n ? C.accent + "33" : C.border}`,
                      }}>{n}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.questionLang}</label>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[["en", "EN"], ["es", "ES"], ["ko", "한"]].map(([c, l]) => (
                      <button key={c} className="ai-num" onClick={() => setQuestionLang(c)} style={{
                        flex: 1, padding: 8, borderRadius: 6, fontSize: 13, fontWeight: 600,
                        background: questionLang === c ? C.accentSoft : C.bg,
                        color: questionLang === c ? C.accent : C.textMuted,
                        border: `1px solid ${questionLang === c ? C.accent + "33" : C.border}`,
                      }}>{l}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ padding: "10px 14px", borderRadius: 8, background: C.bgSoft, fontSize: 12, color: C.textMuted, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>{t.cost}</span>
                <span style={{ fontFamily: MONO, fontWeight: 600, color: C.green }}>~$0.02</span>
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <button className="ai-btn" onClick={handleGenerate} disabled={!canGenerate} style={{
                width: "100%", padding: 14, borderRadius: 10, fontSize: 15, fontWeight: 600,
                background: canGenerate ? `linear-gradient(135deg, ${C.accent}, ${C.purple})` : C.border,
                color: "#fff", opacity: canGenerate ? 1 : 0.4,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                <CIcon name="brain" size={16} inline /> {t.generate}
              </button>
            </div>
          </div>
        )}

        {/* ── Preview ── */}
        {step === "preview" && (
          <div className="fade-up">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600 }}>{t.preview}</h2>
                <p style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>{topic} · {questions.length} {t.question.toLowerCase()}s</p>
              </div>
              <button className="ai-btn ai-btn-secondary" onClick={handleGenerate} style={{
                padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: C.bgSoft, color: C.textSecondary, border: `1px solid ${C.border}`,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <CIcon name="refresh" size={14} inline /> {t.regenerate}
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {questions.map((q, i) => (
                <div key={i} className="ai-card fade-up" style={{
                  background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`,
                  padding: 16, boxShadow: C.shadow, animationDelay: `${i * .04}s`,
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: C.textMuted }}>{t.question} {i + 1}</span>
                    <button className="ai-remove" onClick={() => setQuestions(qs => qs.filter((_, j) => j !== i))} style={{
                      fontSize: 11, color: C.textMuted, background: "transparent", border: "none", padding: "2px 8px", borderRadius: 4, cursor: "pointer",
                    }}>{t.remove}</button>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4 }}>{q.q}</p>
                  {Preview && <Preview q={q} />}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button className="ai-btn ai-btn-secondary" onClick={() => setStep("form")} style={{
                flex: 1, padding: 12, borderRadius: 8, fontSize: 14, fontWeight: 500,
                background: C.bg, color: C.textSecondary, border: `1px solid ${C.border}`,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                <CIcon name="back" size={14} inline /> {t.back}
              </button>
              <button className="ai-btn" onClick={() => setStep("saved")} style={{
                flex: 2, padding: 12, borderRadius: 8, fontSize: 14, fontWeight: 600,
                background: C.accent, color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                <CIcon name="check" size={14} inline /> {t.useThese}
              </button>
            </div>
          </div>
        )}

        {/* ── Saved ── */}
        {step === "saved" && (
          <div style={{ minHeight: "50vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div className="fade-up" style={{ textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.greenSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <CIcon name="check" size={28} inline />
              </div>
              <h2 style={{ fontFamily: "'Outfit'", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{t.looksGood}</h2>
              <p style={{ color: C.textSecondary, fontSize: 15, marginBottom: 24 }}>
                {questions.length} {t.question.toLowerCase()}s — {t.saved}
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button className="ai-btn ai-btn-secondary" onClick={() => { setQuestions([]); setStep("form"); }} style={{
                  padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 500,
                  background: C.bg, color: C.textSecondary, border: `1px solid ${C.border}`,
                }}>{t.createAnother}</button>
                <button className="ai-btn" style={{
                  padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600,
                  background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, color: "#fff",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <CIcon name="rocket" size={14} inline /> {t.launchSession}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
