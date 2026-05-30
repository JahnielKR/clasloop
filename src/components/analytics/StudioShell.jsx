// src/components/analytics/StudioShell.jsx
//
// F0 Analytics Studio: el shell de la sección.
// - Sub-navegación de 8 items. Los navegables (con `route`) se abren desde el
//   sidebar; los contextuales (Clase / Estudiante / Tema) necesitan un id, así
//   que se llega a ellos por click en una card/row/chip y acá solo se resaltan.
// - Toolbar persistente arriba: title + PeriodChips + slot toolbarExtras.
// - El contenido de la vista se pasa por children.
// - i18n: labels via useT("studioShell"); lang del LanguageContext.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PeriodChips from "./PeriodChips";
import { ROUTES, buildRoute } from "../../routes";
import { useIsMobile } from "../MobileMenuButton";
import { C } from "../tokens";
import { useLang } from "../../i18n/LanguageContext";
import { useT } from "../../i18n";

// `route` => navegable desde el sidebar (rutas sin params). Sin `route` =>
// contextual: se abre con un id desde otra vista; el sidebar solo lo resalta.
const NAV_ITEMS = [
  { id: "overview", labelKey: "navOverview", route: ROUTES.SCHOOL },
  { id: "class", labelKey: "navClass" },
  { id: "student", labelKey: "navStudent" },
  { id: "topics", labelKey: "navTopics" },
  { id: "live", labelKey: "navLive", route: buildRoute.analyticsLive() },
  { id: "reports", labelKey: "navReports", route: buildRoute.analyticsReports() },
  { id: "ask", labelKey: "navAsk", route: buildRoute.analyticsAsk() },
  { id: "cleo", labelKey: "navCleo", route: buildRoute.analyticsCleo() },
];

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
  const lang = useLang();
  const t = useT("studioShell", lang);
  const [internalPeriod, setInternalPeriod] = useState(period);
  const effectivePeriod = onPeriodChange ? period : internalPeriod;
  const handlePeriod = onPeriodChange || setInternalPeriod;
  const hintFor = { class: t.hintClass, student: t.hintStudent, topics: t.hintTopics };

  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", minHeight: "100%" }}>
      {/* Sub-navegación lateral */}
      <nav
        aria-label="Analytics Studio"
        style={
          isMobile
            ? { display: "flex", gap: 4, overflowX: "auto", padding: "8px 12px", borderBottom: `1px solid ${C.border}`, background: C.bgSoft, WebkitOverflowScrolling: "touch" }
            : { flex: "0 0 168px", padding: "16px 0", borderRight: `1px solid ${C.border}`, background: C.bgSoft }
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
            {t.eyebrow}
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
              title={navigable ? "" : hintFor[item.id] || ""}
              style={
                isMobile
                  ? {
                      padding: "6px 12px",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      fontWeight: active ? 600 : 400,
                      color: active ? C.accent : navigable ? C.text : C.textMuted,
                      background: active ? C.accentSoft : "transparent",
                      borderRadius: 6,
                      borderBottom: active ? `2px solid ${C.accent}` : "2px solid transparent",
                      cursor: navigable && !active ? "pointer" : "default",
                      fontSize: 13,
                    }
                  : {
                      padding: "8px 16px",
                      fontWeight: active ? 600 : 400,
                      // Navegables: color normal (azul si activo). Contextuales
                      // inactivos: atenuados (se abren desde otra vista).
                      color: active ? C.accent : navigable ? C.text : C.textMuted,
                      background: active ? C.accentSoft : "transparent",
                      borderLeft: active ? `3px solid ${C.accent}` : "3px solid transparent",
                      cursor: navigable && !active ? "pointer" : "default",
                      fontSize: 14,
                    }
              }
            >
              {t[item.labelKey]}
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
            borderBottom: `1px solid ${C.border}`,
            background: C.bg,
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
