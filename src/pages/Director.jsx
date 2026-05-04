import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { getClassRetentionOverview, getStudentProgress } from "../lib/spaced-repetition";
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

const i18n = {
  en: {
    pageTitle: "School Dashboard", subtitle: "Overview of your classes and student performance",
    overview: "Overview", byClass: "By Class", students: "Students", alerts: "Alerts",
    avgRetention: "Avg retention", totalStudents: "Total students", totalSessions: "Total sessions", classesActive: "Classes active",
    className: "Class", grade: "Grade", subject: "Subject", retention: "Retention", sessions: "Sessions", studentCount: "Students",
    topPerformers: "Top performers", atRisk: "At-risk students", atRiskDesc: "Retention below 40% in 2+ topics",
    lowTopics: "Low retention topics", lowTopicsDesc: "Topics below 50% that need review",
    noClasses: "No classes yet. Create a class in Sessions to start tracking.",
    noStudents: "No student data yet. Run a session first.",
    noAlerts: "No alerts — everything looks good!",
    strong: "Strong", needsReview: "Needs review", weak: "Weak",
    lastSession: "Last session", noSessions: "No sessions",
    loading: "Loading...",
  },
  es: {
    pageTitle: "Panel Escolar", subtitle: "Vista general de tus clases y rendimiento estudiantil",
    overview: "Resumen", byClass: "Por Clase", students: "Estudiantes", alerts: "Alertas",
    avgRetention: "Retención prom.", totalStudents: "Total estudiantes", totalSessions: "Total sesiones", classesActive: "Clases activas",
    className: "Clase", grade: "Grado", subject: "Materia", retention: "Retención", sessions: "Sesiones", studentCount: "Estudiantes",
    topPerformers: "Mejores estudiantes", atRisk: "Estudiantes en riesgo", atRiskDesc: "Retención menor a 40% en 2+ temas",
    lowTopics: "Temas con baja retención", lowTopicsDesc: "Temas debajo del 50% que necesitan repaso",
    noClasses: "Sin clases aún. Crea una clase en Sesiones para empezar.",
    noStudents: "Sin datos de estudiantes aún. Crea una sesión primero.",
    noAlerts: "Sin alertas — ¡todo se ve bien!",
    strong: "Fuerte", needsReview: "Necesita repaso", weak: "Débil",
    lastSession: "Última sesión", noSessions: "Sin sesiones",
    loading: "Cargando...",
  },
  ko: {
    pageTitle: "학교 대시보드", subtitle: "수업과 학생 성과 현황",
    overview: "개요", byClass: "수업별", students: "학생", alerts: "알림",
    avgRetention: "평균 기억률", totalStudents: "총 학생", totalSessions: "총 세션", classesActive: "활동 수업",
    className: "수업", grade: "학년", subject: "과목", retention: "기억률", sessions: "세션", studentCount: "학생",
    topPerformers: "우수 학생", atRisk: "위험 학생", atRiskDesc: "2개 이상 주제에서 40% 미만",
    lowTopics: "낮은 기억률 주제", lowTopicsDesc: "50% 미만으로 복습 필요",
    noClasses: "아직 수업이 없습니다. 세션에서 수업을 만드세요.",
    noStudents: "아직 학생 데이터가 없습니다. 세션을 먼저 실행하세요.",
    noAlerts: "알림 없음 — 모두 순조롭습니다!",
    strong: "강함", needsReview: "복습 필요", weak: "약함",
    lastSession: "마지막 세션", noSessions: "세션 없음",
    loading: "로딩...",
  },
};

const css = `
  .sd-tab { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .sd-tab:hover { background: #E8F0FE !important; border-color: #2383E244 !important; color: #2383E2 !important; }
  .sd-stat { transition: all .2s ease; }
  .sd-stat:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.06); }
  .sd-card { transition: all .2s ease; }
  .sd-card:hover { border-color: #2383E233 !important; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
  .sd-row { transition: all .15s ease; }
  .sd-row:hover { background: #E8F0FE !important; }
  .sd-alert { transition: all .15s ease; }
  .sd-alert:hover { filter: brightness(.97); transform: translateX(2px); }
  .sd-lang { transition: all .12s ease; cursor: pointer; }
  .sd-lang:hover { background: #E8F0FE !important; color: #2383E2 !important; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  .fade-up { animation: fadeUp .3s ease-out both; }
`;

const Bar = ({ value, max = 100, color = C.accent, h = 6 }) => (
  <div style={{ width: "100%", height: h, background: C.bgSoft, borderRadius: h }}>
    <div style={{ width: `${Math.min((value / max) * 100, 100)}%`, height: "100%", borderRadius: h, background: color, transition: "width .5s ease" }} />
  </div>
);

function PageHeader({ title, icon, lang, setLang, maxWidth = 860 }) {
  const langSel = { fontFamily: "'Outfit',sans-serif", background: C.bg, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, outline: "none", cursor: "pointer", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%239B9B9B' stroke-width='1.5'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", padding: "6px 26px 6px 10px", fontSize: 12, width: "auto", flexShrink: 0 };
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth, margin: "0 auto 24px", paddingBottom: 18, borderBottom: `1px solid ${C.border}` }}>
      <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 700, color: C.text, display: "flex", alignItems: "center", gap: 10 }}>
        <CIcon name={icon} size={22} /> {title}
      </h1>
      <select value={lang} onChange={(e) => setLang(e.target.value)} style={langSel}>
        <option value="en">EN</option><option value="es">ES</option><option value="ko">한</option>
      </select>
    </div>
  );
}

export default function Director({ lang: pageLang = "en", setLang: pageSetLang }) {
  const [lang, setLangLocal] = useState(pageLang);
  const setLang = pageSetLang || setLangLocal;
  const l = pageLang || lang;
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [retentionData, setRetentionData] = useState({});
  const [studentData, setStudentData] = useState({});
  const [sessionCounts, setSessionCounts] = useState({});
  const [memberCounts, setMemberCounts] = useState({});
  const t = i18n[l] || i18n.en;

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Get all classes for this teacher
    const { data: cls } = await supabase.from("classes").select("*").eq("teacher_id", user.id).order("created_at", { ascending: false });
    setClasses(cls || []);

    if (cls) {
      for (const c of cls) {
        // Retention
        const ret = await getClassRetentionOverview(c.id);
        setRetentionData(prev => ({ ...prev, [c.id]: ret }));

        // Students
        const stu = await getStudentProgress(c.id);
        setStudentData(prev => ({ ...prev, [c.id]: stu }));

        // Session count
        const { count } = await supabase.from("sessions").select("*", { count: "exact", head: true }).eq("class_id", c.id);
        setSessionCounts(prev => ({ ...prev, [c.id]: count || 0 }));

        // Member count
        const { count: mc } = await supabase.from("class_members").select("*", { count: "exact", head: true }).eq("class_id", c.id);
        // Also count unique participants
        const { data: parts } = await supabase.from("session_participants").select("student_name").eq("session_id", c.id);
        const { data: sessIds } = await supabase.from("sessions").select("id").eq("class_id", c.id);
        let uniqueStudents = mc || 0;
        if (sessIds && sessIds.length > 0) {
          const { data: allParts } = await supabase.from("session_participants").select("student_name").in("session_id", sessIds.map(s => s.id));
          if (allParts) {
            const unique = new Set(allParts.map(p => p.student_name));
            uniqueStudents = Math.max(uniqueStudents, unique.size);
          }
        }
        setMemberCounts(prev => ({ ...prev, [c.id]: uniqueStudents }));
      }
    }
    setLoading(false);
  };

  if (loading) return (
    <div style={{ padding: "28px 20px" }}>
      <style>{css}</style>
      <PageHeader title={t.pageTitle} icon="school" lang={l} setLang={setLang} />
      <p style={{ textAlign: "center", color: C.textMuted, padding: 40 }}>{t.loading}</p>
    </div>
  );

  // Aggregate stats
  const totalStudents = Object.values(memberCounts).reduce((s, v) => s + v, 0);
  const totalSessions = Object.values(sessionCounts).reduce((s, v) => s + v, 0);
  const allRetentions = Object.values(retentionData).filter(r => r && r.topics.length > 0);
  const avgRetention = allRetentions.length > 0 ? Math.round(allRetentions.reduce((s, r) => s + r.average, 0) / allRetentions.length) : 0;

  // All students across classes
  const allStudents = [];
  Object.entries(studentData).forEach(([classId, students]) => {
    const cls = classes.find(c => c.id === classId);
    (students || []).forEach(s => allStudents.push({ ...s, className: cls?.name || "" }));
  });

  // Alerts
  const atRiskStudents = allStudents.filter(s => s.weakTopics >= 2);
  const lowTopics = [];
  Object.entries(retentionData).forEach(([classId, ret]) => {
    const cls = classes.find(c => c.id === classId);
    if (ret && ret.topics) {
      ret.topics.filter(tp => tp.current_retention < 50).forEach(tp => {
        lowTopics.push({ ...tp, className: cls?.name || "" });
      });
    }
  });
  const alertCount = atRiskStudents.length + lowTopics.length;

  return (
    <div style={{ padding: "28px 20px" }}>
      <style>{css}</style>
      <PageHeader title={t.pageTitle} icon="school" lang={l} setLang={setLang} />

      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <p style={{ fontSize: 14, color: C.textSecondary, marginBottom: 20 }}>{t.subtitle}</p>

        {classes.length === 0 ? (
          <div className="fade-up" style={{ textAlign: "center", padding: 48 }}>
            <CIcon name="school" size={36} />
            <p style={{ fontSize: 15, color: C.textMuted, fontWeight: 500, marginTop: 12 }}>{t.noClasses}</p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
              {[["overview", t.overview], ["byClass", t.byClass], ["students", t.students], ["alerts", t.alerts]].map(([id, label]) => (
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

            {/* Overview */}
            {tab === "overview" && (
              <div className="fade-up">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
                  {[
                    [t.avgRetention, avgRetention > 0 ? `${avgRetention}%` : "—", retCol(avgRetention), "chart"],
                    [t.classesActive, classes.length, C.accent, "book"],
                    [t.totalStudents, totalStudents, C.purple, "student"],
                    [t.totalSessions, totalSessions, C.green, "pin"],
                  ].map(([label, value, color, icon], i) => (
                    <div key={i} className="sd-stat" style={{ padding: "16px 18px", borderRadius: 10, background: C.bg, border: `1px solid ${C.border}`, textAlign: "center" }}>
                      <div style={{ marginBottom: 6 }}><CIcon name={icon} size={22} /></div>
                      <div style={{ fontSize: 26, fontWeight: 700, color, fontFamily: MONO, lineHeight: 1 }}>{value}</div>
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Retention by class chart */}
                {classes.length > 0 && (
                  <div className="sd-card" style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, marginBottom: 16 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>{t.avgRetention} — {t.byClass.toLowerCase()}</h3>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 140 }}>
                      {classes.map((cls, i) => {
                        const ret = retentionData[cls.id];
                        const avg = ret ? ret.average : 0;
                        return (
                          <div key={i} style={{ flex: 1, textAlign: "center" }}>
                            <div style={{ fontSize: 12, fontWeight: 700, fontFamily: MONO, color: retCol(avg), marginBottom: 4 }}>{avg > 0 ? `${avg}%` : "—"}</div>
                            <div style={{ height: 120, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                              <div style={{ width: "70%", height: Math.max((avg / 100) * 120, 4), borderRadius: "6px 6px 0 0", background: avg > 0 ? retCol(avg) : C.bgSoft, opacity: .8, transition: "height .5s ease" }} />
                            </div>
                            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cls.name}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Top students */}
                {allStudents.length > 0 && (
                  <div className="sd-card" style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      <CIcon name="trophy" size={16} inline /> {t.topPerformers}
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {[...allStudents].sort((a, b) => b.avgRetention - a.avgRetention).slice(0, 5).map((s, i) => (
                        <div key={i} className="sd-row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: C.bgSoft }}>
                          <span style={{ fontSize: 14, width: 20, textAlign: "center", fontWeight: 700, fontFamily: MONO, color: i === 0 ? C.yellow : C.textMuted }}>{i + 1}</span>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</span>
                            <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 8 }}>{s.className}</span>
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: MONO, color: retCol(s.avgRetention) }}>{s.avgRetention}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* By Class */}
            {tab === "byClass" && (
              <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {classes.map((cls, i) => {
                  const ret = retentionData[cls.id];
                  const sc = sessionCounts[cls.id] || 0;
                  const mc = memberCounts[cls.id] || 0;
                  const avg = ret ? ret.average : 0;
                  return (
                    <div key={i} className="sd-card" style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 600 }}>{cls.name}</div>
                          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{cls.grade} · {cls.subject} · {cls.class_code}</div>
                        </div>
                        <span style={{ fontSize: 24, fontWeight: 700, fontFamily: MONO, color: avg > 0 ? retCol(avg) : C.textMuted }}>{avg > 0 ? `${avg}%` : "—"}</span>
                      </div>
                      <Bar value={avg} color={avg > 0 ? retCol(avg) : C.bgSoft} h={6} />
                      <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 13, color: C.textMuted }}>
                        <span><strong style={{ color: C.text }}>{mc}</strong> {t.studentCount.toLowerCase()}</span>
                        <span><strong style={{ color: C.text }}>{sc}</strong> {t.sessions.toLowerCase()}</span>
                        {ret && ret.topics.length > 0 && <span><strong style={{ color: C.green }}>{ret.strong}</strong> {t.strong.toLowerCase()} · <strong style={{ color: C.orange }}>{ret.medium}</strong> {t.needsReview.toLowerCase()} · <strong style={{ color: C.red }}>{ret.weak}</strong> {t.weak.toLowerCase()}</span>}
                      </div>
                      {ret && ret.topics.length > 0 && (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 10 }}>
                          {ret.topics.map((tp, j) => (
                            <span key={j} style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500, background: tp.status === "strong" ? C.greenSoft : tp.status === "medium" ? C.orangeSoft : C.redSoft, color: tp.status === "strong" ? C.green : tp.status === "medium" ? C.orange : C.red }}>{tp.topic} {tp.current_retention}%</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Students */}
            {tab === "students" && (
              <div className="fade-up">
                {allStudents.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 48 }}>
                    <CIcon name="student" size={36} />
                    <p style={{ fontSize: 15, color: C.textMuted, fontWeight: 500, marginTop: 12 }}>{t.noStudents}</p>
                  </div>
                ) : (
                  <div className="sd-card" style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 0, padding: "12px 16px", borderBottom: `1px solid ${C.border}`, fontSize: 12, fontWeight: 600, color: C.textMuted }}>
                      <span>{t.students}</span><span>{t.className}</span><span>{t.retention}</span><span>{t.sessions}</span>
                    </div>
                    {[...allStudents].sort((a, b) => b.avgRetention - a.avgRetention).map((s, i) => (
                      <div key={i} className="sd-row" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 0, padding: "12px 16px", borderBottom: `1px solid ${C.border}`, alignItems: "center", background: i % 2 === 0 ? C.bgSoft : C.bg }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: C.textMuted }}>{s.strongTopics} {t.strong.toLowerCase()} · {s.weakTopics} {t.weak.toLowerCase()}</div>
                        </div>
                        <span style={{ fontSize: 13, color: C.textSecondary }}>{s.className}</span>
                        <div>
                          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: MONO, color: retCol(s.avgRetention) }}>{s.avgRetention}%</span>
                          <div style={{ marginTop: 4 }}><Bar value={s.avgRetention} color={retCol(s.avgRetention)} h={4} /></div>
                        </div>
                        <span style={{ fontSize: 13, fontFamily: MONO }}>{s.topics.length}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Alerts */}
            {tab === "alerts" && (
              <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {alertCount === 0 ? (
                  <div style={{ textAlign: "center", padding: 48 }}>
                    <CIcon name="check" size={36} />
                    <p style={{ fontSize: 15, color: C.green, fontWeight: 500, marginTop: 12 }}>{t.noAlerts}</p>
                  </div>
                ) : (
                  <>
                    {atRiskStudents.length > 0 && (
                      <div className="sd-card" style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, borderLeft: `3px solid ${C.red}` }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                          <CIcon name="alert" size={16} inline /> {t.atRisk}
                        </h3>
                        <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>{t.atRiskDesc}</p>
                        {atRiskStudents.map((s, i) => (
                          <div key={i} className="sd-alert" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, background: C.redSoft, marginBottom: 6 }}>
                            <div>
                              <span style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</span>
                              <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 8 }}>{s.className} · {s.weakTopics} {t.weak.toLowerCase()} topics</span>
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 700, fontFamily: MONO, color: C.red }}>{s.avgRetention}%</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {lowTopics.length > 0 && (
                      <div className="sd-card" style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, borderLeft: `3px solid ${C.orange}` }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                          <CIcon name="warning" size={16} inline /> {t.lowTopics}
                        </h3>
                        <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>{t.lowTopicsDesc}</p>
                        {lowTopics.map((tp, i) => (
                          <div key={i} className="sd-alert" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, background: C.orangeSoft, marginBottom: 6 }}>
                            <div>
                              <span style={{ fontSize: 14, fontWeight: 500 }}>{tp.topic}</span>
                              <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 8 }}>{tp.className}</span>
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 700, fontFamily: MONO, color: C.orange }}>{tp.current_retention}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
