import { LogoMark } from "../../../components/Icons";
import { C } from "../../../components/tokens";

// NOTE (landing scaffold PR): the legal links (Privacy / Terms / Contact)
// are still placeholders — they need real destinations (legal pages or a
// support email) which is a product decision. They are intentionally NOT
// rendered as fake clickable links here; once targets exist they become
// proper <a> elements. The header nav links ARE wired to smooth-scroll
// (see index.jsx) — that's where the "dead link" fix landed for this PR.
export default function Footer({ t }) {
  return (
    <footer style={{
      padding: "32px",
      borderTop: `1px solid ${C.border}`,
      background: C.bg,
    }}>
      <div style={{
        maxWidth: 1000, margin: "0 auto",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LogoMark size={24} />
          <span style={{ fontSize: 13, color: C.textSecondary, fontWeight: 500 }}>
            {t.footerTagline}
          </span>
        </div>
        <div style={{ display: "flex", gap: 20, fontSize: 12, color: C.textMuted }}>
          <span>{t.footerPrivacy}</span>
          <span>{t.footerTerms}</span>
          <span>{t.footerContact}</span>
        </div>
      </div>
      <div style={{
        maxWidth: 1000, margin: "16px auto 0",
        fontSize: 11, color: C.textMuted, textAlign: "center",
      }}>{t.footerCopyright}</div>
    </footer>
  );
}
