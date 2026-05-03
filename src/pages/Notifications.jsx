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

const i18n = {
  en: {
    notifications: "Notifications",
    markAllRead: "Mark all read",
    all: "All", unread: "Unread",
    review: "Review", achievements: "Achievements", sessions: "Sessions", system: "System",
    noNotifications: "You're all caught up!",
    justNow: "Just now", minsAgo: "m ago", hoursAgo: "h ago", daysAgo: "d ago",
    reviewAction: "Start review",
    viewAchievement: "View",
    joinSession: "Join now",
  },
  es: {
    notifications: "Notificaciones",
    markAllRead: "Marcar todo leído",
    all: "Todas", unread: "No leídas",
    review: "Repaso", achievements: "Logros", sessions: "Sesiones", system: "Sistema",
    noNotifications: "¡Estás al día!",
    justNow: "Ahora", minsAgo: "min", hoursAgo: "h", daysAgo: "d",
    reviewAction: "Iniciar repaso",
    viewAchievement: "Ver",
    joinSession: "Unirse",
  },
  ko: {
    notifications: "알림",
    markAllRead: "모두 읽음",
    all: "전체", unread: "읽지 않음",
    review: "복습", achievements: "업적", sessions: "세션", system: "시스템",
    noNotifications: "모두 확인했습니다!",
    justNow: "방금", minsAgo: "분 전", hoursAgo: "시간 전", daysAgo: "일 전",
    reviewAction: "복습 시작",
    viewAchievement: "보기",
    joinSession: "참여",
  },
};

const NOTIFS = [
  { id: 1, type: "review", read: false, time: 5, icon: "brain", color: C.orange,
    title: { en: "3 topics need review", es: "3 temas necesitan repaso", ko: "3개 주제 복습 필요" },
    desc: { en: "Photosynthesis, Cell Division, and Trigonometry are below 50% retention.", es: "Fotosíntesis, División Celular y Trigonometría están debajo del 50% de retención.", ko: "광합성, 세포 분열, 삼각함수의 기억률이 50% 미만입니다." },
    action: "reviewAction" },
  { id: 2, type: "achievement", read: false, time: 30, icon: "trophy", color: C.purple,
    title: { en: "Achievement unlocked: On Fire!", es: "Logro desbloqueado: ¡En Llamas!", ko: "업적 달성: 불타는 중!" },
    desc: { en: "You completed a 7-day streak! +50 XP", es: "¡Completaste una racha de 7 días! +50 XP", ko: "7일 연속 달성! +50 XP" },
    action: "viewAchievement" },
  { id: 3, type: "session", read: false, time: 45, icon: "warmup", color: C.accent,
    title: { en: "Ms. Johnson started a warmup", es: "La Sra. Johnson inició un warmup", ko: "Johnson 선생님이 워밍업을 시작했습니다" },
    desc: { en: "French Revolution — join with PIN 384729", es: "Revolución Francesa — únete con PIN 384729", ko: "프랑스 혁명 — PIN 384729로 참여" },
    action: "joinSession" },
  { id: 4, type: "review", read: true, time: 120, icon: "chart", color: C.green,
    title: { en: "Weekly retention report", es: "Reporte semanal de retención", ko: "주간 기억률 보고서" },
    desc: { en: "Your class average improved from 68% to 72% this week. 3 students improved significantly.", es: "El promedio de tu clase mejoró de 68% a 72% esta semana. 3 estudiantes mejoraron significativamente.", ko: "이번 주 학급 평균이 68%에서 72%로 향상되었습니다. 3명의 학생이 크게 향상되었습니다." } },
  { id: 5, type: "streak", read: true, time: 300, icon: "fire", color: C.orange,
    title: { en: "Don't lose your streak!", es: "¡No pierdas tu racha!", ko: "연속 기록을 잃지 마세요!" },
    desc: { en: "You have a 5-day streak. Complete today's goal to keep it going!", es: "Tienes una racha de 5 días. ¡Completa la meta de hoy para mantenerla!", ko: "5일 연속 기록이 있습니다. 오늘 목표를 완료하세요!" } },
  { id: 6, type: "achievement", read: true, time: 1440, icon: "book", color: C.green,
    title: { en: "New mastery: French Revolution", es: "Nuevo dominio: Revolución Francesa", ko: "새 마스터: 프랑스 혁명" },
    desc: { en: "Your retention on this topic reached 'Strong' (92%). Great work!", es: "Tu retención en este tema alcanzó 'Fuerte' (92%). ¡Buen trabajo!", ko: "이 주제의 기억률이 '강함' (92%)에 도달했습니다!" } },
  { id: 7, type: "session", read: true, time: 2880, icon: "pin", color: C.accent,
    title: { en: "Session results ready", es: "Resultados de sesión listos", ko: "세션 결과 준비 완료" },
    desc: { en: "8th Grade History exit ticket: class average 76%, 28 students participated.", es: "Exit ticket de Historia 8°: promedio de clase 76%, 28 estudiantes participaron.", ko: "중2 역사 마무리 퀴즈: 학급 평균 76%, 28명 참여." } },
  { id: 8, type: "system", read: true, time: 4320, icon: "sparkle", color: C.accent,
    title: { en: "New activity type: Matching Pairs", es: "Nuevo tipo de actividad: Emparejar", ko: "새 활동 유형: 짝 맞추기" },
    desc: { en: "Try the new matching pairs mode in your next session! Great for vocabulary and cause-effect.", es: "¡Prueba el nuevo modo de emparejar en tu próxima sesión! Ideal para vocabulario.", ko: "다음 세션에서 새로운 짝 맞추기 모드를 사용해보세요!" } },
];

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'DM Sans',sans-serif;background:${C.bgSoft};color:${C.text};-webkit-font-smoothing:antialiased}
  button{font-family:'DM Sans',sans-serif;cursor:pointer;border:none;outline:none;transition:all .15s}
  button:active{transform:scale(.97)}
  @keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  .fi{animation:fi .25s ease-out both}
`;

const Logo = ({ s = 20 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{ width: s+4, height: s+4, borderRadius: 7, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={s*.6} height={s*.6} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="1.8"/><path d="M12 8v4l2.5 2.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </div>
    <span style={{ fontSize: s*.75, fontWeight: 700, letterSpacing: "-.03em" }}>clasloop</span>
  </div>
);

const LangSw = ({ lang, setLang }) => (
  <div style={{ display: "flex", gap: 2, background: C.bgSoft, borderRadius: 8, padding: 3, border: `1px solid ${C.border}` }}>
    {[["en","EN"],["es","ES"],["ko","한"]].map(([c,l]) => (
      <button key={c} onClick={() => setLang(c)} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: lang===c?C.bg:"transparent", color: lang===c?C.text:C.textMuted }}>{l}</button>
    ))}
  </div>
);

const timeLabel = (mins, d) => {
  if (mins < 1) return d.justNow;
  if (mins < 60) return `${mins}${d.minsAgo}`;
  if (mins < 1440) return `${Math.floor(mins/60)}${d.hoursAgo}`;
  return `${Math.floor(mins/1440)}${d.daysAgo}`;
};

export default function App() {
  const [lang, setLang] = useState("en");
  const [notifs, setNotifs] = useState(NOTIFS);
  const [filter, setFilter] = useState("all");
  const d = i18n[lang];

  const unreadCount = notifs.filter(n => !n.read).length;
  const markRead = (id) => setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifs(p => p.map(n => ({ ...n, read: true })));

  const filtered = filter === "all" ? notifs
    : filter === "unread" ? notifs.filter(n => !n.read)
    : notifs.filter(n => n.type === filter);

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: "100vh", background: C.bgSoft }}>
        <div style={{ padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: C.bg, borderBottom: `1px solid ${C.border}` }}>
          <Logo /><LangSw lang={lang} setLang={setLang} />
        </div>

        <div style={{ maxWidth: 600, margin: "0 auto", padding: "28px 20px" }}>
          <div className="fi" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700 }}><CIcon name="bell" size={18} inline /> {d.notifications}</h1>
              {unreadCount > 0 && <span style={{ padding: "2px 8px", borderRadius: 10, background: C.red, color: "#fff", fontSize: 12, fontWeight: 700 }}>{unreadCount}</span>}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ fontSize: 13, color: C.accent, fontWeight: 500, background: "transparent" }}>{d.markAllRead}</button>
            )}
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
            {[["all", d.all], ["unread", d.unread], ["review", `${d.review}`], ["achievement", `${d.achievements}`], ["session", `${d.sessions}`], ["system", `${d.system}`]].map(([k, label]) => (
              <button key={k} onClick={() => setFilter(k)} style={{
                padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                background: filter === k ? C.accentSoft : C.bg,
                color: filter === k ? C.accent : C.textSecondary,
                border: `1px solid ${filter === k ? C.accent+"33" : C.border}`,
              }}>{label}</button>
            ))}
          </div>

          {/* Notification list */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 48, color: C.textMuted }}>
              <span style={{ fontSize: 32, display: "block", marginBottom: 8 }}><CIcon name="check" size={28} inline /></span>
              {d.noNotifications}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {filtered.map((n, i) => (
                <div key={n.id} onClick={() => markRead(n.id)} style={{
                  display: "flex", gap: 12, padding: "14px 16px", borderRadius: 12,
                  background: C.bg, border: `1px solid ${n.read ? C.border : n.color + "33"}`,
                  cursor: "pointer", transition: "all .15s",
                  boxShadow: n.read ? "none" : `0 2px 8px ${n.color}11`,
                  animation: `fi .25s ease-out ${i * .03}s both`,
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = n.color + "55"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = n.read ? C.border : n.color + "33"}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: n.color + "14", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, position: "relative",
                  }}>
                    {n.icon}
                    {!n.read && <div style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", background: C.red, border: `2px solid ${C.bg}` }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: n.read ? 500 : 600, color: n.read ? C.text : C.text }}>{n.title[lang]}</span>
                      <span style={{ fontSize: 11, color: C.textMuted, flexShrink: 0, marginLeft: 8 }}>{timeLabel(n.time, d)}</span>
                    </div>
                    <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.45 }}>{n.desc[lang]}</p>
                    {n.action && !n.read && (
                      <button style={{
                        marginTop: 8, padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                        background: n.color + "14", color: n.color,
                      }}>{d[n.action]} →</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
