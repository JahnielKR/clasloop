// ─── Shared PageHeader ──────────────────────────────────────────────────
// Replaces the 9 duplicated PageHeader functions previously living in each
// page. All variations boil down to: title text, optional icon, language
// switcher, mobile menu button, and a configurable maxWidth for centering.
//
// Pages that hardcoded their icon (e.g. Achievements showing a trophy,
// TeacherProfile showing a teacher avatar) now pass `icon="trophy"` etc.
// as a regular prop — no behavior change.

import { CIcon } from "./Icons";
import MobileMenuButton, { useIsMobile } from "./MobileMenuButton";
import { C } from "./tokens";

export default function PageHeader({
  title,
  icon,
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
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {icon && <CIcon name={icon} size={isMobile ? 18 : 22} />}
          {title}
        </h1>
      </div>
      {/* Language selector lives in the sidebar footer now (see App.jsx).
          Removed from here so every page header has the same shape and
          the lang choice is treated as a user preference, not page chrome. */}
    </div>
  );
}
