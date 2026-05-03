import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { CIcon } from "../components/Icons";

const C = {
  bg: "#FFFFFF", bgSoft: "#F7F7F5", accent: "#2383E2", accentSoft: "#E8F0FE",
  green: "#0F7B6C", greenSoft: "#EEFBF5", orange: "#D9730D", orangeSoft: "#FFF3E0",
  red: "#E03E3E", redSoft: "#FDECEC", purple: "#6940A5", purpleSoft: "#F3EEFB",
  yellow: "#D4A017", yellowSoft: "#FEF9E7",
  text: "#191919", textSecondary: "#6B6B6B", textMuted: "#9B9B9B",
  border: "#E8E8E4", shadow: "0 1px 3px rgba(0,0,0,0.04)",
};
const MONO = "'JetBrains Mono', monospace";
const SUBJ_ICON = { Math: "math", Science: "science", History: "history", Language: "language", Geography: "geo", Art: "art", Music: "music", Other: "book" };
const SUBJECTS = ["Math", "Science", "History", "Language", "Geography", "Art", "Music", "Other"];
const GRADES = ["6th-7th", "7th-8th", "8th-9th", "9th-10th", "10th-11th", "11th-12th"];

const i18n = {
  en: { pageTitle: "Community", subtitle: "Browse and share review decks with teachers worldwide", search: "Search topics...", allSubjects: "All subjects", allLanguages: "All languages", mostUsed: "Most used", topRated: "Top rated", newest: "Newest", questions: "questions", uses: "uses", addToClass: "Add to my class", added: "Added!", publishNew: "Publish deck", back: "Back", by: "by", noResults: "No decks found.", myDecks: "My Decks", browse: "Browse", create: "Create", title: "Title", titlePlaceholder: "e.g. French Revolution Review", description: "Description", descPlaceholder: "What this deck covers...", subject: "Subject", grade: "Grade", language: "Language", tags: "Tags (comma-separated)", tagsPlaceholder: "revolution, europe, history", addQuestion: "Add question", questionText: "Question", options: "Options", correctAnswer: "Correct answer", publish: "Publish deck", publishing: "Publishing...", published: "Published!", deleteConfirm: "Delete this deck?", delete: "Delete", edit: "Edit", private: "Private", public: "Public", makePublic: "Make public", visibility: "Visibility", questionCount: "questions added", required: "Required", selectSubject: "Select subject...", selectGrade: "Select grade...", option: "Option", markCorrect: "Mark as correct", removeQuestion: "Remove", saveDraft: "Save as draft", langs: ["English", "Spanish", "Korean"] },
  es: { pageTitle: "Comunidad", subtitle: "Busca y comparte decks de repaso con profesores", search: "Buscar temas...", allSubjects: "Todas las materias", allLanguages: "Todos los idiomas", mostUsed: "Más usados", topRated: "Mejor valorados", newest: "Más recientes", questions: "preguntas", uses: "usos", addToClass: "Agregar a mi clase", added: "¡Agregado!", publishNew: "Publicar deck", back: "Volver", by: "por", noResults: "No se encontraron decks.", myDecks: "Mis Decks", browse: "Explorar", create: "Crear", title: "Título", titlePlaceholder: "ej. Repaso Revolución Francesa", description: "Descripción", descPlaceholder: "Qué cubre este deck...", subject: "Materia", grade: "Grado", language: "Idioma", tags: "Etiquetas (separadas por coma)", tagsPlaceholder: "revolución, europa, historia", addQuestion: "Agregar pregunta", questionText: "Pregunta", options: "Opciones", correctAnswer: "Respuesta correcta", publish: "Publicar deck", publishing: "Publicando...", published: "¡Publicado!", deleteConfirm: "¿Eliminar este deck?", delete: "Eliminar", edit: "Editar", private: "Privado", public: "Público", makePublic: "Hacer público", visibility: "Visibilidad", questionCount: "preguntas agregadas", required: "Requerido", selectSubject: "Seleccionar materia...", selectGrade: "Seleccionar grado...", option: "Opción", markCorrect: "Marcar correcta", removeQuestion: "Eliminar", saveDraft: "Guardar borrador", langs: ["Inglés", "Español", "Coreano"] },
  ko: { pageTitle: "커뮤니티", subtitle: "전 세계 교사들과 복습 덱을 공유하세요", search: "주제 검색...", allSubjects: "모든 과목", allLanguages: "모든 언어", mostUsed: "최다 사용", topRated: "최고 평점", newest: "최신순", questions: "문제", uses: "사용", addToClass: "내 수업에 추가", added: "추가됨!", publishNew: "덱 공유", back: "뒤로", by: "", noResults: "덱을 찾을 수 없습니다.", myDecks: "내 덱", browse: "찾기", create: "만들기", title: "제목", titlePlaceholder: "예: 프랑스 혁명 복습", description: "설명", descPlaceholder: "이 덱의 내용...", subject: "과목", grade: "학년", language: "언어", tags: "태그 (쉼표 구분)", tagsPlaceholder: "혁명, 유럽, 역사", addQuestion: "문제 추가", questionText: "문제", options: "선택지", correctAnswer: "정답", publish: "덱 공유", publishing: "공유 중...", published: "공유됨!", deleteConfirm: "이 덱을 삭제하시겠습니까?", delete: "삭제", edit: "편집", private: "비공개", public: "공개", makePublic: "공개로 전환", visibility: "공개 설정", questionCount: "문제 추가됨", required: "필수", selectSubject: "과목 선택...", selectGrade: "학년 선택...", option: "선택지", markCorrect: "정답 표시", removeQuestion: "삭제", saveDraft: "임시 저장", langs: ["영어", "스페인어", "한국어"] },
};

const css = `
  .cm-card { transition: all .2s ease; cursor: pointer; }
  .cm-card:hover { border-color: #2383E244 !important; box-shadow: 0 4px 16px rgba(35,131,226,.1) !important; transform: translateY(-2px); }
  .cm-tab { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .cm-tab:hover { background: #E8F0FE !important; border-color: #2383E244 !important; color: #2383E2 !important; }
  .cm-sort { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .cm-sort:hover { background: #E8F0FE !important; color: #2383E2 !important; }
  .cm-btn { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .cm-btn:hover { transform: translateY(-1px); filter: brightness(1.05); }
  .cm-btn:active { transform: translateY(0) scale(.97); }
  .cm-btn-secondary:hover { background: #E8F0FE !important; border-color: #2383E244 !important; color: #2383E2 !important; }
  .cm-btn-danger:hover { background: #E03E3E !important; color: #fff !important; }
  .cm-back { transition: all .15s ease; cursor: pointer; }
  .cm-back:hover { background: #E8F0FE !important; }
  .cm-input { transition: border-color .15s, box-shadow .15s; }
  .cm-input:hover { border-color: #2383E266 !important; }
  .cm-input:focus { border-color: #2383E2 !important; box-shadow: 0 0 0 3px #E8F0FE !important; }
  .cm-option:hover { border-color: #2383E244 !important; background: #FAFBFF !important; }
  .cm-lang { transition: all .12s ease; cursor: pointer; }
  .cm-lang:hover { background: #E8F0FE !important; color: #2383E2 !important; }
  .cm-q-card { transition: all .2s ease; }
  .cm-q-card:hover { border-color: #2383E233 !important; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  .fade-up { animation: fadeUp .3s ease-out both; }
`;

const inp = { fontFamily: "'Outfit',sans-serif", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: "10px 14px", borderRadius: 8, fontSize: 14, width: "100%", outline: "none" };
const sel = { ...inp, cursor: "pointer", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%239B9B9B' stroke-width='1.5'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 32 };

const Stars = ({ rating }) => (
  <span style={{ display: "inline-flex", gap: 1, fontSize: 13, color: C.yellow }}>
    {"★".repeat(Math.floor(rating))}<span style={{ color: C.border }}>{"★".repeat(5 - Math.floor(rating))}</span>
  </span>
);

const LangBadge = ({ lang }) => {
  const l = { en: "EN", es: "ES", ko: "한" };
  const c = { en: C.accent, es: C.orange, ko: C.green };
  return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: (c[lang] || C.accent) + "14", color: c[lang] || C.accent }}>{l[lang] || lang}</span>;
};

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
            <button key={c} className="cm-lang" onClick={() => setLang(c)} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: lang === c ? C.bg : "transparent", color: lang === c ? C.text : C.textMuted, border: "none", boxShadow: lang === c ? "0 1px 2px rgba(0,0,0,0.06)" : "none" }}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Create Deck Form ───────────────────────────────
function CreateDeck({ t, onBack, onCreated, userId }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [deckLang, setDeckLang] = useState("en");
  const [tags, setTags] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [saving, setSaving] = useState(false);

  const addQuestion = () => {
    setQuestions(prev => [...prev, { q: "", options: ["", "", "", ""], correct: 0 }]);
  };

  const updateQ = (idx, field, val) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: val } : q));
  };

  const updateOption = (qIdx, optIdx, val) => {
    setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, options: q.options.map((o, j) => j === optIdx ? val : o) } : q));
  };

  const removeQ = (idx) => setQuestions(prev => prev.filter((_, i) => i !== idx));

  const canSave = title.trim() && subject && grade && questions.length > 0 && questions.every(q => q.q.trim() && q.options.every(o => o.trim()));

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const tagArr = tags.split(",").map(t => t.trim()).filter(Boolean);
    const { data, error } = await supabase.from("decks").insert({
      author_id: userId, title: title.trim(), description: desc.trim(),
      subject, grade, language: deckLang, questions, tags: tagArr, is_public: isPublic,
    }).select().single();
    setSaving(false);
    if (!error && data) onCreated(data);
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <button className="cm-back" onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: C.accent, background: C.accentSoft, border: "none", marginBottom: 20, fontFamily: "'Outfit',sans-serif" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12L11 6M5 12L11 18" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        {t.back}
      </button>

      <div className="fade-up" style={{ background: C.bg, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24, marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, fontFamily: "'Outfit'" }}>{t.publishNew}</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.title} *</label>
            <input className="cm-input" value={title} onChange={e => setTitle(e.target.value)} placeholder={t.titlePlaceholder} style={inp} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.description}</label>
            <textarea className="cm-input" value={desc} onChange={e => setDesc(e.target.value)} placeholder={t.descPlaceholder} style={{ ...inp, minHeight: 60, resize: "vertical" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.subject} *</label>
              <select className="cm-input" value={subject} onChange={e => setSubject(e.target.value)} style={sel}>
                <option value="">{t.selectSubject}</option>
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.grade} *</label>
              <select className="cm-input" value={grade} onChange={e => setGrade(e.target.value)} style={sel}>
                <option value="">{t.selectGrade}</option>
                {GRADES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.language}</label>
              <select className="cm-input" value={deckLang} onChange={e => setDeckLang(e.target.value)} style={sel}>
                <option value="en">English</option><option value="es">Español</option><option value="ko">한국어</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.tags}</label>
            <input className="cm-input" value={tags} onChange={e => setTags(e.target.value)} placeholder={t.tagsPlaceholder} style={inp} />
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="fade-up" style={{ animationDelay: ".1s" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>{t.questions} ({questions.length} {t.questionCount})</h3>
          <button className="cm-btn" onClick={addQuestion} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: C.accentSoft, color: C.accent }}>
            <CIcon name="plus" size={14} inline /> {t.addQuestion}
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {questions.map((q, qi) => (
            <div key={qi} className="cm-q-card" style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: C.textMuted }}>Q{qi + 1}</span>
                <button className="cm-btn-danger" onClick={() => removeQ(qi)} style={{ fontSize: 11, color: C.red, background: "transparent", border: "none", padding: "2px 8px", borderRadius: 4 }}>{t.removeQuestion}</button>
              </div>
              <input className="cm-input" value={q.q} onChange={e => updateQ(qi, "q", e.target.value)} placeholder={t.questionText} style={{ ...inp, marginBottom: 10 }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {q.options.map((o, oi) => (
                  <div key={oi} style={{ position: "relative" }}>
                    <input className="cm-input" value={o} onChange={e => updateOption(qi, oi, e.target.value)} placeholder={`${t.option} ${oi + 1}`} style={{ ...inp, paddingRight: 36, background: q.correct === oi ? C.greenSoft : C.bg, borderColor: q.correct === oi ? C.green + "44" : C.border }} />
                    <button onClick={() => updateQ(qi, "correct", oi)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 20, height: 20, borderRadius: "50%", border: `2px solid ${q.correct === oi ? C.green : C.border}`, background: q.correct === oi ? C.green : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff" }}>
                      {q.correct === oi && "✓"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {questions.length === 0 && (
          <div style={{ textAlign: "center", padding: 32, background: C.bgSoft, borderRadius: 12, border: `1px dashed ${C.border}` }}>
            <CIcon name="plus" size={28} />
            <p style={{ fontSize: 13, color: C.textMuted, marginTop: 8 }}>{t.addQuestion}</p>
          </div>
        )}
      </div>

      {/* Publish */}
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button className="cm-btn" onClick={handleSave} disabled={!canSave || saving} style={{
          flex: 2, padding: 14, borderRadius: 10, fontSize: 15, fontWeight: 600,
          background: canSave ? `linear-gradient(135deg, ${C.accent}, ${C.purple})` : C.border,
          color: "#fff", opacity: canSave && !saving ? 1 : 0.4,
        }}>{saving ? t.publishing : t.publish}</button>
      </div>
    </div>
  );
}

// ─── Main ───────────────────────────────────────────
export default function Community({ lang: pageLang = "en", setLang: pageSetLang }) {
  const [lang, setLangLocal] = useState(pageLang);
  const setLang = pageSetLang || setLangLocal;
  const l = pageLang || lang;
  const [view, setView] = useState("browse"); // browse | create | detail | myDecks
  const [tab, setTab] = useState("browse");
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [deckLang, setDeckLang] = useState("");
  const [sort, setSort] = useState("uses_count");
  const [decks, setDecks] = useState([]);
  const [myDecks, setMyDecks] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState({});
  const t = i18n[l] || i18n.en;

  useEffect(() => { loadDecks(); }, []);

  const loadDecks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id);

    // Public decks
    const { data: pub } = await supabase.from("decks").select("*, profiles(full_name)").eq("is_public", true).order("uses_count", { ascending: false });
    setDecks(pub || []);

    // My decks
    if (user) {
      const { data: mine } = await supabase.from("decks").select("*").eq("author_id", user.id).order("created_at", { ascending: false });
      setMyDecks(mine || []);
    }
    setLoading(false);
  };

  const handleDelete = async (deckId) => {
    await supabase.from("decks").delete().eq("id", deckId);
    setMyDecks(prev => prev.filter(d => d.id !== deckId));
    setDecks(prev => prev.filter(d => d.id !== deckId));
  };

  const handleTogglePublic = async (deck) => {
    const newPublic = !deck.is_public;
    await supabase.from("decks").update({ is_public: newPublic }).eq("id", deck.id);
    setMyDecks(prev => prev.map(d => d.id === deck.id ? { ...d, is_public: newPublic } : d));
    if (newPublic) loadDecks();
  };

  const filtered = decks
    .filter(dk => {
      if (search && !dk.title.toLowerCase().includes(search.toLowerCase()) && !(dk.tags || []).some(tg => tg.toLowerCase().includes(search.toLowerCase()))) return false;
      if (subject && dk.subject !== subject) return false;
      if (deckLang && dk.language !== deckLang) return false;
      return true;
    })
    .sort((a, b) => sort === "uses_count" ? (b.uses_count || 0) - (a.uses_count || 0) : sort === "rating" ? (b.rating || 0) - (a.rating || 0) : new Date(b.created_at) - new Date(a.created_at));

  if (view === "create") return (
    <div style={{ padding: "28px 20px" }}>
      <style>{css}</style>
      <PageHeader title={t.pageTitle} icon="globe" lang={l} setLang={setLang} />
      <CreateDeck t={t} onBack={() => setView("browse")} userId={userId} onCreated={(d) => { setMyDecks(prev => [d, ...prev]); if (d.is_public) setDecks(prev => [d, ...prev]); setView("browse"); setTab("myDecks"); }} />
    </div>
  );

  if (view === "detail" && selectedDeck) {
    const dk = selectedDeck;
    const icon = SUBJ_ICON[dk.subject] || "book";
    const qs = dk.questions || [];
    return (
      <div style={{ padding: "28px 20px" }}>
        <style>{css}</style>
        <PageHeader title={t.pageTitle} icon="globe" lang={l} setLang={setLang} />
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <button className="cm-back" onClick={() => setView("browse")} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: C.accent, background: C.accentSoft, border: "none", marginBottom: 20, fontFamily: "'Outfit',sans-serif" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12L11 6M5 12L11 18" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {t.back}
          </button>
          <div className="fade-up" style={{ background: C.bg, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <CIcon name={icon} size={28} />
              <div>
                <span style={{ fontSize: 12, color: C.textMuted }}>{dk.subject} · {dk.grade}</span>
                <div style={{ marginTop: 2 }}><LangBadge lang={dk.language} /></div>
              </div>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, fontFamily: "'Outfit'" }}>{dk.title}</h2>
            {dk.description && <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.5, marginBottom: 16 }}>{dk.description}</p>}
            <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>
              {t.by} {dk.profiles?.full_name || "Unknown"} · {qs.length} {t.questions} · {dk.uses_count || 0} {t.uses}
            </div>
            {(dk.tags || []).length > 0 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 16 }}>
                {dk.tags.map((tag, i) => <span key={i} style={{ padding: "3px 8px", borderRadius: 6, background: C.bgSoft, border: `1px solid ${C.border}`, fontSize: 11, color: C.textSecondary }}>#{tag}</span>)}
              </div>
            )}
            <button className="cm-btn" onClick={() => setAdded(prev => ({ ...prev, [dk.id]: true }))} style={{
              width: "100%", padding: 14, borderRadius: 10, fontSize: 15, fontWeight: 600,
              background: added[dk.id] ? C.greenSoft : C.accent, color: added[dk.id] ? C.green : "#fff",
              border: added[dk.id] ? `1px solid ${C.green}33` : "none",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              {added[dk.id] ? <><CIcon name="check" size={14} inline /> {t.added}</> : t.addToClass}
            </button>
          </div>
          {qs.length > 0 && (
            <div className="fade-up" style={{ animationDelay: ".1s" }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{t.questions} ({qs.length})</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {qs.slice(0, 5).map((q, i) => (
                  <div key={i} style={{ background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, padding: 14 }}>
                    <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>Q{i + 1}</p>
                    <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>{q.q}</p>
                    {q.options && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                      {q.options.map((o, j) => <div key={j} className="cm-option" style={{ padding: "5px 8px", borderRadius: 5, fontSize: 12, background: j === q.correct ? C.greenSoft : C.bgSoft, color: j === q.correct ? C.green : C.textSecondary, border: `1px solid ${j === q.correct ? C.green + "33" : "transparent"}` }}>{o}</div>)}
                    </div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 20px" }}>
      <style>{css}</style>
      <PageHeader title={t.pageTitle} icon="globe" lang={l} setLang={setLang} />
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <p style={{ fontSize: 14, color: C.textSecondary, marginBottom: 16 }}>{t.subtitle}</p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {[["browse", t.browse], ["myDecks", t.myDecks]].map(([id, label]) => (
              <button key={id} className="cm-tab" onClick={() => setTab(id)} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: tab === id ? C.accentSoft : C.bg, color: tab === id ? C.accent : C.textSecondary, border: `1px solid ${tab === id ? C.accent + "33" : C.border}` }}>{label}</button>
            ))}
          </div>
          <button className="cm-btn" onClick={() => setView("create")} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, color: "#fff" }}>
            <CIcon name="plus" size={14} inline /> {t.publishNew}
          </button>
        </div>

        {tab === "browse" && (
          <>
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 2, minWidth: 200, position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}><CIcon name="target" size={14} inline /></span>
                <input className="cm-input" value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search} style={{ ...inp, paddingLeft: 38 }} />
              </div>
              <select className="cm-input" value={subject} onChange={e => setSubject(e.target.value)} style={{ ...sel, flex: 1, minWidth: 120 }}>
                <option value="">{t.allSubjects}</option>
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
              <select className="cm-input" value={deckLang} onChange={e => setDeckLang(e.target.value)} style={{ ...sel, flex: 1, minWidth: 110 }}>
                <option value="">{t.allLanguages}</option>
                <option value="en">{t.langs[0]}</option><option value="es">{t.langs[1]}</option><option value="ko">{t.langs[2]}</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: C.textMuted }}>{filtered.length} decks</span>
              <div style={{ display: "flex", gap: 4 }}>
                {[["uses_count", t.mostUsed], ["rating", t.topRated], ["created_at", t.newest]].map(([k, label]) => (
                  <button key={k} className="cm-sort" onClick={() => setSort(k)} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: sort === k ? C.accentSoft : "transparent", color: sort === k ? C.accent : C.textMuted }}>{label}</button>
                ))}
              </div>
            </div>

            {loading ? <p style={{ textAlign: "center", color: C.textMuted, padding: 40 }}>Loading...</p> :
            filtered.length === 0 ? (
              <div className="fade-up" style={{ textAlign: "center", padding: 48 }}><CIcon name="other" size={36} /><p style={{ fontSize: 15, color: C.textMuted, marginTop: 12 }}>{t.noResults}</p></div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                {filtered.map((dk, i) => {
                  const icon = SUBJ_ICON[dk.subject] || "book";
                  const qs = dk.questions || [];
                  return (
                    <div key={dk.id} className="cm-card fade-up" onClick={() => { setSelectedDeck(dk); setView("detail"); }} style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 18, boxShadow: C.shadow, animationDelay: `${i * .04}s` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <CIcon name={icon} size={20} inline />
                        <span style={{ fontSize: 12, color: C.textMuted }}>{dk.subject} · {dk.grade}</span>
                        <div style={{ marginLeft: "auto" }}><LangBadge lang={dk.language} /></div>
                      </div>
                      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, lineHeight: 1.3 }}>{dk.title}</h3>
                      {dk.description && <p style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.4, marginBottom: 10, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{dk.description}</p>}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: `1px solid ${C.border}`, fontSize: 12, color: C.textMuted }}>
                        <span>{t.by} {dk.profiles?.full_name || "Unknown"}</span>
                        <span>{qs.length} {t.questions}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === "myDecks" && (
          <div className="fade-up">
            {myDecks.length === 0 ? (
              <div style={{ textAlign: "center", padding: 48 }}>
                <CIcon name="book" size={36} />
                <p style={{ fontSize: 15, color: C.textMuted, marginTop: 12 }}>{t.noResults}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {myDecks.map((dk, i) => {
                  const qs = dk.questions || [];
                  return (
                    <div key={dk.id} style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
                      <CIcon name={SUBJ_ICON[dk.subject] || "book"} size={24} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>{dk.title}</div>
                        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{dk.subject} · {dk.grade} · {qs.length} {t.questions} · <LangBadge lang={dk.language} /></div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="cm-btn-secondary" onClick={() => handleTogglePublic(dk)} style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: C.bgSoft, color: dk.is_public ? C.green : C.textMuted, border: `1px solid ${C.border}`, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>
                          {dk.is_public ? t.public : t.private}
                        </button>
                        <button className="cm-btn-danger" onClick={() => handleDelete(dk.id)} style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: C.bg, color: C.red, border: `1px solid ${C.redSoft}`, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{t.delete}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
