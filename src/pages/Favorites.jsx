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
import { useState, useMemo } from "react";
import { useFavorites, useFavoritesCache } from "../hooks/useFavorites";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import PageHeader from "../components/PageHeader";
import Skeleton from "../components/ui/Skeleton";
import { CIcon } from "../components/Icons";
import { C, MONO } from "../components/tokens";
import { ROUTES } from "../routes";
import { SavedDeckCard } from "./MyClasses";
// PR 75: i18n centralizado
import { useT } from "../i18n";

// PR 75: el bloque i18n local fue movido a src/i18n/{en,es,ko}.js
// bajo el namespace "favorites".

export default function Favorites({
  lang: pageLang = "en",
  setLang: pageSetLang,
  profile = null,
  onLaunchPractice = null,
  onOpenMobileMenu,
}) {
  const l = pageLang || "en";
  const t = useT("favorites", l);
  const setLang = pageSetLang || (() => {});
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  // PR 170 (M1): savedDecks + loading now come from a cached React Query
  // (src/hooks/useFavorites.js); the un-star/unsave handlers patch the cache.
  const { data: savedDecks = [], isLoading: loading } = useFavorites(profile?.id);
  const { patchSavedDecks } = useFavoritesCache(profile?.id);

  // Toggle favorite — PR 28.15: post-unification, "saved" === "favorite".
  // Un-starring removes the row entirely (DELETE) since there's no
  // "saved but not favorited" state in the unified model. Mirror of
  // MyClasses.handleToggleFavorite.
  const handleToggleFavorite = async (deckId) => {
    if (!profile?.id) return;
    const removed = savedDecks.find(d => d.id === deckId);
    patchSavedDecks(prev => prev.filter(d => d.id !== deckId));
    const { error } = await supabase.from("saved_decks")
      .delete()
      .eq("student_id", profile.id)
      .eq("deck_id", deckId);
    if (error) {
      console.warn("[clasloop] unstar (toggle off) failed", { deckId, error });
      if (removed) {
        patchSavedDecks(prev => [removed, ...prev]);
      }
    }
  };

  const handleUnsave = async (deckId) => {
    if (!profile?.id) return;
    await supabase.from("saved_decks").delete()
      .eq("student_id", profile.id)
      .eq("deck_id", deckId);
    patchSavedDecks(prev => prev.filter(d => d.id !== deckId));
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={150} radius={12} />)}
          </div>
        ) : totalFavorites === 0 ? (
          <div style={{
            background: C.bg, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: 36, textAlign: "center",
          }}>
            <div style={{ marginBottom: 10 }}><CIcon name="star" size={44} /></div>
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
