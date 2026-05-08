// ─── Shared PageHeader ──────────────────────────────────────────────────
// Replaces the 9 duplicated PageHeader functions previously living in each
// page. All variations boil down to: title text, optional icon, language
// switcher, mobile menu button, and a configurable maxWidth for centering.
//
// Two ways to pass the icon:
//   - `icon="rocket"` → renders <CIcon name="rocket" />, the legacy emoji-
//     style icon set. Simple, but visually distinct from the sidebar nav
//     icons.
//   - `iconNode={<SessionsIcon size={22} active />}` → render a custom
//     JSX node (typically the same SVG icon shown in the sidebar). Use
//     this when you want the page header to match the sidebar nav icon
//     so the user keeps the same visual anchor across the transition.
// If both are provided, iconNode wins.

import { CIcon } from "./Icons";
import MobileMenuButton, { useIsMobile } from "./MobileMenuButton";
import { C } from "./tokens";

export default function PageHeader({
  title,
  icon,
  iconNode,
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
          {iconNode
            ? iconNode
            : (icon && <CIcon name={icon} size={isMobile ? 18 : 22} />)}
          {title}
        </h1>
      </div>
      {/* Language selector lives in the sidebar footer now (see App.jsx).
          Removed from here so every page header has the same shape and
          the lang choice is treated as a user preference, not page chrome. */}
    </div>
  );
}
