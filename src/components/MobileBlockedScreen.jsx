// ─────────────────────────────────────────────────────────────────────────────
// MobileBlockedScreen — shown when a mobile (phone) user tries to enter a
// flow that requires landscape space (quiz sessions, practice mode).
//
// Clasloop is a classroom tool — students typically use tablets or
// computers in class. Building a phone-friendly quiz UI would be 30+
// hours of theme rework. Instead phones can browse the app (MyClasses,
// Favorites, Settings) but get blocked from interactive flows.
//
// PR 28.17.2 added this inline in App.jsx; PR 28.17.3 extracts it to a
// shared component so GuestJoin (which renders OUTSIDE the App shell
// via /join in main.jsx) can use the same blocker without duplication.
//
// Three entry points block:
//   - App.jsx              (logged-in)            page === "studentJoin" or inPractice
//   - GuestJoin            (no-auth /join + QR)   any time
//
// `onBack` is optional — supply a handler when there's somewhere
// sensible to send the user (default route for their role, or "/").
// ─────────────────────────────────────────────────────────────────────────────
import { C } from "./tokens";

export default function MobileBlockedScreen({ lang = "en", onBack }) {
  const txt = {
    en: {
      title: "Use a tablet or computer",
      body: "Clasloop sessions and practice are designed for larger screens. You can still browse on your phone, but to join or practice a deck, switch to a tablet or computer.",
      cta: "Back",
    },
    es: {
      title: "Usa una tablet o computadora",
      body: "Las sesiones y la práctica de Clasloop están diseñadas para pantallas más grandes. Puedes seguir navegando en el celular, pero para unirte a una sesión o practicar un deck, usa una tablet o computadora.",
      cta: "Volver",
    },
    ko: {
      title: "태블릿 또는 컴퓨터를 사용하세요",
      body: "Clasloop의 세션과 학습은 더 큰 화면에 맞게 설계되어 있습니다. 휴대폰에서 둘러볼 수는 있지만, 세션 참여나 덱 학습을 하려면 태블릿이나 컴퓨터에서 사용하세요.",
      cta: "뒤로",
    },
  }[lang] || {
    title: "Use a tablet or computer",
    body: "Clasloop sessions and practice are designed for larger screens. You can still browse on your phone, but to join or practice a deck, switch to a tablet or computer.",
    cta: "Back",
  };

  return (
    <div style={{
      minHeight: "100vh", minHeight: "100dvh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "32px 24px",
      gap: 18,
      boxSizing: "border-box",
      textAlign: "center",
    }}>
      {/* Tablet + phone icons side by side — visual cue for "switch to this" */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 18, marginBottom: 4, color: C.accent,
      }}>
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="2" width="18" height="20" rx="2" />
          <line x1="11" y1="18" x2="13" y2="18" />
        </svg>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
      <h2 style={{
        fontFamily: "'Outfit',sans-serif",
        fontSize: 20, fontWeight: 700, lineHeight: 1.25,
        margin: 0, color: C.text, maxWidth: 320,
      }}>{txt.title}</h2>
      <p style={{
        fontSize: 14, lineHeight: 1.55,
        color: C.textSecondary, fontFamily: "'Outfit',sans-serif",
        margin: 0, maxWidth: 320,
      }}>{txt.body}</p>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            marginTop: 6,
            padding: "10px 22px", borderRadius: 8, fontSize: 14, fontWeight: 600,
            background: C.accent, color: "#fff",
            border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif",
          }}
        >{txt.cta}</button>
      )}
    </div>
  );
}
