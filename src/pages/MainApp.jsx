import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { CIcon } from "../components/Icons";

const C = {
  bg: "#FFFFFF", bgSoft: "#F7F7F5", accent: "#2383E2", accentSoft: "#E8F0FE",
  green: "#0F7B6C", greenSoft: "#EEFBF5", orange: "#D9730D", orangeSoft: "#FFF3E0",
  red: "#E03E3E", redSoft: "#FDECEC", purple: "#6940A5", purpleSoft: "#F3EEFB",
  text: "#191919", textSecondary: "#6B6B6B", textMuted: "#9B9B9B",
  border: "#E8E8E4", shadow: "0 1px 3px rgba(0,0,0,0.04)",
};
const MONO = "'JetBrains Mono', monospace";
const retCol = (v) => v >= 70 ? C.green : v >= 40 ? C.orange : C.red;

const i18n = {
  en: {
    pageTitle: "My Progress", welcome: "Welcome back", yourStats: "Your stats",
    xp: "XP", level: "Level", streak: "Streak", days: "days",
    topicMastery: "Topic mastery", strong: "Strong", medium: "Needs review", weak: "Weak",
    recentSessions: "Recent sessions", noSessions: "No sessions yet. Join a session to start tracking your progress!",
    noTopics: "No topics tracked yet.", correct: "correct", questions: "questions",
    joinSession: "Join a session", ago: "ago", today: "today", daysAgo: "d ago", hoursAgo: "h ago",
    totalCorrect: "Total correct", totalQuestions: "Total questions", accuracy: "Accuracy",
    topicsTracked: "Topics tracked", sessionsJoined: "Sessions joined",
    keepGoing: "Keep going!", greatJob: "Great job!",
  },
  es: {
    pageTitle: "Mi Progreso", welcome: "Bienvenido de vuelta", yourStats: "Tus estadísticas",
    xp: "XP", level: "Nivel", streak: "Racha", days: "días",
    topicMastery: "Dominio por tema", strong: "Fuerte", medium: "Necesita repaso", weak: "Débil",
    recentSessions: "Sesiones recientes", noSessions: "Sin sesiones aún. ¡Únete a una sesión para empezar!",
    noTopics: "Sin temas rastreados.", correct: "correctas", questions: "preguntas",
    joinSession: "Unirse a sesión", ago: "atrás", today: "hoy", daysAgo: "d atrás", hoursAgo: "h atrás",
    totalCorrect: "Total correctas", totalQuestions: "Total preguntas", accuracy: "Precisión",
    topicsTracked: "Temas rastreados", sessionsJoined: "Sesiones unidas",
    keepGoing: "¡Sigue así!", greatJob: "¡Buen trabajo!",
  },
  ko: {
    pageTitle: "내 진행", welcome: "다시 오셨군요", yourStats: "내 통계",
    xp: "XP", level: "레벨", streak: "연속", days: "일",
    topicMastery: "주제별 숙달도", strong: "강함", medium: "복습 필요", weak: "약함",
    recentSessions: "최근 세션", noSessions: "아직 세션이 없습니다. 세션에 참여하여 진행 상황을 추적하세요!",
    noTopics: "추적 중인 주제가 없습니다.", correct: "정답", questions: "문제",
    joinSession: "세션 참여", ago: "전", today: "오늘", daysAgo: "일 전", hoursAgo: "시간 전",
    totalCorrect: "총 정답", totalQuestions: "총 문제", accuracy: "정확도",
    topicsTracked: "추적 주제", sessionsJoined: "참여 세션",
    keepGoing: "계속 가자!", greatJob: "잘했어요!",
  },
};

const css = `
  .mp-stat { transition: all .2s ease; }
  .mp-stat:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.06); }
  .mp-topic { transition: all .15s ease; }
  .mp-topic:hover { background: #E8F0FE !important; border-color: #2383E244 !important; }
  .mp-session { transition: all .15s ease; }
  .mp-session:hover { background: #FAFBFF !important; border-color: #2383E233 !important; }
  .mp-btn { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .mp-btn:hover { transform: translateY(-1px); filter: brightness(1.05); }
  .mp-btn:active { transform: translateY(0) scale(.97); }
  .mp-lang { transition: all .12s ease; cursor: pointer; }
  .mp-lang:hover { background: #E8F0FE !important; color: #2383E2 !important; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  .fade-up { animation: fadeUp .3s ease-out both; }
`;

const Bar = ({ value, max = 100, color = C.accent, h = 6 }) => (
  <div style={{ width: "100%", height: h, background: C.bgSoft, borderRadius: h }}>
    <div style={{ width: `${Math.min((value / max) * 100, 100)}%`, height: "100%", borderRadius: h, background: color, transition: "width .5s ease" }} />
  </div>
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
            <button key={c} className="mp-lang" onClick={() => setLang(c)} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: lang === c ? C.bg : "transparent", color: lang === c ? C.text : C.textMuted, border: "none", boxShadow: lang === c ? "0 1px 2px rgba(0,0,0,0.06)" : "none" }}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function timeAgo(date, t) {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ${t.ago}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}${t.hoursAgo}`;
  const days = Math.floor(hours / 24);
  if (days === 0) return t.today;
  return `${days}${t.daysAgo}`;
}

export default function MainApp({ lang: pageLang = "en", setLang: pageSetLang }) {
  const [lang, setLangLocal] = useState(pageLang);
  const setLang = pageSetLang || setLangLocal;
  const l = pageLang || lang;
  const t = i18n[l] || i18n.en;

  const [profile, setProfile] = useState(null);
  const [topics, setTopics] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Get profile
    const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(prof);

    // Get student's topic progress
    const { data: topicData } = await supabase.from("student_topic_progress").select("*").eq("student_id", user.id).order("retention_score", { ascending: false });
    setTopics(topicData || []);

    // Get sessions this student participated in
    const { data: parts } = await supabase.from("session_participants").select("*, sessions(*)").eq("student_id", user.id).order("joined_at", { ascending: false }).limit(10);

    // Also try by name match if student_id is null
    if (!parts || parts.length === 0) {
      const name = prof?.full_name;
      if (name) {
        const { data: partsByName } = await supabase.from("session_participants").select("*, sessions(*)").eq("student_name", name).order("joined_at", { ascending: false }).limit(10);
        setSessions((partsByName || []).map(p => ({ ...p, session: p.sessions })).filter(p => p.session));
      }
    } else {
      setSessions(parts.map(p => ({ ...p, session: p.sessions })).filter(p => p.session));
    }

    // Get all responses
    const { data: respData } = await supabase.from("responses").select("*").in("participant_id", (parts || []).map(p => p.id));
    setResponses(respData || []);

    setLoading(false);
  };

  if (loading) return (
    <div style={{ padding: "28px 20px" }}>
      <style>{css}</style>
      <PageHeader title={t.pageTitle} icon="chart" lang={l} setLang={setLang} />
      <p style={{ textAlign: "center", color: C.textMuted, padding: 40 }}>Loading...</p>
    </div>
  );

  const totalCorrect = responses.filter(r => r.is_correct).length;
  const totalQuestions = responses.length;
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const xp = profile?.xp || 0;
  const level = profile?.level || 1;
  const streak = profile?.streak || 0;

  return (
    <div style={{ padding: "28px 20px" }}>
      <style>{css}</style>
      <PageHeader title={t.pageTitle} icon="chart" lang={l} setLang={setLang} />

      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* Welcome */}
        <div className="fade-up" style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 14, color: C.textSecondary }}>
            {t.welcome}, <strong>{profile?.full_name || "Student"}</strong>
          </p>
        </div>

        {/* Stats */}
        <div className="fade-up" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 24, animationDelay: ".05s" }}>
          {[
            [t.level, level, C.accent, "levelup"],
            [t.xp, xp.toLocaleString(), C.purple, "star"],
            [t.streak, `${streak} ${t.days}`, C.orange, "fire"],
            [t.accuracy, `${accuracy}%`, retCol(accuracy), "target"],
          ].map(([label, value, color, icon], i) => (
            <div key={i} className="mp-stat" style={{ padding: "16px", borderRadius: 10, background: C.bg, border: `1px solid ${C.border}`, textAlign: "center" }}>
              <div style={{ marginBottom: 8 }}><CIcon name={icon} size={24} /></div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: MONO, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Quick stats row */}
        <div className="fade-up" style={{ display: "flex", gap: 10, marginBottom: 24, animationDelay: ".1s" }}>
          <div style={{ flex: 1, padding: "12px 16px", borderRadius: 8, background: C.greenSoft, display: "flex", alignItems: "center", gap: 8 }}>
            <CIcon name="check" size={16} inline />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.green, fontFamily: MONO }}>{totalCorrect}</div>
              <div style={{ fontSize: 11, color: C.green }}>{t.totalCorrect}</div>
            </div>
          </div>
          <div style={{ flex: 1, padding: "12px 16px", borderRadius: 8, background: C.accentSoft, display: "flex", alignItems: "center", gap: 8 }}>
            <CIcon name="question" size={16} inline />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.accent, fontFamily: MONO }}>{totalQuestions}</div>
              <div style={{ fontSize: 11, color: C.accent }}>{t.totalQuestions}</div>
            </div>
          </div>
          <div style={{ flex: 1, padding: "12px 16px", borderRadius: 8, background: C.purpleSoft, display: "flex", alignItems: "center", gap: 8 }}>
            <CIcon name="book" size={16} inline />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.purple, fontFamily: MONO }}>{topics.length}</div>
              <div style={{ fontSize: 11, color: C.purple }}>{t.topicsTracked}</div>
            </div>
          </div>
        </div>

        {/* Topic Mastery */}
        <div className="fade-up" style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, marginBottom: 20, animationDelay: ".15s" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <CIcon name="brain" size={16} inline /> {t.topicMastery}
          </h3>

          {topics.length === 0 ? (
            <p style={{ fontSize: 13, color: C.textMuted, textAlign: "center", padding: 20 }}>{t.noTopics}</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {topics.map((tp, i) => {
                const ret = tp.retention_score || 0;
                const status = ret >= 70 ? t.strong : ret >= 40 ? t.medium : t.weak;
                return (
                  <div key={i} className="mp-topic" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, background: C.bgSoft, border: `1px solid transparent` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{tp.topic}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: retCol(ret), fontFamily: MONO }}>{Math.round(ret)}%</span>
                      </div>
                      <Bar value={ret} color={retCol(ret)} h={5} />
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                        <span style={{ fontSize: 11, color: retCol(ret), fontWeight: 500 }}>{status}</span>
                        <span style={{ fontSize: 11, color: C.textMuted }}>{tp.correct_answers || 0}/{tp.total_questions || 0} {t.correct}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Sessions */}
        <div className="fade-up" style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, animationDelay: ".2s" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <CIcon name="clock" size={16} inline /> {t.recentSessions}
          </h3>

          {sessions.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24 }}>
              <CIcon name="pin" size={32} />
              <p style={{ fontSize: 13, color: C.textMuted, marginTop: 10, marginBottom: 14 }}>{t.noSessions}</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {sessions.map((s, i) => {
                const sess = s.session;
                if (!sess) return null;
                const pResp = responses.filter(r => r.participant_id === s.id);
                const correct = pResp.filter(r => r.is_correct).length;
                const total = pResp.length;
                const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
                return (
                  <div key={i} className="mp-session" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, background: C.bgSoft, border: `1px solid transparent` }}>
                    <CIcon name={sess.session_type === "warmup" ? "warmup" : "ticket"} size={24} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{sess.topic}</div>
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                        {sess.session_type === "warmup" ? "Warmup" : "Exit Ticket"} · {timeAgo(s.joined_at, t)}
                      </div>
                    </div>
                    {total > 0 && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: MONO, color: retCol(pct) }}>{pct}%</div>
                        <div style={{ fontSize: 11, color: C.textMuted }}>{correct}/{total}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Motivation */}
        {totalQuestions > 0 && (
          <div className="fade-up" style={{ textAlign: "center", marginTop: 20, padding: "16px", borderRadius: 10, background: accuracy >= 70 ? C.greenSoft : C.orangeSoft, animationDelay: ".25s" }}>
            <CIcon name={accuracy >= 70 ? "star" : "fire"} size={20} inline />
            <p style={{ fontSize: 14, fontWeight: 600, color: accuracy >= 70 ? C.green : C.orange, marginTop: 4 }}>
              {accuracy >= 70 ? t.greatJob : t.keepGoing}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
