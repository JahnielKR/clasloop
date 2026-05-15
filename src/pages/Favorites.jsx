// ─────────────────────────────────────────────────────────────────────────────
// Favorites — full list of decks the student has starred from the community.
//
// PR 28.14: MyClasses shows only the top 3 most-recent favorites inline.
// This page is the "see all →" destination. It reuses SavedDeckCard from
// MyClasses (exported in PR 28.14) so the look is identical — only the
// page chrome differs.
//
// Why a dedicated page (not a modal): a) the URL is shareable / back-button
// friendly; b) on mobile a modal of N cards would be cramped; c) the search
// input behaves better in a real page than in a modal overlay.
//
// Data flow mirrors MyClasses.loadAll's saved_decks query: same join shape,
// same is_favorite flag, same handlers. When a favorite is unstarred here
// (toggle off), the row disappears from this page (because we re-derive
// from the source list each render).
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import PageHeader from "../components/PageHeader";
import { C, MONO } from "../components/tokens";
import { ROUTES } from "../routes";
import { SavedDeckCard } from "./MyClasses";

const i18n = {
  en: {
    pageTitle: "Favorites",
    back: "← Back",
    searchPlaceholder: "Search your favorites…",
    empty: "No favorites yet",
    emptySub: "Star a deck from the community or your saved decks to see it here.",
    noResults: "No favorites match that search.",
    loading: "Loading...",
    count: "{n} favorites",
    countOne: "1 favorite",
    favoriteRemove: "Remove from favorites",
    favoriteAdd: "Add to favorites",
    practice: "Practice",
    unsave: "Unsave",
    questionsCount: "questions",
    savedFrom: "Saved from",
    teacher: "Teacher",
    practiceTimerOnTip: "Practice with timer (tap to study without time pressure)",
    practiceTimerOffTip: "Practice untimed (tap to use the recommended timing)",
  },
  es: {
    pageTitle: "Favoritos",
    back: "← Volver",
    searchPlaceholder: "Busca en tus favoritos…",
    empty: "Aún no tienes favoritos",
    emptySub: "Marca un deck con la estrella en la comunidad o en tus guardados para verlo aquí.",
    noResults: "Ningún favorito coincide con esa búsqueda.",
    loading: "Cargando...",
    count: "{n} favoritos",
    countOne: "1 favorito",
    favoriteRemove: "Quitar de favoritos",
    favoriteAdd: "Añadir a favoritos",
    practice: "Practicar",
    unsave: "Quitar",
    questionsCount: "preguntas",
    savedFrom: "Guardado de",
    teacher: "Profesor/a",
    practiceTimerOnTip: "Practicar con timer (toca para estudiar sin presión)",
    practiceTimerOffTip: "Practicar sin timer (toca para usar el tiempo recomendado)",
  },
  ko: {
    pageTitle: "즐겨찾기",
    back: "← 뒤로",
    searchPlaceholder: "즐겨찾기에서 검색…",
    empty: "아직 즐겨찾기가 없습니다",
    emptySub: "커뮤니티나 저장된 덱에서 별표를 누르면 여기에 표시됩니다.",
    noResults: "검색 결과가 없습니다.",
    loading: "로딩 중...",
    count: "즐겨찾기 {n}개",
    countOne: "즐겨찾기 1개",
    favoriteRemove: "즐겨찾기 제거",
    favoriteAdd: "즐겨찾기 추가",
    practice: "학습",
    unsave: "저장 취소",
    questionsCount: "문제",
    savedFrom: "저장 출처",
    teacher: "교사",
    practiceTimerOnTip: "타이머와 함께 학습 (탭하여 시간 압박 없이 학습)",
    practiceTimerOffTip: "타이머 없이 학습 (탭하여 권장 시간 사용)",
  },
};

export default function Favorites({
  lang: pageLang = "en",
  setLang: pageSetLang,
  profile = null,
  onLaunchPractice = null,
  onOpenMobileMenu,
}) {
  const l = pageLang || "en";
  const t = i18n[l] || i18n.en;
  const setLang = pageSetLang || (() => {});
  const navigate = useNavigate();

  const [savedDecks, setSavedDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { loadFavorites(); }, [profile?.id]);

  const loadFavorites = async () => {
    if (!profile?.id) { setLoading(false); return; }
    setLoading(true);
    // Same query shape as MyClasses.loadAll — fetches ALL saved_decks rows
    // (favorited or not). We filter in-memory because the favorites set is
    // small and the user may toggle a star (and we want it to disappear
    // from this page immediately).
    const { data } = await supabase
      .from("saved_decks")
      .select("deck_id, saved_at, is_favorite, decks(*, classes(name, profiles:teacher_id(full_name)))")
      .eq("student_id", profile.id)
      .order("saved_at", { ascending: false });

    setSavedDecks((data || [])
      .filter(s => s.decks)
      .map(s => ({ ...s.decks, _isFavorite: s.is_favorite || false }))
    );
    setLoading(false);
  };

  // Toggle favorite — same shape as MyClasses (optimistic, revert on error).
  const handleToggleFavorite = async (deckId) => {
    if (!profile?.id) return;
    let nextValue = false;
    setSavedDecks(prev => prev.map(d => {
      if (d.id !== deckId) return d;
      nextValue = !d._isFavorite;
      return { ...d, _isFavorite: nextValue };
    }));
    const { error } = await supabase.from("saved_decks")
      .update({ is_favorite: nextValue })
      .eq("student_id", profile.id)
      .eq("deck_id", deckId);
    if (error) {
      setSavedDecks(prev => prev.map(d => d.id === deckId ? { ...d, _isFavorite: !nextValue } : d));
    }
  };

  const handleUnsave = async (deckId) => {
    if (!profile?.id) return;
    await supabase.from("saved_decks").delete()
      .eq("student_id", profile.id)
      .eq("deck_id", deckId);
    setSavedDecks(prev => prev.filter(d => d.id !== deckId));
  };

  // Filter: only favorites + match search query against title (case-insensitive).
  // Memo so a re-render from unrelated state doesn't re-walk the whole list.
  const filteredFavorites = useMemo(() => {
    const favs = savedDecks.filter(d => d._isFavorite);
    const q = search.trim().toLowerCase();
    if (!q) return favs;
    return favs.filter(d => (d.title || "").toLowerCase().includes(q));
  }, [savedDecks, search]);

  const totalFavorites = savedDecks.filter(d => d._isFavorite).length;

  if (!profile) return null;

  return (
    <div style={{ padding: "28px 20px" }}>
      <PageHeader title={t.pageTitle} lang={l} setLang={setLang} maxWidth={720} onOpenMobileMenu={onOpenMobileMenu} />
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* Back link to MyClasses */}
        <button
          onClick={() => navigate(ROUTES.CLASSES)}
          style={{
            background: "transparent", border: "none", padding: 0,
            color: C.textSecondary, fontSize: 13, cursor: "pointer",
            fontFamily: "'Outfit',sans-serif", marginBottom: 14,
          }}
        >{t.back}</button>

        {/* Header — count of favorites */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#EF9F27" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, fontFamily: "'Outfit',sans-serif" }}>{t.pageTitle}</h2>
          </div>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0, fontFamily: MONO }}>
            {totalFavorites === 1 ? t.countOne : t.count.replace("{n}", String(totalFavorites))}
          </p>
        </div>

        {/* Search bar */}
        {totalFavorites > 0 && (
          <div style={{ marginBottom: 20, position: "relative" }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              style={{
                width: "100%",
                padding: "11px 14px 11px 40px",
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                fontSize: 14,
                fontFamily: "'Outfit',sans-serif",
                color: C.text,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <div style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.textMuted, display: "flex", alignItems: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
          </div>
        )}

        {/* States: loading → empty (no favorites at all) → no-results (filter empty) → grid */}
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: C.textMuted, fontFamily: "'Outfit',sans-serif" }}>
            {t.loading}
          </div>
        ) : totalFavorites === 0 ? (
          <div style={{
            background: C.bg, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: 36, textAlign: "center",
          }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>⭐</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, fontFamily: "'Outfit'" }}>{t.empty}</h3>
            <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 0, lineHeight: 1.5 }}>{t.emptySub}</p>
          </div>
        ) : filteredFavorites.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: C.textMuted, fontFamily: "'Outfit',sans-serif", fontSize: 14 }}>
            {t.noResults}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {filteredFavorites.map(deck => (
              <SavedDeckCard
                key={deck.id}
                deck={deck}
                t={t}
                lang={l}
                onPractice={() => onLaunchPractice && onLaunchPractice(deck)}
                onToggleFavorite={() => handleToggleFavorite(deck.id)}
                onUnsave={() => handleUnsave(deck.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
