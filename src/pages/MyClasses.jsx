import { useState, useEffect, useRef } from "react";
import { useNavigate, useMatch } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { CIcon, LogoMark } from "../components/Icons";
import { Avatar } from "../components/Avatars";
import { DeckCover, colorTint } from "../lib/deck-cover";
import { useIsMobile } from "../components/MobileMenuButton";
import PageHeader from "../components/PageHeader";
import SectionBadge from "../components/SectionBadge";
import { C, MONO } from "../components/tokens";
import { getPracticeTimerPref, setPracticeTimerPref } from "../lib/practice-timer-pref";
import { ROUTES, buildRoute } from "../routes";

const i18n = {
  en: {
    pageTitle: "My Classes", subtitle: "Your classrooms and decks in one place.",
    joinClass: "+ Join Class", joinClassTitle: "Join a class",
    classCode: "Class code", classCodePlaceholder: "e.g. MATH-8B",
    join: "Join", joining: "Joining...", cancel: "Cancel",
    notFound: "Class not found. Check the code and try again.",
    alreadyJoined: "You're already in this class.",
    joinedClass: "Joined class!",
    noClassesYet: "No classes yet",
    noClassesSub: "Ask your teacher for a class code to get started.",
    loading: "Loading...",
    teacher: "Teacher", reviewsDue: "reviews due", decksAvailable: "decks",
    backToClasses: "Back to classes",
    tabReviews: "Reviews",     tabDecks: "Decks", tabProgress: "My Progress",
    nothingDueToday: "Nothing to review today \uD83C\uDF89",
    nothingDueSub: "You're all caught up. Come back tomorrow.",
    noDecksYet: "No decks yet",
    noDecksSub: "Your teacher hasn't published any decks for this class.",
    noProgressYet: "No progress data yet",
    noProgressSub: "Practice some decks or join a session to start tracking.",
    practice: "Practice", review: "Review",
    questionsCount: "questions", lastSeen: "Last seen", today: "today", daysAgo: "d ago",
    avgRetention: "Average retention", topicsTracked: "topics tracked",
    topicMastery: "Topic mastery",
    leaveClass: "Leave class",
    leaveConfirm: "Leave this class? You can rejoin anytime with the code.",
    leaveYes: "Yes, leave", leaveNo: "Cancel",
    leaveError: "Could not leave the class. Try again.",
    savedDecks: "Saved from community",
    savedDecksSub: "Decks you bookmarked from the community library.",
    savedFrom: "Saved from",
    unsave: "Unsave",
    strong: "Strong", medium: "Building", weak: "Weak",
    favorites: "Favorites", noFavorites: "Star a deck to mark it as favorite.",
    favoriteAdd: "Add to favorites", favoriteRemove: "Remove from favorites",
    practiceTimerOnTip: "Practice with timer (tap to study without time pressure)",
    practiceTimerOffTip: "Practice untimed (tap to use the recommended timing)",
    bySubject: "By subject", allDecks: "All",
  },
  es: {
    pageTitle: "Mis Clases", subtitle: "Tus salones y decks en un solo lugar.",
    joinClass: "+ Unirse a Clase", joinClassTitle: "Unirse a una clase",
    classCode: "Código de clase", classCodePlaceholder: "ej. MATH-8B",
    join: "Unirse", joining: "Uniéndose...", cancel: "Cancelar",
    notFound: "Clase no encontrada. Verifica el código.",
    alreadyJoined: "Ya estás en esta clase.",
    joinedClass: "¡Te uniste a la clase!",
    noClassesYet: "Aún no tienes clases",
    noClassesSub: "Pídele a tu profesor el código de la clase para empezar.",
    loading: "Cargando...",
    teacher: "Profesor/a", reviewsDue: "repasos pendientes", decksAvailable: "decks",
    backToClasses: "Volver a clases",
    tabReviews: "Repasos",     tabDecks: "Decks", tabProgress: "Mi Progreso",
    nothingDueToday: "Nada por repasar hoy \uD83C\uDF89",
    nothingDueSub: "Estás al día. Vuelve mañana.",
    noDecksYet: "Sin decks aún",
    noDecksSub: "Tu profesor aún no ha publicado decks para esta clase.",
    noProgressYet: "Aún no hay datos de progreso",
    noProgressSub: "Practica decks o únete a una sesión para empezar a registrar.",
    practice: "Practicar", review: "Repasar",
    questionsCount: "preguntas", lastSeen: "Última vez", today: "hoy", daysAgo: "d atrás",
    avgRetention: "Retención promedio", topicsTracked: "temas registrados",
    topicMastery: "Dominio por tema",
    leaveClass: "Salir de la clase",
    leaveConfirm: "¿Salir de esta clase? Puedes volver con el código.",
    leaveYes: "Sí, salir", leaveNo: "Cancelar",
    leaveError: "No se pudo salir de la clase. Intentá de nuevo.",
    savedDecks: "Guardados de la comunidad",
    savedDecksSub: "Decks que guardaste de la biblioteca pública.",
    savedFrom: "Guardado de",
    unsave: "Quitar",
    strong: "Sólido", medium: "Avanzando", weak: "Débil",
    favorites: "Favoritos", noFavorites: "Marca un deck con la estrella para favoritarlo.",
    favoriteAdd: "Añadir a favoritos", favoriteRemove: "Quitar de favoritos",
    practiceTimerOnTip: "Practicar con timer (toca para estudiar sin presión)",
    practiceTimerOffTip: "Practicar sin timer (toca para usar el tiempo recomendado)",
    bySubject: "Por materia", allDecks: "Todos",
  },
  ko: {
    pageTitle: "내 수업", subtitle: "교실과 덱을 한 곳에서.",
    joinClass: "+ 수업 참여", joinClassTitle: "수업에 참여",
    classCode: "수업 코드", classCodePlaceholder: "예: MATH-8B",
    join: "참여", joining: "참여 중...", cancel: "취소",
    notFound: "수업을 찾을 수 없습니다. 코드를 확인하세요.",
    alreadyJoined: "이미 참여한 수업입니다.",
    joinedClass: "수업에 참여했습니다!",
    noClassesYet: "아직 수업이 없습니다",
    noClassesSub: "선생님께 수업 코드를 요청하세요.",
    loading: "로딩 중...",
    teacher: "교사", reviewsDue: "복습 대기", decksAvailable: "덱",
    backToClasses: "수업으로 돌아가기",
    tabReviews: "복습", tabDecks: "덱", tabProgress: "내 진도",
    nothingDueToday: "오늘 복습할 것이 없습니다 \uD83C\uDF89",
    nothingDueSub: "모두 따라잡았습니다. 내일 다시 오세요.",
    noDecksYet: "아직 덱이 없습니다",
    noDecksSub: "선생님이 아직 이 수업의 덱을 게시하지 않았습니다.",
    noProgressYet: "아직 진도 데이터가 없습니다",
    noProgressSub: "덱을 연습하거나 세션에 참여하여 시작하세요.",
    practice: "연습", review: "복습",
    questionsCount: "문제", lastSeen: "마지막", today: "오늘", daysAgo: "일 전",
    avgRetention: "평균 기억률", topicsTracked: "추적된 주제",
    topicMastery: "주제별 숙달도",
    leaveClass: "수업에서 나가기",
    leaveConfirm: "이 수업에서 나가시겠습니까? 코드로 다시 참여할 수 있습니다.",
    leaveYes: "네, 나가기", leaveNo: "취소",
    leaveError: "수업에서 나갈 수 없습니다. 다시 시도하세요.",
    savedDecks: "커뮤니티에서 저장",
    savedDecksSub: "커뮤니티 라이브러리에서 북마크한 덱.",
    savedFrom: "저장 출처",
    unsave: "저장 취소",
    strong: "탄탄함", medium: "성장 중", weak: "약함",
    favorites: "즐겨찾기", noFavorites: "별표를 눌러 즐겨찾기로 지정하세요.",
    favoriteAdd: "즐겨찾기 추가", favoriteRemove: "즐겨찾기 제거",
    practiceTimerOnTip: "타이머와 함께 학습 (탭하여 시간 압박 없이 학습)",
    practiceTimerOffTip: "타이머 없이 학습 (탭하여 권장 시간 사용)",
    bySubject: "과목별", allDecks: "전체",
  },
};

const inp = { fontFamily: "'Outfit',sans-serif", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: "11px 14px", borderRadius: 8, fontSize: 14, width: "100%", outline: "none" };

const css = `
  @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes flashGlow {
    /* Uses --c-accent so the flash matches the active theme (lighter blue
       in dark mode, deeper blue in light mode). */
    0%   { box-shadow: 0 0 0 0 var(--c-accent), 0 0 18px 6px var(--c-accent); }
    100% { box-shadow: 0 0 0 0 transparent, 0 0 0 0 transparent; }
  }
  .fade-up { animation: fadeUp .35s ease-out both; }
  .mc-flash { animation: flashGlow 1.6s ease-out; border-radius: 12px; }
  /* Hover: previously hardcoded #F5F9FF (very light blue) which read fine
     in light mode but flashed near-white over the dark surface in dark
     mode. Switched to bg-soft instead of accent-soft because accent-soft
     is too tinted: in light mode it makes avatar circles (which use light
     palettes) appear washed out, and in dark mode the navy bg contrasts
     too strongly with the light-palette SVG avatars. bg-soft is the
     default page background and gives a subtle "sunken" effect without
     overpowering the contents. The lift + shadow are what carry the hover
     signal. */
  .mc-class-card { transition: all .15s ease; cursor: pointer; }
  .mc-class-card:hover { background: var(--c-bg-soft) !important; transform: translateY(-2px); box-shadow: 0 4px 14px rgba(35,131,226,0.10); }
  .mc-class-card:active { transform: translateY(0) scale(.99); }
  .mc-deck-card { transition: all .15s ease; cursor: pointer; }
  .mc-deck-card:hover { background: var(--c-bg-soft) !important; transform: translateY(-2px); box-shadow: 0 4px 14px rgba(35,131,226,0.10); }
  .mc-deck-card:active { transform: translateY(0) scale(.99); }
  .mc-tab:hover { color: #2383E2 !important; }
  .mc-join-btn:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(35,131,226,0.25); }
  .mc-join-btn:not(:disabled):active { transform: translateY(0) scale(.97); }
  .mc-scroll-x { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; -ms-overflow-style: none; }
  .mc-scroll-x::-webkit-scrollbar { display: none; }
`;

const Card = ({ children, style = {}, onClick, className = "" }) => (
  <div className={className} onClick={onClick} style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16, ...style }}>
    {children}
  </div>
);

const retCol = (r) => r >= 80 ? C.green : r >= 60 ? C.orange : C.red;

// ─── Main page ──────────────────────────────────────────────────────────────
export default function MyClasses({ lang: pageLang = "en", setLang: pageSetLang, profile = null, onLaunchPractice = null, onOpenMobileMenu, studentMembershipTick = 0, notifyMembershipChanged }) {
  const l = pageLang || "en";
  const t = i18n[l] || i18n.en;
  const setLang = pageSetLang || (() => {});

  // Subview is derived from the URL:
  //   /classes              → view="list"
  //   /classes/:classId     → view="class" (selectedClassId from URL)
  // No more useState for view/selectedClassId — the router owns it. This
  // makes the back button work naturally between list and class detail.
  const navigate = useNavigate();
  const classDetailMatch = useMatch("/classes/:classId");
  const selectedClassId = classDetailMatch?.params?.classId || null;
  const view = selectedClassId ? "class" : "list";

  // List view state
  const [classes, setClasses] = useState([]);      // [{ ...class, teacher, reviewsDue, deckCount }]
  const [savedDecks, setSavedDecks] = useState([]); // [{ ...deck, class_name, teacher_name }]
  const [loading, setLoading] = useState(true);

  // Join form
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [flashClassId, setFlashClassId] = useState(null);
  const joinFormRef = useRef(null);
  const classRefs = useRef({});

  // PR 26.2 + 26.3: studentMembershipTick increments every time the
  // student's class membership changes (join via modal, leave via
  // class detail). Including it in deps causes loadAll to re-run, so
  // the list updates immediately without a page reload.
  useEffect(() => { loadAll(); }, [profile?.id, studentMembershipTick]);

  const loadAll = async () => {
    if (!profile?.id) { setLoading(false); return; }
    setLoading(true);

    // 1. Classes the student belongs to (via class_members)
    const { data: members } = await supabase
      .from("class_members")
      .select("class_id, classes(*, profiles:teacher_id(full_name, avatar_url, avatar_id, id))")
      .eq("student_id", profile.id);

    const list = (members || [])
      .map(m => m.classes)
      .filter(Boolean);

    // 2. For each class, count decks + reviews due (best-effort)
    const enriched = await Promise.all(list.map(async (cls) => {
      const { count: deckCount } = await supabase
        .from("decks")
        .select("*", { count: "exact", head: true })
        .eq("class_id", cls.id);

      // Count reviews due for this student in this class
      const { data: progress } = await supabase
        .from("student_topic_progress")
        .select("retention_score, last_reviewed_at")
        .eq("student_id", profile.id)
        .eq("class_id", cls.id);
      const reviewsDue = (progress || []).filter(p => (p.retention_score ?? 100) < 65).length;
      const avgRetention = (progress && progress.length > 0)
        ? Math.round(progress.reduce((s, p) => s + (p.retention_score || 0), 0) / progress.length)
        : null;

      return {
        ...cls,
        deckCount: deckCount || 0,
        reviewsDue,
        avgRetention,
      };
    }));

    setClasses(enriched);

    // 3. Saved decks from community
    const { data: saved } = await supabase
      .from("saved_decks")
      .select("deck_id, saved_at, is_favorite, decks(*, classes(name, profiles:teacher_id(full_name)))")
      .eq("student_id", profile.id)
      .order("saved_at", { ascending: false });

    setSavedDecks((saved || [])
      .filter(s => s.decks)
      .map(s => ({ ...s.decks, _isFavorite: s.is_favorite || false }))
    );

    setLoading(false);
  };

  // ── Join class ──
  const openJoinForm = () => {
    setShowJoinForm(true);
    setJoinError("");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        joinFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  };

  const handleJoinClass = async () => {
    if (!joinCode.trim() || !profile?.id) return;
    setJoining(true);
    setJoinError("");

    const code = joinCode.trim().toUpperCase();
    const { data: cls, error: findErr } = await supabase
      .from("classes")
      .select("*")
      .eq("class_code", code)
      .single();

    if (findErr || !cls) {
      setJoinError(t.notFound);
      setJoining(false);
      return;
    }

    const { error: joinErr } = await supabase
      .from("class_members")
      .insert({ class_id: cls.id, student_id: profile.id, student_name: profile.full_name });

    if (joinErr) {
      if (joinErr.code === "23505") setJoinError(t.alreadyJoined);
      else setJoinError(joinErr.message);
      setJoining(false);
      return;
    }

    setShowJoinForm(false);
    setJoinCode("");
    setFlashClassId(cls.id);
    setTimeout(() => setFlashClassId(null), 1600);
    await loadAll();
    setJoining(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        classRefs.current[cls.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  };

  // ── Saved deck unsave ──
  const handleUnsave = async (deckId) => {
    if (!profile?.id) return;
    await supabase.from("saved_decks").delete()
      .eq("student_id", profile.id)
      .eq("deck_id", deckId);
    setSavedDecks(prev => prev.filter(d => d.id !== deckId));
  };

  // ── Toggle favorite on a saved deck ──
  const handleToggleFavorite = async (deckId) => {
    if (!profile?.id) return;
    // Optimistic flip
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
      // Revert on failure
      setSavedDecks(prev => prev.map(d => d.id === deckId ? { ...d, _isFavorite: !nextValue } : d));
    }
  };

  if (!profile) return null;
  if (loading) return (
    <div style={{ padding: "28px 20px" }}>
      <style>{css}</style>
      <PageHeader title={t.pageTitle} lang={l} setLang={setLang} maxWidth={720} onOpenMobileMenu={onOpenMobileMenu} />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: 40, textAlign: "center", color: C.textMuted, fontFamily: "'Outfit',sans-serif" }}>{t.loading}</div>
    </div>
  );

  // ── Class detail view ──
  if (view === "class" && selectedClassId) {
    const cls = classes.find(c => c.id === selectedClassId);
    if (!cls) {
      // Class not found (deleted, wrong id, or list still loading). Bounce
      // back to /classes. The state (loading) above already handled the
      // "still loading" case before us, so this path is "id was bad".
      navigate(ROUTES.CLASSES, { replace: true });
      return null;
    }
    return (
      <div style={{ padding: "28px 20px" }}>
        <style>{css}</style>
        <PageHeader title={t.pageTitle} lang={l} setLang={setLang} maxWidth={720} onOpenMobileMenu={onOpenMobileMenu} />
        <ClassDetail
          cls={cls}
          profile={profile}
          t={t}
          lang={l}
          onBack={() => { navigate(ROUTES.CLASSES); loadAll(); }}
          onLaunchPractice={onLaunchPractice}
          notifyMembershipChanged={notifyMembershipChanged}
        />
      </div>
    );
  }

  // ── List view ──
  return (
    <div style={{ padding: "28px 20px" }}>
      <style>{css}</style>
      <PageHeader title={t.pageTitle} lang={l} setLang={setLang} maxWidth={720} onOpenMobileMenu={onOpenMobileMenu} />
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Title + action row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, color: C.textSecondary, margin: 0 }}>{t.subtitle}</p>
          </div>
          <button
            className="mc-join-btn"
            onClick={openJoinForm}
            disabled={showJoinForm}
            style={{
              padding: "9px 16px", borderRadius: 8,
              fontSize: 13, fontWeight: 600,
              background: showJoinForm ? C.bgSoft : `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
              color: showJoinForm ? C.textMuted : "#fff",
              border: showJoinForm ? `1px solid ${C.border}` : "none",
              cursor: showJoinForm ? "default" : "pointer",
              opacity: showJoinForm ? 0.6 : 1,
              fontFamily: "'Outfit',sans-serif",
              flexShrink: 0, whiteSpace: "nowrap",
              transition: "all .15s ease",
            }}
          >{t.joinClass}</button>
        </div>

        {/* Inline join form */}
        {showJoinForm && (
          <div ref={joinFormRef}>
            <Card className="fade-up" style={{ marginBottom: 16, borderColor: C.accent, borderLeft: `3px solid ${C.accent}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: C.accent, display: "flex", alignItems: "center", gap: 6 }}>
                  <CIcon name="plus" size={16} inline /> {t.joinClassTitle}
                </h3>
                <button
                  onClick={() => { setShowJoinForm(false); setJoinCode(""); setJoinError(""); }}
                  style={{ padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: "transparent", color: C.textMuted, border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}
                >{t.cancel}</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input
                  value={joinCode}
                  onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError(""); }}
                  onKeyDown={e => { if (e.key === "Enter") handleJoinClass(); }}
                  placeholder={t.classCodePlaceholder}
                  autoFocus
                  style={{ ...inp, fontFamily: MONO, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}
                />
                {joinError && (
                  <div style={{ fontSize: 12, color: C.red, padding: "6px 10px", background: C.redSoft, borderRadius: 6 }}>{joinError}</div>
                )}
                <button
                  onClick={handleJoinClass}
                  disabled={!joinCode.trim() || joining}
                  style={{
                    padding: "10px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600,
                    background: joinCode.trim() && !joining ? C.accent : C.border,
                    color: "#fff", border: "none",
                    cursor: joinCode.trim() && !joining ? "pointer" : "default",
                    fontFamily: "'Outfit',sans-serif",
                  }}
                >{joining ? t.joining : t.join}</button>
              </div>
            </Card>
          </div>
        )}

        {/* Empty state */}
        {classes.length === 0 && !showJoinForm && (
          <Card style={{ textAlign: "center", padding: 36 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📚</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, fontFamily: "'Outfit'" }}>{t.noClassesYet}</h3>
            <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 18, lineHeight: 1.5 }}>{t.noClassesSub}</p>
            <button
              onClick={openJoinForm}
              style={{
                padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600,
                background: C.accent, color: "#fff", border: "none", cursor: "pointer",
                fontFamily: "'Outfit',sans-serif",
              }}
            >{t.joinClass}</button>
          </Card>
        )}

        {/* Class cards */}
        {classes.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
            {classes.map(cls => {
              const isFlash = flashClassId === cls.id;
              const teacher = cls.profiles;
              return (
                <div key={cls.id} ref={el => { classRefs.current[cls.id] = el; }} className={isFlash ? "mc-flash" : ""}>
                  <Card
                    className="mc-class-card"
                    onClick={() => navigate(buildRoute.classDetail(cls.id))}
                    style={{ padding: 16, borderLeft: `3px solid ${cls.avgRetention ? retCol(cls.avgRetention) : C.accent}` }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flexShrink: 0 }}>
                        {teacher ? (
                          <Avatar
                            photoUrl={teacher.avatar_url}
                            id={teacher.avatar_id}
                            seed={teacher.id}
                            size={44}
                          />
                        ) : (
                          <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.bgSoft }} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'Outfit'" }}>{cls.name}</h3>
                          <span style={{ fontSize: 10, fontFamily: MONO, fontWeight: 700, color: C.accent, background: C.accentSoft, padding: "2px 6px", borderRadius: 4 }}>{cls.class_code}</span>
                        </div>
                        <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 8px 0" }}>
                          {cls.subject} · {cls.grade} · {teacher?.full_name || t.teacher}
                        </p>
                        <div style={{ display: "flex", gap: 12, fontSize: 12, flexWrap: "wrap", rowGap: 4 }}>
                          {cls.reviewsDue > 0 && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.orange, fontWeight: 600 }}>
                              <CIcon name="clock" size={12} inline /> {cls.reviewsDue} {t.reviewsDue}
                            </span>
                          )}
                          <span style={{ color: C.textMuted, display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <CIcon name="book" size={12} inline /> {cls.deckCount} {t.decksAvailable}
                          </span>
                          {cls.avgRetention !== null && (
                            <span style={{ color: retCol(cls.avgRetention), fontWeight: 600, fontFamily: MONO }}>
                              {cls.avgRetention}%
                            </span>
                          )}
                        </div>
                      </div>
                      <span style={{ fontSize: 18, color: C.textMuted, flexShrink: 0, alignSelf: "center" }}>→</span>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        )}

        {/* Saved decks from community */}
        {savedDecks.length > 0 && (() => {
          const favorites = savedDecks.filter(d => d._isFavorite);
          // Group remaining by subject (favorites still appear in their subject group too,
          // BUT we exclude them when rendering subject groups so they only show once at top).
          const remaining = savedDecks.filter(d => !d._isFavorite);
          const bySubject = {};
          for (const d of remaining) {
            const key = d.subject || "Other";
            if (!bySubject[key]) bySubject[key] = [];
            bySubject[key].push(d);
          }
          const subjectKeys = Object.keys(bySubject).sort();

          return (
            <div style={{ marginTop: 32 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Outfit'", margin: "0 0 4px" }}>{t.savedDecks}</h3>
              <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 16px" }}>{t.savedDecksSub}</p>

              {/* Favorites section */}
              {favorites.length > 0 && (
                <div style={{ marginBottom: 22 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#EF9F27"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#BA7517" }}>{t.favorites}</span>
                    <span style={{ fontSize: 11, color: C.textMuted, fontFamily: MONO }}>· {favorites.length}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                    {favorites.map(deck => (
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
                </div>
              )}

              {/* Grouped by subject */}
              {subjectKeys.map(subj => (
                <div key={subj} style={{ marginBottom: 22 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <CIcon name={(SUBJECT_ICON_MAP[subj] || "book")} size={14} inline />
                    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: C.textSecondary }}>{subj}</span>
                    <span style={{ fontSize: 11, color: C.textMuted, fontFamily: MONO }}>· {bySubject[subj].length}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                    {bySubject[subj].map(deck => (
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
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// Subject icon shorthand for the group header bar (ASCII fallback if missing).
const SUBJECT_ICON_MAP = { Math: "math", Science: "science", History: "history", Language: "language", Geography: "geo", Art: "art", Music: "music", Other: "book" };

// ─── SavedDeckCard ──────────────────────────────────────────────────────────
function SavedDeckCard({ deck, t, lang, onPractice, onToggleFavorite, onUnsave }) {
  const isFav = deck._isFavorite;
  const qs = deck.questions || [];
  const tint = colorTint(deck, "0F");
  // Per-deck practice timer preference. El estudiante elige aquí si este deck
  // se practica con tiempo o sin presión, ANTES de entrar — más intuitivo que
  // descubrir el botón pequeño dentro del quiz.
  const [timerOn, setTimerOn] = useState(() => getPracticeTimerPref(deck.id));
  const handleToggleTimer = (e) => {
    e.stopPropagation();
    const next = !timerOn;
    setTimerOn(next);
    setPracticeTimerPref(deck.id, next);
  };
  return (
    <div
      className="mc-deck-card"
      onClick={onPractice}
      style={{
        background: C.bg, borderRadius: 14, border: `1px solid ${C.border}`,
        overflow: "hidden", boxShadow: C.shadow,
        display: "flex", flexDirection: "column",
        cursor: "pointer", position: "relative",
        transition: "all .15s ease",
      }}
    >
      <div style={{ position: "relative" }}>
        <DeckCover deck={deck} variant="banner" height={88} radius={14} />
        {/* Star — top-left over the banner. Moved here from the right to
            make room for the timer toggle on the right. */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          title={isFav ? t.favoriteRemove : t.favoriteAdd}
          style={{
            position: "absolute", top: 8, left: 8,
            width: 30, height: 30, padding: 0,
            background: "rgba(255,255,255,0.85)", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: "50%",
            backdropFilter: "blur(4px)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
            zIndex: 1,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill={isFav ? "#EF9F27" : "none"} stroke={isFav ? "#EF9F27" : "#5A5A5A"} strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </button>
        {/* Practice timer toggle — top-right. Decision happens BEFORE entering
            the deck (more intuitive than discovering the small button inside
            the quiz). Per-deck preference: each deck remembers its own.
            Visual language matches the star: SVG with a real body that gets
            FILLED when ON (illuminated, like the star turning yellow), and
            outline-only when OFF. The icon is a stopwatch (race-style pocket
            watch) — instantly recognizable as "timer on/off". */}
        <button
          onClick={handleToggleTimer}
          title={timerOn ? t.practiceTimerOnTip : t.practiceTimerOffTip}
          aria-label={timerOn ? t.practiceTimerOnTip : t.practiceTimerOffTip}
          style={{
            position: "absolute", top: 8, right: 8,
            width: 30, height: 30, padding: 0,
            background: "rgba(255,255,255,0.85)", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: "50%",
            backdropFilter: "blur(4px)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
            zIndex: 1,
          }}
        >
          {/* Stopwatch: crown (button on top), side arms, round body, hands.
              When ON: body filled with C.accent, hands in white. When OFF:
              outline only in muted gray. Matches the star's "on/off" visual
              with a real shape that fills, not just a stroke color change. */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill={timerOn ? C.accent : "none"} stroke={timerOn ? C.accent : "#5A5A5A"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {/* Crown (top button) */}
            <line x1="10" y1="2" x2="14" y2="2" />
            <line x1="12" y1="2" x2="12" y2="5" />
            {/* Body (filled circle when ON) */}
            <circle cx="12" cy="14" r="7.5" />
            {/* Hands — white when ON (visible against accent fill), gray when OFF */}
            <line x1="12" y1="14" x2="12" y2="9.5" stroke={timerOn ? "#fff" : "#5A5A5A"} />
            <line x1="12" y1="14" x2="15.2" y2="14" stroke={timerOn ? "#fff" : "#5A5A5A"} />
          </svg>
        </button>
      </div>
      <div style={{ padding: 14, background: tint, borderTop: `1px solid ${C.border}`, flex: 1, display: "flex", flexDirection: "column" }}>
        {/* PR 11: Section badge — students asked to see warmup vs exit
            ticket vs review on their saved decks (same fix as Community
            in PR 9). Goes first so it's the most prominent piece of meta. */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: 11, color: C.textMuted, flexWrap: "wrap" }}>
          {deck.section && <SectionBadge section={deck.section} lang={lang} variant="compact" />}
          <span>{deck.subject} · {deck.grade}</span>
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{deck.title}</h3>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onPractice(); }}
            style={{
              flex: 1, padding: "8px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600,
              background: C.accent, color: "#fff", border: "none", cursor: "pointer",
              fontFamily: "'Outfit',sans-serif",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
            }}
          ><CIcon name="rocket" size={11} inline /> {t.practice}</button>
          <button
            onClick={(e) => { e.stopPropagation(); onUnsave(); }}
            style={{
              padding: "8px 10px", borderRadius: 7, fontSize: 11,
              background: "transparent", color: C.textMuted,
              border: `1px solid ${C.border}`, cursor: "pointer",
              fontFamily: "'Outfit',sans-serif",
            }}
            title={t.unsave}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 6H21M8 6V4C8 3.4 8.4 3 9 3H15C15.6 3 16 3.4 16 4V6M19 6L18 20C18 20.6 17.6 21 17 21H7C6.4 21 6 20.6 6 20L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 8, marginTop: "auto", borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.textMuted }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.savedFrom} {deck.classes?.profiles?.full_name || t.teacher}</span>
          <span style={{ fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>{qs.length} {t.questionsCount}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Class Detail ───────────────────────────────────────────────────────────
function ClassDetail({ cls, profile, t, lang, onBack, onLaunchPractice, notifyMembershipChanged }) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("reviews");
  const [decks, setDecks] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leavingConfirm, setLeavingConfirm] = useState(false);

  useEffect(() => { loadDetail(); }, [cls.id, profile?.id]);

  const loadDetail = async () => {
    setLoading(true);
    const [{ data: decksData }, { data: progressData }] = await Promise.all([
      supabase.from("decks").select("*").eq("class_id", cls.id).order("created_at", { ascending: false }),
      supabase.from("student_topic_progress").select("*").eq("student_id", profile.id).eq("class_id", cls.id),
    ]);
    setDecks(decksData || []);
    setProgress(progressData || []);
    setLoading(false);
  };

  const handleLeave = async () => {
    // PR 26.3: capture the response to verify the delete actually
    // affected rows. Pre-PR-26.3 the class_members table had no
    // DELETE policy, so Supabase silently returned 0 rows touched
    // and the "Leave class" button did nothing. After the migration
    // this works; the count check below catches future RLS
    // regressions so we don't silently fail again.
    const { error, count } = await supabase.from("class_members").delete({ count: "exact" })
      .eq("class_id", cls.id)
      .eq("student_id", profile.id);
    if (error) {
      console.error("[clasloop] Leave class failed:", error);
      alert(t.leaveError || "Could not leave the class. Try again.");
      return;
    }
    if (count === 0) {
      // Probably an RLS policy missing. Don't lie to the user.
      console.error("[clasloop] Leave class affected 0 rows (RLS?)");
      alert(t.leaveError || "Could not leave the class. Try again.");
      return;
    }
    setLeavingConfirm(false);
    // PR 26.3: notify App.jsx so it re-checks membership. If this was
    // the student's only class, the gating ClassCodeModal opens again.
    // If they're still in other classes, MyClasses just refreshes
    // its list (the leave row is gone).
    if (notifyMembershipChanged) notifyMembershipChanged();
    onBack();
  };

  // Reviews due (retention < 65%)
  const reviewsDue = progress
    .filter(p => (p.retention_score ?? 100) < 65)
    .sort((a, b) => (a.retention_score ?? 100) - (b.retention_score ?? 100));

  // Counts for tabs
  const tabs = [
    { id: "reviews",  label: t.tabReviews,  count: reviewsDue.length, icon: "clock" },
    { id: "decks",    label: t.tabDecks,    count: decks.length,      icon: "book"  },
    { id: "progress", label: t.tabProgress, count: progress.length,   icon: "study" },
  ];

  const teacher = cls.profiles;
  const avgRetention = progress.length > 0
    ? Math.round(progress.reduce((s, p) => s + (p.retention_score || 0), 0) / progress.length)
    : 0;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Back */}
      <button
        onClick={onBack}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
          color: C.accent, background: C.accentSoft, border: "none",
          marginBottom: 16, cursor: "pointer", fontFamily: "'Outfit',sans-serif",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12L11 6M5 12L11 18" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        {t.backToClasses}
      </button>

      {/* Header */}
      <Card style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 12 }}>
          <div style={{ flexShrink: 0 }}>
            {teacher ? (
              <Avatar
                photoUrl={teacher.avatar_url}
                id={teacher.avatar_id}
                seed={teacher.id}
                size={56}
              />
            ) : (
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.bgSoft }} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
              <h2 style={{ fontFamily: "'Outfit'", fontSize: 20, fontWeight: 700, margin: 0 }}>{cls.name}</h2>
              <span style={{ fontSize: 11, fontFamily: MONO, fontWeight: 700, color: C.accent, background: C.accentSoft, padding: "2px 7px", borderRadius: 4 }}>{cls.class_code}</span>
            </div>
            <p style={{ fontSize: 13, color: C.textSecondary, margin: 0 }}>
              {cls.subject} · {cls.grade} · {teacher?.full_name || t.teacher}
            </p>
          </div>
          {!isMobile && (
            <button
              onClick={() => setLeavingConfirm(true)}
              style={{
                padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 500,
                background: "transparent", color: C.red,
                border: `1px solid ${C.redSoft}`, cursor: "pointer",
                fontFamily: "'Outfit',sans-serif",
                flexShrink: 0,
              }}
            >{t.leaveClass}</button>
          )}
        </div>

        {isMobile && (
          <button
            onClick={() => setLeavingConfirm(true)}
            style={{
              width: "100%",
              padding: "8px 12px", borderRadius: 7, fontSize: 12, fontWeight: 500,
              background: "transparent", color: C.red,
              border: `1px solid ${C.redSoft}`, cursor: "pointer",
              fontFamily: "'Outfit',sans-serif",
              marginBottom: 12,
            }}
          >{t.leaveClass}</button>
        )}

        {avgRetention > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: MONO, color: retCol(avgRetention) }}>{avgRetention}%</div>
              <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t.avgRetention}</div>
            </div>
            <div style={{ width: 1, height: 36, background: C.border }} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: MONO }}>{progress.length}</div>
              <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t.topicsTracked}</div>
            </div>
          </div>
        )}
      </Card>

      {/* Leave confirm */}
      {leavingConfirm && (
        <Card className="fade-up" style={{ marginBottom: 16, borderLeft: `3px solid ${C.red}` }}>
          <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, margin: "0 0 12px" }}>{t.leaveConfirm}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setLeavingConfirm(false)} style={{ flex: 1, padding: 8, borderRadius: 8, fontSize: 13, fontWeight: 500, background: C.bg, color: C.textSecondary, border: `1px solid ${C.border}`, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{t.leaveNo}</button>
            <button onClick={handleLeave} style={{ flex: 1, padding: 8, borderRadius: 8, fontSize: 13, fontWeight: 600, background: C.red, color: "#fff", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{t.leaveYes}</button>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className={isMobile ? "mc-scroll-x" : ""} style={{
        display: "flex", gap: 4, marginBottom: 16, borderBottom: `1px solid ${C.border}`,
        ...(isMobile ? { flexWrap: "nowrap" } : {}),
      }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className="mc-tab"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "10px 14px", background: "transparent", border: "none",
                borderBottom: `2.5px solid ${isActive ? C.accent : "transparent"}`,
                color: isActive ? C.accent : C.textSecondary,
                fontSize: 13, fontWeight: 600,
                fontFamily: "'Outfit',sans-serif",
                cursor: "pointer", marginBottom: -1,
                display: "flex", alignItems: "center", gap: 6,
                transition: "all .15s ease",
                whiteSpace: "nowrap", flexShrink: 0,
              }}
            >
              <CIcon name={tab.icon} size={14} inline />
              {tab.label}
              <span style={{
                fontSize: 11, fontWeight: 700, fontFamily: MONO,
                padding: "1px 7px", borderRadius: 999,
                background: isActive ? C.accent : C.bgSoft,
                color: isActive ? "#fff" : C.textMuted,
              }}>{tab.count}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {loading ? (
        <p style={{ textAlign: "center", padding: 40, color: C.textMuted }}>{t.loading}</p>
      ) : (
        <>
          {/* Reviews */}
          {activeTab === "reviews" && (
            <>
              {reviewsDue.length === 0 ? (
                <Card style={{ textAlign: "center", padding: 36 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, fontFamily: "'Outfit'" }}>{t.nothingDueToday}</h3>
                  <p style={{ fontSize: 13, color: C.textMuted, margin: 0, lineHeight: 1.5 }}>{t.nothingDueSub}</p>
                </Card>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {reviewsDue.map((p, i) => {
                    const matchingDeck = decks.find(d =>
                      d.title.toLowerCase().includes(p.topic.toLowerCase()) ||
                      p.topic.toLowerCase().includes(d.title.toLowerCase())
                    );
                    return (
                      <Card
                        key={i}
                        className="mc-deck-card"
                        onClick={() => matchingDeck && onLaunchPractice && onLaunchPractice(matchingDeck)}
                        style={{ padding: 12, opacity: matchingDeck ? 1 : 0.6, cursor: matchingDeck ? "pointer" : "default", display: "flex", alignItems: "center", gap: 10 }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{p.topic}</div>
                          {matchingDeck ? (
                            <div style={{ fontSize: 11, color: C.accent, marginTop: 2, fontWeight: 600 }}>{t.practice} · {matchingDeck.title}</div>
                          ) : (
                            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>—</div>
                          )}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: MONO, color: retCol(p.retention_score) }}>
                          {p.retention_score}%
                        </span>
                        {matchingDeck && <span style={{ fontSize: 16, color: C.textMuted }}>→</span>}
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Decks */}
          {activeTab === "decks" && (
            <>
              {decks.length === 0 ? (
                <Card style={{ textAlign: "center", padding: 36 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📖</div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, fontFamily: "'Outfit'" }}>{t.noDecksYet}</h3>
                  <p style={{ fontSize: 13, color: C.textMuted, margin: 0, lineHeight: 1.5 }}>{t.noDecksSub}</p>
                </Card>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
                  {decks.map(deck => {
                    const qs = deck.questions || [];
                    const tint = colorTint(deck, "0F");
                    return (
                      <div
                        key={deck.id}
                        className="mc-deck-card"
                        onClick={() => onLaunchPractice && onLaunchPractice(deck)}
                        style={{
                          background: C.bg, borderRadius: 14, border: `1px solid ${C.border}`,
                          overflow: "hidden", boxShadow: C.shadow,
                          cursor: "pointer", transition: "all .15s ease",
                          display: "flex", flexDirection: "column",
                        }}
                      >
                        <DeckCover deck={deck} variant="banner" height={88} radius={14} />
                        <div style={{ padding: 14, background: tint, borderTop: `1px solid ${C.border}`, flex: 1, display: "flex", flexDirection: "column" }}>
                          {/* PR 11: Section badge in class deck cards */}
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: 11, color: C.textMuted, flexWrap: "wrap" }}>
                            {deck.section && <SectionBadge section={deck.section} lang={lang} variant="compact" />}
                            <span>{deck.subject} · {deck.grade}</span>
                          </div>
                          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{deck.title}</h3>
                          <button
                            style={{
                              width: "100%",
                              padding: "8px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                              background: C.accent, color: "#fff", border: "none", cursor: "pointer",
                              fontFamily: "'Outfit',sans-serif",
                              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
                              marginBottom: 8,
                            }}
                          >
                            <CIcon name="rocket" size={11} inline /> {t.practice}
                          </button>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", paddingTop: 8, marginTop: "auto", borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.textMuted }}>
                            <span style={{ fontWeight: 600 }}>{qs.length} {t.questionsCount}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Progress */}
          {activeTab === "progress" && (
            <>
              {progress.length === 0 ? (
                <Card style={{ textAlign: "center", padding: 36 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, fontFamily: "'Outfit'" }}>{t.noProgressYet}</h3>
                  <p style={{ fontSize: 13, color: C.textMuted, margin: 0, lineHeight: 1.5 }}>{t.noProgressSub}</p>
                </Card>
              ) : (
                <Card style={{ padding: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Outfit'", marginBottom: 12, marginTop: 0 }}>{t.topicMastery}</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {progress
                      .slice()
                      .sort((a, b) => (b.retention_score || 0) - (a.retention_score || 0))
                      .map((p, i) => {
                        const r = p.retention_score || 0;
                        const status = r >= 80 ? "strong" : r >= 60 ? "medium" : "weak";
                        return (
                          <div key={i}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 8 }}>{p.topic}</span>
                              <span style={{ fontSize: 12, fontWeight: 700, fontFamily: MONO, color: retCol(r), flexShrink: 0 }}>{r}%</span>
                            </div>
                            <div style={{ width: "100%", height: 6, background: C.bgSoft, borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ width: `${r}%`, height: "100%", background: retCol(r), transition: "width .4s ease" }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
