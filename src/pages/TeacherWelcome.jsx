// ─── TeacherWelcome ────────────────────────────────────────────────────────
// Phase 2 — the "OPEN" moment for teachers. They skip avatar onboarding and
// otherwise land on an empty dashboard with no orientation. This is a brief,
// skippable, friendly first-run screen (shown once, right after they pick the
// teacher role) that frames the value in 3 lines and points them at their
// first win: creating a warmup. Same card-on-bgSoft style as RoleOnboarding /
// AvatarOnboarding.
import Cleo from "../components/Cleo";
import { CIcon } from "../components/Icons";
import { C } from "../components/tokens";
import { useT } from "../i18n";

const css = `
  @keyframes tw-rise { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
  .tw-card { animation: tw-rise .4s ease both }
  @keyframes tw-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-5px) } }
  .tw-cleo { animation: tw-bob 3s ease-in-out infinite }
  .tw-row { animation: tw-rise .45s ease both }
  .tw-cta { transition: transform .15s, box-shadow .15s }
  .tw-cta:hover { transform: translateY(-1px); box-shadow: 0 8px 22px rgba(35,131,226,0.28) }
  @media (prefers-reduced-motion: reduce) {
    .tw-card, .tw-row { animation: none !important }
    .tw-cleo { animation: none !important }
  }
`;

export default function TeacherWelcome({ profile, lang = "en", onStart, onSkip }) {
  const t = useT("teacherWelcome", lang);
  const firstName = (profile?.full_name || "").trim().split(/\s+/)[0] || "";

  const points = [
    { icon: "magic", title: t.point1Title, body: t.point1Body },
    { icon: "rocket", title: t.point2Title, body: t.point2Body },
    { icon: "chart", title: t.point3Title, body: t.point3Body },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: C.bgSoft,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "'Outfit', sans-serif",
    }}>
      <style>{css}</style>
      <div className="tw-card" style={{
        position: "relative",
        background: C.bg, borderRadius: 20, border: `1px solid ${C.border}`,
        padding: "60px 34px 34px", maxWidth: 540, width: "100%",
        boxShadow: "0 10px 36px rgba(0,0,0,0.07)", textAlign: "center",
      }}>
        {/* Cleo peeks over the top */}
        <div className="tw-cleo" aria-hidden="true" style={{ position: "absolute", top: -42, left: "50%", transform: "translateX(-50%)" }}>
          <Cleo size={92} />
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 700, color: C.text, margin: "0 0 8px", letterSpacing: "-0.01em" }}>
          {firstName ? t.welcomeNamed.replace("{name}", firstName) : t.welcome}
        </h1>
        <p style={{ fontSize: 15, color: C.textSecondary, lineHeight: 1.5, margin: "0 auto 28px", maxWidth: 420 }}>
          {t.intro}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, textAlign: "left", marginBottom: 30 }}>
          {points.map((p, i) => (
            <div key={i} className="tw-row" style={{ display: "flex", alignItems: "center", gap: 14, animationDelay: `${0.1 + i * 0.08}s` }}>
              <CIcon name={p.icon} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 2 }}>{p.title}</div>
                <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.45 }}>{p.body}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          className="tw-cta"
          onClick={() => onStart?.()}
          style={{
            width: "100%", padding: "14px", borderRadius: 12,
            fontSize: 15.5, fontWeight: 600,
            background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
            color: "#fff", border: "none", cursor: "pointer",
            fontFamily: "'Outfit', sans-serif",
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <CIcon name="magic" inline size={17} /> {t.ctaPrimary}
        </button>
        <button
          onClick={() => onSkip?.()}
          style={{
            width: "100%", padding: "11px", marginTop: 10,
            borderRadius: 10, fontSize: 13.5, fontWeight: 500,
            background: "transparent", color: C.textMuted,
            border: "none", cursor: "pointer", fontFamily: "'Outfit', sans-serif",
          }}
        >
          {t.ctaSkip}
        </button>
      </div>
    </div>
  );
}
