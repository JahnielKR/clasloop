import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { LogoMark, CIcon } from "../components/Icons";
import { Avatar as CatalogAvatar } from "../components/Avatars";
import { DeckCover, resolveColor } from "../lib/deck-cover";

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
    publicDecks: "Public decks", uses: "uses", deck: "deck", decks: "decks",
    noDecks: "This teacher hasn't published any decks yet.",
    notAvailable: "This profile isn't public",
    notAvailableHint: "The profile you're looking for is private or doesn't exist.",
    backHome: "Back to home",
    share: "Share", linkCopied: "Link copied!",
    teacher: "Teacher",
    signIn: "Sign in",
    questions: "questions",
  },
  es: {
    publicDecks: "Decks públicos", uses: "usos", deck: "deck", decks: "decks",
    noDecks: "Este profe aún no ha publicado decks.",
    notAvailable: "Este perfil no es público",
    notAvailableHint: "El perfil que buscas es privado o no existe.",
    backHome: "Volver al inicio",
    share: "Compartir", linkCopied: "¡Enlace copiado!",
    teacher: "Profesor",
    signIn: "Iniciar sesión",
    questions: "preguntas",
  },
  ko: {
    publicDecks: "공개 덱", uses: "회 사용", deck: "덱", decks: "덱",
    noDecks: "이 선생님은 아직 공개된 덱이 없습니다.",
    notAvailable: "이 프로필은 공개되지 않았습니다",
    notAvailableHint: "찾으시는 프로필은 비공개이거나 존재하지 않습니다.",
    backHome: "홈으로",
    share: "공유", linkCopied: "링크가 복사되었습니다!",
    teacher: "교사",
    signIn: "로그인",
    questions: "문제",
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
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
  *{box-sizing:border-box}
  body{margin:0;background:${C.bgSoft};font-family:'Outfit',sans-serif;color:${C.text}}
  @keyframes tp-fade { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
  .tp-fade { animation: tp-fade .3s ease both }
  .tp-card { transition: transform .15s ease, box-shadow .15s ease; cursor: pointer; }
  .tp-card:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,0,0,0.06); }
  .tp-toast { animation: tp-fade .25s ease; }
`;

// Render either the uploaded photo OR the catalog avatar OR a fallback initial.
function ProfilePic({ url, avatarId, name, size = 96 }) {
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
  // Fallback: monogram circle
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

export default function TeacherProfile({ teacherId: propId }) {
  // Detect lang from URL or browser
  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const urlLang = urlParams.get("lang");
  const browserLang = typeof navigator !== "undefined" ? navigator.language?.slice(0, 2) : "en";
  const initialLang = ["en", "es", "ko"].includes(urlLang) ? urlLang
    : ["en", "es", "ko"].includes(browserLang) ? browserLang : "en";
  const [lang, setLang] = useState(initialLang);
  const t = i18n[lang] || i18n.en;

  // Read teacher id from prop or from URL path /teacher/:id
  const teacherId = propId || (typeof window !== "undefined"
    ? window.location.pathname.replace(/^\/teacher\/?/, "").split("/")[0]
    : "");

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [decks, setDecks] = useState([]);
  const [notAvailable, setNotAvailable] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!teacherId) { setNotAvailable(true); setLoading(false); return; }
    (async () => {
      // Fetch profile — only treat as "found" if role is teacher AND it exists
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

      // Fetch only public decks by this teacher
      const { data: dks } = await supabase
        .from("decks")
        .select("*")
        .eq("author_id", teacherId)
        .eq("is_public", true)
        .order("uses_count", { ascending: false });
      setDecks(dks || []);
      setLoading(false);
    })();
  }, [teacherId]);

  useEffect(() => {
    if (!toast) return;
    const tm = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(tm);
  }, [toast]);

  const handleShare = async () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    // Prefer native Web Share API on mobile, fallback to clipboard.
    if (navigator.share) {
      try {
        await navigator.share({ title: profile?.full_name || "", url });
        return;
      } catch (_) { /* user cancelled — fall through */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      setToast(t.linkCopied);
    } catch (_) { /* no clipboard access */ }
  };

  if (loading) {
    return (
      <>
        <style>{css}</style>
        <div style={{ minHeight: "100vh", background: C.bgSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "inline-flex" }}><LogoMark size={48} /></div>
        </div>
      </>
    );
  }

  // ── Not available (student id, missing, or wrong role) ──
  if (notAvailable) {
    return (
      <>
        <style>{css}</style>
        <div style={{ minHeight: "100vh", background: C.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="tp-fade" style={{
            background: C.bg, borderRadius: 16, border: `1px solid ${C.border}`,
            padding: 32, maxWidth: 420, width: "100%", textAlign: "center",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          }}>
            <div style={{ display: "inline-flex", marginBottom: 12 }}><LogoMark size={44} /></div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>
              {t.notAvailable}
            </h2>
            <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5, marginBottom: 20 }}>
              {t.notAvailableHint}
            </p>
            <a href="/" style={{
              display: "inline-block",
              padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600,
              background: C.accentSoft, color: C.accent,
              border: "none", cursor: "pointer", textDecoration: "none",
            }}>{t.backHome}</a>
          </div>
        </div>
      </>
    );
  }

  // ── Profile found ──
  const totalUses = decks.reduce((sum, d) => sum + (d.uses_count || 0), 0);

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: "100vh", background: C.bgSoft }}>
        {/* Top bar */}
        <div style={{
          background: C.bg, borderBottom: `1px solid ${C.border}`,
          padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", color: C.text }}>
            <LogoMark size={26} />
            <span style={{ fontSize: 15, fontWeight: 700 }}>Clasloop</span>
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <select value={lang} onChange={e => setLang(e.target.value)} style={sel}>
              <option value="en">EN</option><option value="es">ES</option><option value="ko">한</option>
            </select>
            <a href="/" style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: C.accent, color: "#fff", textDecoration: "none",
            }}>{t.signIn}</a>
          </div>
        </div>

        {/* Profile content */}
        <div className="tp-fade" style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px" }}>
          {/* Header — minimalist */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 32 }}>
            <ProfilePic url={profile.avatar_url} avatarId={profile.avatar_id} name={profile.full_name} size={88} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Outfit',sans-serif", marginBottom: 4, lineHeight: 1.2 }}>
                {profile.full_name || "—"}
              </h1>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <CIcon name="teacher" size={12} inline /> {t.teacher}
              </div>
              {/* Stats */}
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
              flexShrink: 0,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7M16 6l-4-4-4 4M12 2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {t.share}
            </button>
          </div>

          {/* Decks section */}
          <div style={{ paddingBottom: 12, borderBottom: `1px solid ${C.border}`, marginBottom: 20 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: C.textSecondary, fontFamily: "'Outfit',sans-serif" }}>
              {t.publicDecks}
            </h2>
          </div>

          {decks.length === 0 ? (
            <p style={{ textAlign: "center", color: C.textMuted, fontSize: 13, padding: "40px 20px" }}>
              {t.noDecks}
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {decks.map(dk => {
                const accent = resolveColor(dk);
                const tint = accent + "0F";
                const qs = dk.questions || [];
                return (
                  <div
                    key={dk.id}
                    className="tp-card"
                    style={{
                      background: C.bg, borderRadius: 14, overflow: "hidden",
                      border: `1px solid ${C.border}`,
                      fontFamily: "'Outfit',sans-serif",
                    }}
                  >
                    <DeckCover deck={dk} variant="banner" height={88} />
                    <div style={{ background: tint, padding: 14 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3, marginBottom: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {dk.title}
                      </h3>
                      <p style={{ fontSize: 11, color: C.textMuted, marginBottom: 10 }}>
                        {dk.subject} · {dk.grade}
                      </p>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.textMuted, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                        <span>{qs.length} {t.questions}</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <CIcon name="rocket" size={11} inline /> {dk.uses_count || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div className="tp-toast" style={{
            position: "fixed", bottom: 24, right: 24,
            background: C.green, color: "#fff",
            padding: "10px 16px", borderRadius: 10,
            fontSize: 13, fontWeight: 600,
            boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
            display: "flex", alignItems: "center", gap: 8,
            fontFamily: "'Outfit',sans-serif", zIndex: 200,
          }}>
            <CIcon name="check" size={14} inline /> {toast}
          </div>
        )}
      </div>
    </>
  );
}
