// ─── Landing CSS ───────────────────────────────────────────────────────────
// Extracted verbatim from the old single-file PublicHome.jsx (PR: landing
// scaffold split) so each section component stays lean. The string is
// injected once via <style>{landingCss}</style> from index.jsx.
//
// Two additions vs. the original:
//   1. Scroll-reveal helpers (.ph-reveal / .ph-stagger) used by useReveal.js.
//   2. A prefers-reduced-motion block that neutralizes the float/morph loops
//      and reveals (accessibility — these animations used to run regardless).
import { C } from "../../components/tokens";

export const landingCss = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
  *{box-sizing:border-box}
  body{margin:0;background:#fff;font-family:'Outfit',sans-serif}

  /* Forzar light mode en la landing — esta página es marketing y debe verse
     consistente para todos los visitors sin importar su preferencia de OS.
     Notion, Linear, Stripe hacen lo mismo: la landing es siempre light. */
  .ph-root { color-scheme: light; background: #fff !important; }
  .ph-root, .ph-root * { color-scheme: light !important; }
  @media (prefers-color-scheme: dark) {
    .ph-root { background: #fff !important; }
  }

  /* Smooth scroll for in-page nav anchors */
  html { scroll-behavior: smooth; }
  /* Offset anchored sections so the sticky header doesn't cover their tops */
  .ph-anchor { scroll-margin-top: 84px; }

  /* Float keyframes — cada card tiene su propia rotación base, animamos solo translateY */
  @keyframes ph-float-a { 0%,100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-10px) rotate(-3deg); } }
  @keyframes ph-float-b { 0%,100% { transform: translateY(-5px) rotate(2deg); } 50% { transform: translateY(5px) rotate(2deg); } }
  @keyframes ph-float-c { 0%,100% { transform: translateY(0) rotate(-1deg); } 50% { transform: translateY(-12px) rotate(-1deg); } }
  @keyframes ph-float-d { 0%,100% { transform: translateY(-3px) rotate(4deg); } 50% { transform: translateY(8px) rotate(4deg); } }

  /* Morph: cada 6s alterna doc <-> pregunta */
  @keyframes ph-morph-from { 0%, 40% { opacity: 1; } 50%, 90% { opacity: 0; } 100% { opacity: 1; } }
  @keyframes ph-morph-to { 0%, 40% { opacity: 0; } 50%, 90% { opacity: 1; } 100% { opacity: 0; } }

  .ph-float { animation-duration: 4s; animation-iteration-count: infinite; animation-timing-function: ease-in-out; }
  .ph-float-a { animation-name: ph-float-a; }
  .ph-float-b { animation-name: ph-float-b; }
  .ph-float-c { animation-name: ph-float-c; }
  .ph-float-d { animation-name: ph-float-d; }
  .ph-morph-from { animation: ph-morph-from 6s infinite; }
  .ph-morph-to { animation: ph-morph-to 6s infinite; position: absolute; inset: 0; }

  /* Page-load fade for sections */
  @keyframes ph-fade { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
  .ph-fade { animation: ph-fade .4s ease both }

  /* ── Scroll reveal (driven by useReveal.js IntersectionObserver) ──
     A single observer toggles .is-visible on the wrapper; children animate in.
     .ph-reveal  = one element. .ph-stagger = animate children with a cascade. */
  .ph-reveal { opacity: 0; transform: translateY(20px); transition: opacity .6s cubic-bezier(.16,1,.3,1), transform .6s cubic-bezier(.16,1,.3,1); }
  .ph-reveal.is-visible { opacity: 1; transform: none; }
  .ph-stagger > * { opacity: 0; transform: translateY(20px); transition: opacity .55s cubic-bezier(.16,1,.3,1), transform .55s cubic-bezier(.16,1,.3,1); }
  .ph-stagger.is-visible > * { opacity: 1; transform: none; }
  .ph-stagger.is-visible > *:nth-child(1) { transition-delay: .04s; }
  .ph-stagger.is-visible > *:nth-child(2) { transition-delay: .12s; }
  .ph-stagger.is-visible > *:nth-child(3) { transition-delay: .20s; }
  .ph-stagger.is-visible > *:nth-child(4) { transition-delay: .28s; }
  .ph-stagger.is-visible > *:nth-child(5) { transition-delay: .36s; }
  .ph-stagger.is-visible > *:nth-child(6) { transition-delay: .44s; }

  /* Scroll cue under the hero CTA */
  @keyframes ph-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(5px); } }
  .ph-scroll-cue { animation: ph-bob 1.8s ease-in-out infinite; }

  /* Hover states */
  .ph-btn-primary { transition: transform .15s, box-shadow .15s; }
  .ph-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(35,131,226,0.25); }
  .ph-btn-primary:active { transform: translateY(0); }
  .ph-nav-link { transition: color .15s; cursor: pointer; }
  .ph-nav-link:hover { color: ${C.text} !important; }
  .ph-cta-secondary { transition: background .15s, border-color .15s; }
  .ph-cta-secondary:hover { background: ${C.bgSoft}; border-color: ${C.textMuted}; }
  .ph-input:focus { border-color: ${C.accent}; box-shadow: 0 0 0 3px ${C.accentSoft}; outline: none; }
  .ph-lang-btn { transition: all .15s ease; cursor: pointer; }

  /* Tablet grande / laptop chica (≤1366px) — Galaxy Tab S9 FE en
     landscape (~1316x682). El problema crítico aquí no es el ancho sino
     la ALTURA: 682px de alto deja muy poco espacio vertical, así que el
     hero tiene que ser COMPACTO para que entren tagline + CTA + cards +
     pills sin scroll. */
  @media (max-width: 1366px) {
    .ph-tagline { font-size: 56px !important; line-height: 1.12 !important; }
    .ph-sub { font-size: 18px !important; }
    .ph-cta-primary { font-size: 16px !important; padding: 13px 30px !important; }
    .ph-section { padding: 60px 28px !important; }
    .ph-section-h2 { font-size: 34px !important; }
    .ph-section-sub { font-size: 16px !important; }
    .ph-step-title, .ph-why-title { font-size: 19px !important; }
    .ph-step-body, .ph-why-body { font-size: 14px !important; }
    .ph-final-h2 { font-size: 38px !important; }
    .ph-final-sub { font-size: 18px !important; }
    .ph-pill { font-size: 13px !important; padding: 6px 16px !important; }
    /* Hero compacto verticalmente: la pantalla es solo 682px de alto,
       hero tiene que entrar en ~600px máximo dejando espacio para los
       pills de tipos abajo. */
    .ph-hero { padding: 36px 28px 28px !important; min-height: auto !important; }
    /* Hero container: max-width controlado para que el tagline 56px
       wrapee en 2 líneas centradas y los documentos queden cerca del
       contenido. */
    .ph-hero-content { max-width: 820px !important; }
    /* Cards más chicas y bien en las esquinas para no chocar con texto. */
    .ph-floating-card { width: 150px !important; height: 100px !important; }
    .ph-floating-card[data-card="1"] { top: 32px !important; left: 18px !important; }
    .ph-floating-card[data-card="2"] { top: 28px !important; right: 24px !important; }
    .ph-floating-card[data-card="3"] { bottom: 24px !important; left: 40px !important; }
    .ph-floating-card[data-card="4"] { bottom: 32px !important; right: 18px !important; }
    /* Texto interno de las cards: más chico para que quepa bien. */
    .ph-floating-card .ph-morph-from,
    .ph-floating-card .ph-morph-to { padding: 10px !important; }
  }

  /* Tablet chica / mobile grande (≤900px) — aquí SÍ escondemos cards
     flotantes porque se amontonan, escondemos nav links del header,
     y achicamos todo más agresivamente. */
  @media (max-width: 900px) {
    .ph-floating-card { display: none !important; }
    .ph-nav-links { display: none !important; }
    .ph-tagline { font-size: 36px !important; line-height: 1.18 !important; }
    .ph-sub { font-size: 15px !important; }
    .ph-cta-primary { font-size: 15px !important; padding: 12px 26px !important; }
    .ph-section { padding: 56px 22px !important; }
    .ph-hero { padding: 64px 22px 48px !important; min-height: auto !important; }
    .ph-how-grid, .ph-why-grid { grid-template-columns: 1fr !important; }
    .ph-section-h2 { font-size: 30px !important; }
    .ph-section-sub { font-size: 15px !important; }
    .ph-step-title, .ph-why-title { font-size: 18px !important; }
    .ph-step-body, .ph-why-body { font-size: 14px !important; }
    .ph-final-h2 { font-size: 34px !important; }
    .ph-final-sub { font-size: 17px !important; }
    .ph-pill { font-size: 12px !important; padding: 6px 15px !important; }
  }

  /* Mobile (≤640px) — header simplificado: solo logo + Sign up free + langs.
     "Got a code?" se mueve al hero como botón secundario debajo del CTA.
     PR 56 fix 4: antes Sign in se escondía en mobile porque el plan era
     que el dialog de signup tuviera link "ya tengo cuenta" — pero ese
     dialog nunca se construyó. Sin Sign in visible, un usuario en mobile
     que ya tiene cuenta no puede hacer login. Lo dejamos visible pero
     más compacto. */
  @media (max-width: 640px) {
    .ph-tagline { font-size: 32px !important; line-height: 1.15 !important; }
    .ph-sub { font-size: 16px !important; }
    .ph-cta-primary { font-size: 16px !important; padding: 13px 28px !important; }
    .ph-have-code-btn { display: none !important; }
    .ph-sign-in-btn { font-size: 13px !important; padding: 6px 8px !important; }
    .ph-mobile-code-btn { display: inline-block !important; }
    /* PR 56 fix 3: el header CTA "Sign up free" / "Registrarse gratis"
       se desbordaba en mobile cuando el idioma es ES (palabra larga).
       Padding y font reducidos. La regla específica para header es
       más estricta que .ph-cta-primary que ya está arriba. */
    header .ph-btn-primary { font-size: 13px !important; padding: 7px 11px !important; }
    .ph-section { padding: 56px 20px !important; }
    .ph-section-h2 { font-size: 30px !important; }
    .ph-section-sub { font-size: 16px !important; }
    .ph-step-title, .ph-why-title { font-size: 20px !important; }
    .ph-step-body, .ph-why-body { font-size: 15px !important; }
    .ph-final-h2 { font-size: 34px !important; }
    .ph-final-sub { font-size: 18px !important; }
    .ph-pill { font-size: 13px !important; padding: 6px 14px !important; }
    .ph-header { padding: 12px 18px !important; }
    .ph-header-logo-text { font-size: 18px !important; }
    .ph-header-actions { gap: 6px !important; }
    .ph-header-langs { margin-left: 4px !important; }
    .ph-header-langs button { padding: 5px 8px !important; font-size: 12px !important; }
    .ph-step-card { padding: 28px !important; }
  }

  /* Dialog backdrop */
  .ph-dialog-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
  .ph-dialog { background: ${C.bg}; border-radius: 16px; padding: 28px; width: 100%; max-width: 380px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }

  /* ── Accessibility: honor reduced-motion. The infinite float/morph loops
     and the scroll reveals all collapse to static. (Previously the loops
     ran unconditionally, ignoring the user's OS preference.) */
  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    .ph-float, .ph-morph-from, .ph-morph-to, .ph-fade, .ph-scroll-cue { animation: none !important; }
    .ph-morph-to { opacity: 0; }
    .ph-reveal, .ph-stagger > * { opacity: 1 !important; transform: none !important; transition: none !important; }
  }
`;
