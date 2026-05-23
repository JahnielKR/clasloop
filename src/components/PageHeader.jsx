// ─── Shared PageHeader ──────────────────────────────────────────────────
// Title + mobile menu button + a configurable maxWidth for centering.
//
// Note: page header icons were removed in favor of a cleaner layout —
// the sidebar already shows a (distinct, designed) icon for each route,
// so duplicating it next to the page title was visual noise. Pages no
// longer pass an `icon` prop. If a page genuinely needs custom header
// chrome (e.g. avatar in TeacherProfile), it builds its own header
// instead of using PageHeader.

import MobileMenuButton, { useIsMobile } from "./MobileMenuButton";
import { C, TYPE } from "./tokens";
import Cleo from "./Cleo";
import { useT } from "../i18n";
import { useReplayTour } from "../onboarding/TourContext";

export default function PageHeader({
  title,
  subtitle,        // optional line under the title
  eyebrow,         // optional small uppercase label above the title (accent)
  actions,         // optional node rendered on the right (buttons, etc.)
  // setLang is still accepted but unused — the language selector moved to the
  // sidebar footer (App.jsx). lang is used again (PR 153) to localize the
  // mobile menu button's aria-label.
  lang,
  setLang: _setLang,
  maxWidth = 800,
  onOpenMobileMenu,
  // When set (and a TourProvider is mounted), shows a "Ver guía" button that
  // replays this page's first-visit Cleo tour.
  tourId,
}) {
  const isMobile = useIsMobile();
  const replayTour = useReplayTour();
  const tt = useT("tours", lang);
  const showReplay = !!tourId && !!replayTour;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        maxWidth,
        margin: "0 auto 24px",
        paddingBottom: 18,
        borderBottom: `1px solid ${C.border}`,
        flexWrap: (actions || showReplay) ? "wrap" : "nowrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0, flex: 1 }}>
        <MobileMenuButton onOpen={onOpenMobileMenu} lang={lang} />
        <div style={{ minWidth: 0 }}>
          {eyebrow && (
            <div style={{ ...TYPE.caption, color: C.accent, marginBottom: 4 }}>{eyebrow}</div>
          )}
          <h1 style={{ ...TYPE.h1, fontSize: isMobile ? 18 : TYPE.h1.fontSize, color: C.text }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ ...TYPE.small, color: C.textSecondary, margin: "4px 0 0" }}>{subtitle}</p>
          )}
        </div>
      </div>
      {(actions || showReplay) && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          {showReplay && (
            <button
              type="button"
              onClick={() => replayTour(tourId)}
              title={tt.replay}
              aria-label={tt.replay}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 10px", borderRadius: 8,
                background: "transparent", color: C.textSecondary,
                border: `1px solid ${C.border}`, cursor: "pointer",
                fontFamily: "'Outfit',sans-serif", fontSize: 12.5, fontWeight: 600,
                transition: "border-color .15s ease, color .15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSecondary; }}
            >
              <Cleo size={18} animate={false} />
              {!isMobile && tt.replay}
            </button>
          )}
          {actions}
        </div>
      )}
    </div>
  );
}
