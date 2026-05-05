import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../lib/supabase";
import { processSessionResults, getSuggestedDecksForToday } from "../lib/spaced-repetition";
import { CIcon } from "../components/Icons";
import { DeckCover, resolveColor } from "../lib/deck-cover";
import MobileMenuButton, { useIsMobile } from "../components/MobileMenuButton";
import PageHeader from "../components/PageHeader";
import { C, MONO } from "../components/tokens";

// ─── Theme ─────────────────────────────────────────────────────────────────
const SUBJECTS = ["Math", "Science", "History", "Language", "Geography", "Art", "Music", "Other"];

// ─── i18n ──────────────────────────────────────────────────────────────────
const i18n = {
  en: {
    pageTitle: "New Session", subtitle: "Launch a deck live in class",
    suggestedToday: "Suggested for today", suggestedHint: "Decks your students should review now",
    suggestedNone: "All your classes are up to date", showMore: "Show more", showLess: "Show less",
    retentionLabel: "retention", overdueDays: "{n} days overdue", overdueDay: "1 day overdue",
    launchNow: "Launch", customize: "Customize",
    newClass: "+ New class",
    createClass: "Create class", className: "Class name", classNamePlaceholder: "e.g. Math 6th Grade",
    classSubject: "Subject", classGrade: "Grade", classGradePlaceholder: "e.g. 6th, 7th–9th, Mixed",
    classCode: "Class code (auto-generated)", classCreate: "Create class", creating: "Creating...",
    classCreated: "Class created!",
    pickDeck: "Pick a deck", search: "Search decks...", filterAllSubjects: "All subjects", filterAllClasses: "All classes",
    filterUnassigned: "Unassigned", filterFavorites: "Favorites", noDecksYet: "You don't have any decks yet.",
    noDecksHint: "Create a deck first in the Decks page.", goToDecks: "Go to Decks",
    noResults: "No decks match your filters.",
    by: "by", questions: "questions",
    sessionOptions: "Session options",
    classLabel: "Class (optional)", classNone: "No class — guest session only",
    classHelp: "Pick a class to track student progress and retention",
    classBoundHelp: "This deck is linked to a class. Only that class or guest-only is available.",
    timeLimit: "Time per question", timeLimitNone: "No limit", seconds: "s",
    competitiveMode: "Show leaderboard during quiz",
    showAnswers: "Show correct answer after each question",
    allowGuests: "Allow students to join without account",
    allowGuestsHelp: "Guests join with just their name. Their progress won't be tracked.",
    backToDecks: "Back to deck selection",
    launchSession: "Launch session", starting: "Starting...",
    lobbyTitle: "Waiting for students",
    sharePin: "Share this code with your students",
    joinAt: "Join at",
    studentsJoined: "students joined", oneStudentJoined: "1 student joined", noStudentsYet: "No students yet",
    startQuiz: "Start quiz", cancel: "Cancel",
    kick: "Remove", kickConfirm: "Remove this student from the lobby?", guest: "guest",
    clickEnlarge: "Click to enlarge", clickClose: "Click anywhere to close",
    liveResults: "Live results", endSession: "End session",
    students: "students", average: "average", waitingResponses: "Waiting for responses...",
  },
  es: {
    pageTitle: "Nueva Sesión", subtitle: "Lanza un deck en vivo en clase",
    suggestedToday: "Sugerencias para hoy", suggestedHint: "Decks que tus estudiantes deberían revisar ahora",
    suggestedNone: "Todas tus clases están al día", showMore: "Ver más", showLess: "Ver menos",
    retentionLabel: "retención", overdueDays: "{n} días atrasado", overdueDay: "1 día atrasado",
    launchNow: "Lanzar", customize: "Personalizar",
    newClass: "+ Nueva clase",
    createClass: "Crear clase", className: "Nombre de la clase", classNamePlaceholder: "ej. Matemáticas 6to",
    classSubject: "Materia", classGrade: "Grado", classGradePlaceholder: "ej. 6to, 7mo–9no, Mixto",
    classCode: "Código de clase (autogenerado)", classCreate: "Crear clase", creating: "Creando...",
    classCreated: "¡Clase creada!",
    pickDeck: "Elige un deck", search: "Buscar decks...", filterAllSubjects: "Todas las materias", filterAllClasses: "Todas las clases",
    filterUnassigned: "Sin clase", filterFavorites: "Favoritos", noDecksYet: "Aún no tienes decks.",
    noDecksHint: "Crea un deck primero en la página de Decks.", goToDecks: "Ir a Decks",
    noResults: "Ningún deck coincide con tus filtros.",
    by: "por", questions: "preguntas",
    sessionOptions: "Opciones de la sesión",
    classLabel: "Clase (opcional)", classNone: "Sin clase — solo sesión invitada",
    classHelp: "Elige una clase para rastrear progreso y retención",
    classBoundHelp: "Este deck está ligado a una clase. Solo esa clase o solo-invitados están disponibles.",
    timeLimit: "Tiempo por pregunta", timeLimitNone: "Sin límite", seconds: "s",
    competitiveMode: "Mostrar clasificación durante el quiz",
    showAnswers: "Mostrar respuesta correcta después de cada pregunta",
    allowGuests: "Permitir entrar sin cuenta",
    allowGuestsHelp: "Los invitados entran solo con su nombre. Su progreso no se guardará.",
    backToDecks: "Volver a selección",
    launchSession: "Lanzar sesión", starting: "Iniciando...",
    lobbyTitle: "Esperando estudiantes",
    sharePin: "Comparte este código con tus estudiantes",
    joinAt: "Únete en",
    studentsJoined: "estudiantes se unieron", oneStudentJoined: "1 estudiante se unió", noStudentsYet: "Aún no se ha unido nadie",
    startQuiz: "Iniciar quiz", cancel: "Cancelar",
    kick: "Sacar", kickConfirm: "¿Sacar a este estudiante del lobby?", guest: "invitado",
    clickEnlarge: "Click para ampliar", clickClose: "Click en cualquier lugar para cerrar",
    liveResults: "Resultados en vivo", endSession: "Terminar sesión",
    students: "estudiantes", average: "promedio", waitingResponses: "Esperando respuestas...",
  },
  ko: {
    pageTitle: "새 세션", subtitle: "수업에서 덱을 라이브로 실행하세요",
    suggestedToday: "오늘의 추천", suggestedHint: "지금 학생들이 복습해야 할 덱",
    suggestedNone: "모든 수업이 최신 상태입니다", showMore: "더 보기", showLess: "접기",
    retentionLabel: "보존율", overdueDays: "{n}일 지연", overdueDay: "1일 지연",
    launchNow: "시작", customize: "맞춤설정",
    newClass: "+ 새 수업",
    createClass: "수업 만들기", className: "수업 이름", classNamePlaceholder: "예: 수학 6학년",
    classSubject: "과목", classGrade: "학년", classGradePlaceholder: "예: 6학년, 7-9학년, 혼합",
    classCode: "수업 코드 (자동 생성)", classCreate: "수업 만들기", creating: "만드는 중...",
    classCreated: "수업이 생성되었습니다!",
    pickDeck: "덱 선택", search: "덱 검색...", filterAllSubjects: "모든 과목", filterAllClasses: "모든 수업",
    filterUnassigned: "미지정", filterFavorites: "즐겨찾기", noDecksYet: "아직 덱이 없습니다.",
    noDecksHint: "먼저 덱 페이지에서 덱을 만드세요.", goToDecks: "덱으로 이동",
    noResults: "필터와 일치하는 덱이 없습니다.",
    by: "", questions: "문제",
    sessionOptions: "세션 옵션",
    classLabel: "수업 (선택)", classNone: "수업 없음 — 게스트 세션",
    classHelp: "학생 진행도와 보존을 추적하려면 수업을 선택하세요",
    classBoundHelp: "이 덱은 수업에 연결되어 있습니다. 해당 수업 또는 게스트 전용만 사용 가능합니다.",
    timeLimit: "문제당 시간", timeLimitNone: "제한 없음", seconds: "초",
    competitiveMode: "퀴즈 중 순위표 표시",
    showAnswers: "각 문제 후 정답 표시",
    allowGuests: "계정 없이 참여 허용",
    allowGuestsHelp: "게스트는 이름만으로 참여합니다. 진행도는 저장되지 않습니다.",
    backToDecks: "덱 선택으로",
    launchSession: "세션 시작", starting: "시작 중...",
    lobbyTitle: "학생 기다리는 중",
    sharePin: "학생들과 이 코드를 공유하세요",
    joinAt: "참여 주소",
    studentsJoined: "명 참여", oneStudentJoined: "1명 참여", noStudentsYet: "아직 참여자 없음",
    startQuiz: "퀴즈 시작", cancel: "취소",
    kick: "내보내기", kickConfirm: "이 학생을 로비에서 내보내시겠습니까?", guest: "게스트",
    clickEnlarge: "클릭하여 확대", clickClose: "아무곳이나 클릭하여 닫기",
    liveResults: "실시간 결과", endSession: "세션 종료",
    students: "학생", average: "평균", waitingResponses: "응답 기다리는 중...",
  },
};

// ─── Styles ────────────────────────────────────────────────────────────────
const inp = { fontFamily: "'Outfit',sans-serif", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: "10px 14px", borderRadius: 8, fontSize: 14, width: "100%", outline: "none" };
const sel = { ...inp, cursor: "pointer", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%239B9B9B' stroke-width='1.5'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 32 };

const css = `
  .ns-card { transition: transform .15s ease, box-shadow .15s ease; }
  .ns-card:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,0,0,0.06); }
  .ns-toggle { transition: background .15s ease; }
  .ns-pin { letter-spacing: 0.18em; }
  @keyframes ns-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.03); } }
  .ns-pulse { animation: ns-pulse 2s ease infinite; }
  @keyframes ns-fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  .ns-fade { animation: ns-fadeIn .25s ease; }
  @media (max-width: 720px) {
    .ns-lobby-top { grid-template-columns: 1fr !important; }
  }
`;

// ─── PageHeader ────────────────────────────────────────────────────────────
// ─── Step 1: Deck Picker ───────────────────────────────────────────────────
function DeckPicker({ userId, t, onPick, navigateToDecks }) {
  const [decks, setDecks] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterClass, setFilterClass] = useState("");

  useEffect(() => {
    (async () => {
      // 1. Own decks (created by this teacher)
      const { data: deckRows } = await supabase
        .from("decks")
        .select("*, profiles(full_name)")
        .eq("author_id", userId)
        .order("created_at", { ascending: false });

      // 2. Favorites — decks the teacher saved from Community/profiles. They're
      // read-only (we can't edit them) but launchable in a live session.
      // We mark them with _isFav so the card shows a badge.
      const { data: savedRows } = await supabase
        .from("saved_decks")
        .select("decks(*, profiles(full_name))")
        .eq("student_id", userId);
      const favs = (savedRows || [])
        .map(r => r.decks)
        .filter(Boolean)
        .map(d => ({ ...d, _isFav: true }));

      // De-dupe in case the teacher both authored and somehow favorited the same deck.
      const ownIds = new Set((deckRows || []).map(d => d.id));
      const dedupedFavs = favs.filter(d => !ownIds.has(d.id));

      const { data: clsRows } = await supabase
        .from("classes")
        .select("*")
        .eq("teacher_id", userId)
        .order("created_at", { ascending: false });

      setDecks([...(deckRows || []), ...dedupedFavs]);
      setClasses(clsRows || []);
      setLoading(false);
    })();
  }, [userId]);

  const allSubjects = Array.from(new Set(decks.map(d => d.subject).filter(Boolean))).sort();

  const filtered = decks.filter(d => {
    if (search) {
      const q = search.toLowerCase();
      const hay = [d.title, d.description, ...(d.tags || [])].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filterSubject && d.subject !== filterSubject) return false;
    if (filterClass) {
      if (filterClass === "__unassigned__") {
        if (d.class_id) return false;
      } else if (filterClass === "__favorites__") {
        if (!d._isFav) return false;
      } else if (d.class_id !== filterClass) return false;
    }
    return true;
  });

  if (loading) return <p style={{ textAlign: "center", color: C.textMuted, padding: 40 }}>Loading...</p>;

  if (decks.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <CIcon name="book" size={36} />
        <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 12, marginBottom: 4 }}>{t.noDecksYet}</h3>
        <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>{t.noDecksHint}</p>
        <button
          onClick={navigateToDecks}
          style={{
            padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, color: "#fff",
            border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif",
          }}
        >{t.goToDecks}</button>
      </div>
    );
  }

  return (
    <div className="ns-fade">
      <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}><CIcon name="target" size={14} inline /></span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search} style={{ ...inp, paddingLeft: 38 }} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} style={{ ...sel, flex: 1, minWidth: 140 }}>
            <option value="">{t.filterAllSubjects}</option>
            {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {(classes.length > 0 || decks.some(d => d._isFav)) && (
            <select value={filterClass} onChange={e => setFilterClass(e.target.value)} style={{ ...sel, flex: 1, minWidth: 140 }}>
              <option value="">{t.filterAllClasses}</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="__unassigned__">{t.filterUnassigned}</option>
              {decks.some(d => d._isFav) && <option value="__favorites__">★ {t.filterFavorites}</option>}
            </select>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p style={{ textAlign: "center", color: C.textMuted, padding: 40 }}>{t.noResults}</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          {filtered.map(dk => {
            const qs = dk.questions || [];
            const cls = classes.find(c => c.id === dk.class_id);
            const accent = resolveColor(dk);
            return (
              <button
                key={dk.id}
                className="ns-card"
                onClick={() => onPick(dk)}
                style={{
                  background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`,
                  borderLeft: `4px solid ${accent}`,
                  padding: 14, cursor: "pointer", textAlign: "left",
                  fontFamily: "'Outfit',sans-serif",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <DeckCover deck={dk} size={48} radius={10} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{dk.title}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{dk.subject} · {dk.grade}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: C.textMuted, paddingTop: 8, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{qs.length} {t.questions}</span>
                  {dk._isFav ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "1px 6px", borderRadius: 5, fontSize: 10, fontWeight: 600, background: C.accentSoft, color: C.accent }}>
                      ★ {dk.profiles?.full_name || t.filterFavorites}
                    </span>
                  ) : cls ? (
                    <span style={{ color: accent, fontWeight: 600 }}>{cls.name}</span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Session Options ───────────────────────────────────────────────
function SessionOptions({ deck, classes, t, onLaunch, onBack }) {
  // Favorited decks reference a class_id that belongs to the *original* author,
  // not to the current teacher. Don't try to pre-select that — the picker
  // should default to "no class" for favorites.
  const isFav = !!deck._isFav;
  const [classId, setClassId] = useState(isFav ? "" : (deck.class_id || ""));
  const [timeLimit, setTimeLimit] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [showAnswers, setShowAnswers] = useState(true);
  const [allowGuests, setAllowGuests] = useState(true);
  const [launching, setLaunching] = useState(false);

  const accent = resolveColor(deck);
  const qs = deck.questions || [];

  const handleLaunch = () => {
    setLaunching(true);
    onLaunch({
      deck, classId: classId || null,
      timeLimit, showLeaderboard, showAnswers, allowGuests,
    });
  };

  return (
    <div className="ns-fade">
      <div style={{
        background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`,
        borderLeft: `4px solid ${accent}`, padding: 14, marginBottom: 20,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <DeckCover deck={deck} size={56} radius={11} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{deck.title}</div>
          <div style={{ fontSize: 12, color: C.textMuted }}>{deck.subject} · {deck.grade} · {qs.length} {t.questions}</div>
        </div>
        <button
          onClick={onBack}
          style={{
            fontSize: 12, padding: "6px 12px", borderRadius: 6,
            background: C.bg, color: C.textSecondary, border: `1px solid ${C.border}`,
            cursor: "pointer", fontFamily: "'Outfit',sans-serif",
          }}
        >{t.backToDecks}</button>
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: C.textSecondary }}>{t.sessionOptions}</h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 6 }}>{t.classLabel}</label>
          <select value={classId} onChange={e => setClassId(e.target.value)} style={sel}>
            <option value="">{t.classNone}</option>
            {/* If deck is bound to a class, show only that class. Otherwise show all classes. */}
            {(() => {
              const eligible = deck.class_id
                ? classes.filter(c => c.id === deck.class_id)
                : classes;
              return eligible.map(c => <option key={c.id} value={c.id}>{c.name} · {c.subject} · {c.grade}</option>);
            })()}
          </select>
          <p style={{ fontSize: 11, color: C.textMuted, marginTop: 6, lineHeight: 1.4 }}>
            {deck.class_id ? t.classBoundHelp : t.classHelp}
          </p>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 6 }}>{t.timeLimit}</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[0, 10, 20, 30, 60].map(s => (
              <button
                key={s}
                onClick={() => setTimeLimit(s)}
                style={{
                  padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                  background: timeLimit === s ? C.accentSoft : C.bg,
                  color: timeLimit === s ? C.accent : C.textSecondary,
                  border: `1px solid ${timeLimit === s ? C.accent + "33" : C.border}`,
                  cursor: "pointer", fontFamily: "'Outfit',sans-serif",
                }}
              >{s === 0 ? t.timeLimitNone : `${s}${t.seconds}`}</button>
            ))}
          </div>
        </div>

        <Toggle label={t.competitiveMode} value={showLeaderboard} onChange={setShowLeaderboard} />
        <Toggle label={t.showAnswers} value={showAnswers} onChange={setShowAnswers} />
        <Toggle label={t.allowGuests} hint={t.allowGuestsHelp} value={allowGuests} onChange={setAllowGuests} />
      </div>

      <button
        onClick={handleLaunch}
        disabled={launching}
        style={{
          width: "100%", marginTop: 24, padding: 14, borderRadius: 10,
          fontSize: 15, fontWeight: 600,
          background: launching ? C.bgSoft : `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
          color: launching ? C.textMuted : "#fff",
          border: "none", cursor: launching ? "default" : "pointer",
          fontFamily: "'Outfit',sans-serif",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        <CIcon name="rocket" size={16} inline />
        {launching ? t.starting : t.launchSession}
      </button>
    </div>
  );
}

function Toggle({ label, hint, value, onChange }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="button"
          onClick={() => onChange(!value)}
          className="ns-toggle"
          style={{
            width: 36, height: 20, borderRadius: 10, padding: 2,
            background: value ? C.accent : C.border,
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center",
            justifyContent: value ? "flex-end" : "flex-start",
            flexShrink: 0,
          }}
        >
          <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }} />
        </button>
        <span onClick={() => onChange(!value)} style={{ fontSize: 13, color: C.text, fontWeight: 500, cursor: "pointer" }}>{label}</span>
      </div>
      {hint && <p style={{ fontSize: 11, color: C.textMuted, marginTop: 4, marginLeft: 48, lineHeight: 1.4 }}>{hint}</p>}
    </div>
  );
}

// ─── Step 3: Lobby with QR ─────────────────────────────────────────────────
function SessionLobby({ session, deck, t, onStart, onCancel }) {
  const [participants, setParticipants] = useState([]);
  const [showQRLarge, setShowQRLarge] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("session_participants")
        .select("*").eq("session_id", session.id);
      setParticipants(data || []);
    })();

    const channel = supabase.channel(`lobby:${session.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "session_participants", filter: `session_id=eq.${session.id}` },
        (payload) => setParticipants(prev => [...prev, payload.new])
      )
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "session_participants", filter: `session_id=eq.${session.id}` },
        (payload) => setParticipants(prev => prev.map(p => p.id === payload.new.id ? payload.new : p))
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session.id]);

  const activeParticipants = participants.filter(p => !p.is_kicked);
  const guestCount = activeParticipants.filter(p => p.is_guest).length;

  const joinUrl = typeof window !== "undefined"
    ? `${window.location.origin}/join?code=${session.pin}`
    : `https://clasloop.com/join?code=${session.pin}`;
  const joinHost = (joinUrl.replace(/^https?:\/\//, "").split("/")[0]);

  const handleStart = async () => {
    await supabase.from("sessions").update({ status: "active" }).eq("id", session.id);
    onStart();
  };

  const handleKick = async (p) => {
    if (!confirm(t.kickConfirm)) return;
    await supabase.from("session_participants")
      .update({ is_kicked: true })
      .eq("id", p.id);
  };

  const studentLabel = activeParticipants.length === 0 ? t.noStudentsYet
    : activeParticipants.length === 1 ? t.oneStudentJoined
    : `${activeParticipants.length} ${t.studentsJoined}`;

  if (showQRLarge) {
    const dim = typeof window !== "undefined" ? Math.min(420, window.innerHeight - 280) : 320;
    return (
      <div
        onClick={() => setShowQRLarge(false)}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 1000,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          cursor: "pointer", padding: 32,
        }}
      >
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginBottom: 8, fontFamily: "'Outfit',sans-serif" }}>{t.joinAt}</p>
        <p style={{ fontSize: 22, fontWeight: 600, color: "#fff", marginBottom: 28, fontFamily: MONO }}>{joinHost}/join</p>
        <div style={{ background: "#fff", padding: 20, borderRadius: 16 }}>
          <QRCodeSVG value={joinUrl} size={dim} level="M" />
        </div>
        <p className="ns-pin" style={{ fontSize: 64, fontWeight: 800, color: "#fff", fontFamily: MONO, marginTop: 28 }}>{session.pin}</p>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 16 }}>{t.clickClose}</p>
      </div>
    );
  }

  return (
    <div className="ns-fade" style={{ maxWidth: 720, margin: "0 auto" }}>
      <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 4, color: C.text }}>{t.lobbyTitle}</h2>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 20 }}>{deck.title}</p>

      <div className="ns-lobby-top" style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 20, marginBottom: 20 }}>
        <div style={{
          background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14,
          padding: 28, textAlign: "center", boxShadow: C.shadow,
        }}>
          <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>{t.sharePin}</p>
          <div className="ns-pin ns-pulse" style={{ fontSize: 64, fontWeight: 800, color: C.accent, fontFamily: MONO, lineHeight: 1, marginBottom: 8 }}>{session.pin}</div>
          <p style={{ fontSize: 13, color: C.textSecondary }}>{t.joinAt} <strong>{joinHost}/join</strong></p>
        </div>

        <button
          onClick={() => setShowQRLarge(true)}
          style={{
            background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14,
            padding: 14, cursor: "pointer", boxShadow: C.shadow,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            fontFamily: "'Outfit',sans-serif",
          }}
        >
          <div style={{ background: "#fff", padding: 8, borderRadius: 8 }}>
            <QRCodeSVG value={joinUrl} size={140} level="M" />
          </div>
          <p style={{ fontSize: 11, color: C.textMuted, marginTop: 8 }}>{t.clickEnlarge}</p>
        </button>
      </div>

      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, marginBottom: 20, boxShadow: C.shadow }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{studentLabel}</span>
          {guestCount > 0 && (
            <span style={{ fontSize: 11, color: C.textMuted }}>{guestCount} {t.guest}{guestCount !== 1 ? "s" : ""}</span>
          )}
        </div>
        {activeParticipants.length === 0 ? (
          <p style={{ fontSize: 12, color: C.textMuted, textAlign: "center", padding: "16px 0" }}>—</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {activeParticipants.map(p => (
              <ParticipantChip key={p.id} p={p} t={t} onKick={() => handleKick(p)} />
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={onCancel}
          style={{
            padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600,
            background: C.bg, color: C.red, border: `1px solid ${C.redSoft}`,
            cursor: "pointer", fontFamily: "'Outfit',sans-serif",
          }}
        >{t.cancel}</button>
        <button
          onClick={handleStart}
          disabled={activeParticipants.length === 0}
          style={{
            flex: 1, padding: "12px 20px", borderRadius: 10, fontSize: 15, fontWeight: 600,
            background: activeParticipants.length === 0 ? C.bgSoft : `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
            color: activeParticipants.length === 0 ? C.textMuted : "#fff",
            border: "none", cursor: activeParticipants.length === 0 ? "default" : "pointer",
            fontFamily: "'Outfit',sans-serif",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <CIcon name="rocket" size={16} inline />
          {t.startQuiz} ({activeParticipants.length})
        </button>
      </div>
    </div>
  );
}

function ParticipantChip({ p, t, onKick }) {
  const [hover, setHover] = useState(false);
  const name = p.is_guest ? p.guest_name : p.student_name;
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "5px 10px", borderRadius: 16, fontSize: 12,
        background: p.is_guest ? C.orangeSoft : C.bgSoft,
        color: p.is_guest ? C.orange : C.textSecondary,
        border: `1px solid ${p.is_guest ? C.orange + "33" : C.border}`,
        fontFamily: "'Outfit',sans-serif",
      }}
    >
      <span>{name}</span>
      {p.is_guest && <span style={{ fontSize: 10, opacity: 0.7 }}>({t.guest})</span>}
      {hover && (
        <button
          onClick={onKick}
          title={t.kick}
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            padding: 0, lineHeight: 0, color: C.red,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
        </button>
      )}
    </div>
  );
}

// ─── Step 4: Live Results ──────────────────────────────────────────────────
function LiveResults({ session, t, onEnd }) {
  const [participants, setParticipants] = useState([]);
  const [responses, setResponses] = useState([]);

  useEffect(() => {
    (async () => {
      const { data: pp } = await supabase.from("session_participants").select("*").eq("session_id", session.id);
      const { data: rr } = await supabase.from("responses").select("*").eq("session_id", session.id);
      setParticipants(pp || []);
      setResponses(rr || []);
    })();

    const ch = supabase.channel(`live:${session.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "responses", filter: `session_id=eq.${session.id}` },
        (payload) => setResponses(prev => [...prev, payload.new])
      )
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [session.id]);

  const questions = session.questions || [];
  const totalQ = questions.length;
  const activeParticipants = participants.filter(p => !p.is_kicked);

  const results = activeParticipants.map(p => {
    const pResp = responses.filter(r => r.participant_id === p.id);
    return {
      ...p,
      name: p.is_guest ? p.guest_name : p.student_name,
      correct: pResp.filter(r => r.is_correct).length,
      answered: pResp.length,
    };
  }).sort((a, b) => b.correct - a.correct);

  const avgPct = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.correct, 0) / results.length / Math.max(totalQ, 1) * 100)
    : 0;

  const handleEnd = async () => {
    try { await processSessionResults(session); } catch (err) { console.error("SM-2 error:", err); }
    if (session.deck_id) {
      const { data: dk } = await supabase.from("decks").select("uses_count").eq("id", session.deck_id).maybeSingle();
      await supabase.from("decks").update({ uses_count: (dk?.uses_count || 0) + 1 }).eq("id", session.deck_id);
    }
    await supabase.from("sessions").update({
      status: "completed",
      completed_at: new Date().toISOString(),
    }).eq("id", session.id);
    onEnd();
  };

  const retCol = (v) => v >= 70 ? C.green : v >= 40 ? C.orange : C.red;

  return (
    <div className="ns-fade" style={{ maxWidth: 560, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <CIcon name="chart" size={20} inline /> {t.liveResults}
        </h2>
        <button
          onClick={handleEnd}
          style={{
            fontSize: 12, padding: "8px 16px", borderRadius: 8, fontWeight: 600,
            background: C.bg, color: C.red, border: `1px solid ${C.redSoft}`,
            cursor: "pointer", fontFamily: "'Outfit',sans-serif",
          }}
        >{t.endSession}</button>
      </div>

      <div style={{
        background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20,
        textAlign: "center", marginBottom: 16, boxShadow: C.shadow,
      }}>
        <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>{session.topic}</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 12 }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 700, color: C.accent, fontFamily: MONO }}>{activeParticipants.length}</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>{t.students}</div>
          </div>
          <div>
            <div style={{ fontSize: 32, fontWeight: 700, color: retCol(avgPct), fontFamily: MONO }}>{avgPct}%</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>{t.average}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {results.map((s, i) => {
          const pct = totalQ > 0 ? (s.correct / totalQ) * 100 : 0;
          return (
            <div key={s.id} style={{
              background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
              padding: "12px 16px", display: "flex", alignItems: "center", gap: 12,
              boxShadow: C.shadow,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.textMuted, width: 20, textAlign: "center" }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  {s.name}
                  {s.is_guest && <span style={{ fontSize: 10, color: C.orange, background: C.orangeSoft, padding: "1px 6px", borderRadius: 6 }}>{t.guest}</span>}
                </div>
                <div style={{ background: C.bgSoft, height: 4, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: retCol(pct), transition: "width .25s ease" }} />
                </div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, fontFamily: MONO, color: retCol(pct) }}>
                {s.correct}/{totalQ}
              </span>
            </div>
          );
        })}
        {results.length === 0 && (
          <p style={{ textAlign: "center", color: C.textMuted, padding: 32 }}>{t.waitingResponses}</p>
        )}
      </div>
    </div>
  );
}

// ─── Suggested for Today ───────────────────────────────────────────────────
function SuggestedToday({ teacherId, t, onPickSuggestion }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const VISIBLE = 2;

  useEffect(() => {
    if (!teacherId) return;
    (async () => {
      try {
        const list = await getSuggestedDecksForToday(teacherId);
        setItems(list);
      } catch (e) {
        console.error("Suggested fetch failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [teacherId]);

  if (loading) return null; // silently load
  if (items.length === 0) return null; // nothing urgent → hide section entirely

  const visible = showAll ? items : items.slice(0, VISIBLE);
  const hiddenCount = items.length - VISIBLE;

  return (
    <div className="ns-fade" style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: C.textSecondary, display: "flex", alignItems: "center", gap: 8 }}>
        <CIcon name="fire" size={14} inline /> {t.suggestedToday}
      </h3>
      <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>{t.suggestedHint}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
        {visible.map(item => <SuggestedCard key={`${item.class.id}-${item.deck.id}`} item={item} t={t} onPick={onPickSuggestion} />)}
      </div>

      {hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(s => !s)}
          style={{
            marginTop: 10,
            padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500,
            background: "transparent", color: C.textSecondary,
            border: `1px dashed ${C.border}`, cursor: "pointer",
            fontFamily: "'Outfit',sans-serif",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          {showAll ? t.showLess : `${t.showMore} (+${hiddenCount})`}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ transform: showAll ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s" }}>
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
  );
}

function SuggestedCard({ item, t, onPick }) {
  const { deck, class: cls, retention_score, days_overdue, is_overdue } = item;
  const accent = resolveColor(deck);
  const retCol = retention_score >= 70 ? C.green : retention_score >= 40 ? C.orange : C.red;

  const overdueLabel = is_overdue && days_overdue > 0
    ? (days_overdue === 1 ? t.overdueDay : t.overdueDays.replace("{n}", days_overdue))
    : null;

  return (
    <div
      style={{
        background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`,
        borderLeft: `4px solid ${retCol}`,
        padding: 12,
        display: "flex", flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <DeckCover deck={deck} size={40} radius={9} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{deck.title}</div>
          <div style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{cls.name}</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: C.textMuted, marginBottom: 10 }}>
        <span style={{ color: retCol, fontWeight: 700, fontFamily: MONO }}>{retention_score}%</span>
        <span>{t.retentionLabel}</span>
        {overdueLabel && (
          <>
            <span style={{ color: C.border }}>·</span>
            <span style={{ color: C.red, fontWeight: 600 }}>{overdueLabel}</span>
          </>
        )}
      </div>

      <button
        onClick={() => onPick(item)}
        style={{
          width: "100%", padding: "8px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600,
          background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, color: "#fff",
          border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif",
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}
      >
        <CIcon name="rocket" size={11} inline /> {t.launchNow}
      </button>
    </div>
  );
}

// ─── Create Class Modal ────────────────────────────────────────────────────
function CreateClassModal({ userId, t, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("Math");
  const [grade, setGrade] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim() || !grade.trim()) { setError(t.classNamePlaceholder); return; }
    setError("");
    setCreating(true);
    // Generate a 6-character class code (uppercase letters + digits, easy to read)
    const code = generateClassCode();
    const { data, error: err } = await supabase.from("classes").insert({
      teacher_id: userId,
      name: name.trim(),
      subject,
      grade: grade.trim(),
      class_code: code, // table column is `class_code`, not `code`
    }).select().single();
    setCreating(false);
    if (err) { setError(err.message); return; }
    onCreated(data);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100, padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="ns-fade"
        style={{ background: C.bg, borderRadius: 14, padding: 24, maxWidth: 460, width: "100%", boxShadow: "0 12px 40px rgba(0,0,0,0.15)" }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, fontFamily: "'Outfit',sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
          <CIcon name="school" size={20} inline /> {t.createClass}
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 6 }}>{t.className}</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t.classNamePlaceholder}
              autoFocus
              style={inp}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 6 }}>{t.classSubject}</label>
              <select value={subject} onChange={e => setSubject(e.target.value)} style={sel}>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 6 }}>{t.classGrade}</label>
              <input
                value={grade}
                onChange={e => setGrade(e.target.value)}
                placeholder={t.classGradePlaceholder}
                style={inp}
              />
            </div>
          </div>

          {error && <p style={{ fontSize: 12, color: C.red, margin: 0 }}>{error}</p>}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: "transparent", color: C.textMuted,
              border: `1px solid ${C.border}`, cursor: "pointer",
              fontFamily: "'Outfit',sans-serif",
            }}
          >{t.cancel}</button>
          <button
            onClick={handleCreate}
            disabled={creating}
            style={{
              flex: 1,
              padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: creating ? C.bgSoft : `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
              color: creating ? C.textMuted : "#fff",
              border: "none", cursor: creating ? "default" : "pointer",
              fontFamily: "'Outfit',sans-serif",
            }}
          >{creating ? t.creating : t.classCreate}</button>
        </div>
      </div>
    </div>
  );
}

function generateClassCode() {
  // Avoid I/O/0/1 to reduce confusion. 6 chars.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// ─── Main Export ───────────────────────────────────────────────────────────
export default function SessionFlow({ lang = "en", setLang, onNavigateToDecks, sessionsOpts, onConsumeSessionsOpts, onOpenMobileMenu }) {
  const t = i18n[lang] || i18n.en;
  const [user, setUser] = useState(null);
  const [classes, setClasses] = useState([]);
  const [step, setStep] = useState("pickDeck");
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [session, setSession] = useState(null);
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [toast, setToast] = useState(null); // { message } | null

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);
      const { data: cls } = await supabase.from("classes").select("*").eq("teacher_id", user.id).order("created_at", { ascending: false });
      setClasses(cls || []);
    })();
  }, []);

  // If we arrived here from "+ New class" elsewhere, auto-open the modal,
  // then clear the flag so it doesn't re-trigger on subsequent visits.
  useEffect(() => {
    if (sessionsOpts?.openCreateClass) {
      setShowCreateClass(true);
      if (onConsumeSessionsOpts) onConsumeSessionsOpts();
    }
  }, [sessionsOpts, onConsumeSessionsOpts]);

  // Auto-dismiss toast after 3s
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleLaunch = async (config) => {
    const { deck, classId, timeLimit, showLeaderboard, showAnswers, allowGuests } = config;
    const pin = String(Math.floor(100000 + Math.random() * 900000));

    const { data, error } = await supabase.from("sessions").insert({
      class_id: classId,
      teacher_id: user.id,
      deck_id: deck.id,
      topic: deck.title,
      pin,
      status: "lobby",
      questions: deck.questions || [],
      allow_guests: allowGuests,
      session_settings: {
        time_limit: timeLimit,
        show_leaderboard: showLeaderboard,
        show_answers: showAnswers,
      },
    }).select().single();

    if (error) {
      console.error("Failed to create session:", error);
      alert("Could not create session. Please try again.");
      return;
    }

    setSession(data);
    setStep("lobby");
  };

  // Suggested-card handler: pre-fill selected deck + class, then go to options.
  // We could skip straight to lobby with defaults, but giving the teacher one
  // last screen to confirm timing/leaderboard/etc. is friendlier.
  const handlePickSuggestion = (item) => {
    setSelectedDeck(item.deck);
    setStep("options");
  };

  const handleClassCreated = (newClass) => {
    setClasses(prev => [newClass, ...prev]);
    setShowCreateClass(false);
    // Navigate to Decks with the new class focused so the teacher SEES where
    // their class lives (and can immediately add a deck to it).
    if (onNavigateToDecks) {
      onNavigateToDecks({ focusClassId: newClass.id });
    } else {
      setToast({ message: t.classCreated });
    }
  };

  const handleCancel = async () => {
    if (session) {
      await supabase.from("sessions").update({ status: "cancelled" }).eq("id", session.id);
    }
    setSession(null);
    setSelectedDeck(null);
    setStep("pickDeck");
  };

  const handleEnd = () => {
    setSession(null);
    setSelectedDeck(null);
    setStep("pickDeck");
  };

  if (!user) return <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>Loading...</div>;

  return (
    <div style={{ padding: "28px 20px" }}>
      <style>{css}</style>
      {step !== "lobby" && step !== "live" && (
        <PageHeader title={t.pageTitle} icon="rocket" lang={lang} setLang={setLang} onOpenMobileMenu={onOpenMobileMenu} />
      )}
      {/* In lobby/live there's no PageHeader, so render the hamburger on its
          own so the user can still open the drawer on mobile. */}
      {(step === "lobby" || step === "live") && (
        <div style={{ maxWidth: 800, margin: "0 auto 16px" }}>
          <MobileMenuButton onOpen={onOpenMobileMenu} />
        </div>
      )}

      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        {step === "pickDeck" && (
          <>
            <p style={{ fontSize: 14, color: C.textSecondary, marginBottom: 20 }}>{t.subtitle}</p>

            {/* Suggested for Today (only shows if there are urgent decks) */}
            <SuggestedToday teacherId={user.id} t={t} onPickSuggestion={handlePickSuggestion} />

            {/* "Pick a deck" header + "+ New class" button */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: C.textSecondary, margin: 0 }}>{t.pickDeck}</h3>
              <button
                onClick={() => setShowCreateClass(true)}
                style={{
                  padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                  background: C.bg, color: C.accent,
                  border: `1px dashed ${C.accent}66`,
                  cursor: "pointer", fontFamily: "'Outfit',sans-serif",
                }}
              >{t.newClass}</button>
            </div>

            <DeckPicker
              userId={user.id}
              t={t}
              onPick={(dk) => { setSelectedDeck(dk); setStep("options"); }}
              navigateToDecks={onNavigateToDecks || (() => {})}
            />
          </>
        )}

        {step === "options" && selectedDeck && (
          <SessionOptions
            deck={selectedDeck}
            classes={classes}
            t={t}
            onLaunch={handleLaunch}
            onBack={() => { setSelectedDeck(null); setStep("pickDeck"); }}
          />
        )}

        {step === "lobby" && session && selectedDeck && (
          <SessionLobby
            session={session}
            deck={selectedDeck}
            t={t}
            onStart={() => setStep("live")}
            onCancel={handleCancel}
          />
        )}

        {step === "live" && session && (
          <LiveResults
            session={session}
            t={t}
            onEnd={handleEnd}
          />
        )}
      </div>

      {/* Create class modal */}
      {showCreateClass && (
        <CreateClassModal
          userId={user.id}
          t={t}
          onClose={() => setShowCreateClass(false)}
          onCreated={handleClassCreated}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className="ns-fade"
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 200,
            background: C.green, color: "#fff",
            padding: "10px 16px", borderRadius: 10,
            fontSize: 13, fontWeight: 600, fontFamily: "'Outfit',sans-serif",
            boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <CIcon name="check" size={14} inline /> {toast.message}
        </div>
      )}
    </div>
  );
}
