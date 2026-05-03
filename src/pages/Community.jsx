import { useState } from "react";
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

const SUBJ_ICON = { Math: "math", Science: "science", History: "history", Language: "language", Geography: "geo", Art: "art", Music: "music", Matemáticas: "math", Ciencias: "science", Historia: "history", Lengua: "language", Geografía: "geo", Arte: "art", Música: "music", 수학: "math", 과학: "science", 역사: "history", 국어: "language", 지리: "geo", 미술: "art" };

const DECKS = [
  { id: 1, title: { en: "French Revolution — Complete", es: "Revolución Francesa — Completo", ko: "프랑스 혁명 — 전체" }, subject: { en: "History", es: "Historia", ko: "역사" }, grade: { en: "8th-9th", es: "8°-9°", ko: "중2-중3" }, author: "María González", initials: "MG", color: C.purple, lang: "es", questions: 24, uses: 1847, rating: 4.8, reviews: 132, tags: { en: ["revolution", "Europe"], es: ["revolución", "Europa"], ko: ["혁명", "유럽"] }, featured: true, desc: { en: "Comprehensive deck covering causes, key events, and consequences of the French Revolution.", es: "Deck completo sobre causas, eventos clave y consecuencias de la Revolución Francesa.", ko: "프랑스 혁명의 원인, 주요 사건, 결과를 다루는 종합 덱." }, preview: [{ q: "What year did the French Revolution begin?", options: ["1776", "1789", "1804", "1815"], correct: 1 }, { q: "What was the Bastille?", options: ["A palace", "A prison-fortress", "A church", "A market"], correct: 1 }] },
  { id: 2, title: { en: "Quadratic Equations Basics", es: "Ecuaciones Cuadráticas", ko: "이차방정식 기초" }, subject: { en: "Math", es: "Matemáticas", ko: "수학" }, grade: { en: "8th-9th", es: "8°-9°", ko: "중2-중3" }, author: "James Park", initials: "JP", color: C.accent, lang: "en", questions: 18, uses: 2341, rating: 4.9, reviews: 198, tags: { en: ["algebra", "equations"], es: ["álgebra", "ecuaciones"], ko: ["대수", "방정식"] }, featured: true, desc: { en: "Master the quadratic formula, discriminant, and graphing parabolas.", es: "Domina la fórmula cuadrática y graficación de parábolas.", ko: "근의 공식과 포물선 그래프를 마스터하세요." }, preview: [{ q: "What is the quadratic formula?", options: ["x = -b/2a", "x = (-b±√(b²-4ac))/2a", "x = a²+b²", "x = -b/a"], correct: 1 }] },
  { id: 3, title: { en: "Photosynthesis Deep Dive", es: "Fotosíntesis a Fondo", ko: "광합성 심화" }, subject: { en: "Science", es: "Ciencias", ko: "과학" }, grade: { en: "7th-8th", es: "7°-8°", ko: "중1-중2" }, author: "Yuna Kim", initials: "YK", color: C.green, lang: "ko", questions: 15, uses: 987, rating: 4.7, reviews: 76, tags: { en: ["biology", "plants"], es: ["biología", "plantas"], ko: ["생물", "식물"] }, featured: false, desc: { en: "Everything about photosynthesis — light reactions, Calvin cycle, chloroplast.", es: "Todo sobre fotosíntesis — reacciones lumínicas, ciclo de Calvin.", ko: "광합성의 모든 것 — 명반응, 캘빈 회로." }, preview: [] },
  { id: 4, title: { en: "World War II Timeline", es: "Segunda Guerra Mundial", ko: "제2차 세계대전" }, subject: { en: "History", es: "Historia", ko: "역사" }, grade: { en: "9th-10th", es: "9°-10°", ko: "중3-고1" }, author: "Carlos Ruiz", initials: "CR", color: C.orange, lang: "es", questions: 30, uses: 3102, rating: 4.6, reviews: 215, tags: { en: ["war", "20th century"], es: ["guerra", "siglo XX"], ko: ["전쟁", "20세기"] }, featured: false, desc: { en: "Chronological review from 1939 to 1945. Major battles and key figures.", es: "Repaso cronológico de 1939 a 1945. Batallas principales y figuras clave.", ko: "1939~1945년 연대순 복습." }, preview: [] },
  { id: 5, title: { en: "Cell Division & Mitosis", es: "División Celular", ko: "세포 분열" }, subject: { en: "Science", es: "Ciencias", ko: "과학" }, grade: { en: "8th-9th", es: "8°-9°", ko: "중2-중3" }, author: "Emma Watson", initials: "EW", color: C.red, lang: "en", questions: 12, uses: 654, rating: 4.5, reviews: 43, tags: { en: ["biology", "cells"], es: ["biología", "células"], ko: ["생물", "세포"] }, featured: false, desc: { en: "Phases of mitosis, comparison with meiosis, and cell cycle.", es: "Fases de la mitosis y comparación con meiosis.", ko: "유사분열 단계와 감수분열 비교." }, preview: [] },
  { id: 6, title: { en: "Geography: Continents", es: "Geografía: Continentes", ko: "지리: 대륙" }, subject: { en: "Geography", es: "Geografía", ko: "지리" }, grade: { en: "6th-7th", es: "6°-7°", ko: "중1" }, author: "Sofía Martínez", initials: "SM", color: C.purple, lang: "es", questions: 16, uses: 2890, rating: 4.9, reviews: 187, tags: { en: ["continents", "oceans"], es: ["continentes", "océanos"], ko: ["대륙", "대양"] }, featured: true, desc: { en: "Complete world geography — continents, oceans, rivers, capitals.", es: "Geografía mundial completa — continentes, océanos, ríos, capitales.", ko: "세계 지리 전체 복습." }, preview: [] },
  { id: 7, title: { en: "Shakespeare Intro", es: "Shakespeare", ko: "셰익스피어" }, subject: { en: "Language", es: "Lengua", ko: "국어" }, grade: { en: "9th-10th", es: "9°-10°", ko: "중3-고1" }, author: "David Chen", initials: "DC", color: C.accent, lang: "en", questions: 14, uses: 445, rating: 4.3, reviews: 28, tags: { en: ["literature", "drama"], es: ["literatura", "drama"], ko: ["문학", "드라마"] }, featured: false, desc: { en: "Introduction to Shakespeare — Romeo & Juliet, Hamlet, Macbeth.", es: "Introducción a Shakespeare.", ko: "셰익스피어 작품 소개." }, preview: [] },
];

const i18n = {
  en: { pageTitle: "Community", subtitle: "Ready-made review decks shared by teachers worldwide", search: "Search topics, subjects...", allSubjects: "All subjects", allLanguages: "All languages", featured: "Featured", mostUsed: "Most used", topRated: "Top rated", newest: "Newest", questions: "questions", uses: "uses", reviews: "reviews", addToClass: "Add to my class", added: "Added!", preview: "Preview", publishNew: "+ Publish deck", by: "by", grade: "Grade", tags: "Tags", noResults: "No decks found. Try different filters.", back: "Back", subjects: ["Math", "Science", "History", "Language", "Geography", "Art"], langs: ["English", "Spanish", "Korean"] },
  es: { pageTitle: "Comunidad", subtitle: "Decks de repaso creados por profesores de todo el mundo", search: "Buscar temas, materias...", allSubjects: "Todas las materias", allLanguages: "Todos los idiomas", featured: "Destacado", mostUsed: "Más usados", topRated: "Mejor valorados", newest: "Más recientes", questions: "preguntas", uses: "usos", reviews: "reseñas", addToClass: "Agregar a mi clase", added: "¡Agregado!", preview: "Vista previa", publishNew: "+ Publicar deck", by: "por", grade: "Grado", tags: "Etiquetas", noResults: "No se encontraron decks.", back: "Volver", subjects: ["Matemáticas", "Ciencias", "Historia", "Lengua", "Geografía", "Arte"], langs: ["Inglés", "Español", "Coreano"] },
  ko: { pageTitle: "커뮤니티", subtitle: "전 세계 교사들이 공유한 복습 덱", search: "주제, 과목 검색...", allSubjects: "모든 과목", allLanguages: "모든 언어", featured: "추천", mostUsed: "최다 사용", topRated: "최고 평점", newest: "최신순", questions: "문제", uses: "사용", reviews: "리뷰", addToClass: "내 수업에 추가", added: "추가됨!", preview: "미리보기", publishNew: "+ 덱 공유", by: "", grade: "학년", tags: "태그", noResults: "덱을 찾을 수 없습니다.", back: "뒤로", subjects: ["수학", "과학", "역사", "국어", "지리", "미술"], langs: ["영어", "스페인어", "한국어"] },
};

const css = `
  .cm-card { transition: all .2s ease; cursor: pointer; }
  .cm-card:hover { border-color: #2383E244 !important; box-shadow: 0 4px 16px rgba(35,131,226,.1) !important; transform: translateY(-2px); }
  .cm-card:active { transform: translateY(0); }
  .cm-filter { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .cm-filter:hover { background: #E8F0FE !important; border-color: #2383E244 !important; color: #2383E2 !important; }
  .cm-sort { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .cm-sort:hover { background: #E8F0FE !important; color: #2383E2 !important; }
  .cm-tag { transition: all .15s ease; }
  .cm-tag:hover { background: #E8F0FE !important; border-color: #2383E244 !important; }
  .cm-btn { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .cm-btn:hover { transform: translateY(-1px); filter: brightness(1.05); }
  .cm-btn:active { transform: translateY(0) scale(.97); }
  .cm-btn-secondary:hover { background: #E8F0FE !important; border-color: #2383E244 !important; color: #2383E2 !important; }
  .cm-back { transition: all .15s ease; cursor: pointer; }
  .cm-back:hover { background: #E8F0FE !important; }
  .cm-option { transition: all .15s ease; }
  .cm-option:hover { border-color: #2383E244 !important; background: #FAFBFF !important; }
  .cm-input { transition: border-color .15s, box-shadow .15s; }
  .cm-input:hover { border-color: #2383E266 !important; }
  .cm-input:focus { border-color: #2383E2 !important; box-shadow: 0 0 0 3px #E8F0FE !important; }
  .cm-lang { transition: all .12s ease; cursor: pointer; }
  .cm-lang:hover { background: #E8F0FE !important; color: #2383E2 !important; }
  .cm-avatar { transition: all .15s ease; }
  .cm-avatar:hover { transform: scale(1.1); }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  .fade-up { animation: fadeUp .3s ease-out both; }
`;

const inp = { fontFamily: "'Outfit',sans-serif", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: "10px 14px", borderRadius: 8, fontSize: 14, width: "100%", outline: "none" };
const sel = { ...inp, cursor: "pointer", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%239B9B9B' stroke-width='1.5'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 32 };

const Stars = ({ rating, size = 13 }) => (
  <span style={{ display: "inline-flex", gap: 1, fontSize: size, color: C.yellow }}>
    {"★".repeat(Math.floor(rating))}{rating - Math.floor(rating) >= 0.5 ? "½" : ""}
    <span style={{ color: C.border }}>{"★".repeat(5 - Math.floor(rating) - (rating - Math.floor(rating) >= 0.5 ? 1 : 0))}</span>
  </span>
);

const LangBadge = ({ lang }) => {
  const l = { en: "EN", es: "ES", ko: "한" };
  const c = { en: C.accent, es: C.orange, ko: C.green };
  return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: c[lang] + "14", color: c[lang] }}>{l[lang]}</span>;
};

const AvatarCircle = ({ initials, color, size = 24 }) => (
  <div className="cm-avatar" style={{ width: size, height: size, borderRadius: "50%", background: color + "18", border: `1.5px solid ${color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.4, fontWeight: 600, color, flexShrink: 0 }}>{initials}</div>
);

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

// ─── Deck Detail ────────────────────────────────────
function DeckDetail({ deck, l, t, onBack }) {
  const [added, setAdded] = useState(false);
  const icon = SUBJ_ICON[deck.subject[l]] || "book";

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <button className="cm-back" onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: C.accent, background: C.accentSoft, border: "none", marginBottom: 20, fontFamily: "'Outfit',sans-serif" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12L11 6M5 12L11 18" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        {t.back}
      </button>

      <div className="fade-up" style={{ background: C.bg, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <CIcon name={icon} size={28} />
          <div>
            <span style={{ fontSize: 12, color: C.textMuted }}>{deck.subject[l]} · {deck.grade[l]}</span>
            <div style={{ marginTop: 2 }}><LangBadge lang={deck.lang} /></div>
          </div>
          {deck.featured && <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: C.yellowSoft, color: C.yellow, display: "flex", alignItems: "center", gap: 4 }}><CIcon name="star" size={10} inline /> {t.featured}</span>}
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, fontFamily: "'Outfit'" }}>{deck.title[l]}</h2>
        <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.5, marginBottom: 16 }}>{deck.desc[l]}</p>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Stars rating={deck.rating} size={15} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>{deck.rating}</span>
          <span style={{ fontSize: 12, color: C.textMuted }}>({deck.reviews} {t.reviews})</span>
        </div>

        <div style={{ display: "flex", gap: 16, fontSize: 13, color: C.textMuted, marginBottom: 16, padding: "12px 0", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontFamily: MONO, fontWeight: 600, color: C.text }}>{deck.questions}</span> {t.questions}
          <span style={{ fontFamily: MONO, fontWeight: 600, color: C.text }}>{deck.uses.toLocaleString()}</span> {t.uses}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <AvatarCircle initials={deck.initials} color={deck.color} size={28} />
          <span style={{ fontSize: 13, color: C.textSecondary }}>{t.by} {deck.author}</span>
        </div>

        {(deck.tags[l] || []).length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            {deck.tags[l].map((tag, i) => <span key={i} className="cm-tag" style={{ padding: "4px 10px", borderRadius: 6, background: C.bgSoft, border: `1px solid ${C.border}`, fontSize: 12, color: C.textSecondary }}>#{tag}</span>)}
          </div>
        )}

        <button className={added ? "cm-btn" : "cm-btn"} onClick={() => setAdded(true)} style={{
          width: "100%", padding: 14, borderRadius: 10, fontSize: 15, fontWeight: 600,
          background: added ? C.greenSoft : C.accent, color: added ? C.green : "#fff",
          border: added ? `1px solid ${C.green}33` : "none",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          {added ? <><CIcon name="check" size={14} inline /> {t.added}</> : t.addToClass}
        </button>
      </div>

      {/* Question preview */}
      {deck.preview && deck.preview.length > 0 && (
        <div className="fade-up" style={{ animationDelay: ".1s" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <CIcon name="question" size={16} inline /> {t.preview}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {deck.preview.map((q, i) => (
              <div key={i} style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
                <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>Q{i + 1}</p>
                <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 10, lineHeight: 1.4 }}>{q.q}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {q.options.map((o, j) => (
                    <div key={j} className="cm-option" style={{ padding: "7px 10px", borderRadius: 6, fontSize: 13, background: j === q.correct ? C.greenSoft : C.bgSoft, color: j === q.correct ? C.green : C.textSecondary, fontWeight: j === q.correct ? 500 : 400, border: `1px solid ${j === q.correct ? C.green + "33" : "transparent"}` }}>{o}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ───────────────────────────────────────────
export default function Community({ lang: pageLang = "en", setLang: pageSetLang }) {
  const [lang, setLangLocal] = useState(pageLang);
  const setLang = pageSetLang || setLangLocal;
  const l = pageLang || lang;
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [deckLang, setDeckLang] = useState("");
  const [sort, setSort] = useState("uses");
  const [selectedDeck, setSelectedDeck] = useState(null);
  const t = i18n[l] || i18n.en;

  const filtered = DECKS
    .filter(dk => {
      const q = search.toLowerCase();
      if (q && !dk.title[l].toLowerCase().includes(q) && !(dk.tags[l] || []).some(tg => tg.includes(q))) return false;
      if (subject && dk.subject[l] !== subject) return false;
      if (deckLang && dk.lang !== deckLang) return false;
      return true;
    })
    .sort((a, b) => sort === "uses" ? b.uses - a.uses : sort === "rating" ? b.rating - a.rating : b.id - a.id);

  return (
    <div style={{ padding: "28px 20px" }}>
      <style>{css}</style>
      <PageHeader title={t.pageTitle} icon="globe" lang={l} setLang={setLang} />

      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {selectedDeck ? (
          <DeckDetail deck={selectedDeck} l={l} t={t} onBack={() => setSelectedDeck(null)} />
        ) : (
          <>
            <p style={{ fontSize: 14, color: C.textSecondary, marginBottom: 20 }}>{t.subtitle}</p>

            {/* Search + Filters */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 2, minWidth: 200, position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}><CIcon name="target" size={14} inline /></span>
                <input className="cm-input" value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search} style={{ ...inp, paddingLeft: 38 }} />
              </div>
              <select className="cm-input" value={subject} onChange={e => setSubject(e.target.value)} style={{ ...sel, flex: 1, minWidth: 130 }}>
                <option value="">{t.allSubjects}</option>
                {t.subjects.map(s => <option key={s}>{s}</option>)}
              </select>
              <select className="cm-input" value={deckLang} onChange={e => setDeckLang(e.target.value)} style={{ ...sel, flex: 1, minWidth: 120 }}>
                <option value="">{t.allLanguages}</option>
                <option value="en">{t.langs[0]}</option>
                <option value="es">{t.langs[1]}</option>
                <option value="ko">{t.langs[2]}</option>
              </select>
            </div>

            {/* Sort */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: C.textMuted }}>{filtered.length} decks</span>
              <div style={{ display: "flex", gap: 4 }}>
                {[["uses", t.mostUsed], ["rating", t.topRated], ["newest", t.newest]].map(([k, label]) => (
                  <button key={k} className="cm-sort" onClick={() => setSort(k)} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: sort === k ? C.accentSoft : "transparent", color: sort === k ? C.accent : C.textMuted }}>{label}</button>
                ))}
              </div>
            </div>

            {/* Grid */}
            {filtered.length === 0 ? (
              <div className="fade-up" style={{ textAlign: "center", padding: 48 }}>
                <div style={{ marginBottom: 12 }}><CIcon name="other" size={36} /></div>
                <p style={{ fontSize: 15, color: C.textMuted, fontWeight: 500 }}>{t.noResults}</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
                {filtered.map((dk, i) => {
                  const icon = SUBJ_ICON[dk.subject[l]] || "book";
                  return (
                    <div key={dk.id} className="cm-card fade-up" onClick={() => setSelectedDeck(dk)} style={{
                      background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`,
                      padding: 20, boxShadow: C.shadow, position: "relative", overflow: "hidden",
                      animationDelay: `${i * .04}s`,
                    }}>
                      {dk.featured && <div style={{ position: "absolute", top: 12, right: 12, fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: C.yellowSoft, color: C.yellow, display: "flex", alignItems: "center", gap: 4 }}><CIcon name="star" size={10} inline /> {t.featured}</div>}

                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <CIcon name={icon} size={22} inline />
                        <div>
                          <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 500 }}>{dk.subject[l]}</span>
                          <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 6 }}>· {dk.grade[l]}</span>
                        </div>
                        <div style={{ marginLeft: "auto" }}><LangBadge lang={dk.lang} /></div>
                      </div>

                      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, lineHeight: 1.35 }}>{dk.title[l]}</h3>
                      <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5, marginBottom: 14, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{dk.desc[l]}</p>

                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                        <Stars rating={dk.rating} />
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{dk.rating}</span>
                        <span style={{ fontSize: 11, color: C.textMuted }}>({dk.reviews})</span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <AvatarCircle initials={dk.initials} color={dk.color} size={22} />
                          <span style={{ fontSize: 12, color: C.textSecondary }}>{dk.author}</span>
                        </div>
                        <div style={{ display: "flex", gap: 10, fontSize: 12, color: C.textMuted }}>
                          <span>{dk.questions} {t.questions}</span>
                          <span>·</span>
                          <span>{dk.uses.toLocaleString()} {t.uses}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
