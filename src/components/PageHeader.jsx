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
import { C } from "./tokens";

export default function PageHeader({
  title,
  // lang and setLang are still accepted as props so existing call sites
  // don't have to change, but they're no longer used inside the header.
  // The language selector moved to the sidebar footer (App.jsx).
  lang: _lang,
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
        <MobileMenuButton onOpen={onOpenMobileMenu} />
        <h1
          style={{
            fontFamily: "'Outfit',sans-serif",
            fontSize: isMobile ? 18 : 22,
            fontWeight: 700,
            color: C.text,
          }}
        >
          {title}
        </h1>
      </div>
    </div>
  );
}
