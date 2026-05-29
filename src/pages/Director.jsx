import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDirector } from "../hooks/useDirector";
import { CIcon } from "../components/Icons";
import { useIsMobile } from "../components/MobileMenuButton";
import PageHeader from "../components/PageHeader";
import Skeleton from "../components/ui/Skeleton";
import { StudioShell, PulseStrip, ExportMenu } from "../components/analytics";
import { buildOverviewReportModel } from "../lib/analytics/report-model";
import { C as BASE_C, MONO } from "../components/tokens";
import { useDensity } from "../components/ui/density";
import { selectableChip } from "../components/ui/selectable";
import { ROUTES, buildRoute } from "../routes";
// PR 74: i18n centralizado
import { useT } from "../i18n";

// Director adds a single yellow accent (used for warning-tier indicators
// in the dashboard). No paired yellowSoft because Director uses bgSoft for
// soft backgrounds when needed.
const C = BASE_C;

const retCol = (v) => v >= 70 ? C.green : v >= 40 ? C.orange : C.red;

// PR 74: el bloque i18n local fue movido a src/i18n/{en,es,ko}.js
// bajo el namespace "director".

// GPU-safe transitions (explicit props, never `all`) so hovers never animate
// layout — mirrors the global button set (index.css). Reduced-motion disables
// the motion at the end of the blob.
const css = `
  .sd-tab { cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .sd-tab:hover { background: ${C.accentSoft} !important; border-color: ${C.accent} !important; color: ${C.accent} !important; }
  .sd-stat { transition: transform .2s ease, box-shadow .2s ease; }
  .sd-stat:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.06); }
  .sd-card { transition: border-color .2s ease, box-shadow .2s ease; }
  .sd-card:hover { border-color: ${C.accent} !important; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
  .sd-row { transition: background-color .15s ease, color .15s ease; }
  .sd-row:hover { background: ${C.accentSoft} !important; }
  .sd-alert { transition: filter .15s ease, transform .15s ease; }
  .sd-alert:hover { filter: brightness(.97); transform: translateX(2px); }
  .sd-lang { cursor: pointer; transition: background-color .12s ease, color .12s ease; }
  .sd-lang:hover { background: ${C.accentSoft} !important; color: ${C.accent} !important; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  .fade-up { animation: fadeUp .3s ease-out both; }
  .sd-scroll-x { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; -ms-overflow-style: none; }
  .sd-scroll-x::-webkit-scrollbar { display: none; }
  @media (prefers-reduced-motion: reduce) {
    .sd-stat, .sd-card, .sd-row, .sd-alert, .sd-lang, .cl-selectable { transition: none; }
    .sd-stat:hover, .sd-alert:hover { transform: none; }
    .fade-up { animation: none; }
  }
`;

const Bar = ({ value, max = 100, color = C.accent, h = 6 }) => (
  <div style={{ width: "100%", height: h, background: C.bgSoft, borderRadius: h }}>
    <div style={{ width: `${Math.min((value / max) * 100, 100)}%`, height: "100%", borderRadius: h, background: color, transition: "width .5s ease" }} />
  </div>
);

export default function Director({ lang: pageLang = "en", setLang: pageSetLang, onOpenMobileMenu }) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  // Director sits in a COMPACT DensityProvider (App.jsx) — consume it so the
  // dashboard's spacing actually tightens into the scannable, Sheets/TradingView
  // rhythm instead of staying at fixed comfortable paddings.
  const { space } = useDensity();
  const [lang, setLangLocal] = useState(pageLang);
  const setLang = pageSetLang || setLangLocal;
  const l = pageLang || lang;
  const [tab, setTab] = useState("overview");
  // PR 170 (M1): the Director (school analysis) data — classes + per-class
  // retention / student progress / counts — now comes from one cached React
  // Query (src/hooks/useDirector.js). Read-only; no mutations.
  const { data: dd, isPending: loading } = useDirector();
  const classes = dd?.classes ?? [];
  const retentionData = dd?.retentionData ?? {};
  const studentData = dd?.studentData ?? {};
  const sessionCounts = dd?.sessionCounts ?? {};
  const memberCounts = dd?.memberCounts ?? {};
  const t = useT("director", l);

  // PR 170: data loads via useDirector() (src/hooks/useDirector.js); React Query
  // owns loading + caching. Read-only analytics — no mutations.

  // Back-to-MyClasses bar — Director is now reached only as a sub-page from
  // MyClasses (no longer in the sidebar), so users need a way out beyond
  // browser back. Rendered above PageHeader in both loading and main states.
  const backBar = (
    <div style={{ maxWidth: 860, margin: "0 auto 12px" }}>
      <button
        onClick={() => navigate(ROUTES.CLASSES)}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "6px 8px",
          marginLeft: -8,
          borderRadius: 6,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "'Outfit',sans-serif",
          fontSize: 13,
          fontWeight: 500,
          color: C.textSecondary,
          transition: "color .15s ease, background .15s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = C.accent; e.currentTarget.style.background = C.accentSoft; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = C.textSecondary; e.currentTarget.style.background = "transparent"; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {t.backToMyClasses}
      </button>
    </div>
  );

  if (loading) return (
    <StudioShell view="overview" title="Analytics">
      <div style={{ padding: "28px 20px" }}>
        <style>{css}</style>
        {backBar}
        <PageHeader title={t.pageTitle} lang={l} setLang={setLang} maxWidth={860} onOpenMobileMenu={onOpenMobileMenu} />
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={88} radius={12} />)}
          </div>
          <Skeleton height={220} radius={12} style={{ marginBottom: 12 }} />
          <Skeleton height={160} radius={12} />
        </div>
      </div>
    </StudioShell>
  );

  // Aggregate stats
  const totalStudents = Object.values(memberCounts).reduce((s, v) => s + v, 0);
  const totalSessions = Object.values(sessionCounts).reduce((s, v) => s + v, 0);
  const allRetentions = Object.values(retentionData).filter(r => r && r.topics.length > 0);
  const avgRetention = allRetentions.length > 0 ? Math.round(allRetentions.reduce((s, r) => s + r.average, 0) / allRetentions.length) : 0;

  // All students across classes
  // F2 Task 9: preserve classId per row so the Students tab can drill into
  // /school/student/:classId/:studentRef (StudentProfile).
  const allStudents = [];
  Object.entries(studentData).forEach(([classId, students]) => {
    const cls = classes.find(c => c.id === classId);
    (students || []).forEach(s => allStudents.push({ ...s, classId, className: cls?.name || "" }));
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
    <StudioShell
      view="overview"
      title="Analytics"
      toolbarExtras={
        <ExportMenu
          baseName="reporte-general"
          disabled={classes.length === 0}
          buildModel={() =>
            buildOverviewReportModel({
              period: "actual",
              stats: { avgRetention, classes: classes.length, students: totalStudents, sessions: totalSessions },
              perClass: classes.map((c) => ({
                name: c.name,
                retention: retentionData[c.id]?.average ?? 0,
              })),
            })
          }
        />
      }
    >
      <div style={{ padding: "28px 20px" }}>
        <style>{css}</style>
        {backBar}
        <PageHeader title={t.pageTitle} lang={l} setLang={setLang} maxWidth={860} onOpenMobileMenu={onOpenMobileMenu} />

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
            <div className={isMobile ? "sd-scroll-x" : ""} style={{
              display: "flex", gap: 4, marginBottom: 20,
              ...(isMobile ? { flexWrap: "nowrap" } : {}),
            }}>
              {[["overview", t.overview], ["byClass", t.byClass], ["students", t.students], ["alerts", t.alerts]].map(([id, label]) => (
                <button key={id} className="sd-tab cl-selectable" onClick={() => setTab(id)} style={{
                  padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                  ...selectableChip(tab === id),
                  display: "flex", alignItems: "center", gap: 6,
                  whiteSpace: "nowrap", flexShrink: 0,
                }}>
                  {label}
                  {id === "alerts" && alertCount > 0 && <span style={{ padding: "1px 6px", borderRadius: 10, background: C.red, color: "#fff", fontSize: 10, fontWeight: 700 }}>{alertCount}</span>}
                </button>
              ))}
            </div>

            {/* Overview */}
            {tab === "overview" && (
              <div className="fade-up">
                <PulseStrip />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
                  {[
                    [t.avgRetention, avgRetention > 0 ? `${avgRetention}%` : "—", retCol(avgRetention), "chart"],
                    [t.classesActive, classes.length, C.accent, "book"],
                    [t.totalStudents, totalStudents, C.purple, "student"],
                    [t.totalSessions, totalSessions, C.green, "pin"],
                  ].map(([label, value, color, icon], i) => (
                    <div key={i} className="sd-stat" style={{ padding: space.lg, borderRadius: 10, background: C.bg, border: `1px solid ${C.border}`, textAlign: "center" }}>
                      <div style={{ marginBottom: 6 }}><CIcon name={icon} size={22} /></div>
                      <div style={{ fontSize: 26, fontWeight: 700, color, fontFamily: MONO, lineHeight: 1 }}>{value}</div>
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Retention by class chart */}
                {classes.length > 0 && (
                  <div className="sd-card" style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: space.lg, marginBottom: 16 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>{t.avgRetention} — {t.byClass.toLowerCase()}</h3>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", justifyContent: "center", height: 140 }}>
                      {classes.map((cls, i) => {
                        const ret = retentionData[cls.id];
                        const avg = ret ? ret.average : 0;
                        return (
                          <div key={i} style={{ flex: "1 1 0", maxWidth: 110, minWidth: 56, textAlign: "center" }}>
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
                  <div className="sd-card" style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: space.lg }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      <CIcon name="trophy" size={16} inline /> {t.topPerformers}
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {[...allStudents].sort((a, b) => b.avgRetention - a.avgRetention).slice(0, 5).map((s, i) => (
                        <div key={i} className="sd-row" style={{ display: "flex", alignItems: "center", gap: 10, padding: `${space.sm}px ${space.md}px`, borderRadius: 8, background: C.bgSoft }}>
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
                    <div
                      key={i}
                      className="sd-card"
                      onClick={() => navigate(buildRoute.analyticsClass(cls.id))}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(buildRoute.analyticsClass(cls.id)); } }}
                      style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: space.lg, cursor: "pointer" }}
                    >
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
                    {!isMobile && (
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 0, padding: `${space.sm}px ${space.md}px`, borderBottom: `1px solid ${C.border}`, fontSize: 12, fontWeight: 600, color: C.textMuted }}>
                        <span>{t.students}</span><span>{t.className}</span><span>{t.retention}</span><span>{t.sessions}</span>
                      </div>
                    )}
                    {[...allStudents].sort((a, b) => b.avgRetention - a.avgRetention).map((s, i) => {
                      // F2 Task 9: click row → /school/student/:classId/:studentRef
                      const goToProfile = () => navigate(buildRoute.analyticsStudent(s.classId, s.name));
                      const onKey = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goToProfile(); } };
                      return isMobile ? (
                        <div
                          key={i}
                          className="sd-row"
                          onClick={goToProfile}
                          role="button"
                          tabIndex={0}
                          onKeyDown={onKey}
                          style={{ padding: `${space.sm}px ${space.md}px`, borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? C.bgSoft : C.bg, cursor: "pointer" }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{s.className}</div>
                            </div>
                            <span style={{ fontSize: 16, fontWeight: 700, fontFamily: MONO, color: retCol(s.avgRetention), flexShrink: 0 }}>{s.avgRetention}%</span>
                          </div>
                          <div style={{ marginBottom: 8 }}><Bar value={s.avgRetention} color={retCol(s.avgRetention)} h={4} /></div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.textMuted }}>
                            <span>{s.strongTopics} {t.strong.toLowerCase()} · {s.weakTopics} {t.weak.toLowerCase()}</span>
                            <span style={{ fontFamily: MONO }}>{s.topics.length} {t.sessions.toLowerCase()}</span>
                          </div>
                        </div>
                      ) : (
                        <div
                          key={i}
                          className="sd-row"
                          onClick={goToProfile}
                          role="button"
                          tabIndex={0}
                          onKeyDown={onKey}
                          style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 0, padding: `${space.sm}px ${space.md}px`, borderBottom: `1px solid ${C.border}`, alignItems: "center", background: i % 2 === 0 ? C.bgSoft : C.bg, cursor: "pointer" }}
                        >
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
                      );
                    })}
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
                      <div className="sd-card" style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: space.lg, borderLeft: `3px solid ${C.red}` }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                          <CIcon name="alert" size={16} inline /> {t.atRisk}
                        </h3>
                        <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>{t.atRiskDesc}</p>
                        {atRiskStudents.map((s, i) => (
                          <div key={i} className="sd-alert" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: `${space.sm}px ${space.md}px`, borderRadius: 8, background: C.redSoft, marginBottom: 6 }}>
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
                      <div className="sd-card" style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: space.lg, borderLeft: `3px solid ${C.orange}` }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                          <CIcon name="warning" size={16} inline /> {t.lowTopics}
                        </h3>
                        <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>{t.lowTopicsDesc}</p>
                        {lowTopics.map((tp, i) => (
                          <div key={i} className="sd-alert" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: `${space.sm}px ${space.md}px`, borderRadius: 8, background: C.orangeSoft, marginBottom: 6 }}>
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
    </StudioShell>
  );
}
