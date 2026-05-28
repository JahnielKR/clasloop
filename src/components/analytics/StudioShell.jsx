// src/components/analytics/StudioShell.jsx
//
// F0 Analytics Studio: el shell de la sección.
// - Sub-navegación de 7 items (solo "Resumen" navegable en F0; los demás
//   muestran "Próximamente — F1+" disabled).
// - Toolbar persistente arriba: title + PeriodChips + (slots vacíos
//   para Compare/Export que F4/F7 llenan).
// - El contenido de la vista se pasa por children.
//
// En F0 se monta envolviendo Director.jsx (la vista Resumen). En F1+ las
// otras vistas (ClassDetail, etc.) usarán el mismo shell con view="class"|...

// React 17+ automatic JSX runtime: no React default import needed.
// (Project lint disables react/react-in-jsx-scope; see eslint.config.js.)
import { useState } from "react";
import PeriodChips from "./PeriodChips";

const NAV_ITEMS = [
  { id: "overview", label: "Resumen", enabled: true },
  { id: "class", label: "Clase", enabled: false },
  { id: "student", label: "Estudiante", enabled: false },
  { id: "topics", label: "Temas", enabled: false },
  { id: "live", label: "En vivo", enabled: false },
  { id: "reports", label: "Reportes", enabled: false },
  { id: "ask", label: "Analista Cleo", enabled: false },
];

export default function StudioShell({
  view = "overview",
  title = "Analytics",
  period = "d30",
  onPeriodChange,
  children,
}) {
  const [internalPeriod, setInternalPeriod] = useState(period);
  const effectivePeriod = onPeriodChange ? period : internalPeriod;
  const handlePeriod = onPeriodChange || setInternalPeriod;

  return (
    <div style={{ display: "flex", minHeight: "100%" }}>
      {/* Sub-navegación lateral */}
      <nav
        aria-label="Analytics Studio"
        style={{
          flex: "0 0 168px",
          padding: "16px 0",
          borderRight: "1px solid #e4e4e7",
          background: "#fafafa",
        }}
      >
        <div
          style={{
            padding: "0 16px 12px",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: ".08em",
            opacity: 0.55,
          }}
        >
          Analytics
        </div>
        {NAV_ITEMS.map((item) => {
          const active = item.id === view;
          return (
            <div
              key={item.id}
              aria-disabled={!item.enabled}
              title={item.enabled ? "" : "Próximamente — F1+"}
              style={{
                padding: "8px 16px",
                fontWeight: active ? 600 : 400,
                color: !item.enabled ? "#a1a1aa" : active ? "#2563eb" : "inherit",
                background: active ? "#eff6ff" : "transparent",
                borderLeft: active ? "3px solid #2563eb" : "3px solid transparent",
                cursor: item.enabled ? "pointer" : "not-allowed",
                fontSize: 14,
              }}
            >
              {item.label}
              {!item.enabled && (
                <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.7 }}>· pronto</span>
              )}
            </div>
          );
        })}
      </nav>

      {/* Contenido + toolbar */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 18px",
            borderBottom: "1px solid #e4e4e7",
            background: "#fff",
          }}
        >
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h1>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <PeriodChips value={effectivePeriod} onChange={handlePeriod} />
            {/* Compare + Export viven acá en F4/F7 */}
          </div>
        </header>
        <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
      </div>
    </div>
  );
}
