// src/components/analytics/StudioShell.jsx
//
// F0 Analytics Studio: el shell de la sección.
// - Sub-navegación de 7 items. Los 4 sin params (Resumen / En vivo /
//   Reportes / Analista Cleo) son navegables directo desde el sidebar.
//   Los 3 contextuales (Clase / Estudiante / Tema) necesitan un id, así
//   que se llega a ellos por click en una card/row/chip y acá solo se
//   resaltan cuando estás en su vista.
// - Toolbar persistente arriba: title + PeriodChips + slot toolbarExtras
//   (Compare en F4, Export en F7).
// - El contenido de la vista se pasa por children.

// React 17+ automatic JSX runtime: no React default import needed.
// (Project lint disables react/react-in-jsx-scope; see eslint.config.js.)
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PeriodChips from "./PeriodChips";
import { ROUTES, buildRoute } from "../../routes";
import { useIsMobile } from "../MobileMenuButton";

// `route` => navegable desde el sidebar (rutas sin params). Sin `route` =>
// contextual: se abre con un id desde otra vista; el sidebar solo lo resalta.
const NAV_ITEMS = [
  { id: "overview", label: "Resumen", route: ROUTES.SCHOOL },
  { id: "class", label: "Clase" },
  { id: "student", label: "Estudiante" },
  { id: "topics", label: "Temas" },
  { id: "live", label: "En vivo", route: buildRoute.analyticsLive() },
  { id: "reports", label: "Reportes", route: buildRoute.analyticsReports() },
  { id: "ask", label: "Analista Cleo", route: buildRoute.analyticsAsk() },
];

const CONTEXTUAL_HINT = {
  class: "Se abre desde una clase del Resumen",
  student: "Se abre desde un alumno del roster",
  topics: "Se abre desde un tema del detalle de clase",
};

export default function StudioShell({
  view = "overview",
  title = "Analytics",
  period = "d30",
  onPeriodChange,
  toolbarExtras,  // F4: optional ReactNode rendered alongside PeriodChips
  children,
}) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [internalPeriod, setInternalPeriod] = useState(period);
  const effectivePeriod = onPeriodChange ? period : internalPeriod;
  const handlePeriod = onPeriodChange || setInternalPeriod;

  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", minHeight: "100%" }}>
      {/* Sub-navegación lateral */}
      <nav
        aria-label="Analytics Studio"
        style={
          isMobile
            ? { display: "flex", gap: 4, overflowX: "auto", padding: "8px 12px", borderBottom: "1px solid #e4e4e7", background: "#fafafa", WebkitOverflowScrolling: "touch" }
            : { flex: "0 0 168px", padding: "16px 0", borderRight: "1px solid #e4e4e7", background: "#fafafa" }
        }
      >
        {!isMobile && (
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
        )}
        {NAV_ITEMS.map((item) => {
          const active = item.id === view;
          const navigable = !!item.route;
          const go = () => {
            if (navigable && !active) navigate(item.route);
          };
          return (
            <div
              key={item.id}
              role={navigable ? "link" : undefined}
              tabIndex={navigable ? 0 : undefined}
              aria-current={active ? "page" : undefined}
              onClick={navigable ? go : undefined}
              onKeyDown={
                navigable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        go();
                      }
                    }
                  : undefined
              }
              title={navigable ? "" : CONTEXTUAL_HINT[item.id] || ""}
              style={
                isMobile
                  ? {
                      padding: "6px 12px",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      fontWeight: active ? 600 : 400,
                      color: active ? "#2563eb" : navigable ? "inherit" : "#a1a1aa",
                      background: active ? "#eff6ff" : "transparent",
                      borderRadius: 6,
                      borderBottom: active ? "2px solid #2563eb" : "2px solid transparent",
                      cursor: navigable && !active ? "pointer" : "default",
                      fontSize: 13,
                    }
                  : {
                      padding: "8px 16px",
                      fontWeight: active ? 600 : 400,
                      // Navegables: color normal (azul si activo). Contextuales
                      // inactivos: atenuados (se abren desde otra vista).
                      color: active ? "#2563eb" : navigable ? "inherit" : "#a1a1aa",
                      background: active ? "#eff6ff" : "transparent",
                      borderLeft: active ? "3px solid #2563eb" : "3px solid transparent",
                      cursor: navigable && !active ? "pointer" : "default",
                      fontSize: 14,
                    }
              }
            >
              {item.label}
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
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <PeriodChips value={effectivePeriod} onChange={handlePeriod} />
            {toolbarExtras}
            {/* Export vive acá en F7 */}
          </div>
        </header>
        <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
      </div>
    </div>
  );
}
