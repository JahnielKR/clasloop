import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { CIcon } from "../components/Icons";
import { DeckCover, DECK_COLORS, DECK_ICONS, DEFAULT_DECK_COLOR, DEFAULT_DECK_ICON, SUBJ_ICON } from "../lib/deck-cover";

const C = {
  bg: "#FFFFFF", bgSoft: "#F7F7F5", accent: "#2383E2", accentSoft: "#E8F0FE",
  green: "#0F7B6C", greenSoft: "#EEFBF5", orange: "#D9730D", orangeSoft: "#FFF3E0",
  red: "#E03E3E", redSoft: "#FDECEC", purple: "#6940A5", purpleSoft: "#F3EEFB",
  yellow: "#D4A017", yellowSoft: "#FEF9E7",
  text: "#191919", textSecondary: "#6B6B6B", textMuted: "#9B9B9B",
  border: "#E8E8E4", shadow: "0 1px 3px rgba(0,0,0,0.04)",
};
const MONO = "'JetBrains Mono', monospace";
const SUBJECTS = ["Math", "Science", "History", "Language", "Geography", "Art", "Music", "Other"];
const GRADES = ["6th-7th", "7th-8th", "8th-9th", "9th-10th", "10th-11th", "11th-12th"];

const ACTIVITY_TYPES = [
  { id: "mcq", icon: "mcq", label: { en: "Multiple Choice", es: "Opción Múltiple", ko: "객관식" } },
  { id: "tf", icon: "truefalse", label: { en: "True / False", es: "Verdadero / Falso", ko: "참 / 거짓" } },
  { id: "fill", icon: "fillblank", label: { en: "Fill in the Blank", es: "Completar", ko: "빈칸 채우기" } },
  { id: "order", icon: "ordering", label: { en: "Put in Order", es: "Ordenar", ko: "순서 맞추기" } },
  { id: "match", icon: "matching", label: { en: "Matching Pairs", es: "Emparejar", ko: "짝 맞추기" } },
];

const i18n = {
  en: {
    pageTitle: "Decks", subtitle: "Create and manage your question collections",
    myDecks: "My Decks", following: "Following", create: "+ Create deck",
    title: "Title", titlePlaceholder: "e.g. French Revolution Review",
    description: "Description", descPlaceholder: "What this deck covers...",
    addToClass: "Add to class (optional)", noClass: "No class — general deck",
    subject: "Subject", grade: "Grade", language: "Language", tags: "Tags (comma-separated)",
    tagsPlaceholder: "revolution, europe, history",
    activityType: "Activity type", questions: "Questions", addQuestion: "+ Add question",
    questionText: "Question", option: "Option", removeQuestion: "Remove",
    publish: "Save deck", publishing: "Saving...", makePublic: "Make public to community",
    selectSubject: "Select subject...", selectGrade: "Select grade...",
    back: "Back", noDecks: "No decks yet. Click Create to make your first one.",
    noFollowing: "You haven't saved any decks from the community yet.",
    private: "Private", public: "Public", delete: "Delete", edit: "Edit",
    questionCount: "questions", launchSession: "Launch in class",
    deleteConfirm: "Delete this deck? This cannot be undone.",
    by: "by",
    customize: "Customize", coverColor: "Cover color", coverIcon: "Cover icon",
    preview: "Preview",
  },
  es: {
    pageTitle: "Decks", subtitle: "Crea y gestiona tus colecciones de preguntas",
    myDecks: "Mis Decks", following: "Siguiendo", create: "+ Crear deck",
    title: "Título", titlePlaceholder: "ej. Repaso Revolución Francesa",
    description: "Descripción", descPlaceholder: "Qué cubre este deck...",
    addToClass: "Agregar a clase (opcional)", noClass: "Sin clase — deck general",
    subject: "Materia", grade: "Grado", language: "Idioma", tags: "Etiquetas (separadas por coma)",
    tagsPlaceholder: "revolución, europa, historia",
    activityType: "Tipo de actividad", questions: "Preguntas", addQuestion: "+ Agregar pregunta",
    questionText: "Pregunta", option: "Opción", removeQuestion: "Eliminar",
    publish: "Guardar deck", publishing: "Guardando...", makePublic: "Hacer público en comunidad",
    selectSubject: "Seleccionar materia...", selectGrade: "Seleccionar grado...",
    back: "Volver", noDecks: "Sin decks aún. Click Crear para hacer tu primero.",
    noFollowing: "No has guardado decks de la comunidad aún.",
    private: "Privado", public: "Público", delete: "Eliminar", edit: "Editar",
    questionCount: "preguntas", launchSession: "Lanzar en clase",
    deleteConfirm: "¿Eliminar este deck? No se puede deshacer.",
    by: "por",
    customize: "Personalizar", coverColor: "Color de portada", coverIcon: "Icono de portada",
    preview: "Vista previa",
  },
  ko: {
    pageTitle: "덱", subtitle: "문제 모음을 만들고 관리하세요",
    myDecks: "내 덱", following: "팔로잉", create: "+ 덱 만들기",
    title: "제목", titlePlaceholder: "예: 프랑스 혁명 복습",
    description: "설명", descPlaceholder: "이 덱의 내용...",
    addToClass: "수업에 추가 (선택)", noClass: "수업 없음 — 일반 덱",
    subject: "과목", grade: "학년", language: "언어", tags: "태그 (쉼표 구분)",
    tagsPlaceholder: "혁명, 유럽, 역사",
    activityType: "활동 유형", questions: "문제", addQuestion: "+ 문제 추가",
    questionText: "문제", option: "선택지", removeQuestion: "삭제",
    publish: "덱 저장", publishing: "저장 중...", makePublic: "커뮤니티에 공개",
    selectSubject: "과목 선택...", selectGrade: "학년 선택...",
    back: "뒤로", noDecks: "아직 덱이 없습니다. 만들기를 클릭하세요.",
    noFollowing: "아직 커뮤니티에서 저장한 덱이 없습니다.",
    private: "비공개", public: "공개", delete: "삭제", edit: "편집",
    questionCount: "문제", launchSession: "수업에서 시작",
    deleteConfirm: "이 덱을 삭제하시겠습니까?",
    by: "",
    customize: "커스터마이즈", coverColor: "커버 색상", coverIcon: "커버 아이콘",
    preview: "미리보기",
  },
};

const css = `
  .dk-tab { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .dk-tab:hover { background: #E8F0FE !important; border-color: #2383E244 !important; color: #2383E2 !important; }
  .dk-card { transition: all .2s ease; cursor: pointer; }
  .dk-card:hover { border-color: #2383E244 !important; box-shadow: 0 4px 16px rgba(35,131,226,.1) !important; transform: translateY(-2px); }
  .dk-btn { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .dk-btn:hover { transform: translateY(-1px); filter: brightness(1.05); }
  .dk-btn-secondary:hover { background: #E8F0FE !important; border-color: #2383E244 !important; color: #2383E2 !important; }
  .dk-btn-danger:hover { background: #E03E3E !important; color: #fff !important; }
  .dk-pill { transition: all .15s ease; cursor: pointer; }
  .dk-pill:hover { background: #E8F0FE !important; border-color: #2383E244 !important; color: #2383E2 !important; }
  .dk-color-swatch:hover { transform: scale(1.1); }
  .dk-color-swatch:active { transform: scale(.95); }
  .dk-icon-btn:hover { background: #F5F9FF !important; border-color: #2383E2 !important; transform: translateY(-1px); }
  .dk-icon-btn:active { transform: scale(.95); }
  .dk-input { transition: border-color .15s, box-shadow .15s; }
  .dk-input:hover { border-color: #2383E266 !important; }
  .dk-input:focus { border-color: #2383E2 !important; box-shadow: 0 0 0 3px #E8F0FE !important; }
  .dk-back { transition: all .15s ease; cursor: pointer; }
  .dk-back:hover { background: #E8F0FE !important; }
  .dk-q-card { transition: all .2s ease; }
  .dk-q-card:hover { border-color: #2383E233 !important; }
  .dk-lang { transition: all .12s ease; cursor: pointer; }
  .dk-lang:hover { background: #E8F0FE !important; color: #2383E2 !important; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  .fade-up { animation: fadeUp .3s ease-out both; }
`;

const inp = { fontFamily: "'Outfit',sans-serif", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: "10px 14px", borderRadius: 8, fontSize: 14, width: "100%", outline: "none" };
const sel = { ...inp, cursor: "pointer", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%239B9B9B' stroke-width='1.5'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 32 };

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
            <button key={c} className="dk-lang" onClick={() => setLang(c)} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: lang === c ? C.bg : "transparent", color: lang === c ? C.text : C.textMuted, border: "none", boxShadow: lang === c ? "0 1px 2px rgba(0,0,0,0.06)" : "none" }}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Create Deck Editor ─────────────────────────────
function CreateDeckEditor({ t, l, onBack, onCreated, userId, userClasses, existingDeck }) {
  const [title, setTitle] = useState(existingDeck?.title || "");
  const [desc, setDesc] = useState(existingDeck?.description || "");
  const [subject, setSubject] = useState(existingDeck?.subject || "");
  const [grade, setGrade] = useState(existingDeck?.grade || "");
  const [deckLang, setDeckLang] = useState(existingDeck?.language || l);
  const [tags, setTags] = useState((existingDeck?.tags || []).join(", "));
  const [classId, setClassId] = useState(existingDeck?.class_id || "");
  const [makePublic, setMakePublic] = useState(existingDeck?.is_public || false);
  const [activityType, setActivityType] = useState(existingDeck?.questions?.[0]?.type || "mcq");
  const [questions, setQuestions] = useState(existingDeck?.questions || []);
  const [saving, setSaving] = useState(false);
  const [coverColor, setCoverColor] = useState(existingDeck?.cover_color || DEFAULT_DECK_COLOR);
  const [coverIcon, setCoverIcon] = useState(existingDeck?.cover_icon || (existingDeck?.subject && SUBJ_ICON[existingDeck.subject]) || DEFAULT_DECK_ICON);

  const addQuestion = () => {
    let newQ;
    if (activityType === "mcq") newQ = { type: "mcq", q: "", options: ["", "", "", ""], correct: 0 };
    else if (activityType === "tf") newQ = { type: "tf", q: "", correct: true };
    else if (activityType === "fill") newQ = { type: "fill", q: "", answer: "" };
    else if (activityType === "order") newQ = { type: "order", q: "", items: ["", "", "", ""] };
    else if (activityType === "match") newQ = { type: "match", q: "", pairs: [{ left: "", right: "" }, { left: "", right: "" }, { left: "", right: "" }] };
    setQuestions(prev => [...prev, newQ]);
  };

  const updateQ = (idx, field, val) => setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: val } : q));
  const updateOption = (qIdx, optIdx, val) => setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, options: q.options.map((o, j) => j === optIdx ? val : o) } : q));
  const updateItem = (qIdx, itemIdx, val) => setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, items: q.items.map((it, j) => j === itemIdx ? val : it) } : q));
  const updatePair = (qIdx, pairIdx, side, val) => setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, pairs: q.pairs.map((p, j) => j === pairIdx ? { ...p, [side]: val } : p) } : q));
  const removeQ = (idx) => setQuestions(prev => prev.filter((_, i) => i !== idx));

  const canSave = title.trim() && subject && grade && questions.length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const tagArr = tags.split(",").map(t => t.trim()).filter(Boolean);
    const payload = {
      author_id: userId, class_id: classId || null, title: title.trim(), description: desc.trim(),
      subject, grade, language: deckLang, questions, tags: tagArr, is_public: makePublic,
      cover_color: coverColor, cover_icon: coverIcon,
    };
    if (existingDeck) {
      await supabase.from("decks").update(payload).eq("id", existingDeck.id);
      onCreated({ ...existingDeck, ...payload });
    } else {
      const { data } = await supabase.from("decks").insert(payload).select().single();
      if (data) onCreated(data);
    }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <button className="dk-back" onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: C.accent, background: C.accentSoft, border: "none", marginBottom: 20, fontFamily: "'Outfit',sans-serif" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12L11 6M5 12L11 18" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        {t.back}
      </button>

      <div className="fade-up" style={{ background: C.bg, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24, marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, fontFamily: "'Outfit'" }}>{existingDeck ? t.edit : t.create}</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.title} *</label>
            <input className="dk-input" value={title} onChange={e => setTitle(e.target.value)} placeholder={t.titlePlaceholder} style={inp} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.description}</label>
            <textarea className="dk-input" value={desc} onChange={e => setDesc(e.target.value)} placeholder={t.descPlaceholder} style={{ ...inp, minHeight: 60, resize: "vertical" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.addToClass}</label>
            <select className="dk-input" value={classId} onChange={e => {
              const id = e.target.value;
              setClassId(id);
              if (id) {
                const cls = userClasses.find(c => c.id === id);
                if (cls) { setSubject(cls.subject); setGrade(cls.grade); }
              }
            }} style={sel}>
              <option value="">{t.noClass}</option>
              {userClasses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.subject} · {c.grade})</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.subject} *</label>
              <select className="dk-input" value={subject} onChange={e => setSubject(e.target.value)} style={sel}>
                <option value="">{t.selectSubject}</option>
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.grade} *</label>
              <select className="dk-input" value={grade} onChange={e => setGrade(e.target.value)} style={sel}>
                <option value="">{t.selectGrade}</option>
                {GRADES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.language}</label>
              <select className="dk-input" value={deckLang} onChange={e => setDeckLang(e.target.value)} style={sel}>
                <option value="en">English</option><option value="es">Español</option><option value="ko">한국어</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.tags}</label>
            <input className="dk-input" value={tags} onChange={e => setTags(e.target.value)} placeholder={t.tagsPlaceholder} style={inp} />
          </div>

          {/* ── Customize: Cover color + icon ── */}
          <div style={{ background: C.bgSoft, borderRadius: 10, padding: 14, border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <DeckCover deck={{ cover_color: coverColor, cover_icon: coverIcon }} size={56} radius={12} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{t.customize}</div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title || t.titlePlaceholder}</div>
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 6 }}>{t.coverColor}</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {DECK_COLORS.map(col => (
                  <button
                    key={col.id}
                    type="button"
                    aria-label={col.label}
                    title={col.label}
                    onClick={() => setCoverColor(col.id)}
                    className="dk-color-swatch"
                    style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: col.value,
                      border: coverColor === col.id ? `2.5px solid ${C.text}` : `2px solid transparent`,
                      cursor: "pointer", padding: 0,
                      boxShadow: coverColor === col.id ? `0 0 0 2px ${C.bg}, 0 2px 6px ${col.value}55` : `0 1px 3px ${col.value}33`,
                      transition: "all .15s ease",
                    }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 6 }}>{t.coverIcon}</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 4 }}>
                {DECK_ICONS.map(ic => (
                  <button
                    key={ic}
                    type="button"
                    aria-label={ic}
                    title={ic}
                    onClick={() => setCoverIcon(ic)}
                    className="dk-icon-btn"
                    style={{
                      aspectRatio: "1 / 1",
                      borderRadius: 8,
                      background: coverIcon === ic ? C.accentSoft : C.bg,
                      border: `1.5px solid ${coverIcon === ic ? C.accent : C.border}`,
                      cursor: "pointer", padding: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all .15s ease",
                    }}
                  >
                    <CIcon name={ic} size={18} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 8 }}>{t.activityType}</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {ACTIVITY_TYPES.map(at => (
                <button key={at.id} className="dk-pill" onClick={() => { setActivityType(at.id); }} style={{
                  padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                  background: activityType === at.id ? C.accentSoft : C.bg,
                  color: activityType === at.id ? C.accent : C.textSecondary,
                  border: `1px solid ${activityType === at.id ? C.accent + "33" : C.border}`,
                  cursor: "pointer", fontFamily: "'Outfit',sans-serif",
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  <CIcon name={at.icon} size={14} inline /> {at.label[l]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="fade-up" style={{ animationDelay: ".1s" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>{t.questions} ({questions.length})</h3>
          <button className="dk-btn" onClick={addQuestion} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: C.accentSoft, color: C.accent }}>{t.addQuestion}</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {questions.map((q, qi) => (
            <div key={qi} className="dk-q-card" style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: C.textMuted }}>Q{qi + 1} · {ACTIVITY_TYPES.find(a => a.id === (q.type || activityType))?.label[l]}</span>
                <button className="dk-btn-danger" onClick={() => removeQ(qi)} style={{ fontSize: 11, color: C.red, background: "transparent", border: "none", padding: "2px 8px", borderRadius: 4, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{t.removeQuestion}</button>
              </div>
              <input className="dk-input" value={q.q} onChange={e => updateQ(qi, "q", e.target.value)} placeholder={t.questionText} style={{ ...inp, marginBottom: 10 }} />

              {/* MCQ */}
              {(q.type === "mcq" || (!q.type && activityType === "mcq")) && q.options && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {q.options.map((o, oi) => (
                    <div key={oi} style={{ position: "relative" }}>
                      <input className="dk-input" value={o} onChange={e => updateOption(qi, oi, e.target.value)} placeholder={`${t.option} ${oi + 1}`} style={{ ...inp, paddingRight: 36, background: q.correct === oi ? C.greenSoft : C.bg, borderColor: q.correct === oi ? C.green + "44" : C.border }} />
                      <button onClick={() => updateQ(qi, "correct", oi)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 20, height: 20, borderRadius: "50%", border: `2px solid ${q.correct === oi ? C.green : C.border}`, background: q.correct === oi ? C.green : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff" }}>
                        {q.correct === oi && "✓"}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* True/False */}
              {(q.type === "tf" || (!q.type && activityType === "tf")) && (
                <div style={{ display: "flex", gap: 6 }}>
                  {[true, false].map(v => (
                    <button key={String(v)} className="dk-pill" onClick={() => updateQ(qi, "correct", v)} style={{
                      flex: 1, padding: "10px 14px", borderRadius: 8, fontSize: 14, fontWeight: 600,
                      background: q.correct === v ? C.greenSoft : C.bgSoft,
                      color: q.correct === v ? C.green : C.textMuted,
                      border: `1px solid ${q.correct === v ? C.green + "44" : C.border}`,
                      cursor: "pointer", fontFamily: "'Outfit',sans-serif",
                    }}>{v ? "True" : "False"}</button>
                  ))}
                </div>
              )}

              {/* Fill */}
              {(q.type === "fill" || (!q.type && activityType === "fill")) && (
                <input className="dk-input" value={q.answer || ""} onChange={e => updateQ(qi, "answer", e.target.value)} placeholder="Correct answer" style={{ ...inp, background: C.greenSoft, borderColor: C.green + "44" }} />
              )}

              {/* Order */}
              {(q.type === "order" || (!q.type && activityType === "order")) && q.items && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {q.items.map((it, ii) => (
                    <div key={ii} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 22, height: 22, borderRadius: 5, background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{ii + 1}</span>
                      <input className="dk-input" value={it} onChange={e => updateItem(qi, ii, e.target.value)} placeholder={`Step ${ii + 1}`} style={inp} />
                    </div>
                  ))}
                </div>
              )}

              {/* Match */}
              {(q.type === "match" || (!q.type && activityType === "match")) && q.pairs && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {q.pairs.map((p, pi) => (
                    <div key={pi} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input className="dk-input" value={p.left} onChange={e => updatePair(qi, pi, "left", e.target.value)} placeholder="Left" style={{ ...inp, fontFamily: MONO, fontWeight: 600 }} />
                      <span style={{ color: C.textMuted }}>→</span>
                      <input className="dk-input" value={p.right} onChange={e => updatePair(qi, pi, "right", e.target.value)} placeholder="Right" style={inp} />
                    </div>
                  ))}
                </div>
              )}
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

      {/* Make public toggle */}
      <div style={{ marginTop: 16, padding: 14, borderRadius: 10, background: C.bgSoft, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{t.makePublic}</div>
        </div>
        <button onClick={() => setMakePublic(!makePublic)} style={{ width: 44, height: 24, borderRadius: 12, padding: 2, background: makePublic ? C.accent : C.border, border: "none", display: "flex", alignItems: "center", cursor: "pointer" }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", transform: makePublic ? "translateX(20px)" : "translateX(0)", transition: "transform .2s", boxShadow: "0 1px 3px rgba(0,0,0,.15)" }} />
        </button>
      </div>

      {/* Save */}
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button className="dk-btn" onClick={handleSave} disabled={!canSave || saving} style={{
          flex: 1, padding: 14, borderRadius: 10, fontSize: 15, fontWeight: 600,
          background: canSave ? `linear-gradient(135deg, ${C.accent}, ${C.purple})` : C.border,
          color: "#fff", opacity: canSave && !saving ? 1 : 0.4,
        }}>{saving ? t.publishing : t.publish}</button>
      </div>
    </div>
  );
}

// ─── Main ───────────────────────────────────────────
export default function Decks({ lang: pageLang = "en", setLang: pageSetLang }) {
  const [lang, setLangLocal] = useState(pageLang);
  const setLang = pageSetLang || setLangLocal;
  const l = pageLang || lang;
  const [view, setView] = useState("list"); // list | create | edit
  const [tab, setTab] = useState("myDecks");
  const [myDecks, setMyDecks] = useState([]);
  const [followingDecks, setFollowingDecks] = useState([]);
  const [userId, setUserId] = useState(null);
  const [userClasses, setUserClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const t = i18n[l] || i18n.en;

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id);
    if (!user) { setLoading(false); return; }

    const { data: cls } = await supabase.from("classes").select("*").eq("teacher_id", user.id).order("created_at", { ascending: false });
    setUserClasses(cls || []);

    // My decks: created by user (not from community)
    const { data: mine } = await supabase.from("decks").select("*").eq("author_id", user.id).order("created_at", { ascending: false });
    // Split: original mine vs copies from community
    // Following = decks where author is current user but were copied (we'll track via a tag or description)
    // For simplicity: My Decks = all author_id = me. Following = none for now (until we add proper following table)
    setMyDecks(mine || []);
    // For now Following is empty - we'll implement following with a separate logic later
    setFollowingDecks([]);

    setLoading(false);
  };

  const handleDelete = async (deckId) => {
    if (!confirm(t.deleteConfirm)) return;
    await supabase.from("decks").delete().eq("id", deckId);
    setMyDecks(prev => prev.filter(d => d.id !== deckId));
  };

  const handleTogglePublic = async (deck) => {
    const newPublic = !deck.is_public;
    await supabase.from("decks").update({ is_public: newPublic }).eq("id", deck.id);
    setMyDecks(prev => prev.map(d => d.id === deck.id ? { ...d, is_public: newPublic } : d));
  };

  if (view === "create" || view === "edit") return (
    <div style={{ padding: "28px 20px" }}>
      <style>{css}</style>
      <PageHeader title={t.pageTitle} icon="book" lang={l} setLang={setLang} />
      <CreateDeckEditor t={t} l={l} onBack={() => { setView("list"); setEditing(null); }} userId={userId} userClasses={userClasses} existingDeck={editing} onCreated={(d) => {
        if (editing) setMyDecks(prev => prev.map(dk => dk.id === d.id ? d : dk));
        else setMyDecks(prev => [d, ...prev]);
        setView("list"); setEditing(null);
      }} />
    </div>
  );

  return (
    <div style={{ padding: "28px 20px" }}>
      <style>{css}</style>
      <PageHeader title={t.pageTitle} icon="book" lang={l} setLang={setLang} />

      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <p style={{ fontSize: 14, color: C.textSecondary, marginBottom: 20 }}>{t.subtitle}</p>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 8 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {[["myDecks", t.myDecks, myDecks.length], ["following", t.following, followingDecks.length]].map(([id, label, count]) => (
              <button key={id} className="dk-tab" onClick={() => setTab(id)} style={{
                padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: tab === id ? C.accentSoft : C.bg,
                color: tab === id ? C.accent : C.textSecondary,
                border: `1px solid ${tab === id ? C.accent + "33" : C.border}`,
                display: "flex", alignItems: "center", gap: 6,
              }}>{label} {count > 0 && <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 8, background: tab === id ? C.accent : C.bgSoft, color: tab === id ? "#fff" : C.textMuted, fontWeight: 700 }}>{count}</span>}</button>
            ))}
          </div>
          <button className="dk-btn" onClick={() => setView("create")} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, color: "#fff" }}>{t.create}</button>
        </div>

        {loading ? (
          <p style={{ textAlign: "center", color: C.textMuted, padding: 40 }}>Loading...</p>
        ) : tab === "myDecks" ? (
          myDecks.length === 0 ? (
            <div className="fade-up" style={{ textAlign: "center", padding: 48 }}>
              <CIcon name="book" size={36} />
              <p style={{ fontSize: 15, color: C.textMuted, marginTop: 12 }}>{t.noDecks}</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {myDecks.map((dk, i) => {
                const qs = dk.questions || [];
                const cls = userClasses.find(c => c.id === dk.class_id);
                return (
                  <div key={dk.id} className="dk-card fade-up" style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16, animationDelay: `${i * .04}s` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <DeckCover deck={dk} size={48} radius={11} />
                      <div style={{ flex: 1, cursor: "pointer", minWidth: 0 }} onClick={() => { setEditing(dk); setView("edit"); }}>
                        <div style={{ fontSize: 15, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dk.title}</div>
                        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                          {dk.subject} · {dk.grade} · {qs.length} {t.questionCount}
                          {cls && <> · <strong style={{ color: C.accent }}>{cls.name}</strong></>}
                          {" · "}<LangBadge lang={dk.language} />
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="dk-btn-secondary" onClick={() => handleTogglePublic(dk)} style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: C.bgSoft, color: dk.is_public ? C.green : C.textMuted, border: `1px solid ${C.border}`, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{dk.is_public ? t.public : t.private}</button>
                        <button className="dk-btn-secondary" onClick={() => { setEditing(dk); setView("edit"); }} style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: C.bg, color: C.textSecondary, border: `1px solid ${C.border}`, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{t.edit}</button>
                        <button className="dk-btn-danger" onClick={() => handleDelete(dk.id)} style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: C.bg, color: C.red, border: `1px solid ${C.redSoft}`, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{t.delete}</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          followingDecks.length === 0 ? (
            <div className="fade-up" style={{ textAlign: "center", padding: 48 }}>
              <CIcon name="globe" size={36} />
              <p style={{ fontSize: 15, color: C.textMuted, marginTop: 12 }}>{t.noFollowing}</p>
            </div>
          ) : (
            <div>{/* TODO: show followed decks */}</div>
          )
        )}
      </div>
    </div>
  );
}
