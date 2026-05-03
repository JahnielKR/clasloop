import { CIcon } from "../components/Icons";
import { useState } from "react";

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
    title: "School Dashboard",
    subtitle: "Bird's eye view of retention across your school",
    overview: "Overview", byTeacher: "By Teacher", byGrade: "By Grade", alerts: "Alerts",
    schoolRetention: "School-wide retention", activeTeachers: "Active teachers",
    activeStudents: "Active students", sessionsThisWeek: "Sessions this week",
    totalTopics: "Topics tracked", avgSessionsPerTeacher: "Avg sessions/teacher",
    teacherName: "Teacher", classes: "Classes", students: "Students", retention: "Retention", sessions: "Sessions", trend: "Trend",
    gradeLevel: "Grade", subjectsTracked: "Subjects", avgRetention: "Avg. Retention",
    atRiskStudents: "At-risk students", atRiskDesc: "Students with retention below 40% in 2+ topics",
    inactiveTeachers: "Inactive teachers", inactiveDesc: "No sessions in the last 7 days",
    lowRetentionTopics: "Low retention topics", lowRetentionDesc: "Topics below 50% across the school",
    topPerformers: "Top performers", topDesc: "Highest retention teachers this month",
    viewProfile: "View",
    noAlerts: "No alerts — everything looks good!",
    lastActive: "Last active",
    daysAgo: "days ago",
    today: "today",
  },
  es: {
    title: "Panel de Escuela",
    subtitle: "Vista panorámica de retención en tu escuela",
    overview: "Resumen", byTeacher: "Por Profesor", byGrade: "Por Grado", alerts: "Alertas",
    schoolRetention: "Retención escolar", activeTeachers: "Profesores activos",
    activeStudents: "Estudiantes activos", sessionsThisWeek: "Sesiones esta semana",
    totalTopics: "Temas rastreados", avgSessionsPerTeacher: "Promedio sesiones/profe",
    teacherName: "Profesor", classes: "Clases", students: "Estudiantes", retention: "Retención", sessions: "Sesiones", trend: "Tendencia",
    gradeLevel: "Grado", subjectsTracked: "Materias", avgRetention: "Retención Prom.",
    atRiskStudents: "Estudiantes en riesgo", atRiskDesc: "Estudiantes con retención menor a 40% en 2+ temas",
    inactiveTeachers: "Profesores inactivos", inactiveDesc: "Sin sesiones en los últimos 7 días",
    lowRetentionTopics: "Temas con baja retención", lowRetentionDesc: "Temas debajo del 50% en la escuela",
    topPerformers: "Mejores profesores", topDesc: "Mayor retención este mes",
    viewProfile: "Ver",
    noAlerts: "Sin alertas — ¡todo se ve bien!",
    lastActive: "Última actividad",
    daysAgo: "días atrás",
    today: "hoy",
  },
  ko: {
    title: "학교 대시보드",
    subtitle: "학교 전체의 기억률 현황",
    overview: "개요", byTeacher: "교사별", byGrade: "학년별", alerts: "알림",
    schoolRetention: "학교 전체 기억률", activeTeachers: "활동 교사",
    activeStudents: "활동 학생", sessionsThisWeek: "이번 주 세션",
    totalTopics: "추적 주제", avgSessionsPerTeacher: "교사당 평균 세션",
    teacherName: "교사", classes: "수업", students: "학생", retention: "기억률", sessions: "세션", trend: "추세",
    gradeLevel: "학년", subjectsTracked: "과목", avgRetention: "평균 기억률",
    atRiskStudents: "위험 학생", atRiskDesc: "2개 이상 주제에서 기억률 40% 미만인 학생",
    inactiveTeachers: "비활동 교사", inactiveDesc: "최근 7일간 세션 없음",
    lowRetentionTopics: "낮은 기억률 주제", lowRetentionDesc: "학교 전체에서 50% 미만인 주제",
    topPerformers: "우수 교사", topDesc: "이번 달 최고 기억률 교사",
    viewProfile: "보기",
    noAlerts: "알림 없음 — 모두 순조롭습니다!",
    lastActive: "마지막 활동",
    daysAgo: "일 전",
    today: "오늘",
  },
};

const TEACHERS = [
  { name: "María González", avatar: "MG", classes: 3, students: 83, retention: 78, sessions: 12, trend: "up", lastActive: 0 },
  { name: "James Park", avatar: "JP", classes: 2, students: 56, retention: 82, sessions: 15, trend: "up", lastActive: 0 },
  { name: "Yuna Kim", avatar: "YK", classes: 2, students: 48, retention: 71, sessions: 8, trend: "stable", lastActive: 1 },
  { name: "Carlos Ruiz", avatar: "CR", classes: 3, students: 91, retention: 65, sessions: 6, trend: "down", lastActive: 2 },
  { name: "Emma Watson", avatar: "EW", classes: 1, students: 30, retention: 59, sessions: 3, trend: "down", lastActive: 5 },
  { name: "David Chen", avatar: "DC", classes: 2, students: 52, retention: 74, sessions: 9, trend: "up", lastActive: 0 },
  { name: "Sofía Martínez", avatar: "SM", classes: 1, students: 27, retention: 45, sessions: 1, trend: "down", lastActive: 9 },
];

const GRADES = [
  { grade: { en: "6th", es: "6°", ko: "중1" }, subjects: 4, students: 62, retention: 68, sessions: 14 },
  { grade: { en: "7th", es: "7°", ko: "중2" }, subjects: 5, students: 78, retention: 72, sessions: 18 },
  { grade: { en: "8th", es: "8°", ko: "중3" }, subjects: 6, students: 95, retention: 75, sessions: 24 },
  { grade: { en: "9th", es: "9°", ko: "고1" }, subjects: 5, students: 82, retention: 64, sessions: 12 },
  { grade: { en: "10th", es: "10°", ko: "고2" }, subjects: 4, students: 56, retention: 58, sessions: 8 },
  { grade: { en: "11th", es: "11°", ko: "고3" }, subjects: 3, students: 44, retention: 71, sessions: 10 },
];

const ALERTS_DATA = {
  atRisk: [
    { name: "Lucas G.", grade: "8th", weakTopics: 4, retention: 32 },
    { name: "Ana P.", grade: "9th", weakTopics: 3, retention: 38 },
    { name: "Kevin M.", grade: "10th", weakTopics: 2, retention: 35 },
  ],
  inactive: [
    { name: "Sofía Martínez", days: 9, classes: 1 },
  ],
  lowTopics: [
    { topic: { en: "Trigonometry", es: "Trigonometría", ko: "삼각함수" }, grade: "10th", retention: 34 },
    { topic: { en: "Cell Division", es: "División Celular", ko: "세포 분열" }, grade: "8th", retention: 41 },
    { topic: { en: "Grammar: Subjunctive", es: "Gramática: Subjuntivo", ko: "문법: 가정법" }, grade: "9th", retention: 44 },
  ],
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'DM Sans',sans-serif;background:${C.bgSoft};color:${C.text};-webkit-font-smoothing:antialiased}
  ::selection{background:${C.accentSoft};color:${C.accent}}
  button{font-family:'DM Sans',sans-serif;cursor:pointer;border:none;outline:none;transition:all .15s}
  button:active{transform:scale(.97)}
  @keyframes fi{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  .fi{animation:fi .3s ease-out both}.f1{animation:fi .3s ease-out .05s both}.f2{animation:fi .3s ease-out .1s both}
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

const Bar = ({ value, max = 100, color = C.accent, h = 6 }) => (
  <div style={{ width: "100%", height: h, background: C.bgSoft, borderRadius: h }}>
    <div style={{ width: `${Math.min((value/max)*100,100)}%`, height: "100%", borderRadius: h, background: color, transition: "width .5s ease" }} />
  </div>
);

const Stat = ({ label, value, color = C.accent, sub }) => (
  <div style={{ padding: "16px 18px", borderRadius: 10, background: C.bg, border: `1px solid ${C.border}`, flex: 1, minWidth: 130 }}>
    <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4, fontWeight: 500 }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: MONO, lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{sub}</div>}
  </div>
);

const trendIcon = (t) => t === "up" ? "↑" : t === "down" ? "↓" : "→";
const trendColor = (t) => t === "up" ? C.green : t === "down" ? C.red : C.textMuted;

export default function App() {
  const [lang, setLang] = useState("en");
  const [tab, setTab] = useState("overview");
  const d = i18n[lang];

  const schoolAvg = Math.round(TEACHERS.reduce((s, t) => s + t.retention, 0) / TEACHERS.length);
  const totalStudents = TEACHERS.reduce((s, t) => s + t.students, 0);
  const totalSessions = TEACHERS.reduce((s, t) => s + t.sessions, 0);

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: "100vh", background: C.bgSoft }}>
        <div style={{ padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: C.bg, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10 }}>
          <Logo /><LangSw lang={lang} setLang={setLang} />
        </div>

        <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 20px" }}>
          <div className="fi" style={{ marginBottom: 20 }}>
            <h1 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 28, fontWeight: 400, letterSpacing: "-.01em" }}><CIcon name="school" size={22} inline /> {d.title}</h1>
            <p style={{ fontSize: 14, color: C.textSecondary, marginTop: 4 }}>{d.subtitle}</p>
          </div>

          {/* Tabs */}
          <div className="f1" style={{ display: "flex", gap: 4, marginBottom: 20 }}>
            {[["overview", d.overview], ["byTeacher", d.byTeacher], ["byGrade", d.byGrade], ["alerts", d.alerts]].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: tab === id ? C.accentSoft : C.bg,
                color: tab === id ? C.accent : C.textSecondary,
                border: `1px solid ${tab === id ? C.accent+"33" : C.border}`,
              }}>{label}{id === "alerts" && ALERTS_DATA.atRisk.length > 0 && <span style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 10, background: C.red, color: "#fff", fontSize: 10, fontWeight: 700 }}>{ALERTS_DATA.atRisk.length + ALERTS_DATA.inactive.length + ALERTS_DATA.lowTopics.length}</span>}</button>
            ))}
          </div>

          {/* Overview */}
          {tab === "overview" && (
            <>
              <div className="f1" style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                <Stat label={d.schoolRetention} value={`${schoolAvg}%`} color={retCol(schoolAvg)} />
                <Stat label={d.activeTeachers} value={TEACHERS.length} color={C.accent} />
                <Stat label={d.activeStudents} value={totalStudents} color={C.purple} />
                <Stat label={d.sessionsThisWeek} value={totalSessions} color={C.green} />
              </div>

              {/* Mini chart - retention by grade */}
              <div className="f2" style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>{d.avgRetention} {d.byGrade.toLowerCase()}</h3>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 140 }}>
                  {GRADES.map((g, i) => {
                    const h = (g.retention / 100) * 120;
                    return (
                      <div key={i} style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, fontFamily: MONO, color: retCol(g.retention), marginBottom: 4 }}>{g.retention}%</div>
                        <div style={{ height: 120, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                          <div style={{ width: "70%", height: h, borderRadius: "6px 6px 0 0", background: retCol(g.retention), transition: "height .5s ease", opacity: .8 }} />
                        </div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>{g.grade[lang]}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top performers */}
              <div className="f2" style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>><CIcon name="trophy" size={16} inline /> {d.topPerformers}</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[...TEACHERS].sort((a, b) => b.retention - a.retention).slice(0, 3).map((t, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: C.bgSoft }}>
                      <span style={{ fontSize: 16, width: 24, textAlign: "center", fontWeight: 700, color: i === 0 ? C.yellow : C.textMuted }}>{i + 1}</span>
                      <span style={{ fontSize: 18 }}>{t.avatar}</span>
                      <div style={{ flex: 1 }}><span style={{ fontSize: 14, fontWeight: 500 }}>{t.name}</span></div>
                      <span style={{ fontSize: 14, fontWeight: 700, fontFamily: MONO, color: retCol(t.retention) }}>{t.retention}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* By Teacher */}
          {tab === "byTeacher" && (
            <div className="f2" style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 80px", gap: 0, padding: "12px 16px", borderBottom: `1px solid ${C.border}`, fontSize: 12, fontWeight: 600, color: C.textMuted }}>
                <span>{d.teacherName}</span><span>{d.classes}</span><span>{d.students}</span><span>{d.retention}</span><span>{d.sessions}</span><span>{d.trend}</span>
              </div>
              {[...TEACHERS].sort((a, b) => b.retention - a.retention).map((t, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 80px", gap: 0, padding: "12px 16px", borderBottom: `1px solid ${C.border}`, alignItems: "center", background: i % 2 === 0 ? C.bgSoft : C.bg }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{t.avatar}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>{d.lastActive}: {t.lastActive === 0 ? d.today : `${t.lastActive} ${d.daysAgo}`}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 14, fontFamily: MONO }}>{t.classes}</span>
                  <span style={{ fontSize: 14, fontFamily: MONO }}>{t.students}</span>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 700, fontFamily: MONO, color: retCol(t.retention) }}>{t.retention}%</span>
                    <div style={{ marginTop: 4 }}><Bar value={t.retention} color={retCol(t.retention)} h={4} /></div>
                  </div>
                  <span style={{ fontSize: 14, fontFamily: MONO }}>{t.sessions}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: trendColor(t.trend) }}>{trendIcon(t.trend)}</span>
                </div>
              ))}
            </div>
          )}

          {/* By Grade */}
          {tab === "byGrade" && (
            <div className="f2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
              {GRADES.map((g, i) => (
                <div key={i} style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontSize: 18, fontWeight: 700 }}>{g.grade[lang]}</span>
                    <span style={{ fontSize: 22, fontWeight: 700, fontFamily: MONO, color: retCol(g.retention) }}>{g.retention}%</span>
                  </div>
                  <Bar value={g.retention} color={retCol(g.retention)} h={6} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 12, color: C.textMuted }}>
                    <span>{g.students} {d.students.toLowerCase()}</span>
                    <span>{g.subjects} {d.subjectsTracked.toLowerCase()}</span>
                    <span>{g.sessions} {d.sessions.toLowerCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Alerts */}
          {tab === "alerts" && (
            <div className="f2" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* At-risk students */}
              <div style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, borderLeft: `3px solid ${C.red}` }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>><CIcon name="alert" size={16} inline /> {d.atRiskStudents}</h3>
                <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>{d.atRiskDesc}</p>
                {ALERTS_DATA.atRisk.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, background: C.redSoft, marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</span>
                      <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 8 }}>{s.grade} · {s.weakTopics} {d.lowRetentionTopics.toLowerCase().split(" ")[0]}</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, fontFamily: MONO, color: C.red }}>{s.retention}%</span>
                  </div>
                ))}
              </div>

              {/* Low retention topics */}
              <div style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, borderLeft: `3px solid ${C.orange}` }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>><CIcon name="warning" size={16} inline /> {d.lowRetentionTopics}</h3>
                <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>{d.lowRetentionDesc}</p>
                {ALERTS_DATA.lowTopics.map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, background: C.orangeSoft, marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{t.topic[lang]}</span>
                      <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 8 }}>{t.grade}</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, fontFamily: MONO, color: C.orange }}>{t.retention}%</span>
                  </div>
                ))}
              </div>

              {/* Inactive teachers */}
              {ALERTS_DATA.inactive.length > 0 && (
                <div style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, borderLeft: `3px solid ${C.textMuted}` }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>><CIcon name="sleep" size={16} inline /> {d.inactiveTeachers}</h3>
                  <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>{d.inactiveDesc}</p>
                  {ALERTS_DATA.inactive.map((t, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, background: C.bgSoft }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{t.name}</span>
                      <span style={{ fontSize: 12, color: C.textMuted }}>{t.days} {d.daysAgo} · {t.classes} {d.classes.toLowerCase()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
