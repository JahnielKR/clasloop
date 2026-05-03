import { useState } from "react";
import { CIcon } from "../components/Icons";

const C = {
  bg: "#FFFFFF", bgSoft: "#F7F7F5", accent: "#2383E2", accentSoft: "#E8F0FE",
  green: "#0F7B6C", greenSoft: "#EEFBF5", orange: "#D9730D", orangeSoft: "#FFF3E0",
  red: "#E03E3E", redSoft: "#FDECEC", purple: "#6940A5", purpleSoft: "#F3EEFB",
  yellow: "#D4A017",
  text: "#191919", textSecondary: "#6B6B6B", textMuted: "#9B9B9B",
  border: "#E8E8E4", shadow: "0 1px 3px rgba(0,0,0,0.04)",
};
const MONO = "'JetBrains Mono', monospace";
const retCol = (v) => v >= 70 ? C.green : v >= 40 ? C.orange : C.red;

// ─── i18n ───────────────────────────────────────────
const i18n = {
  en: {
    pageTitle: "School Dashboard", subtitle: "Retention overview across your school",
    overview: "Overview", byTeacher: "By Teacher", byGrade: "By Grade", alerts: "Alerts",
    schoolRetention: "School retention", activeTeachers: "Active teachers",
    activeStudents: "Active students", sessionsWeek: "Sessions this week",
    teacher: "Teacher", classes: "Classes", students: "Students", retention: "Retention", sessions: "Sessions", trend: "Trend",
    grade: "Grade", subjects: "Subjects", avgRetention: "Avg retention",
    atRisk: "At-risk students", atRiskDesc: "Retention below 40% in 2+ topics",
    inactive: "Inactive teachers", inactiveDesc: "No sessions in the last 7 days",
    lowTopics: "Low retention topics", lowTopicsDesc: "Topics below 50% school-wide",
    topPerformers: "Top performers", lastActive: "Last active",
    daysAgo: "days ago", today: "today", noAlerts: "No alerts — everything looks good!",
  },
  es: {
    pageTitle: "Panel de Escuela", subtitle: "Vista de retención en tu escuela",
    overview: "Resumen", byTeacher: "Por Profesor", byGrade: "Por Grado", alerts: "Alertas",
    schoolRetention: "Retención escolar", activeTeachers: "Profesores activos",
    activeStudents: "Estudiantes activos", sessionsWeek: "Sesiones esta semana",
    teacher: "Profesor", classes: "Clases", students: "Estudiantes", retention: "Retención", sessions: "Sesiones", trend: "Tendencia",
    grade: "Grado", subjects: "Materias", avgRetention: "Retención prom.",
    atRisk: "Estudiantes en riesgo", atRiskDesc: "Retención menor a 40% en 2+ temas",
    inactive: "Profesores inactivos", inactiveDesc: "Sin sesiones en los últimos 7 días",
    lowTopics: "Temas con baja retención", lowTopicsDesc: "Temas debajo del 50% en la escuela",
    topPerformers: "Mejores profesores", lastActive: "Última actividad",
    daysAgo: "días atrás", today: "hoy", noAlerts: "Sin alertas — todo se ve bien!",
  },
  ko: {
    pageTitle: "학교 대시보드", subtitle: "학교 전체의 기억률 현황",
    overview: "개요", byTeacher: "교사별", byGrade: "학년별", alerts: "알림",
    schoolRetention: "학교 기억률", activeTeachers: "활동 교사",
    activeStudents: "활동 학생", sessionsWeek: "이번 주 세션",
    teacher: "교사", classes: "수업", students: "학생", retention: "기억률", sessions: "세션", trend: "추세",
    grade: "학년", subjects: "과목", avgRetention: "평균 기억률",
    atRisk: "위험 학생", atRiskDesc: "2개 이상 주제에서 기억률 40% 미만",
    inactive: "비활동 교사", inactiveDesc: "최근 7일간 세션 없음",
    lowTopics: "낮은 기억률 주제", lowTopicsDesc: "학교 전체에서 50% 미만",
    topPerformers: "우수 교사", lastActive: "마지막 활동",
    daysAgo: "일 전", today: "오늘", noAlerts: "알림 없음 — 모두 순조롭습니다!",
  },
};

// ─── CSS ────────────────────────────────────────────
const css = `
  .sd-tab { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .sd-tab:hover { background: #E8F0FE !important; border-color: #2383E244 !important; color: #2383E2 !important; }
  .sd-tab:active { transform: scale(.96); }
  .sd-stat { transition: all .2s ease; }
  .sd-stat:hover { border-color: #2383E233 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.06); transform: translateY(-2px); }
  .sd-card { transition: all .2s ease; }
  .sd-card:hover { border-color: #2383E233 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .sd-row { transition: all .15s ease; }
  .sd-row:hover { background: #E8F0FE !important; }
  .sd-grade { transition: all .2s ease; cursor: default; }
  .sd-grade:hover { border-color: #2383E233 !important; box-shadow: 0 4px 12px rgba(0,0,0,0.06); transform: translateY(-2px); }
  .sd-alert-item { transition: all .15s ease; }
  .sd-alert-item:hover { filter: brightness(.97); transform: translateX(2px); }
  .sd-bar-segment { transition: height .5s ease, width .5s ease; }
  .sd-lang { transition: all .12s ease; cursor: pointer; }
  .sd-lang:hover { background: #E8F0FE !important; color: #2383E2 !important; }
  .sd-avatar { transition: all .15s ease; }
  .sd-avatar:hover { transform: scale(1.1); }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  .fade-up { animation: fadeUp .3s ease-out both; }
`;

// ─── Mock Data ──────────────────────────────────────
const TEACHERS = [
  { name: "María González", initials: "MG", color: C.purple, classes: 3, students: 83, retention: 78, sessions: 12, trend: "up", lastActive: 0 },
  { name: "James Park", initials: "JP", color: C.accent, classes: 2, students: 56, retention: 82, sessions: 15, trend: "up", lastActive: 0 },
  { name: "Yuna Kim", initials: "YK", color: C.green, classes: 2, students: 48, retention: 71, sessions: 8, trend: "stable", lastActive: 1 },
  { name: "Carlos Ruiz", initials: "CR", color: C.orange, classes: 3, students: 91, retention: 65, sessions: 6, trend: "down", lastActive: 2 },
  { name: "Emma Watson", initials: "EW", color: C.red, classes: 1, students: 30, retention: 59, sessions: 3, trend: "down", lastActive: 5 },
  { name: "David Chen", initials: "DC", color: C.accent, classes: 2, students: 52, retention: 74, sessions: 9, trend: "up", lastActive: 0 },
  { name: "Sofía Martínez", initials: "SM", color: C.purple, classes: 1, students: 27, retention: 45, sessions: 1, trend: "down", lastActive: 9 },
];

const GRADES_DATA = [
  { grade: { en: "6th", es: "6°", ko: "중1" }, subjects: 4, students: 62, retention: 68, sessions: 14 },
  { grade: { en: "7th", es: "7°", ko: "중2" }, subjects: 5, students: 78, retention: 72, sessions: 18 },
  { grade: { en: "8th", es: "8°", ko: "중3" }, subjects: 6, students: 95, retention: 75, sessions: 24 },
  { grade: { en: "9th", es: "9°", ko: "고1" }, subjects: 5, students: 82, retention: 64, sessions: 12 },
  { grade: { en: "10th", es: "10°", ko: "고2" }, subjects: 4, students: 56, retention: 58, sessions: 8 },
  { grade: { en: "11th", es: "11°", ko: "고3" }, subjects: 3, students: 44, retention: 71, sessions: 10 },
];

const ALERTS = {
  atRisk: [
    { name: "Lucas G.", grade: "8th", weakTopics: 4, retention: 32 },
    { name: "Ana P.", grade: "9th", weakTopics: 3, retention: 38 },
    { name: "Kevin M.", grade: "10th", weakTopics: 2, retention: 35 },
  ],
  inactive: [{ name: "Sofía Martínez", days: 9, classes: 1 }],
  lowTopics: [
    { topic: { en: "Trigonometry", es: "Trigonometría", ko: "삼각함수" }, grade: "10th", retention: 34 },
    { topic: { en: "Cell Division", es: "División Celular", ko: "세포 분열" }, grade: "8th", retention: 41 },
    { topic: { en: "Grammar: Subjunctive", es: "Gramática: Subjuntivo", ko: "문법: 가정법" }, grade: "9th", retention: 44 },
  ],
};

// ─── Components ─────────────────────────────────────
const Bar = ({ value, max = 100, color = C.accent, h = 6 }) => (
  <div style={{ width: "100%", height: h, background: C.bgSoft, borderRadius: h }}>
    <div className="sd-bar-segment" style={{ width: `${Math.min((value / max) * 100, 100)}%`, height: "100%", borderRadius: h, background: color }} />
  </div>
);

const AvatarCircle = ({ initials, color, size = 32 }) => (
  <div className="sd-avatar" style={{ width: size, height: size, borderRadius: "50%", background: color + "18", border: `1.5px solid ${color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 600, color, flexShrink: 0 }}>{initials}</div>
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
            <button key={c} className="sd-lang" onClick={() => setLang(c)} style={{
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

const trendIcon = (tr) => tr === "up" ? "↑" : tr === "down" ? "↓" : "→";
const trendColor = (tr) => tr === "up" ? C.green : tr === "down" ? C.red : C.textMuted;
const alertCount = ALERTS.atRisk.length + ALERTS.inactive.length + ALERTS.lowTopics.length;

// ─── Main ───────────────────────────────────────────
export default function Director({ lang: pageLang = "en", setLang: pageSetLang }) {
  const [lang, setLangLocal] = useState(pageLang);
  const setLang = pageSetLang || setLangLocal;
  const [tab, setTab] = useState("overview");
  const t = i18n[pageLang || lang] || i18n.en;
  const l = pageLang || lang;

  const schoolAvg = Math.round(TEACHERS.reduce((s, x) => s + x.retention, 0) / TEACHERS.length);
  const totalStudents = TEACHERS.reduce((s, x) => s + x.students, 0);
  const totalSessions = TEACHERS.reduce((s, x) => s + x.sessions, 0);

  return (
    <div style={{ padding: "28px 20px" }}>
      <style>{css}</style>
      <PageHeader title={t.pageTitle} icon="school" lang={l} setLang={setLang} />

      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <p style={{ fontSize: 14, color: C.textSecondary, marginBottom: 20 }}>{t.subtitle}</p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
          {[["overview", t.overview], ["byTeacher", t.byTeacher], ["byGrade", t.byGrade], ["alerts", t.alerts]].map(([id, label]) => (
            <button key={id} className="sd-tab" onClick={() => setTab(id)} style={{
              padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: tab === id ? C.accentSoft : C.bg,
              color: tab === id ? C.accent : C.textSecondary,
              border: `1px solid ${tab === id ? C.accent + "33" : C.border}`,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              {label}
              {id === "alerts" && alertCount > 0 && <span style={{ padding: "1px 6px", borderRadius: 10, background: C.red, color: "#fff", fontSize: 10, fontWeight: 700 }}>{alertCount}</span>}
            </button>
          ))}
        </div>

        {/* ── Overview ── */}
        {tab === "overview" && (
          <div className="fade-up">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
              {[
                [t.schoolRetention, `${schoolAvg}%`, retCol(schoolAvg)],
                [t.activeTeachers, TEACHERS.length, C.accent],
                [t.activeStudents, totalStudents, C.purple],
                [t.sessionsWeek, totalSessions, C.green],
              ].map(([label, value, color], i) => (
                <div key={i} className="sd-stat" style={{ padding: "16px 18px", borderRadius: 10, background: C.bg, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4, fontWeight: 500 }}>{label}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: MONO, lineHeight: 1 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="sd-card" style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>{t.avgRetention} — {t.byGrade.toLowerCase()}</h3>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 140 }}>
                {GRADES_DATA.map((g, i) => (
                  <div key={i} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, fontFamily: MONO, color: retCol(g.retention), marginBottom: 4 }}>{g.retention}%</div>
                    <div style={{ height: 120, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                      <div className="sd-bar-segment" style={{ width: "70%", height: (g.retention / 100) * 120, borderRadius: "6px 6px 0 0", background: retCol(g.retention), opacity: .8 }} />
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>{g.grade[l]}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top performers */}
            <div className="sd-card" style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <CIcon name="trophy" size={16} inline /> {t.topPerformers}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[...TEACHERS].sort((a, b) => b.retention - a.retention).slice(0, 3).map((x, i) => (
                  <div key={i} className="sd-row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: C.bgSoft }}>
                    <span style={{ fontSize: 14, width: 20, textAlign: "center", fontWeight: 700, fontFamily: MONO, color: i === 0 ? C.yellow : C.textMuted }}>{i + 1}</span>
                    <AvatarCircle initials={x.initials} color={x.color} size={30} />
                    <div style={{ flex: 1 }}><span style={{ fontSize: 14, fontWeight: 500 }}>{x.name}</span></div>
                    <span style={{ fontSize: 14, fontWeight: 700, fontFamily: MONO, color: retCol(x.retention) }}>{x.retention}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── By Teacher ── */}
        {tab === "byTeacher" && (
          <div className="fade-up sd-card" style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 60px", gap: 0, padding: "12px 16px", borderBottom: `1px solid ${C.border}`, fontSize: 12, fontWeight: 600, color: C.textMuted }}>
              <span>{t.teacher}</span><span>{t.classes}</span><span>{t.students}</span><span>{t.retention}</span><span>{t.sessions}</span><span>{t.trend}</span>
            </div>
            {[...TEACHERS].sort((a, b) => b.retention - a.retention).map((x, i) => (
              <div key={i} className="sd-row" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 60px", gap: 0, padding: "12px 16px", borderBottom: `1px solid ${C.border}`, alignItems: "center", background: i % 2 === 0 ? C.bgSoft : C.bg }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <AvatarCircle initials={x.initials} color={x.color} size={28} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{x.name}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>{t.lastActive}: {x.lastActive === 0 ? t.today : `${x.lastActive} ${t.daysAgo}`}</div>
                  </div>
                </div>
                <span style={{ fontSize: 14, fontFamily: MONO }}>{x.classes}</span>
                <span style={{ fontSize: 14, fontFamily: MONO }}>{x.students}</span>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: MONO, color: retCol(x.retention) }}>{x.retention}%</span>
                  <div style={{ marginTop: 4 }}><Bar value={x.retention} color={retCol(x.retention)} h={4} /></div>
                </div>
                <span style={{ fontSize: 14, fontFamily: MONO }}>{x.sessions}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: trendColor(x.trend) }}>{trendIcon(x.trend)}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── By Grade ── */}
        {tab === "byGrade" && (
          <div className="fade-up" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {GRADES_DATA.map((g, i) => (
              <div key={i} className="sd-grade" style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 18, fontWeight: 700 }}>{g.grade[l]}</span>
                  <span style={{ fontSize: 22, fontWeight: 700, fontFamily: MONO, color: retCol(g.retention) }}>{g.retention}%</span>
                </div>
                <Bar value={g.retention} color={retCol(g.retention)} h={6} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 12, color: C.textMuted }}>
                  <span>{g.students} {t.students.toLowerCase()}</span>
                  <span>{g.subjects} {t.subjects.toLowerCase()}</span>
                  <span>{g.sessions} {t.sessions.toLowerCase()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Alerts ── */}
        {tab === "alerts" && (
          <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* At-risk */}
            <div className="sd-card" style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, borderLeft: `3px solid ${C.red}` }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <CIcon name="alert" size={16} inline /> {t.atRisk}
              </h3>
              <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>{t.atRiskDesc}</p>
              {ALERTS.atRisk.map((s, i) => (
                <div key={i} className="sd-alert-item" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, background: C.redSoft, marginBottom: 6 }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</span>
                    <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 8 }}>{s.grade} · {s.weakTopics} topics</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: MONO, color: C.red }}>{s.retention}%</span>
                </div>
              ))}
            </div>

            {/* Low topics */}
            <div className="sd-card" style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, borderLeft: `3px solid ${C.orange}` }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <CIcon name="warning" size={16} inline /> {t.lowTopics}
              </h3>
              <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>{t.lowTopicsDesc}</p>
              {ALERTS.lowTopics.map((x, i) => (
                <div key={i} className="sd-alert-item" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, background: C.orangeSoft, marginBottom: 6 }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{x.topic[l]}</span>
                    <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 8 }}>{x.grade}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: MONO, color: C.orange }}>{x.retention}%</span>
                </div>
              ))}
            </div>

            {/* Inactive */}
            {ALERTS.inactive.length > 0 && (
              <div className="sd-card" style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, borderLeft: `3px solid ${C.textMuted}` }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  <CIcon name="sleep" size={16} inline /> {t.inactive}
                </h3>
                <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>{t.inactiveDesc}</p>
                {ALERTS.inactive.map((x, i) => (
                  <div key={i} className="sd-alert-item" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, background: C.bgSoft }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{x.name}</span>
                    <span style={{ fontSize: 12, color: C.textMuted }}>{x.days} {t.daysAgo} · {x.classes} {t.classes.toLowerCase()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
