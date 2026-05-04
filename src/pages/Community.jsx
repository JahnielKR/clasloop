import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { CIcon } from "../components/Icons";
import { DeckCover, colorTint } from "../lib/deck-cover";

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

const i18n = {
  en: {
    pageTitle: "Community", subtitle: "Browse decks shared by teachers worldwide",
    search: "Search topics...", allSubjects: "All subjects", allLanguages: "All languages",
    mostUsed: "Most used", topRated: "Top rated", newest: "Newest",
    questions: "questions", uses: "uses",
    saveToMyDecks: "Save to my decks", saved: "Saved!", back: "Back",
    by: "by", noResults: "No decks found.",
    favorite: "Favorite", favorited: "Favorited", favoriteAdd: "Add to favorites", favoriteRemove: "Remove from favorites",
    addToWhich: "Add to which class?", noClass: "Save without class",
    noClassesYet: "You don't have any classes yet. Create one in Sessions first.",
    cancel: "Cancel", langs: ["English", "Spanish", "Korean"],
  },
  es: {
    pageTitle: "Comunidad", subtitle: "Busca decks compartidos por profesores",
    search: "Buscar temas...", allSubjects: "Todas las materias", allLanguages: "Todos los idiomas",
    mostUsed: "Más usados", topRated: "Mejor valorados", newest: "Más recientes",
    questions: "preguntas", uses: "usos",
    saveToMyDecks: "Guardar en mis decks", saved: "¡Guardado!", back: "Volver",
    by: "por", noResults: "No se encontraron decks.",
    favorite: "Favorito", favorited: "En favoritos", favoriteAdd: "Agregar a favoritos", favoriteRemove: "Quitar de favoritos",
    addToWhich: "¿A qué clase agregarlo?", noClass: "Guardar sin clase",
    noClassesYet: "No tienes clases aún. Crea una en Sesiones primero.",
    cancel: "Cancelar", langs: ["Inglés", "Español", "Coreano"],
  },
  ko: {
    pageTitle: "커뮤니티", subtitle: "전 세계 교사들이 공유한 덱을 찾아보세요",
    search: "주제 검색...", allSubjects: "모든 과목", allLanguages: "모든 언어",
    mostUsed: "최다 사용", topRated: "최고 평점", newest: "최신순",
    questions: "문제", uses: "사용",
    saveToMyDecks: "내 덱에 저장", saved: "저장됨!", back: "뒤로",
    by: "", noResults: "덱을 찾을 수 없습니다.",
    favorite: "즐겨찾기", favorited: "즐겨찾기됨", favoriteAdd: "즐겨찾기에 추가", favoriteRemove: "즐겨찾기에서 제거",
    addToWhich: "어느 수업에 추가하시겠습니까?", noClass: "수업 없이 저장",
    noClassesYet: "아직 수업이 없습니다. 세션에서 먼저 만드세요.",
    cancel: "취소", langs: ["영어", "스페인어", "한국어"],
  },
};

const css = `
  .cm-card { transition: all .2s ease; cursor: pointer; }
  .cm-card:hover { border-color: #2383E244 !important; box-shadow: 0 4px 16px rgba(35,131,226,.1) !important; transform: translateY(-2px); }
  .cm-sort { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .cm-sort:hover { background: #E8F0FE !important; color: #2383E2 !important; }
  .cm-btn { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .cm-btn:hover { transform: translateY(-1px); filter: brightness(1.05); }
  .cm-back { transition: all .15s ease; cursor: pointer; }
  .cm-back:hover { background: #E8F0FE !important; }
  .cm-input { transition: border-color .15s, box-shadow .15s; }
  .cm-input:hover { border-color: #2383E266 !important; }
  .cm-input:focus { border-color: #2383E2 !important; box-shadow: 0 0 0 3px #E8F0FE !important; }
  .cm-class-pick { transition: all .15s ease; cursor: pointer; }
  .cm-class-pick:hover { border-color: #2383E244 !important; background: #E8F0FE !important; }
  .cm-lang { transition: all .12s ease; cursor: pointer; }
  .cm-lang:hover { background: #E8F0FE !important; color: #2383E2 !important; }
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
            <button key={c} className="cm-lang" onClick={() => setLang(c)} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: lang === c ? C.bg : "transparent", color: lang === c ? C.text : C.textMuted, border: "none", boxShadow: lang === c ? "0 1px 2px rgba(0,0,0,0.06)" : "none" }}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Community({ lang: pageLang = "en", setLang: pageSetLang, profile = null }) {
  const [lang, setLangLocal] = useState(pageLang);
  const setLang = pageSetLang || setLangLocal;
  const l = pageLang || lang;
  const [decks, setDecks] = useState([]);
  const [userId, setUserId] = useState(null);
  const [userClasses, setUserClasses] = useState([]);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [deckLang, setDeckLang] = useState("");
  const [sort, setSort] = useState("uses_count");
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [savingDeck, setSavingDeck] = useState(null); // deck being saved (for class picker)
  const [saved, setSaved] = useState({});
  const [loading, setLoading] = useState(true);
  const t = i18n[l] || i18n.en;
  const isStudent = profile?.role === "student";

  useEffect(() => { loadData(); }, [profile?.id]);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id);
    if (user) {
      // Both teachers and students have favorites in the same saved_decks table.
      const { data: savedRows } = await supabase.from("saved_decks").select("deck_id").eq("student_id", user.id);
      const map = {};
      (savedRows || []).forEach(r => { map[r.deck_id] = true; });
      setSaved(map);

      // Teachers also need their classes for the "Save to my decks" picker.
      if (!isStudent) {
        const { data: cls } = await supabase.from("classes").select("*").eq("teacher_id", user.id).order("created_at", { ascending: false });
        setUserClasses(cls || []);
      }
    }
    const { data } = await supabase.from("decks").select("*, profiles(full_name)").eq("is_public", true).order("uses_count", { ascending: false });
    setDecks(data || []);
    setLoading(false);
  };

  // Toggle favorite — works for both students and teachers (same saved_decks table).
  const handleToggleFavorite = async (deck) => {
    if (!userId) return;
    const isAlreadySaved = saved[deck.id];
    if (isAlreadySaved) {
      const { error } = await supabase.from("saved_decks").delete().eq("student_id", userId).eq("deck_id", deck.id);
      if (!error) setSaved(prev => { const next = { ...prev }; delete next[deck.id]; return next; });
    } else {
      const { error } = await supabase.from("saved_decks").insert({ student_id: userId, deck_id: deck.id });
      if (!error) {
        await supabase.from("decks").update({ uses_count: (deck.uses_count || 0) + 1 }).eq("id", deck.id);
        setSaved(prev => ({ ...prev, [deck.id]: true }));
      }
    }
  };

  const handleSaveToMyDecks = async (deck, classId) => {
    if (!userId) return;
    const cls = classId ? userClasses.find(c => c.id === classId) : null;
    const { error } = await supabase.from("decks").insert({
      author_id: userId, class_id: classId || null,
      title: deck.title, description: deck.description,
      subject: cls?.subject || deck.subject, grade: cls?.grade || deck.grade,
      language: deck.language, questions: deck.questions, tags: deck.tags, is_public: false,
      cover_color: deck.cover_color, cover_icon: deck.cover_icon, cover_image_url: deck.cover_image_url,
    });
    if (!error) {
      await supabase.from("decks").update({ uses_count: (deck.uses_count || 0) + 1 }).eq("id", deck.id);
      setSavingDeck(null);
    }
  };

  const filtered = decks
    .filter(dk => {
      if (search && !dk.title.toLowerCase().includes(search.toLowerCase()) && !(dk.tags || []).some(tg => tg.toLowerCase().includes(search.toLowerCase()))) return false;
      if (subject && dk.subject !== subject) return false;
      if (deckLang && dk.language !== deckLang) return false;
      return true;
    })
    .sort((a, b) => sort === "uses_count" ? (b.uses_count || 0) - (a.uses_count || 0) : sort === "rating" ? (b.rating || 0) - (a.rating || 0) : new Date(b.created_at) - new Date(a.created_at));

  if (selectedDeck) {
    const dk = selectedDeck;
    const qs = dk.questions || [];
    const tint = colorTint(dk, "0F");
    return (
      <div style={{ padding: "28px 20px" }}>
        <style>{css}</style>
        <PageHeader title={t.pageTitle} icon="globe" lang={l} setLang={setLang} />
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <button className="cm-back" onClick={() => setSelectedDeck(null)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: C.accent, background: C.accentSoft, border: "none", marginBottom: 20, fontFamily: "'Outfit',sans-serif", cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12L11 6M5 12L11 18" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {t.back}
          </button>

          <div className="fade-up" style={{ background: C.bg, borderRadius: 14, border: `1px solid ${C.border}`, marginBottom: 16, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
            <DeckCover deck={dk} variant="banner" height={140} radius={14} />
            <div style={{ padding: 24, background: tint, borderTop: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 12, color: C.textMuted }}>
                <span>{dk.subject} · {dk.grade}</span>
                <LangBadge lang={dk.language} />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, fontFamily: "'Outfit'" }}>{dk.title}</h2>
              {dk.description && <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.5, marginBottom: 16 }}>{dk.description}</p>}
              <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>
                {t.by} {dk.profiles?.full_name || "Unknown"} · {qs.length} {t.questions} · {dk.uses_count || 0} {t.uses}
              </div>
              {(dk.tags || []).length > 0 && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 16 }}>
                  {dk.tags.map((tag, i) => <span key={i} style={{ padding: "3px 8px", borderRadius: 6, background: C.bg, border: `1px solid ${C.border}`, fontSize: 11, color: C.textSecondary }}>#{tag}</span>)}
                </div>
              )}
              {isStudent ? (
                <button className="cm-btn" onClick={() => handleToggleFavorite(dk)} style={{
                  width: "100%", padding: 14, borderRadius: 10, fontSize: 15, fontWeight: 600,
                  background: saved[dk.id] ? C.greenSoft : `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
                  color: saved[dk.id] ? C.green : "#fff",
                  border: saved[dk.id] ? `1px solid ${C.green}33` : "none",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  cursor: "pointer",
                }}>
                  {saved[dk.id] ? <><CIcon name="check" size={14} inline /> {t.saved}</> : t.saveToMyDecks}
                </button>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => handleToggleFavorite(dk)}
                    title={saved[dk.id] ? t.favoriteRemove : t.favoriteAdd}
                    style={{
                      padding: "14px 18px", borderRadius: 10, fontSize: 14, fontWeight: 600,
                      background: saved[dk.id] ? "#FFF3E0" : C.bg,
                      color: saved[dk.id] ? "#D9730D" : C.textSecondary,
                      border: `1px solid ${saved[dk.id] ? "#D9730D40" : C.border}`,
                      cursor: "pointer", fontFamily: "'Outfit',sans-serif",
                      display: "inline-flex", alignItems: "center", gap: 6,
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill={saved[dk.id] ? "#D9730D" : "none"} stroke={saved[dk.id] ? "#D9730D" : C.textSecondary} strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    {saved[dk.id] ? t.favorited : t.favorite}
                  </button>
                  <button className="cm-btn" onClick={() => setSavingDeck(dk)} style={{
                    flex: 1, padding: 14, borderRadius: 10, fontSize: 15, fontWeight: 600,
                    background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
                    color: "#fff",
                    border: "none",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    cursor: "pointer",
                  }}>
                    {t.saveToMyDecks}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Save modal */}
        {savingDeck && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }} onClick={() => setSavingDeck(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: C.bg, borderRadius: 14, padding: 24, maxWidth: 400, width: "100%" }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{t.addToWhich}</h3>
              <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 16 }}>{savingDeck.title}</p>
              {userClasses.length === 0 ? (
                <p style={{ fontSize: 13, color: C.textMuted, padding: 20, textAlign: "center" }}>{t.noClassesYet}</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                  {userClasses.map(c => (
                    <button key={c.id} onClick={() => handleSaveToMyDecks(savingDeck, c.id)} className="cm-class-pick" style={{ padding: 12, borderRadius: 10, background: C.bg, border: `1px solid ${C.border}`, textAlign: "left", display: "flex", alignItems: "center", gap: 10, fontFamily: "'Outfit',sans-serif" }}>
                      <CIcon name={SUBJ_ICON[c.subject] || "book"} size={20} inline />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: C.textMuted }}>{c.subject} · {c.grade}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => handleSaveToMyDecks(savingDeck, null)} style={{ width: "100%", padding: 10, borderRadius: 8, fontSize: 13, fontWeight: 500, background: C.bgSoft, color: C.textSecondary, border: `1px solid ${C.border}`, cursor: "pointer", fontFamily: "'Outfit',sans-serif", marginBottom: 8 }}>{t.noClass}</button>
              <button onClick={() => setSavingDeck(null)} style={{ width: "100%", padding: 10, borderRadius: 8, fontSize: 13, fontWeight: 500, background: "transparent", color: C.textMuted, border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{t.cancel}</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 20px" }}>
      <style>{css}</style>
      <PageHeader title={t.pageTitle} icon="globe" lang={l} setLang={setLang} />

      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <p style={{ fontSize: 14, color: C.textSecondary, marginBottom: 16 }}>{t.subtitle}</p>

        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 2, minWidth: 200, position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}><CIcon name="target" size={14} inline /></span>
            <input className="cm-input" value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search} style={{ ...inp, paddingLeft: 38 }} />
          </div>
          <select className="cm-input" value={subject} onChange={e => setSubject(e.target.value)} style={{ ...sel, flex: 1, minWidth: 130 }}>
            <option value="">{t.allSubjects}</option>
            {SUBJECTS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="cm-input" value={deckLang} onChange={e => setDeckLang(e.target.value)} style={{ ...sel, flex: 1, minWidth: 120 }}>
            <option value="">{t.allLanguages}</option>
            <option value="en">{t.langs[0]}</option>
            <option value="es">{t.langs[1]}</option>
            <option value="ko">{t.langs[2]}</option>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {filtered.map((dk, i) => {
              const qs = dk.questions || [];
              const tint = colorTint(dk, "0F");
              return (
                <div key={dk.id} className="cm-card fade-up" onClick={() => setSelectedDeck(dk)} style={{
                  background: C.bg, borderRadius: 14, border: `1px solid ${C.border}`,
                  overflow: "hidden", boxShadow: C.shadow,
                  animationDelay: `${i * .04}s`,
                  display: "flex", flexDirection: "column",
                  cursor: "pointer",
                }}>
                  <DeckCover deck={dk} variant="banner" height={88} radius={14} />
                  <div style={{ padding: 14, background: tint, borderTop: `1px solid ${C.border}`, flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: 11, color: C.textMuted }}>
                      <span>{dk.subject} · {dk.grade}</span>
                      <div style={{ marginLeft: "auto" }}><LangBadge lang={dk.language} /></div>
                    </div>
                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{dk.title}</h3>
                    {dk.description && <p style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.4, marginBottom: 10, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{dk.description}</p>}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 8, marginTop: "auto", borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.textMuted }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.by} {dk.profiles?.full_name || "Unknown"}</span>
                      <span style={{ fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>{qs.length} {t.questions}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
