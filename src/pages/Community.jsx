import { CIcon } from "../components/Icons";
import { useState } from "react";

const C = {
  bg: "#FFFFFF", bgSoft: "#F7F7F5", accent: "#2383E2", accentSoft: "#E8F0FE",
  green: "#0F7B6C", greenSoft: "#EEFBF5", orange: "#D9730D", orangeSoft: "#FFF3E0",
  red: "#E03E3E", redSoft: "#FDECEC", purple: "#6940A5", purpleSoft: "#F3EEFB",
  yellow: "#D4A017", yellowSoft: "#FEF9E7",
  text: "#191919", textSecondary: "#6B6B6B", textMuted: "#9B9B9B",
  border: "#E8E8E4", shadow: "0 1px 3px rgba(0,0,0,0.04)",
};
const MONO = "'JetBrains Mono', monospace";

const SUBJECTS_ICONS = { Math: "math", Science: "science", History: "history", Language: "language", Geography: "geo", Art: "art", Music: "music", PE: "sports", Matemáticas: "math", Ciencias: "science", Historia: "history", Lengua: "language", Geografía: "geo", Arte: "art", Música: "music", 수학: "math", 과학: "science", 역사: "history", 국어: "language", 지리: "geo", 미술: "art" };

const DECKS = [
  { id: 1, title: { en: "French Revolution — Complete", es: "Revolución Francesa — Completo", ko: "프랑스 혁명 — 전체" }, subject: { en: "History", es: "Historia", ko: "역사" }, grade: { en: "8th-9th", es: "8°-9°", ko: "중2-중3" }, author: "María González", authorAvatar: "MG", lang: "es", questions: 24, uses: 1847, rating: 4.8, reviews: 132, tags: { en: ["revolution", "Europe", "18th century"], es: ["revolución", "Europa", "siglo XVIII"], ko: ["혁명", "유럽", "18세기"] }, featured: true, desc: { en: "Comprehensive deck covering causes, key events, major figures, and consequences of the French Revolution. Aligned with standard curricula.", es: "Deck completo sobre causas, eventos clave, figuras principales y consecuencias de la Revolución Francesa. Alineado con currículos estándar.", ko: "프랑스 혁명의 원인, 주요 사건, 인물, 결과를 다루는 종합 덱. 표준 교육과정에 맞춤." }, questions_preview: [{ q: "What year did the French Revolution begin?", options: ["1776", "1789", "1804", "1815"], correct: 1 }, { q: "What was the Bastille?", options: ["A palace", "A prison-fortress", "A church", "A market"], correct: 1 }, { q: "Who was executed in 1793?", options: ["Napoleon", "Robespierre", "Louis XVI", "Lafayette"], correct: 2 }] },
  { id: 2, title: { en: "Quadratic Equations Basics", es: "Ecuaciones Cuadráticas Básico", ko: "이차방정식 기초" }, subject: { en: "Math", es: "Matemáticas", ko: "수학" }, grade: { en: "8th-9th", es: "8°-9°", ko: "중2-중3" }, author: "James Park", authorAvatar: "JP", lang: "en", questions: 18, uses: 2341, rating: 4.9, reviews: 198, tags: { en: ["algebra", "equations", "formula"], es: ["álgebra", "ecuaciones", "fórmula"], ko: ["대수", "방정식", "공식"] }, featured: true, desc: { en: "Master the quadratic formula, discriminant, and graphing parabolas. Includes word problems.", es: "Domina la fórmula cuadrática, discriminante y graficación de parábolas.", ko: "근의 공식, 판별식, 포물선 그래프를 마스터하세요." }, questions_preview: [{ q: "What is the quadratic formula?", options: ["x = -b/2a", "x = (-b ± √(b²-4ac))/2a", "x = a² + b²", "x = -b/a"], correct: 1 }, { q: "If discriminant < 0, how many real solutions?", options: ["Two", "One", "Zero", "Infinite"], correct: 2 }] },
  { id: 3, title: { en: "Photosynthesis Deep Dive", es: "Fotosíntesis a Fondo", ko: "광합성 심화" }, subject: { en: "Science", es: "Ciencias", ko: "과학" }, grade: { en: "7th-8th", es: "7°-8°", ko: "중1-중2" }, author: "Yuna Kim", authorAvatar: "YK", lang: "ko", questions: 15, uses: 987, rating: 4.7, reviews: 76, tags: { en: ["biology", "plants", "energy"], es: ["biología", "plantas", "energía"], ko: ["생물", "식물", "에너지"] }, featured: false, desc: { en: "Everything about photosynthesis — light reactions, Calvin cycle, chloroplast structure.", es: "Todo sobre fotosíntesis — reacciones lumínicas, ciclo de Calvin, estructura del cloroplasto.", ko: "광합성의 모든 것 — 명반응, 캘빈 회로, 엽록체 구조." }, questions_preview: [{ q: "Where does photosynthesis occur?", options: ["Mitochondria", "Chloroplast", "Nucleus", "Ribosome"], correct: 1 }] },
  { id: 4, title: { en: "World War II Timeline", es: "Segunda Guerra Mundial Cronología", ko: "제2차 세계대전 연대표" }, subject: { en: "History", es: "Historia", ko: "역사" }, grade: { en: "9th-10th", es: "9°-10°", ko: "중3-고1" }, author: "Carlos Ruiz", authorAvatar: "CR", lang: "es", questions: 30, uses: 3102, rating: 4.6, reviews: 215, tags: { en: ["war", "20th century", "world"], es: ["guerra", "siglo XX", "mundo"], ko: ["전쟁", "20세기", "세계"] }, featured: false, desc: { en: "Chronological review from 1939 to 1945. Major battles, turning points, and key figures.", es: "Repaso cronológico de 1939 a 1945. Batallas principales, puntos de inflexión y figuras clave.", ko: "1939년부터 1945년까지의 연대순 복습. 주요 전투와 인물." }, questions_preview: [] },
  { id: 5, title: { en: "Cell Division & Mitosis", es: "División Celular y Mitosis", ko: "세포 분열과 유사분열" }, subject: { en: "Science", es: "Ciencias", ko: "과학" }, grade: { en: "8th-9th", es: "8°-9°", ko: "중2-중3" }, author: "Emma Watson", authorAvatar: "EW", lang: "en", questions: 12, uses: 654, rating: 4.5, reviews: 43, tags: { en: ["biology", "cells", "mitosis"], es: ["biología", "células", "mitosis"], ko: ["생물", "세포", "유사분열"] }, featured: false, desc: { en: "Phases of mitosis, comparison with meiosis, and cell cycle regulation.", es: "Fases de la mitosis, comparación con meiosis y regulación del ciclo celular.", ko: "유사분열 단계, 감수분열과 비교, 세포주기 조절." }, questions_preview: [] },
  { id: 6, title: { en: "Linear Functions Mastery", es: "Funciones Lineales Dominio", ko: "일차함수 마스터" }, subject: { en: "Math", es: "Matemáticas", ko: "수학" }, grade: { en: "7th-8th", es: "7°-8°", ko: "중1-중2" }, author: "Minjun Lee", authorAvatar: "🦉", lang: "ko", questions: 20, uses: 1523, rating: 4.8, reviews: 109, tags: { en: ["algebra", "graphs", "slope"], es: ["álgebra", "gráficas", "pendiente"], ko: ["대수", "그래프", "기울기"] }, featured: false, desc: { en: "Slope, y-intercept, graphing, and real-world applications of linear functions.", es: "Pendiente, ordenada al origen, graficación y aplicaciones reales de funciones lineales.", ko: "기울기, y절편, 그래프, 일차함수의 실생활 응용." }, questions_preview: [] },
  { id: 7, title: { en: "Geography: Continents & Oceans", es: "Geografía: Continentes y Océanos", ko: "지리: 대륙과 대양" }, subject: { en: "Geography", es: "Geografía", ko: "지리" }, grade: { en: "6th-7th", es: "6°-7°", ko: "중1" }, author: "Sofía Martínez", authorAvatar: "SM", lang: "es", questions: 16, uses: 2890, rating: 4.9, reviews: 187, tags: { en: ["continents", "oceans", "maps"], es: ["continentes", "océanos", "mapas"], ko: ["대륙", "대양", "지도"] }, featured: true, desc: { en: "Complete review of world geography — continents, oceans, major rivers, and capitals.", es: "Repaso completo de geografía mundial — continentes, océanos, ríos principales y capitales.", ko: "세계 지리 전체 복습 — 대륙, 대양, 주요 강, 수도." }, questions_preview: [] },
  { id: 8, title: { en: "Shakespeare Intro", es: "Introducción a Shakespeare", ko: "셰익스피어 입문" }, subject: { en: "Language", es: "Lengua", ko: "국어" }, grade: { en: "9th-10th", es: "9°-10°", ko: "중3-고1" }, author: "David Chen", authorAvatar: "DC", lang: "en", questions: 14, uses: 445, rating: 4.3, reviews: 28, tags: { en: ["literature", "Shakespeare", "drama"], es: ["literatura", "Shakespeare", "drama"], ko: ["문학", "셰익스피어", "드라마"] }, featured: false, desc: { en: "Introduction to Shakespeare's works — Romeo & Juliet, Hamlet, and Macbeth basics.", es: "Introducción a las obras de Shakespeare — Romeo y Julieta, Hamlet y Macbeth.", ko: "셰익스피어 작품 소개 — 로미오와 줄리엣, 햄릿, 맥베스 기초." }, questions_preview: [] },
];

const i18n = {
  en: {
    community: "Community Decks",
    communitySub: "Ready-made review decks shared by teachers worldwide",
    search: "Search topics, subjects...",
    allSubjects: "All subjects",
    allGrades: "All grades",
    allLanguages: "All languages",
    featured: "Featured",
    sortBy: "Sort by",
    mostUsed: "Most used",
    topRated: "Top rated",
    newest: "Newest",
    questions: "questions",
    uses: "uses",
    reviews: "reviews",
    addToClass: "Add to my class",
    added: "Added!",
    preview: "Preview questions",
    publishDeck: "Publish a deck",
    publishTitle: "Share your deck with the community",
    publishSub: "Help other teachers save time with your content",
    back: "← Back",
    by: "by",
    grade: "Grade",
    language: "Language",
    tags: "Tags",
    deckDetail: "Deck details",
    questionPreview: "Question preview",
    viewAll: "View all",
    subjects: ["Math", "Science", "History", "Language", "Geography", "Art"],
    grades: ["6th-7th", "7th-8th", "8th-9th", "9th-10th", "10th-11th", "11th-12th"],
    langs: ["English", "Spanish", "Korean"],
    noResults: "No decks found. Try different filters.",
    created: "Created in",
    myDecks: "My Decks",
    publishNew: "+ Publish deck",
  },
  es: {
    community: "Decks de la Comunidad",
    communitySub: "Decks de repaso creados por profesores de todo el mundo",
    search: "Buscar temas, materias...",
    allSubjects: "Todas las materias",
    allGrades: "Todos los grados",
    allLanguages: "Todos los idiomas",
    featured: "Destacados",
    sortBy: "Ordenar por",
    mostUsed: "Más usados",
    topRated: "Mejor valorados",
    newest: "Más recientes",
    questions: "preguntas",
    uses: "usos",
    reviews: "reseñas",
    addToClass: "Agregar a mi clase",
    added: "¡Agregado!",
    preview: "Ver preguntas",
    publishDeck: "Publicar un deck",
    publishTitle: "Comparte tu deck con la comunidad",
    publishSub: "Ayuda a otros profesores a ahorrar tiempo",
    back: "← Volver",
    by: "por",
    grade: "Grado",
    language: "Idioma",
    tags: "Etiquetas",
    deckDetail: "Detalles del deck",
    questionPreview: "Vista previa",
    viewAll: "Ver todo",
    subjects: ["Matemáticas", "Ciencias", "Historia", "Lengua", "Geografía", "Arte"],
    grades: ["6°-7°", "7°-8°", "8°-9°", "9°-10°", "10°-11°", "11°-12°"],
    langs: ["Inglés", "Español", "Coreano"],
    noResults: "No se encontraron decks. Prueba otros filtros.",
    created: "Creado en",
    myDecks: "Mis Decks",
    publishNew: "+ Publicar deck",
  },
  ko: {
    community: "커뮤니티 덱",
    communitySub: "전 세계 교사들이 공유한 복습 덱",
    search: "주제, 과목 검색...",
    allSubjects: "모든 과목",
    allGrades: "모든 학년",
    allLanguages: "모든 언어",
    featured: "추천",
    sortBy: "정렬",
    mostUsed: "최다 사용",
    topRated: "최고 평점",
    newest: "최신순",
    questions: "문제",
    uses: "사용",
    reviews: "리뷰",
    addToClass: "내 수업에 추가",
    added: "추가됨!",
    preview: "문제 미리보기",
    publishDeck: "덱 공유하기",
    publishTitle: "커뮤니티에 덱을 공유하세요",
    publishSub: "다른 교사의 시간을 절약해주세요",
    back: "← 뒤로",
    by: "",
    grade: "학년",
    language: "언어",
    tags: "태그",
    deckDetail: "덱 상세",
    questionPreview: "문제 미리보기",
    viewAll: "전체 보기",
    subjects: ["수학", "과학", "역사", "국어", "지리", "미술"],
    grades: ["중1", "중1-중2", "중2-중3", "중3-고1", "고1-고2", "고2-고3"],
    langs: ["영어", "스페인어", "한국어"],
    noResults: "덱을 찾을 수 없습니다. 다른 필터를 시도하세요.",
    created: "생성 언어:",
    myDecks: "내 덱",
    publishNew: "+ 덱 공유",
  },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'DM Sans',sans-serif;background:${C.bgSoft};color:${C.text};-webkit-font-smoothing:antialiased}
  ::selection{background:${C.accentSoft};color:${C.accent}}
  input,select{font-family:'DM Sans',sans-serif;background:${C.bg};border:1px solid ${C.border};color:${C.text};padding:10px 14px;border-radius:8px;font-size:14px;width:100%;outline:none;transition:border-color .15s,box-shadow .15s}
  input:focus,select:focus{border-color:${C.accent};box-shadow:0 0 0 3px ${C.accentSoft}}
  input::placeholder{color:${C.textMuted}}
  select{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%239B9B9B' stroke-width='1.5'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:32px}
  button{font-family:'DM Sans',sans-serif;cursor:pointer;border:none;outline:none;transition:all .15s}
  button:active{transform:scale(.97)}
  @keyframes fi{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pop{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
  .fi{animation:fi .3s ease-out both}
  .f1{animation:fi .3s ease-out .05s both}
  .f2{animation:fi .3s ease-out .1s both}
  .f3{animation:fi .3s ease-out .15s both}
`;

const Logo = ({ s = 20 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{ width: s + 4, height: s + 4, borderRadius: 7, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={s * .6} height={s * .6} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="1.8"/><path d="M12 8v4l2.5 2.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </div>
    <span style={{ fontSize: s * .75, fontWeight: 700, letterSpacing: "-.03em" }}>clasloop</span>
  </div>
);

const Btn = ({ children, v = "primary", onClick, disabled, style = {}, full }) => {
  const base = { padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, width: full ? "100%" : "auto", opacity: disabled ? .4 : 1, pointerEvents: disabled ? "none" : "auto" };
  const vs = { primary: { background: C.accent, color: "#fff" }, secondary: { background: C.bg, color: C.text, border: `1px solid ${C.border}` }, ghost: { background: "transparent", color: C.textSecondary, padding: "8px 4px" }, success: { background: C.greenSoft, color: C.green, border: `1px solid ${C.green}33` } };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...vs[v], ...style }}>{children}</button>;
};

const LangSw = ({ lang, setLang }) => (
  <div style={{ display: "flex", gap: 2, background: C.bgSoft, borderRadius: 8, padding: 3, border: `1px solid ${C.border}` }}>
    {[["en", "EN"], ["es", "ES"], ["ko", "한"]].map(([c, l]) => (
      <button key={c} onClick={() => setLang(c)} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: lang === c ? C.bg : "transparent", color: lang === c ? C.text : C.textMuted, boxShadow: lang === c ? C.shadow : "none" }}>{l}</button>
    ))}
  </div>
);

const Stars = ({ rating, size = 13 }) => {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span style={{ display: "inline-flex", gap: 1, fontSize: size, color: C.yellow }}>
      {"★".repeat(full)}{half ? "½" : ""}
      <span style={{ color: C.border }}>{"★".repeat(5 - full - (half ? 1 : 0))}</span>
    </span>
  );
};

const LangBadge = ({ lang }) => {
  const labels = { en: "EN", es: "ES", ko: "한" };
  const colors = { en: C.accent, es: C.orange, ko: C.green };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: colors[lang] + "14", color: colors[lang] }}>{labels[lang]}</span>
  );
};

// ─── Deck Card ──────────────────────────────────────
const DeckCard = ({ deck, lang, d, onClick }) => {
  const subj = deck.subject[lang];
  const icon = SUBJECTS_ICONS[subj] || "book";
  return (
    <div onClick={onClick} style={{
      background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`,
      padding: 20, cursor: "pointer", transition: "all .15s", boxShadow: C.shadow,
      position: "relative", overflow: "hidden",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.boxShadow = "0 4px 16px rgba(35,131,226,.1)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = C.shadow; }}
    >
      {deck.featured && <div style={{ position: "absolute", top: 12, right: 12, fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: C.yellowSoft, color: C.yellow }}>><CIcon name="star" size={12} inline /> {d.featured}</div>}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 22 }}><CIcon name={icon} size={18} inline />/span>
        <div>
          <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 500 }}>{subj}</span>
          <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 6 }}>· {deck.grade[lang]}</span>
        </div>
        <div style={{ marginLeft: "auto" }}><LangBadge lang={deck.lang} /></div>
      </div>

      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, lineHeight: 1.35 }}>{deck.title[lang]}</h3>

      <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5, marginBottom: 14, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{deck.desc[lang]}</p>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <Stars rating={deck.rating} />
        <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{deck.rating}</span>
        <span style={{ fontSize: 11, color: C.textMuted }}>({deck.reviews})</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 16 }}>{deck.authorAvatar}</span>
          <span style={{ fontSize: 12, color: C.textSecondary }}>{deck.author}</span>
        </div>
        <div style={{ display: "flex", gap: 10, fontSize: 12, color: C.textMuted }}>
          <span>{deck.questions} {d.questions}</span>
          <span>·</span>
          <span>{deck.uses.toLocaleString()} {d.uses}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Deck Detail ────────────────────────────────────
const DeckDetail = ({ deck, lang, d, onBack }) => {
  const [added, setAdded] = useState(false);
  const subj = deck.subject[lang];
  const icon = SUBJECTS_ICONS[subj] || "book";

  return (
    <div style={{ minHeight: "100vh", background: C.bgSoft }}>
      <div style={{ padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: C.bg, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Btn v="ghost" onClick={onBack} style={{ fontSize: 13 }}>{d.back}</Btn>
          <Logo />
        </div>
        <LangSw lang={lang} setLang={() => {}} />
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "28px 20px" }}>
        {/* Header */}
        <div className="fi" style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 28 }}><CIcon name={icon} size={22} inline />/span>
            <span style={{ fontSize: 13, color: C.textMuted }}>{subj} · {deck.grade[lang]}</span>
            <LangBadge lang={deck.lang} />
            {deck.featured && <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: C.yellowSoft, color: C.yellow }}>><CIcon name="star" size={12} inline /> {d.featured}</span>}
          </div>
          <h1 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 28, fontWeight: 400, marginBottom: 8, letterSpacing: "-.01em" }}>{deck.title[lang]}</h1>
          <p style={{ fontSize: 15, color: C.textSecondary, lineHeight: 1.6, marginBottom: 16 }}>{deck.desc[lang]}</p>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 20 }}>{deck.authorAvatar}</span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{deck.author}</span>
            </div>
            <span style={{ color: C.border }}>|</span>
            <Stars rating={deck.rating} size={14} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{deck.rating}</span>
            <span style={{ fontSize: 12, color: C.textMuted }}>({deck.reviews} {d.reviews})</span>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            {[
              { label: d.questions, value: deck.questions, color: C.accent },
              { label: d.uses, value: deck.uses.toLocaleString(), color: C.green },
              { label: d.reviews, value: deck.reviews, color: C.purple },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, padding: "14px", borderRadius: 10, background: C.bg, border: `1px solid ${C.border}`, textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: MONO, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Action */}
          {!added ? (
            <Btn full onClick={() => setAdded(true)} style={{ padding: 14 }}>{d.addToClass}</Btn>
          ) : (
            <Btn v="success" full style={{ padding: 14 }}>✓ {d.added}</Btn>
          )}
        </div>

        {/* Tags */}
        <div className="f1" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
          {(deck.tags[lang] || []).map((tag, i) => (
            <span key={i} style={{ padding: "4px 10px", borderRadius: 6, background: C.bgSoft, border: `1px solid ${C.border}`, fontSize: 12, color: C.textSecondary }}>#{tag}</span>
          ))}
        </div>

        {/* Question preview */}
        {deck.questions_preview && deck.questions_preview.length > 0 && (
          <div className="f2">
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{d.questionPreview}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {deck.questions_preview.map((q, i) => (
                <div key={i} style={{ background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, padding: 16 }}>
                  <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 6 }}>Q{i + 1}</p>
                  <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 10, lineHeight: 1.4 }}>{q.q}</p>
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
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Community View ────────────────────────────
export default function App() {
  const [lang, setLang] = useState("en");
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [deckLang, setDeckLang] = useState("");
  const [sort, setSort] = useState("uses");
  const [selectedDeck, setSelectedDeck] = useState(null);

  const d = i18n[lang];

  const filtered = DECKS
    .filter(dk => {
      const q = search.toLowerCase();
      if (q && !dk.title[lang].toLowerCase().includes(q) && !(dk.tags[lang] || []).some(t => t.includes(q))) return false;
      if (subject && dk.subject[lang] !== subject) return false;
      if (deckLang && dk.lang !== deckLang) return false;
      return true;
    })
    .sort((a, b) => sort === "uses" ? b.uses - a.uses : sort === "rating" ? b.rating - a.rating : b.id - a.id);

  if (selectedDeck) {
    return (
      <>
        <style>{css}</style>
        <DeckDetail deck={selectedDeck} lang={lang} d={d} onBack={() => setSelectedDeck(null)} />
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: "100vh", background: C.bgSoft }}>
        {/* Nav */}
        <div style={{ padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: C.bg, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10 }}>
          <Logo />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Btn style={{ fontSize: 13, padding: "7px 14px" }}>{d.publishNew}</Btn>
            <LangSw lang={lang} setLang={setLang} />
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px" }}>
          {/* Header */}
          <div className="fi" style={{ textAlign: "center", marginBottom: 28 }}>
            <h1 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 32, fontWeight: 400, marginBottom: 6, letterSpacing: "-.01em" }}>{d.community}</h1>
            <p style={{ fontSize: 15, color: C.textSecondary }}>{d.communitySub}</p>
          </div>

          {/* Search + Filters */}
          <div className="f1" style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            <div style={{ flex: 2, minWidth: 200, position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: C.textMuted }}><CIcon name="target" size={14} inline /></span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={d.search}
                style={{ paddingLeft: 38 }}
              />
            </div>
            <select value={subject} onChange={e => setSubject(e.target.value)} style={{ flex: 1, minWidth: 130 }}>
              <option value="">{d.allSubjects}</option>
              {d.subjects.map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={deckLang} onChange={e => setDeckLang(e.target.value)} style={{ flex: 1, minWidth: 120 }}>
              <option value="">{d.allLanguages}</option>
              <option value="en">{d.langs[0]}</option>
              <option value="es">{d.langs[1]}</option>
              <option value="ko">{d.langs[2]}</option>
            </select>
          </div>

          {/* Sort */}
          <div className="f1" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: C.textMuted }}>{filtered.length} decks</span>
            <div style={{ display: "flex", gap: 4 }}>
              {[["uses", d.mostUsed], ["rating", d.topRated], ["newest", d.newest]].map(([k, label]) => (
                <button key={k} onClick={() => setSort(k)} style={{
                  padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                  background: sort === k ? C.accentSoft : "transparent",
                  color: sort === k ? C.accent : C.textMuted,
                }}>{label}</button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 48, color: C.textMuted }}>
              <span style={{ fontSize: 32, display: "block", marginBottom: 12 }}><CIcon name="other" size={28} inline /></span>
              {d.noResults}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
              {filtered.map((dk, i) => (
                <div key={dk.id} style={{ animation: `fi .3s ease-out ${i * .04}s both` }}>
                  <DeckCard deck={dk} lang={lang} d={d} onClick={() => setSelectedDeck(dk)} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
