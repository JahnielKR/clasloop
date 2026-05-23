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

export default function PageHeader({
  title,
  // setLang is still accepted but unused — the language selector moved to the
  // sidebar footer (App.jsx). lang is used again (PR 153) to localize the
  // mobile menu button's aria-label.
  lang,
  setLang: _setLang,
  maxWidth = 800,
  onOpenMobileMenu,
}) {
  const isMobile = useIsMobile();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        maxWidth,
        margin: "0 auto 24px",
        paddingBottom: 18,
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <MobileMenuButton onOpen={onOpenMobileMenu} lang={lang} />
        <h1
          style={{
            ...TYPE.h1,
            fontSize: isMobile ? 18 : TYPE.h1.fontSize,
            color: C.text,
          }}
        >
          {title}
        </h1>
      </div>
    </div>
  );
}
