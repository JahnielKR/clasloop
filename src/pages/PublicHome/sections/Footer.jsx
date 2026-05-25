import { LogoMark } from "../../../components/Icons";
import { C } from "../../../components/tokens";

// Privacy links to the static /privacy.html (the canonical policy URL used by
// the Google Play listing). Terms / Contact stay as placeholders until they
// have real destinations (a legal page / support email — a product decision).
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
          <a
            href="/privacy.html"
            style={{ color: C.textMuted, textDecoration: "none" }}
          >{t.footerPrivacy}</a>
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
