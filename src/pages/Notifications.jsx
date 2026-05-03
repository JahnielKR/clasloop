import { useState } from "react";
import { CIcon } from "../components/Icons";

const C = {
  bg: "#FFFFFF", bgSoft: "#F7F7F5", accent: "#2383E2", accentSoft: "#E8F0FE",
  green: "#0F7B6C", greenSoft: "#EEFBF5", orange: "#D9730D", orangeSoft: "#FFF3E0",
  red: "#E03E3E", redSoft: "#FDECEC", purple: "#6940A5", purpleSoft: "#F3EEFB",
  text: "#191919", textSecondary: "#6B6B6B", textMuted: "#9B9B9B",
  border: "#E8E8E4", shadow: "0 1px 3px rgba(0,0,0,0.04)",
};

const i18n = {
  en: {
    pageTitle: "Notifications", markAllRead: "Mark all read",
    all: "All", unread: "Unread", review: "Review", achievements: "Achievements",
    sessions: "Sessions", system: "System",
    noNotifications: "You're all caught up!", justNow: "Just now",
    minsAgo: "m ago", hoursAgo: "h ago", daysAgo: "d ago",
    reviewAction: "Start review", viewAchievement: "View", joinSession: "Join now",
  },
  es: {
    pageTitle: "Notificaciones", markAllRead: "Marcar todo leído",
    all: "Todas", unread: "No leídas", review: "Repaso", achievements: "Logros",
    sessions: "Sesiones", system: "Sistema",
    noNotifications: "¡Estás al día!", justNow: "Ahora",
    minsAgo: "min", hoursAgo: "h", daysAgo: "d",
    reviewAction: "Iniciar repaso", viewAchievement: "Ver", joinSession: "Unirse",
  },
  ko: {
    pageTitle: "알림", markAllRead: "모두 읽음",
    all: "전체", unread: "읽지 않음", review: "복습", achievements: "업적",
    sessions: "세션", system: "시스템",
    noNotifications: "모두 확인했습니다!", justNow: "방금",
    minsAgo: "분 전", hoursAgo: "시간 전", daysAgo: "일 전",
    reviewAction: "복습 시작", viewAchievement: "보기", joinSession: "참여",
  },
};

const NOTIFS = [
  { id: 1, type: "review", read: false, time: 5, icon: "brain", color: C.orange,
    title: { en: "3 topics need review", es: "3 temas necesitan repaso", ko: "3개 주제 복습 필요" },
    desc: { en: "Photosynthesis, Cell Division, and Trigonometry are below 50% retention.", es: "Fotosíntesis, División Celular y Trigonometría están debajo del 50%.", ko: "광합성, 세포 분열, 삼각함수의 기억률이 50% 미만입니다." },
    action: "reviewAction" },
  { id: 2, type: "achievement", read: false, time: 30, icon: "trophy", color: C.purple,
    title: { en: "Achievement unlocked: On Fire!", es: "Logro: ¡En Llamas!", ko: "업적 달성: 불타는 중!" },
    desc: { en: "You completed a 7-day streak! +50 XP", es: "¡Racha de 7 días! +50 XP", ko: "7일 연속 달성! +50 XP" },
    action: "viewAchievement" },
  { id: 3, type: "session", read: false, time: 45, icon: "warmup", color: C.accent,
    title: { en: "Ms. Johnson started a warmup", es: "La Sra. Johnson inició un warmup", ko: "Johnson 선생님이 워밍업 시작" },
    desc: { en: "French Revolution — join with PIN 384729", es: "Revolución Francesa — PIN 384729", ko: "프랑스 혁명 — PIN 384729" },
    action: "joinSession" },
  { id: 4, type: "review", read: true, time: 120, icon: "chart", color: C.green,
    title: { en: "Weekly retention report", es: "Reporte semanal", ko: "주간 기억률 보고서" },
    desc: { en: "Class average improved from 68% to 72% this week.", es: "Promedio de clase mejoró de 68% a 72%.", ko: "학급 평균이 68%에서 72%로 향상." } },
  { id: 5, type: "review", read: true, time: 300, icon: "fire", color: C.orange,
    title: { en: "Don't lose your streak!", es: "¡No pierdas tu racha!", ko: "연속 기록을 잃지 마세요!" },
    desc: { en: "5-day streak. Complete today's goal!", es: "Racha de 5 días. ¡Completa la meta!", ko: "5일 연속. 오늘 목표를 완료하세요!" } },
  { id: 6, type: "achievement", read: true, time: 1440, icon: "star", color: C.green,
    title: { en: "New mastery: French Revolution", es: "Dominio: Revolución Francesa", ko: "마스터: 프랑스 혁명" },
    desc: { en: "Retention reached 'Strong' (92%)!", es: "Retención en 'Fuerte' (92%)!", ko: "기억률 '강함' (92%) 도달!" } },
  { id: 7, type: "session", read: true, time: 2880, icon: "chart", color: C.accent,
    title: { en: "Session results ready", es: "Resultados listos", ko: "세션 결과 준비 완료" },
    desc: { en: "8th Grade History: average 76%, 28 students.", es: "Historia 8°: promedio 76%, 28 alumnos.", ko: "중2 역사: 평균 76%, 28명 참여." } },
  { id: 8, type: "system", read: true, time: 4320, icon: "sparkle", color: C.purple,
    title: { en: "New: Matching Pairs mode", es: "Nuevo: Modo Emparejar", ko: "새로운: 짝 맞추기 모드" },
    desc: { en: "Try matching pairs in your next session!", es: "¡Prueba emparejar en tu próxima sesión!", ko: "다음 세션에서 짝 맞추기를 사용해보세요!" } },
];

const css = `
  .nt-filter { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .nt-filter:hover { background: #E8F0FE !important; border-color: #2383E244 !important; color: #2383E2 !important; }
  .nt-filter:active { transform: scale(.96); }
  .nt-card { transition: all .2s ease; cursor: pointer; }
  .nt-card:hover { border-color: #2383E244 !important; background: #FAFBFF !important; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .nt-action { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .nt-action:hover { filter: brightness(.9); transform: translateX(2px); }
  .nt-mark { transition: all .15s ease; cursor: pointer; }
  .nt-mark:hover { color: #2383E2 !important; }
  .nt-lang { transition: all .12s ease; cursor: pointer; }
  .nt-lang:hover { background: #E8F0FE !important; color: #2383E2 !important; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .fade-up { animation: fadeUp .25s ease-out both; }
`;

const timeLabel = (mins, t) => {
  if (mins < 1) return t.justNow;
  if (mins < 60) return `${mins}${t.minsAgo}`;
  if (mins < 1440) return `${Math.floor(mins / 60)}${t.hoursAgo}`;
  return `${Math.floor(mins / 1440)}${t.daysAgo}`;
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
            <button key={c} className="nt-lang" onClick={() => setLang(c)} style={{
              padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: lang === c ? C.bg : "transparent", color: lang === c ? C.text : C.textMuted,
              border: "none", boxShadow: lang === c ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
            }}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Notifications({ lang: pageLang = "en", setLang: pageSetLang }) {
  const [lang, setLangLocal] = useState(pageLang);
  const setLang = pageSetLang || setLangLocal;
  const l = pageLang || lang;
  const [notifs, setNotifs] = useState(NOTIFS);
  const [filter, setFilter] = useState("all");
  const t = i18n[l] || i18n.en;

  const unreadCount = notifs.filter(n => !n.read).length;
  const markRead = (id) => setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifs(p => p.map(n => ({ ...n, read: true })));

  const filtered = filter === "all" ? notifs
    : filter === "unread" ? notifs.filter(n => !n.read)
    : notifs.filter(n => n.type === filter);

  return (
    <div style={{ padding: "28px 20px" }}>
      <style>{css}</style>
      <PageHeader title={t.pageTitle} icon="bell" lang={l} setLang={setLang} />

      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {unreadCount > 0 && <span style={{ padding: "2px 8px", borderRadius: 10, background: C.red, color: "#fff", fontSize: 12, fontWeight: 700 }}>{unreadCount}</span>}
          </div>
          {unreadCount > 0 && (
            <button className="nt-mark" onClick={markAllRead} style={{ fontSize: 13, color: C.textMuted, fontWeight: 500, background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{t.markAllRead}</button>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            ["all", t.all], ["unread", t.unread], ["review", t.review],
            ["achievement", t.achievements], ["session", t.sessions], ["system", t.system],
          ].map(([k, label]) => (
            <button key={k} className="nt-filter" onClick={() => setFilter(k)} style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500,
              background: filter === k ? C.accentSoft : C.bg,
              color: filter === k ? C.accent : C.textSecondary,
              border: `1px solid ${filter === k ? C.accent + "33" : C.border}`,
            }}>
              {label}
              {k === "unread" && unreadCount > 0 && <span style={{ marginLeft: 4, padding: "1px 5px", borderRadius: 8, background: C.red, color: "#fff", fontSize: 10, fontWeight: 700 }}>{unreadCount}</span>}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div className="fade-up" style={{ textAlign: "center", padding: 48 }}>
            <div style={{ marginBottom: 12 }}><CIcon name="check" size={36} /></div>
            <p style={{ fontSize: 15, color: C.textMuted, fontWeight: 500 }}>{t.noNotifications}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((n, i) => (
              <div key={n.id} className="nt-card fade-up" onClick={() => markRead(n.id)} style={{
                display: "flex", gap: 12, padding: "14px 16px", borderRadius: 12,
                background: C.bg, border: `1px solid ${n.read ? C.border : n.color + "33"}`,
                boxShadow: n.read ? "none" : `0 2px 8px ${n.color}11`,
                animationDelay: `${i * .04}s`,
              }}>
                {/* Icon */}
                <div style={{
                  width: 42, height: 42, borderRadius: 11, flexShrink: 0, position: "relative",
                  background: n.color + "14", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <CIcon name={n.icon} size={20} inline />
                  {!n.read && <div style={{ position: "absolute", top: -2, right: -2, width: 9, height: 9, borderRadius: "50%", background: C.red, border: `2px solid ${C.bg}` }} />}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: n.read ? 500 : 600 }}>{n.title[l]}</span>
                    <span style={{ fontSize: 11, color: C.textMuted, flexShrink: 0, marginLeft: 8 }}>{timeLabel(n.time, t)}</span>
                  </div>
                  <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.45 }}>{n.desc[l]}</p>
                  {n.action && !n.read && (
                    <button className="nt-action" onClick={e => e.stopPropagation()} style={{
                      marginTop: 8, padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                      background: n.color + "14", color: n.color,
                      display: "inline-flex", alignItems: "center", gap: 4,
                    }}>
                      {t[n.action]}
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
