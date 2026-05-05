import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { CIcon } from "../components/Icons";
import { Avatar as CatalogAvatar } from "../components/Avatars";
import { DeckCover, resolveColor, colorTint } from "../lib/deck-cover";
import MobileMenuButton from "../components/MobileMenuButton";

const C = {
  bg: "#FFFFFF", bgSoft: "#F7F7F5",
  accent: "#2383E2", accentSoft: "#E8F0FE",
  green: "#0F7B6C", greenSoft: "#EEFBF5",
  orange: "#D9730D", orangeSoft: "#FFF3E0",
  red: "#E03E3E", redSoft: "#FDECEC",
  purple: "#6940A5", purpleSoft: "#F3EEFB",
  text: "#191919", textSecondary: "#6B6B6B", textMuted: "#9B9B9B",
  border: "#E8E8E4", shadow: "0 1px 3px rgba(0,0,0,0.04)",
};
const MONO = "'JetBrains Mono', monospace";

const i18n = {
  en: {
    pageTitle: "Profile", teacher: "Teacher",
    publicDecks: "Public decks", uses: "uses", deck: "deck", decks: "decks",
    noDecks: "This teacher hasn't published any decks yet.",
    notAvailable: "This profile isn't public",
    notAvailableHint: "The profile you're looking for is private or doesn't exist.",
    backToCommunity: "Back to Community",
    share: "Share", linkCopied: "Link copied!",
    questions: "questions",
    saveToFavorites: "Save to favorites", removeFromFavorites: "Remove from favorites",
    saveToMyDecks: "Save to my decks",
    addToWhich: "Add to which class?", noClass: "No class — keep as personal", saved: "Saved!",
    by: "by", back: "Back",
  },
  es: {
    pageTitle: "Perfil", teacher: "Profesor",
    publicDecks: "Decks públicos", uses: "usos", deck: "deck", decks: "decks",
    noDecks: "Este profe aún no ha publicado decks.",
    notAvailable: "Este perfil no es público",
    notAvailableHint: "El perfil que buscas es privado o no existe.",
    backToCommunity: "Volver a Comunidad",
    share: "Compartir", linkCopied: "¡Enlace copiado!",
    questions: "preguntas",
    saveToFavorites: "Guardar en favoritos", removeFromFavorites: "Quitar de favoritos",
    saveToMyDecks: "Guardar en mis decks",
    addToWhich: "¿A qué clase?", noClass: "Sin clase — mantener personal", saved: "¡Guardado!",
    by: "por", back: "Volver",
  },
  ko: {
    pageTitle: "프로필", teacher: "교사",
    publicDecks: "공개 덱", uses: "회 사용", deck: "덱", decks: "덱",
    noDecks: "이 선생님은 아직 공개된 덱이 없습니다.",
    notAvailable: "이 프로필은 공개되지 않았습니다",
    notAvailableHint: "찾으시는 프로필은 비공개이거나 존재하지 않습니다.",
    backToCommunity: "커뮤니티로 돌아가기",
    share: "공유", linkCopied: "링크가 복사되었습니다!",
    questions: "문제",
    saveToFavorites: "즐겨찾기에 저장", removeFromFavorites: "즐겨찾기에서 제거",
    saveToMyDecks: "내 덱에 저장",
    addToWhich: "어느 수업에?", noClass: "수업 없음 — 개인용", saved: "저장됨!",
    by: "", back: "뒤로",
  },
};

const sel = {
  fontFamily: "'Outfit',sans-serif", background: C.bg, border: `1px solid ${C.border}`,
  color: C.text, padding: "6px 26px 6px 10px", borderRadius: 8, fontSize: 12,
  outline: "none", cursor: "pointer", appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%239B9B9B' stroke-width='1.5'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
  width: "auto", flexShrink: 0,
};

const css = `
  @keyframes tp-fade { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
  .tp-fade { animation: tp-fade .3s ease both }
  .tp-card { transition: transform .15s ease, box-shadow .15s ease; cursor: pointer; }
  .tp-card:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,0,0,0.06); }
  .tp-back:hover { background: ${C.accentSoft} !important; }
`;

function PageHeader({ title, lang, setLang, maxWidth = 800, onOpenMobileMenu }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, maxWidth, margin: "0 auto 24px", paddingBottom: 18, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <MobileMenuButton onOpen={onOpenMobileMenu} />
        <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 700, color: C.text, display: "flex", alignItems: "center", gap: 10 }}>
          <CIcon name="teacher" size={22} /> {title}
        </h1>
      </div>
      <select value={lang} onChange={(e) => setLang(e.target.value)} style={sel}>
        <option value="en">EN</option><option value="es">ES</option><option value="ko">한</option>
      </select>
    </div>
  );
}

// Render uploaded photo or catalog avatar or initial fallback.
function ProfilePic({ url, avatarId, name, size = 88 }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name || ""}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: `2px solid ${C.border}` }}
      />
    );
  }
  if (avatarId) {
    return <CatalogAvatar id={avatarId} size={size} />;
  }
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, fontWeight: 700, fontFamily: "'Outfit',sans-serif",
    }}>
      {initial}
    </div>
  );
}

export default function TeacherProfile({ teacherId, profile: viewerProfile, lang = "en", setLang, onNavigateToCommunity, onOpenMobileMenu }) {
  const t = i18n[lang] || i18n.en;
  const viewerId = viewerProfile?.id;
  const viewerRole = viewerProfile?.role; // "student" | "teacher"

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [decks, setDecks] = useState([]);
  const [notAvailable, setNotAvailable] = useState(false);
  const [saved, setSaved] = useState({}); // { deckId: true }
  const [userClasses, setUserClasses] = useState([]); // for the "save to my decks" modal (teachers only)
  const [savingDeck, setSavingDeck] = useState(null); // deck object that's being saved
  const [selectedDeck, setSelectedDeck] = useState(null); // deck open in detail view
  const [toast, setToast] = useState(null);

  // Fetch profile + decks
  useEffect(() => {
    if (!teacherId) { setNotAvailable(true); setLoading(false); return; }
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("id, full_name, role, avatar_url, avatar_id")
        .eq("id", teacherId)
        .maybeSingle();

      if (!p || p.role !== "teacher") {
        setNotAvailable(true);
        setLoading(false);
        return;
      }
      setProfile(p);

      const { data: dks } = await supabase
        .from("decks")
        .select("*")
        .eq("author_id", teacherId)
        .eq("is_public", true)
        .order("uses_count", { ascending: false });
      setDecks(dks || []);

      // Saved decks for the viewer (so we can show filled/empty stars)
      if (viewerId) {
        const { data: savedRows } = await supabase
          .from("saved_decks").select("deck_id").eq("student_id", viewerId);
        const map = {};
        (savedRows || []).forEach(r => { map[r.deck_id] = true; });
        setSaved(map);
      }

      // Teacher-only: load own classes for the "save to my decks" modal
      if (viewerRole === "teacher" && viewerId) {
        const { data: cls } = await supabase
          .from("classes").select("*").eq("teacher_id", viewerId).order("created_at", { ascending: false });
        setUserClasses(cls || []);
      }

      setLoading(false);
    })();
  }, [teacherId, viewerId, viewerRole]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const tm = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(tm);
  }, [toast]);

  const handleToggleFavorite = async (deck) => {
    if (!viewerId) return;
    const isAlreadySaved = saved[deck.id];
    if (isAlreadySaved) {
      const { error } = await supabase.from("saved_decks").delete().eq("student_id", viewerId).eq("deck_id", deck.id);
      if (!error) setSaved(prev => { const next = { ...prev }; delete next[deck.id]; return next; });
    } else {
      const { error } = await supabase.from("saved_decks").insert({ student_id: viewerId, deck_id: deck.id });
      if (!error) {
        await supabase.from("decks").update({ uses_count: (deck.uses_count || 0) + 1 }).eq("id", deck.id);
        setSaved(prev => ({ ...prev, [deck.id]: true }));
        setToast(t.saved);
      }
    }
  };

  const handleSaveToMyDecks = async (deck, classId) => {
    if (!viewerId) return;
    const cls = classId ? userClasses.find(c => c.id === classId) : null;
    const { error } = await supabase.from("decks").insert({
      author_id: viewerId, class_id: classId || null,
      title: deck.title, description: deck.description,
      subject: cls?.subject || deck.subject, grade: cls?.grade || deck.grade,
      language: deck.language, questions: deck.questions, tags: deck.tags, is_public: false,
      cover_color: deck.cover_color, cover_icon: deck.cover_icon, cover_image_url: deck.cover_image_url,
      copied_from_id: deck.id, // track the original — powers Following tab + "from X" badge
    });
    if (!error) {
      await supabase.from("decks").update({ uses_count: (deck.uses_count || 0) + 1 }).eq("id", deck.id);
      setSavingDeck(null);
      setToast(t.saved);
    }
  };

  const handleShare = async () => {
    if (typeof window === "undefined") return;
    const url = window.location.origin + "/teacher/" + (teacherId || "");
    if (navigator.share) {
      try { await navigator.share({ title: profile?.full_name || "", url }); return; }
      catch (_) { /* user cancelled — fall through */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      setToast(t.linkCopied);
    } catch (_) { /* no clipboard */ }
  };

  if (loading) {
    return (
      <div style={{ padding: "28px 20px" }}>
        <style>{css}</style>
        <PageHeader title={t.pageTitle} lang={lang} setLang={setLang} onOpenMobileMenu={onOpenMobileMenu} />
        <p style={{ textAlign: "center", color: C.textMuted, padding: 40 }}>...</p>
      </div>
    );
  }

  // ── Not available (student id, missing, or wrong role) ──
  if (notAvailable) {
    return (
      <div style={{ padding: "28px 20px" }}>
        <style>{css}</style>
        <PageHeader title={t.pageTitle} lang={lang} setLang={setLang} onOpenMobileMenu={onOpenMobileMenu} />
        <div className="tp-fade" style={{ maxWidth: 460, margin: "60px auto 0", textAlign: "center", padding: "32px 20px" }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: C.bgSoft, color: C.textMuted,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            marginBottom: 16,
          }}>
            <CIcon name="warning" size={28} inline />
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 8 }}>
            {t.notAvailable}
          </h2>
          <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5, marginBottom: 20 }}>
            {t.notAvailableHint}
          </p>
          {onNavigateToCommunity && (
            <button onClick={onNavigateToCommunity} style={{
              padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: C.accentSoft, color: C.accent,
              border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif",
            }}>{t.backToCommunity}</button>
          )}
        </div>
      </div>
    );
  }

  // ── Detail view (one deck open) ──
  if (selectedDeck) {
    const dk = selectedDeck;
    const accent = resolveColor(dk);
    const tint = colorTint(dk, "0F");
    const qs = dk.questions || [];
    const isSaved = !!saved[dk.id];
    const canCopyToMyDecks = viewerRole === "teacher" && viewerId !== teacherId; // not your own deck
    return (
      <div style={{ padding: "28px 20px" }}>
        <style>{css}</style>
        <PageHeader title={t.pageTitle} lang={lang} setLang={setLang} maxWidth={600} onOpenMobileMenu={onOpenMobileMenu} />
        <div className="tp-fade" style={{ maxWidth: 600, margin: "0 auto" }}>
          <button
            onClick={() => setSelectedDeck(null)}
            className="tp-back"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
              color: C.accent, background: "transparent",
              border: `1px solid ${C.border}`, cursor: "pointer",
              fontFamily: "'Outfit',sans-serif", marginBottom: 20,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {t.back}
          </button>

          <div style={{ background: C.bg, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
            <DeckCover deck={dk} variant="banner" height={140} radius={14} />
            <div style={{ background: tint, padding: 20 }}>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>{dk.subject} · {dk.grade}</div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, fontFamily: "'Outfit',sans-serif" }}>{dk.title}</h2>
              {dk.description && <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.5, marginBottom: 16 }}>{dk.description}</p>}
              <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>
                {qs.length} {t.questions} · {dk.uses_count || 0} {t.uses}
              </div>
              {(dk.tags || []).length > 0 && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 16 }}>
                  {dk.tags.map((tag, i) => <span key={i} style={{ padding: "3px 8px", borderRadius: 6, background: C.bg, border: `1px solid ${C.border}`, fontSize: 11, color: C.textSecondary }}>#{tag}</span>)}
                </div>
              )}
              {/* Action buttons */}
              {viewerId && viewerId !== teacherId && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={() => handleToggleFavorite(dk)}
                    style={{
                      padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: isSaved ? `${accent}14` : C.bg,
                      color: isSaved ? accent : C.textSecondary,
                      border: `1px solid ${isSaved ? accent + "44" : C.border}`,
                      cursor: "pointer", fontFamily: "'Outfit',sans-serif",
                      display: "inline-flex", alignItems: "center", gap: 6,
                    }}
                  >
                    <CIcon name="star" size={14} inline />
                    {isSaved ? t.removeFromFavorites : t.saveToFavorites}
                  </button>
                  {canCopyToMyDecks && (
                    <button
                      onClick={() => setSavingDeck(dk)}
                      style={{
                        padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                        background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, color: "#fff",
                        border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif",
                        display: "inline-flex", alignItems: "center", gap: 6,
                      }}
                    >
                      <CIcon name="plus" size={14} inline />
                      {t.saveToMyDecks}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {savingDeck && (
          <SaveModal t={t} deck={savingDeck} userClasses={userClasses} onClose={() => setSavingDeck(null)} onSave={handleSaveToMyDecks} />
        )}
        {toast && <Toast message={toast} />}
      </div>
    );
  }

  // ── Profile main ──
  const totalUses = decks.reduce((sum, d) => sum + (d.uses_count || 0), 0);
  const isOwnProfile = viewerId === teacherId;

  return (
    <div style={{ padding: "28px 20px" }}>
      <style>{css}</style>
      <PageHeader title={t.pageTitle} lang={lang} setLang={setLang} onOpenMobileMenu={onOpenMobileMenu} />

      <div className="tp-fade" style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Header — minimalist */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 32, flexWrap: "wrap" }}>
          <ProfilePic url={profile.avatar_url} avatarId={profile.avatar_id} name={profile.full_name} size={88} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Outfit',sans-serif", marginBottom: 4, lineHeight: 1.2 }}>
              {profile.full_name || "—"}
            </h2>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <CIcon name="teacher" size={12} inline /> {t.teacher}
            </div>
            <div style={{ display: "flex", gap: 18, fontSize: 13, color: C.textSecondary }}>
              <span><strong style={{ color: C.text, fontFamily: MONO }}>{decks.length}</strong> {decks.length === 1 ? t.deck : t.decks}</span>
              <span><strong style={{ color: C.text, fontFamily: MONO }}>{totalUses}</strong> {t.uses}</span>
            </div>
          </div>
          <button onClick={handleShare} style={{
            padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: C.bg, color: C.textSecondary, border: `1px solid ${C.border}`,
            cursor: "pointer", fontFamily: "'Outfit',sans-serif",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7M16 6l-4-4-4 4M12 2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {t.share}
          </button>
        </div>

        {/* Decks section */}
        <div style={{ paddingBottom: 12, borderBottom: `1px solid ${C.border}`, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: C.textSecondary, fontFamily: "'Outfit',sans-serif" }}>
            {t.publicDecks}
          </h3>
        </div>

        {decks.length === 0 ? (
          <p style={{ textAlign: "center", color: C.textMuted, fontSize: 13, padding: "40px 20px" }}>
            {t.noDecks}
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            {decks.map(dk => {
              const tint = colorTint(dk, "0F");
              const qs = dk.questions || [];
              const isSaved = !!saved[dk.id];
              const accent = resolveColor(dk);
              return (
                <div
                  key={dk.id}
                  className="tp-card"
                  onClick={() => setSelectedDeck(dk)}
                  style={{
                    background: C.bg, borderRadius: 14, overflow: "hidden",
                    border: `1px solid ${C.border}`,
                    fontFamily: "'Outfit',sans-serif",
                    display: "flex", flexDirection: "column",
                  }}
                >
                  <DeckCover deck={dk} variant="banner" height={88} radius={14} />
                  <div style={{ background: tint, padding: 14, flex: 1, display: "flex", flexDirection: "column" }}>
                    <h4 style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3, marginBottom: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {dk.title}
                    </h4>
                    <p style={{ fontSize: 11, color: C.textMuted, marginBottom: 10 }}>
                      {dk.subject} · {dk.grade}
                    </p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: C.textMuted, paddingTop: 10, marginTop: "auto", borderTop: `1px solid ${C.border}` }}>
                      <span>{qs.length} {t.questions}</span>
                      {/* Quick favorite (only if not your own profile) */}
                      {viewerId && !isOwnProfile && (
                        <button
                          onClick={e => { e.stopPropagation(); handleToggleFavorite(dk); }}
                          title={isSaved ? t.removeFromFavorites : t.saveToFavorites}
                          style={{
                            background: "transparent", border: "none", cursor: "pointer",
                            padding: 4, borderRadius: 6, color: isSaved ? accent : C.textMuted,
                            display: "inline-flex", alignItems: "center",
                          }}
                        >
                          <CIcon name="star" size={14} inline />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {savingDeck && (
        <SaveModal t={t} deck={savingDeck} userClasses={userClasses} onClose={() => setSavingDeck(null)} onSave={handleSaveToMyDecks} />
      )}
      {toast && <Toast message={toast} />}
    </div>
  );
}

// ─── Save modal (teacher only) ─────────────────────────────────────────────
function SaveModal({ t, deck, userClasses, onClose, onSave }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bg, borderRadius: 14, padding: 24, maxWidth: 420, width: "100%", boxShadow: "0 12px 40px rgba(0,0,0,0.15)" }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6, fontFamily: "'Outfit',sans-serif" }}>{t.addToWhich}</h3>
        <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 16 }}>{deck.title}</p>
        {userClasses.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {userClasses.map(c => (
              <button
                key={c.id}
                onClick={() => onSave(deck, c.id)}
                style={{
                  padding: 12, borderRadius: 10,
                  background: C.bg, border: `1px solid ${C.border}`,
                  textAlign: "left", display: "flex", alignItems: "center", gap: 10,
                  fontFamily: "'Outfit',sans-serif", cursor: "pointer",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{c.subject} · {c.grade}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => onSave(deck, null)}
          style={{
            width: "100%", padding: 10, borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: C.bgSoft, color: C.textSecondary,
            border: `1px solid ${C.border}`, cursor: "pointer",
            fontFamily: "'Outfit',sans-serif",
          }}
        >{t.noClass}</button>
      </div>
    </div>
  );
}

function Toast({ message }) {
  return (
    <div className="tp-fade" style={{
      position: "fixed", bottom: 24, right: 24,
      background: C.green, color: "#fff",
      padding: "10px 16px", borderRadius: 10,
      fontSize: 13, fontWeight: 600,
      boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
      display: "flex", alignItems: "center", gap: 8,
      fontFamily: "'Outfit',sans-serif", zIndex: 200,
    }}>
      <CIcon name="check" size={14} inline /> {message}
    </div>
  );
}
