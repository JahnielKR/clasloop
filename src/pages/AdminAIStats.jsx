// ─── /admin/ai-stats — Dashboard interno de métricas AI ─────────────
// Bloque 7: muestra el estado del sistema de generación.
//
// Acceso: solo profiles.is_admin = true. La columna se agrega via
// supabase/profiles_admin_flag.sql.
//
// Métricas:
//   - KPIs grandes: total gens, filter rate, active teachers, costo estimado.
//   - Distribución por activity_type (mix, mcq, tf, etc.)
//   - Distribución por input_type (text, pdf, docx, pptx, image)
//   - Tabla últimas 50 generaciones (debug y spot check)
//   - Tabla top 10 con más drops (para inspeccionar casos donde Haiku
//     fue agresivo).
//
// Diseño:
//   - Cero charts; números grandes y tablas. Es admin tool, no presentation.
//   - Responsive con flex-wrap. Usable en mobile pero pensado para desktop.
//   - i18n EN + ES (KO no es prioridad para tool interno).

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { C } from "../components/tokens";

// Costo aproximado por generación. Sonnet 4.5: $3/$15 per 1M tokens. Por
// generación típica de 10 preguntas: ~3k input + 5k output = $0.084 + $0.075
// = redondeo a $0.025 promedio (los outputs reales son más cortos). Haiku
// validación: ~$0.0015. Total ~$0.027 por gen con validación.
const COST_PER_GENERATION_USD = 0.027;

const STRINGS = {
  en: {
    title: "AI System Stats",
    notAuthorized: "Not authorized.",
    notAuthorizedDesc: "This page is for system administrators only.",
    loading: "Loading…",
    rangeLabel: "Range:",
    range7: "7 days",
    range30: "30 days",
    range90: "90 days",
    rangeAll: "All time",
    refresh: "Refresh",
    kpiTotalGens: "Total generations",
    kpiFilterRate: "Filter rate",
    kpiActiveTeachers: "Active teachers",
    kpiEstCost: "Est. cost",
    filterRateNote: "% of questions Haiku rejected (post-validation only)",
    sectionDistribution: "Distribution",
    byActivityType: "By question type",
    byInputType: "By input type",
    sectionRecent: "Recent generations",
    sectionTopDrops: "Top drops (where Haiku rejected most)",
    colDate: "Date",
    colTeacher: "Teacher",
    colType: "Type",
    colCount: "Count",
    colInput: "Input",
    colDropped: "Dropped",
    colRaw: "Raw",
    colFiltered: "Filtered",
    none: "—",
    noData: "No generations in this range.",
    noDrops: "No drops in this range. ✨",
    preValidation: "Pre-validation era (no filter data)",
  },
  es: {
    title: "Estadísticas del sistema AI",
    notAuthorized: "No autorizado.",
    notAuthorizedDesc: "Esta página es solo para administradores del sistema.",
    loading: "Cargando…",
    rangeLabel: "Rango:",
    range7: "7 días",
    range30: "30 días",
    range90: "90 días",
    rangeAll: "Todo",
    refresh: "Actualizar",
    kpiTotalGens: "Generaciones totales",
    kpiFilterRate: "Tasa de filtrado",
    kpiActiveTeachers: "Profes activos",
    kpiEstCost: "Costo aprox.",
    filterRateNote: "% de preguntas que Haiku rechazó (solo post-validación)",
    sectionDistribution: "Distribución",
    byActivityType: "Por tipo de pregunta",
    byInputType: "Por tipo de entrada",
    sectionRecent: "Generaciones recientes",
    sectionTopDrops: "Top descartes (donde Haiku filtró más)",
    colDate: "Fecha",
    colTeacher: "Profe",
    colType: "Tipo",
    colCount: "Cantidad",
    colInput: "Entrada",
    colDropped: "Descartadas",
    colRaw: "Original",
    colFiltered: "Filtradas",
    none: "—",
    noData: "Sin generaciones en este rango.",
    noDrops: "Sin descartes en este rango. ✨",
    preValidation: "Era pre-validación (sin datos de filtrado)",
  },
};

export default function AdminAIStats({ profile, lang, onOpenMobileMenu }) {
  const t = STRINGS[lang] || STRINGS.en;
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  // Guard de acceso. Si profile no carga aún, dejamos cargar la página y
  // chequeamos al final. Si profile.is_admin === false, mostramos guard.
  // RLS de Supabase ES la autorización real; este check es UX.
  const isAdmin = profile?.is_admin === true;

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      let query = supabase
        .from("ai_generations")
        .select(`
          id, created_at, teacher_id, activity_type, num_questions,
          model_used, input_type, input_size_chars,
          output_raw, output_filtered, validation_dropped_count,
          profiles:teacher_id ( id, full_name )
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      if (days < 999) {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte("created_at", since);
      }

      const { data, error: queryErr } = await query;
      if (queryErr) throw queryErr;
      setRows(data || []);
    } catch (e) {
      setError(e?.message || String(e));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, days]);

  // ─── Guard de acceso ──────────────────────────────────
  if (!isAdmin) {
    return (
      <div style={{ padding: "60px 20px", maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
        <h1 style={{ fontSize: 20, color: C.text, margin: "0 0 8px" }}>{t.notAuthorized}</h1>
        <p style={{ fontSize: 14, color: C.textSecondary, margin: 0 }}>{t.notAuthorizedDesc}</p>
      </div>
    );
  }

  // ─── Métricas calculadas ──────────────────────────────
  const total = rows.length;

  // Filter rate: solo cuenta filas con validación corrida (validation_dropped_count != null).
  // Calcula sobre la suma de num_questions vs total dropped para ese subset.
  // Esto da el % de preguntas que Haiku rechazó del total post-validación.
  const validatedRows = rows.filter(r => r.validation_dropped_count !== null && r.validation_dropped_count !== undefined);
  const totalValidatedQuestions = validatedRows.reduce((acc, r) => acc + (r.num_questions || 0), 0);
  const totalValidatedDropped = validatedRows.reduce((acc, r) => acc + (r.validation_dropped_count || 0), 0);
  const filterRate = totalValidatedQuestions > 0
    ? (totalValidatedDropped / totalValidatedQuestions) * 100
    : null;

  const uniqueTeachers = new Set(rows.map(r => r.teacher_id)).size;
  const estCost = total * COST_PER_GENERATION_USD;

  // Distribución por activity_type
  const byType = {};
  for (const r of rows) {
    const k = r.activity_type || "unknown";
    byType[k] = (byType[k] || 0) + 1;
  }
  const byTypeSorted = Object.entries(byType).sort((a, b) => b[1] - a[1]);

  // Distribución por input_type
  const byInput = {};
  for (const r of rows) {
    const k = r.input_type || "unknown";
    byInput[k] = (byInput[k] || 0) + 1;
  }
  const byInputSorted = Object.entries(byInput).sort((a, b) => b[1] - a[1]);

  // Top drops: filas con más drops, descendente. Solo las que tuvieron al
  // menos 1 drop para que la tabla no se llene de ceros.
  const topDrops = rows
    .filter(r => (r.validation_dropped_count || 0) > 0)
    .sort((a, b) => (b.validation_dropped_count || 0) - (a.validation_dropped_count || 0))
    .slice(0, 10);

  // Recent: las primeras 50 (ya vienen ordenadas DESC).
  const recent = rows.slice(0, 50);

  // ─── Render ───────────────────────────────────────────
  return (
    <div style={{ padding: "20px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>{t.title}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: C.textSecondary }}>{t.rangeLabel}</span>
          {[
            { v: 7, label: t.range7 },
            { v: 30, label: t.range30 },
            { v: 90, label: t.range90 },
            { v: 999, label: t.rangeAll },
          ].map(opt => (
            <button
              key={opt.v}
              onClick={() => setDays(opt.v)}
              style={{
                padding: "5px 10px", fontSize: 12, fontWeight: 500,
                border: `1px solid ${days === opt.v ? C.accent : C.border}`,
                background: days === opt.v ? C.accentSoft : C.bg,
                color: days === opt.v ? C.accent : C.text,
                borderRadius: 6, cursor: "pointer",
              }}
            >{opt.label}</button>
          ))}
          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              padding: "5px 10px", fontSize: 12, fontWeight: 500,
              border: `1px solid ${C.border}`, background: C.bg, color: C.text,
              borderRadius: 6, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.6 : 1,
            }}
          >↻ {t.refresh}</button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", marginBottom: 16, background: C.redSoft, border: `1px solid ${C.red}44`, color: C.red, fontSize: 12, borderRadius: 8 }}>
          {error}
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: C.textSecondary, fontSize: 14 }}>{t.loading}</div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
            <Kpi label={t.kpiTotalGens} value={total} />
            <Kpi
              label={t.kpiFilterRate}
              value={filterRate === null ? t.none : `${filterRate.toFixed(1)}%`}
              note={filterRate === null ? t.preValidation : t.filterRateNote}
              accent={filterRate === null ? "muted" : (filterRate > 25 ? "warn" : (filterRate > 10 ? "neutral" : "good"))}
            />
            <Kpi label={t.kpiActiveTeachers} value={uniqueTeachers} />
            <Kpi label={t.kpiEstCost} value={`$${estCost.toFixed(2)}`} />
          </div>

          {/* Distribuciones */}
          <h2 style={sectionH2}>{t.sectionDistribution}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 28 }}>
            <DistTable title={t.byActivityType} rows={byTypeSorted} total={total} />
            <DistTable title={t.byInputType} rows={byInputSorted} total={total} />
          </div>

          {/* Top drops */}
          <h2 style={sectionH2}>{t.sectionTopDrops}</h2>
          {topDrops.length === 0 ? (
            <div style={{ padding: "20px", color: C.textSecondary, fontSize: 13, background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 28 }}>{t.noDrops}</div>
          ) : (
            <GenTable rows={topDrops} t={t} showDrops />
          )}

          {/* Recent */}
          <h2 style={sectionH2}>{t.sectionRecent}</h2>
          {recent.length === 0 ? (
            <div style={{ padding: "20px", color: C.textSecondary, fontSize: 13, background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>{t.noData}</div>
          ) : (
            <GenTable rows={recent} t={t} />
          )}
        </>
      )}
    </div>
  );
}

// ─── Subcomponentes ──────────────────────────────────────

const sectionH2 = {
  fontSize: 14, fontWeight: 600, color: C.textSecondary, margin: "0 0 12px",
  textTransform: "uppercase", letterSpacing: 0.5,
};

function Kpi({ label, value, note, accent }) {
  // accent: "good" (green), "warn" (orange), "neutral" (border), "muted" (gris)
  const palette = accent === "good"
    ? { border: C.green + "44", color: C.green }
    : accent === "warn"
    ? { border: C.orange + "44", color: C.orange }
    : accent === "muted"
    ? { border: C.border, color: C.textMuted }
    : { border: C.border, color: C.text };

  return (
    <div style={{
      padding: 16, borderRadius: 10, background: C.bg,
      border: `1px solid ${palette.border}`,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: palette.color, lineHeight: 1.2 }}>{value}</div>
      {note && <div style={{ fontSize: 10, color: C.textMuted, marginTop: 6, lineHeight: 1.4 }}>{note}</div>}
    </div>
  );
}

function DistTable({ title, rows, total }) {
  return (
    <div style={{ background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: C.textSecondary, borderBottom: `1px solid ${C.border}` }}>{title}</div>
      {rows.length === 0 ? (
        <div style={{ padding: 14, fontSize: 12, color: C.textMuted }}>—</div>
      ) : (
        rows.map(([k, n]) => {
          const pct = total > 0 ? (n / total) * 100 : 0;
          return (
            <div key={k} style={{ padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontSize: 13, borderTop: `1px solid ${C.border}`, position: "relative" }}>
              {/* bar */}
              <div style={{
                position: "absolute", left: 0, top: 0, bottom: 0,
                width: `${pct}%`, background: C.accentSoft, opacity: 0.5,
              }} />
              <span style={{ color: C.text, fontWeight: 500, position: "relative" }}>{k}</span>
              <span style={{ color: C.textSecondary, fontSize: 12, position: "relative" }}>
                {n} <span style={{ color: C.textMuted }}>({pct.toFixed(0)}%)</span>
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}

function GenTable({ rows, t, showDrops }) {
  return (
    <div style={{ marginBottom: 28, background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: C.bgSoft }}>
            <th style={th}>{t.colDate}</th>
            <th style={th}>{t.colTeacher}</th>
            <th style={th}>{t.colType}</th>
            <th style={{ ...th, textAlign: "right" }}>{t.colCount}</th>
            <th style={th}>{t.colInput}</th>
            {showDrops && <th style={{ ...th, textAlign: "right" }}>{t.colDropped}</th>}
            <th style={{ ...th, textAlign: "right" }}>{t.colRaw}</th>
            <th style={{ ...th, textAlign: "right" }}>{t.colFiltered}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const rawCount = Array.isArray(r.output_raw) ? r.output_raw.length : (r.output_raw ? "?" : "—");
            const filteredCount = Array.isArray(r.output_filtered)
              ? r.output_filtered.length
              : (r.output_filtered === null || r.output_filtered === undefined ? "—" : "?");
            const teacherName = r.profiles?.full_name || r.teacher_id?.slice(0, 8) || "—";
            const dt = new Date(r.created_at);
            const dateStr = dt.toLocaleString(undefined, {
              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
            });
            const dropped = r.validation_dropped_count;
            return (
              <tr key={r.id} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={td}>{dateStr}</td>
                <td style={td}>{teacherName}</td>
                <td style={td}>{r.activity_type || "—"}</td>
                <td style={{ ...td, textAlign: "right" }}>{r.num_questions || 0}</td>
                <td style={td}>{r.input_type || "—"}</td>
                {showDrops && (
                  <td style={{ ...td, textAlign: "right", color: dropped > 0 ? C.orange : C.textMuted, fontWeight: dropped > 0 ? 600 : 400 }}>
                    {dropped ?? "—"}
                  </td>
                )}
                <td style={{ ...td, textAlign: "right", color: C.textSecondary }}>{rawCount}</td>
                <td style={{ ...td, textAlign: "right", color: filteredCount === "—" ? C.textMuted : C.textSecondary }}>{filteredCount}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const th = { padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 600, color: C.textSecondary, textTransform: "uppercase", letterSpacing: 0.3 };
const td = { padding: "8px 10px", color: C.text };
