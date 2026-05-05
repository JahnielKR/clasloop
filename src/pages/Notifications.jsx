import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { getReviewSuggestions } from "../lib/spaced-repetition";
import { loadDismissed, saveDismissed } from "../lib/notifications";
import { CIcon } from "../components/Icons";
import PageHeader from "../components/PageHeader";
import { C } from "../components/tokens";

const i18n = {
  en: {
    pageTitle: "Notifications", all: "All", review: "Review", sessions: "Sessions", system: "System",
    noNotifications: "You're all caught up!", loading: "Loading...",
    topicsNeedReview: "topics need review", belowRetention: "below 50% retention",
    sessionCompleted: "Session completed", avgScore: "Class average", students: "students participated",
    streakReminder: "Don't lose your streak!", currentStreak: "Current streak", daysStreak: "days",
    welcomeBack: "Welcome to Clasloop!", welcomeDesc: "Start by creating a class and running your first session.",
    newSession: "New session available", joinNow: "Join now",
    reviewNow: "Review now", viewResults: "View results",
    justNow: "Just now", minsAgo: "m ago", hoursAgo: "h ago", daysAgo: "d ago",
    markAllRead: "Mark all as read",
  },
  es: {
    pageTitle: "Notificaciones", all: "Todas", review: "Repaso", sessions: "Sesiones", system: "Sistema",
    noNotifications: "¡Estás al día!", loading: "Cargando...",
    topicsNeedReview: "temas necesitan repaso", belowRetention: "debajo del 50%",
    sessionCompleted: "Sesión completada", avgScore: "Promedio de clase", students: "estudiantes participaron",
    streakReminder: "¡No pierdas tu racha!", currentStreak: "Racha actual", daysStreak: "días",
    welcomeBack: "¡Bienvenido a Clasloop!", welcomeDesc: "Empieza creando una clase y tu primera sesión.",
    newSession: "Nueva sesión disponible", joinNow: "Unirse ahora",
    reviewNow: "Repasar ahora", viewResults: "Ver resultados",
    justNow: "Ahora", minsAgo: "min", hoursAgo: "h", daysAgo: "d",
    markAllRead: "Marcar todas como leídas",
  },
  ko: {
    pageTitle: "알림", all: "전체", review: "복습", sessions: "세션", system: "시스템",
    noNotifications: "모두 확인했습니다!", loading: "로딩...",
    topicsNeedReview: "개 주제 복습 필요", belowRetention: "50% 미만",
    sessionCompleted: "세션 완료", avgScore: "학급 평균", students: "명 참여",
    streakReminder: "연속 기록을 잃지 마세요!", currentStreak: "현재 연속", daysStreak: "일",
    welcomeBack: "Clasloop에 오신 것을 환영합니다!", welcomeDesc: "수업을 만들고 첫 세션을 시작하세요.",
    newSession: "새 세션 가능", joinNow: "참여하기",
    reviewNow: "복습 시작", viewResults: "결과 보기",
    justNow: "방금", minsAgo: "분 전", hoursAgo: "시간 전", daysAgo: "일 전",
    markAllRead: "모두 읽음으로 표시",
  },
};

// Persistent dismissed notifications: live in localStorage so dismissals
// survive a refresh and stay in sync with App.jsx (which uses the same
// helpers for the sidebar badge count). See lib/notifications.js.


const css = `
  .nt-filter { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .nt-filter:hover { background: #E8F0FE !important; border-color: #2383E244 !important; color: #2383E2 !important; }
  .nt-card { transition: all .2s ease; }
  .nt-card:hover { border-color: #2383E244 !important; background: #FAFBFF !important; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .nt-action { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .nt-action:hover { filter: brightness(.9); transform: translateX(2px); }
  .nt-lang { transition: all .12s ease; cursor: pointer; }
  .nt-lang:hover { background: #E8F0FE !important; color: #2383E2 !important; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .fade-up { animation: fadeUp .25s ease-out both; }
`;

function timeAgo(date, t) {
  if (!date) return t.justNow;
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t.justNow;
  if (mins < 60) return `${mins}${t.minsAgo}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}${t.hoursAgo}`;
  return `${Math.floor(hours / 24)}${t.daysAgo}`;
}

export default function Notifications({ lang: pageLang = "en", setLang: pageSetLang, onOpenMobileMenu, onNavigate }) {
  const [lang, setLangLocal] = useState(pageLang);
  const setLang = pageSetLang || setLangLocal;
  const l = pageLang || lang;
  const [filter, setFilter] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  // Persistent across reloads — see DISMISSED_KEY above. We initialize from
  // localStorage on first render so dismiss survives a refresh.
  const [dismissed, setDismissed] = useState(() => loadDismissed());
  const t = i18n[l] || i18n.en;

  useEffect(() => { generateNotifications(); }, []);

  // Persist dismissed map every time it changes
  useEffect(() => { saveDismissed(dismissed); }, [dismissed]);

  // ── Action dispatcher ────────────────────────────────────────────
  // Each notification carries a `_action` describing what to do when the
  // user clicks it (or the inline action button). We map that to a page +
  // opts and let the parent (App.jsx) handle the actual navigation.
  const handleAction = (n) => {
    if (!n || !n._action || !onNavigate) return;
    const a = n._action;
    if (a.kind === "openCreateSession") {
      onNavigate("sessions", { focusClassId: a.classId, openCreateSession: true });
    } else if (a.kind === "viewSessionResults") {
      onNavigate("sessions", { focusSessionId: a.sessionId });
    } else if (a.kind === "openCreateClass") {
      onNavigate("sessions", { openCreateClass: true });
    } else if (a.kind === "joinSession") {
      onNavigate("myClasses", { focusPin: a.pin });
    } else if (a.kind === "openMyClasses") {
      onNavigate("myClasses", {});
    }
  };

  const generateNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    const isTeacher = profile?.role === "teacher";
    const notifs = [];

    if (isTeacher) {
      // Get teacher's classes
      const { data: classes } = await supabase.from("classes").select("*").eq("teacher_id", user.id);

      if (classes && classes.length > 0) {
        // Review suggestions per class
        for (const cls of classes) {
          const sug = await getReviewSuggestions(cls.id);
          if (sug && sug.length > 0) {
            notifs.push({
              id: `review-${cls.id}`,
              type: "review",
              icon: "brain",
              color: C.orange,
              title: `${sug.length} ${t.topicsNeedReview}`,
              desc: `${cls.name} — ${sug.map(s => s.topic).slice(0, 3).join(", ")} ${t.belowRetention}`,
              time: new Date(),
              action: t.reviewNow,
              _action: { kind: "openCreateSession", classId: cls.id },
            });
          }
        }

        // Recent completed sessions
        const { data: recentSessions } = await supabase.from("sessions")
          .select("*, session_participants(count), responses(*)")
          .eq("teacher_id", user.id)
          .eq("status", "completed")
          .order("completed_at", { ascending: false })
          .limit(5);

        if (recentSessions) {
          for (const sess of recentSessions) {
            const participants = sess.session_participants?.[0]?.count || 0;
            const responses = sess.responses || [];
            const correctCount = responses.filter(r => r.is_correct).length;
            const totalCount = responses.length;
            const avg = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

            notifs.push({
              id: `session-${sess.id}`,
              type: "session",
              icon: sess.session_type === "warmup" ? "warmup" : "ticket",
              color: C.accent,
              title: `${t.sessionCompleted}: ${sess.topic}`,
              desc: `${t.avgScore}: ${avg}% · ${participants} ${t.students}`,
              time: new Date(sess.completed_at || sess.created_at),
              action: t.viewResults,
              _action: { kind: "viewSessionResults", sessionId: sess.id },
            });
          }
        }
      } else {
        // No classes yet - welcome notification
        notifs.push({
          id: "welcome",
          type: "system",
          icon: "sparkle",
          color: C.purple,
          title: t.welcomeBack,
          desc: t.welcomeDesc,
          time: new Date(),
          _action: { kind: "openCreateClass" },
        });
      }
    } else {
      // Student notifications
      // Check for active sessions they can join
      const { data: activeSessions } = await supabase.from("sessions")
        .select("*, classes(name)")
        .eq("status", "lobby")
        .order("created_at", { ascending: false })
        .limit(3);

      if (activeSessions) {
        for (const sess of activeSessions) {
          notifs.push({
            id: `join-${sess.id}`,
            type: "session",
            icon: "pin",
            color: C.accent,
            title: `${t.newSession}: ${sess.topic}`,
            desc: `PIN: ${sess.pin} · ${sess.classes?.name || ""}`,
            time: new Date(sess.created_at),
            action: t.joinNow,
            _action: { kind: "joinSession", pin: sess.pin },
          });
        }
      }

      // Streak reminder
      const streak = profile?.streak || 0;
      if (streak > 0) {
        notifs.push({
          id: "streak",
          type: "review",
          icon: "fire",
          color: C.orange,
          title: t.streakReminder,
          desc: `${t.currentStreak}: ${streak} ${t.daysStreak}`,
          time: new Date(),
          _action: { kind: "openMyClasses" },
        });
      }

      // Welcome if no data
      if (notifs.length === 0) {
        notifs.push({
          id: "welcome-student",
          type: "system",
          icon: "sparkle",
          color: C.purple,
          title: t.welcomeBack,
          desc: t.welcomeDesc,
          time: new Date(),
          _action: { kind: "openMyClasses" },
        });
      }
    }

    // Sort by time, newest first
    notifs.sort((a, b) => new Date(b.time) - new Date(a.time));
    setNotifications(notifs);
    setLoading(false);
  };

  const filtered = filter === "all" ? notifications : notifications.filter(n => n.type === filter);
  const visibleNotifs = filtered.filter(n => !dismissed[n.id]);

  return (
    <div style={{ padding: "28px 20px" }}>
      <style>{css}</style>
      <PageHeader title={t.pageTitle} icon="bell" lang={l} setLang={setLang} onOpenMobileMenu={onOpenMobileMenu} />

      <div style={{ maxWidth: 600, margin: "0 auto" }}>

        {/* Filters + mark-all-read */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {[["all", t.all], ["review", t.review], ["session", t.sessions], ["system", t.system]].map(([k, label]) => (
              <button key={k} className="nt-filter" onClick={() => setFilter(k)} style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                background: filter === k ? C.accentSoft : C.bg,
                color: filter === k ? C.accent : C.textSecondary,
                border: `1px solid ${filter === k ? C.accent + "33" : C.border}`,
              }}>{label}</button>
            ))}
          </div>
          {!loading && visibleNotifs.length > 0 && (
            <button
              onClick={() => {
                // Mark all *currently visible* notifications as dismissed.
                // We don't dismiss filtered-out ones — that would be confusing
                // when the user comes back to a different filter and finds
                // them gone.
                const m = { ...dismissed };
                for (const n of visibleNotifs) m[n.id] = true;
                setDismissed(m);
              }}
              className="nt-filter"
              style={{
                padding: "6px 12px", borderRadius: 20, fontSize: 11, fontWeight: 500,
                background: C.bg, color: C.textSecondary,
                border: `1px solid ${C.border}`,
                display: "inline-flex", alignItems: "center", gap: 5,
              }}
              title={t.markAllRead}
            >
              <CIcon name="check" size={11} inline /> {t.markAllRead}
            </button>
          )}
        </div>

        {loading ? (
          <p style={{ textAlign: "center", color: C.textMuted, padding: 40 }}>{t.loading}</p>
        ) : visibleNotifs.length === 0 ? (
          <div className="fade-up" style={{ textAlign: "center", padding: 48 }}>
            <div style={{ marginBottom: 12 }}><CIcon name="check" size={36} /></div>
            <p style={{ fontSize: 15, color: C.textMuted, fontWeight: 500 }}>{t.noNotifications}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {visibleNotifs.map((n, i) => {
              const clickable = Boolean(n._action && onNavigate);
              return (
                <div
                  key={n.id}
                  className="nt-card fade-up"
                  onClick={clickable ? () => handleAction(n) : undefined}
                  style={{
                    display: "flex", gap: 12, padding: "14px 16px", borderRadius: 12,
                    background: C.bg, border: `1px solid ${n.color + "33"}`,
                    boxShadow: `0 2px 8px ${n.color}11`,
                    animationDelay: `${i * .04}s`,
                    cursor: clickable ? "pointer" : "default",
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: 42, height: 42, borderRadius: 11, flexShrink: 0,
                    background: n.color + "14", display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <CIcon name={n.icon} size={20} inline />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{n.title}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 11, color: C.textMuted, flexShrink: 0 }}>{timeAgo(n.time, t)}</span>
                        <button
                          onClick={(e) => {
                            // stopPropagation so we don't also trigger the
                            // card-level click handler.
                            e.stopPropagation();
                            setDismissed(prev => ({ ...prev, [n.id]: true }));
                          }}
                          style={{ width: 18, height: 18, borderRadius: 4, background: "transparent", border: "none", cursor: "pointer", color: C.textMuted, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}
                          title="Dismiss"
                        >×</button>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.45 }}>{n.desc}</p>
                    {n.action && (
                      <button
                        className="nt-action"
                        onClick={(e) => { e.stopPropagation(); handleAction(n); }}
                        style={{
                          marginTop: 8, padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                          background: n.color + "14", color: n.color,
                          display: "inline-flex", alignItems: "center", gap: 4,
                        }}
                      >
                        {n.action}
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    )}
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
