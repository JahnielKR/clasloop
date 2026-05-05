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

// Inline language select styling. We keep this co-located rather than in
// tokens.js because it's specific to the header — no other place uses it.
const langSel = {
  fontFamily: "'Outfit',sans-serif",
  background: C.bg,
  border: `1px solid ${C.border}`,
  color: C.text,
  borderRadius: 8,
  outline: "none",
  cursor: "pointer",
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%239B9B9B' stroke-width='1.5'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  padding: "6px 26px 6px 10px",
  fontSize: 12,
  width: "auto",
  flexShrink: 0,
};

export default function PageHeader({
  title,
  icon,
  lang,
  setLang,
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
      {!isMobile && (
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          style={langSel}
        >
          <option value="en">EN</option>
          <option value="es">ES</option>
          <option value="ko">한</option>
        </select>
      )}
    </div>
  );
}
