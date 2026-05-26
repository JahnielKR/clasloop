// ─── ClassReport ─────────────────────────────────────────────────────────────
// A teacher-facing snapshot of one class that Cleo opens on request ("give me a
// summary of <class>"). Real numbers (no AI estimation) from class-report.ts,
// shown with Recharts charts (KPI cards, a retention donut, and horizontal bars
// for the hardest topics + students who need help). Printable to PDF via the
// browser (the print stylesheet hides the app chrome). Charts live in their own
// reusable components under src/components/charts/.
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { C } from "../components/tokens";
import { CIcon } from "../components/Icons";
import { useT } from "../i18n";
import { buildRoute, ROUTES } from "../routes";
import { getClassReport } from "../lib/class-report";
import RetentionDonut from "../components/charts/RetentionDonut";
import RetentionBars from "../components/charts/RetentionBars";

const printCSS = `
  @media print {
    .cl-sidebar-root, .clc-fab, .cr-noprint { display: none !important; }
    .cr-page { padding: 0 !important; }
    body, .cr-page { background: #fff !important; }
    @page { margin: 14mm; }
  }
`;

function Kpi({ value, label }) {
  return (
    <div style={{ flex: "1 1 120px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: C.text, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: "0 0 14px", fontFamily: "'Outfit',sans-serif" }}>{title}</h3>
      {children}
    </div>
  );
}

export default function ClassReport({ lang = "en" }) {
  const t = useT("classReport", lang);
  const location = useLocation();
  const navigate = useNavigate();
  const classId = useMemo(() => {
    const m = location.pathname.match(/^\/classes\/([^/]+)\/report\/?$/);
    return m ? decodeURIComponent(m[1]) : null;
  }, [location.pathname]);

  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    if (!classId) { setState({ loading: false, error: "missing", data: null }); return; }
    let cancelled = false;
    setState({ loading: true, error: null, data: null });
    getClassReport(classId).then((res) => {
      if (cancelled) return;
      if (res.error || !res.data) setState({ loading: false, error: res.error || "load", data: null });
      else setState({ loading: false, error: null, data: res.data });
    });
    return () => { cancelled = true; };
  }, [classId]);

  const { loading, error, data } = state;
  const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString(lang === "en" ? "en-US" : lang, { year: "numeric", month: "long", day: "numeric" }); } catch { return ""; } };

  return (
    <div className="cr-page" style={{ maxWidth: 820, margin: "0 auto", padding: 24, fontFamily: "'Outfit',sans-serif" }}>
      <style>{printCSS}</style>

      {/* Header */}
      <div className="cr-noprint" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <button
          onClick={() => navigate(classId ? buildRoute.classDetail(classId) : ROUTES.CLASSES)}
          aria-label={t.back}
          style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: C.textMuted, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "'Outfit',sans-serif" }}
        >
          <CIcon name="back" inline size={15} /> {t.back}
        </button>
        <div style={{ flex: 1 }} />
        {data && (
          <button
            onClick={() => window.print()}
            style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'Outfit',sans-serif", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <CIcon name="printer" inline size={15} /> {t.print}
          </button>
        )}
      </div>

      {/* Title */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: C.accent }}>{t.eyebrow}</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: "4px 0 2px" }}>
          {data ? data.class.name : (loading ? "…" : t.eyebrow)}
        </h1>
        {data && (
          <div style={{ fontSize: 13, color: C.textMuted }}>
            {[data.class.subject, data.class.grade].filter(Boolean).join(" · ")}
            {data.class.subject || data.class.grade ? " — " : ""}{t.generated.replace("{date}", fmtDate(data.generatedAt))}
          </div>
        )}
      </div>

      {loading && <p style={{ color: C.textMuted, fontSize: 14 }}>{t.loading}</p>}
      {!loading && error && <p style={{ color: C.red, fontSize: 14 }}>{t.error}</p>}

      {!loading && !error && data && (() => {
        const noData = data.kpis.topics === 0 && data.studentsNeedingHelp.length === 0;
        if (noData) {
          return (
            <Section title={t.emptyTitle}>
              <p style={{ fontSize: 13, color: C.textMuted, margin: 0, lineHeight: 1.5 }}>{t.emptyBody}</p>
            </Section>
          );
        }
        const d = data.distribution;
        return (
          <>
            {/* KPIs */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
              <Kpi value={data.kpis.students} label={t.kpiStudents} />
              <Kpi value={data.kpis.topics} label={t.kpiTopics} />
              <Kpi value={data.kpis.avgRetention == null ? "—" : `${data.kpis.avgRetention}%`} label={t.kpiAvgRetention} />
            </div>

            {/* Retention distribution donut */}
            {data.kpis.topics > 0 && (
              <Section title={t.distributionTitle}>
                <div style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
                  <RetentionDonut dist={d} centerLabel={data.kpis.topics} centerSub={t.kpiTopics} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[["green", t.tierStrong], ["orange", t.tierMedium], ["red", t.tierWeak]].map(([k, lbl]) => (
                      <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.text }}>
                        <span style={{ width: 11, height: 11, borderRadius: 3, background: k === "green" ? C.green : k === "orange" ? C.orange : C.red, flexShrink: 0 }} />
                        <span style={{ fontWeight: 600 }}>{d[k]}</span>
                        <span style={{ color: C.textMuted }}>{lbl}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>
            )}

            {/* Hardest topics */}
            <Section title={t.hardestTitle}>
              {data.hardestTopics.length === 0
                ? <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>{t.noTopics}</p>
                : <RetentionBars data={data.hardestTopics.map((tp) => ({ label: tp.topic, value: tp.retention }))} />}
            </Section>

            {/* Students who need help */}
            <Section title={t.studentsTitle}>
              {data.studentsNeedingHelp.length === 0
                ? <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>{t.noStudents}</p>
                : <RetentionBars data={data.studentsNeedingHelp.map((s) => ({ label: s.name, value: s.retention }))} />}
            </Section>

            {/* Strongest topics (a positive note) */}
            {data.strongestTopics.length > 0 && (
              <Section title={t.strongestTitle}>
                <RetentionBars data={data.strongestTopics.map((tp) => ({ label: tp.topic, value: tp.retention }))} />
              </Section>
            )}
          </>
        );
      })()}
    </div>
  );
}
