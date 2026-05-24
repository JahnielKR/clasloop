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
  /* Desync the doc↔question flip per card (negative delays start each one mid-
     cycle) so they don't all morph in lockstep — reads as alive, not mechanical. */
  [data-card="2"] .ph-morph-from, [data-card="2"] .ph-morph-to { animation-delay: -1.5s; }
  [data-card="3"] .ph-morph-from, [data-card="3"] .ph-morph-to { animation-delay: -3s; }
  [data-card="4"] .ph-morph-from, [data-card="4"] .ph-morph-to { animation-delay: -4.5s; }

  /* Page-load fade for sections */
  @keyframes ph-fade { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
  .ph-fade { animation: ph-fade .4s ease both }

  /* ── Hero entrance choreography ──────────────────────────────────────────
     The first impression. Instead of one flat fade over the whole hero, the
     content rises in sequence (pill → headline → sub → CTA → subtext → cue) on
     the shared easeOut curve, so the eye is led down to the call to action. */
  @keyframes ph-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
  .ph-hero-enter > * { opacity: 0; animation: ph-rise .72s cubic-bezier(.16,1,.3,1) both; }
  .ph-hero-enter > *:nth-child(1) { animation-delay: .06s; }
  .ph-hero-enter > *:nth-child(2) { animation-delay: .15s; }
  .ph-hero-enter > *:nth-child(3) { animation-delay: .25s; }
  .ph-hero-enter > *:nth-child(4) { animation-delay: .35s; }
  .ph-hero-enter > *:nth-child(5) { animation-delay: .45s; }
  .ph-hero-enter > *:nth-child(6) { animation-delay: .55s; }
  .ph-hero-enter > *:nth-child(7) { animation-delay: .62s; }

  /* Floating cards settle in just AFTER the copy, then the float loop carries
     them. We animate the independent \`opacity\` + \`scale\` properties (not
     \`transform\`/\`translate\`), so the entrance composes cleanly with the float
     keyframes (transform) and the imperative parallax (translate). The .is-in
     flag is set on the hero one frame after mount (see Hero.jsx). */
  .ph-hero [data-card] { opacity: 0; scale: .9; transition: opacity .8s ease, scale .8s cubic-bezier(.16,1,.3,1); }
  .ph-hero.is-in [data-card] { opacity: 1; scale: 1; }
  .ph-hero.is-in [data-card="1"] { transition-delay: .50s; }
  .ph-hero.is-in [data-card="2"] { transition-delay: .62s; }
  .ph-hero.is-in [data-card="3"] { transition-delay: .72s; }
  .ph-hero.is-in [data-card="4"] { transition-delay: .82s; }

  /* Reserved depth: a whisper-quiet dot grid behind the hero, masked so it fades
     out under the headline (clean reading) and toward the edges. Static — no
     motion to disable. */
  .ph-hero::before {
    content: ""; position: absolute; inset: 0; z-index: 0; pointer-events: none;
    background-image: radial-gradient(${C.border} 1px, transparent 1px);
    background-size: 26px 26px;
    -webkit-mask-image: radial-gradient(ellipse 66% 58% at 50% 40%, transparent 0%, #000 80%);
            mask-image: radial-gradient(ellipse 66% 58% at 50% 40%, transparent 0%, #000 80%);
    opacity: .55;
  }

  /* ── Ticking "30" in the headline — 3D split-flap (see TickingSeconds.jsx) ──
     Each value re-mounts on change and flips in. A fixed 2ch width + tabular-nums
     means the headline never reflows as the digits change. */
  .ph-secs-fixed { display: inline-block; width: 2ch; text-align: center; font-variant-numeric: tabular-nums; perspective: 320px; }
  .ph-secs-val { display: inline-block; }
  @keyframes ph-num-flip { from { opacity: 0; transform: rotateX(-90deg); } to { opacity: 1; transform: rotateX(0deg); } }
  .ph-secs-flip { animation: ph-num-flip .5s cubic-bezier(.2,.7,.2,1) both; transform-origin: center bottom; }

  /* Quiet dot-grid bookend on the closing CTA — mirrors the hero so the page
     opens and closes on the same texture. Masked to whisper only at the edges. */
  .ph-final-cta::before {
    content: ""; position: absolute; inset: 0; z-index: 0; pointer-events: none;
    background-image: radial-gradient(${C.border} 1px, transparent 1px);
    background-size: 26px 26px;
    -webkit-mask-image: radial-gradient(ellipse 60% 55% at 50% 50%, transparent 0%, #000 86%);
            mask-image: radial-gradient(ellipse 60% 55% at 50% 50%, transparent 0%, #000 86%);
    opacity: .4;
  }

  /* ── Hero machine — the live "60-second" generation funnel (centerpiece) ──
     Inputs flow left → a glowing AI core verifies → finished, verified question
     cards land right. The PARTS animate in once (gated by .ph-hero.is-in,
     transitions on opacity/transform), while their CHILD decorations loop
     forever (light packets, ring spin, ping, verify shimmer) — kept on separate
     elements so the one-shot assembly and the infinite loops never fight over a
     single property. */
  .ph-machine { position: relative; margin: 4px auto 0; max-width: 780px; transition: transform .14s ease-out; will-change: transform; }
  .ph-machine-grid { display: flex; align-items: center; justify-content: center; gap: 0; }
  .ph-mc-col { display: flex; flex-direction: column; gap: 10px; }
  .ph-mc-inputs { width: 176px; flex-shrink: 0; }
  .ph-mc-outputs { width: 300px; flex-shrink: 0; }

  .ph-mc-chip { display: flex; align-items: center; gap: 9px; background: #fff; border: 1px solid ${C.border}; border-radius: 10px; padding: 9px 12px; box-shadow: 0 4px 14px rgba(0,0,0,0.05); }
  .ph-mc-chip-badge { width: 30px; height: 30px; border-radius: 7px; display: grid; place-items: center; color: #fff; font-size: 11px; font-weight: 700; font-family: 'JetBrains Mono', monospace; flex-shrink: 0; }

  /* connector wires + the light packet streaming along them */
  .ph-mc-wire { position: relative; width: 56px; height: 3px; flex-shrink: 0; border-radius: 3px; background: linear-gradient(90deg, rgba(35,131,226,0.14), rgba(35,131,226,0.5)); }
  .ph-mc-wire-out { background: linear-gradient(90deg, rgba(35,131,226,0.5), rgba(35,131,226,0.14)); }
  .ph-mc-packet { position: absolute; top: 50%; left: 0; width: 9px; height: 9px; margin-top: -4.5px; border-radius: 50%; background: ${C.accent}; box-shadow: 0 0 10px 2px rgba(35,131,226,0.7); animation: ph-mc-travel 1.7s cubic-bezier(.5,0,.5,1) infinite; }
  .ph-mc-wire-out .ph-mc-packet { animation-delay: .85s; }
  @keyframes ph-mc-travel { 0% { left: 0; opacity: 0; transform: scale(.5); } 14% { opacity: 1; transform: scale(1); } 76% { opacity: 1; transform: scale(1); } 100% { left: 100%; opacity: 0; transform: scale(.5); } }

  /* the glowing AI core */
  .ph-mc-core-wrap { display: flex; flex-direction: column; align-items: center; }
  .ph-mc-core { position: relative; width: 92px; height: 92px; flex-shrink: 0; display: grid; place-items: center; }
  .ph-mc-core::after { content: ""; position: absolute; inset: -16px; border-radius: 50%; background: radial-gradient(circle, rgba(35,131,226,0.28), transparent 68%); z-index: 0; }
  .ph-mc-core-ring { position: absolute; inset: 0; z-index: 1; animation: ph-spin 3s linear infinite; transform-origin: center; }
  .ph-mc-ping { position: absolute; inset: 14px; z-index: 1; border-radius: 50%; border: 1.5px solid ${C.accent}; animation: ph-mc-ping 2.2s ease-out infinite; }
  .ph-mc-core-orb { position: relative; z-index: 2; width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(150deg, #3f9bef, #2270c9); display: grid; place-items: center; box-shadow: 0 8px 22px rgba(35,131,226,0.45), inset 0 1px 2px rgba(255,255,255,0.45); }
  .ph-mc-core-label { margin-top: 10px; font-size: 12px; font-weight: 700; letter-spacing: .03em; color: ${C.accent}; font-family: 'Outfit', sans-serif; white-space: nowrap; }
  @keyframes ph-spin { to { transform: rotate(360deg); } }
  @keyframes ph-mc-ping { 0% { transform: scale(.7); opacity: .75; } 100% { transform: scale(1.75); opacity: 0; } }

  /* verified output cards + the verify-shimmer that sweeps them */
  .ph-mc-qcard { position: relative; overflow: hidden; border-radius: 12px; padding: 11px 13px; text-align: left; box-shadow: 0 6px 18px rgba(0,0,0,0.06); }
  .ph-mc-qcard-top { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; flex-wrap: wrap; }
  .ph-mc-verified { margin-left: auto; display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 700; color: #0F6E56; background: #E1F5EE; border: 1px solid #1D9E75; border-radius: 100px; padding: 2px 7px; animation: ph-mc-vpop 4.5s ease infinite; transform-origin: center; }
  .ph-mc-qcard::after { content: ""; position: absolute; inset: 0; background: linear-gradient(105deg, transparent 32%, rgba(35,131,226,0.12) 50%, transparent 68%); transform: translateX(-130%); animation: ph-mc-sweep 4.5s ease-in-out infinite; pointer-events: none; }
  .ph-mc-qcard:nth-child(2)::after, .ph-mc-qcard:nth-child(2) .ph-mc-verified { animation-delay: .4s; }
  .ph-mc-qcard:nth-child(3)::after, .ph-mc-qcard:nth-child(3) .ph-mc-verified { animation-delay: .8s; }
  @keyframes ph-mc-sweep { 0%, 42% { transform: translateX(-130%); } 72%, 100% { transform: translateX(130%); } }
  @keyframes ph-mc-vpop { 0%, 58%, 100% { transform: scale(1); } 64% { transform: scale(1.18); } }

  /* entrance assembly — the parts fly in once .is-in is set (one frame after mount) */
  .ph-hero-enter > .ph-machine { opacity: 1; animation: none; }
  .ph-hero .ph-mc-inputs { opacity: 0; transform: translateX(-18px); transition: opacity .6s ease, transform .6s cubic-bezier(.16,1,.3,1); }
  .ph-hero .ph-mc-core-wrap { opacity: 0; transform: scale(.55); transition: opacity .55s ease, transform .6s cubic-bezier(.34,1.56,.64,1); }
  .ph-hero .ph-mc-wire { opacity: 0; transform: scaleX(0); transform-origin: left center; transition: opacity .4s ease, transform .55s cubic-bezier(.16,1,.3,1); }
  .ph-hero .ph-mc-qcard { opacity: 0; transform: translateX(20px) scale(.96); transition: opacity .55s ease, transform .55s cubic-bezier(.16,1,.3,1); }
  .ph-hero.is-in .ph-mc-inputs { opacity: 1; transform: none; transition-delay: .45s; }
  .ph-hero.is-in .ph-mc-wire-in { opacity: 1; transform: none; transition-delay: .62s; }
  .ph-hero.is-in .ph-mc-core-wrap { opacity: 1; transform: none; transition-delay: .72s; }
  .ph-hero.is-in .ph-mc-wire-out { opacity: 1; transform: none; transition-delay: .95s; }
  .ph-hero.is-in .ph-mc-qcard { opacity: 1; transform: none; }
  .ph-hero.is-in .ph-mc-qcard:nth-child(1) { transition-delay: 1.05s; }
  .ph-hero.is-in .ph-mc-qcard:nth-child(2) { transition-delay: 1.18s; }
  .ph-hero.is-in .ph-mc-qcard:nth-child(3) { transition-delay: 1.31s; }

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

  /* ── Product demos (landing PR B): generation + print/scan ── */
  /* Pulsing "AI working" dot */
  @keyframes ph-pulse { 0%,100% { opacity:.35; transform:scale(.82); } 50% { opacity:1; transform:scale(1); } }
  .ph-pulse-dot { animation: ph-pulse 1.1s ease-in-out infinite; }
  /* Indeterminate progress bar fill */
  @keyframes ph-progress { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }
  .ph-progress-bar { animation: ph-progress 1.6s ease-in-out infinite; }
  /* Sweeping scan line over the paper test */
  @keyframes ph-scan { 0% { top: 6%; opacity:.2; } 15% { opacity:1; } 50% { top: 90%; opacity:1; } 65% { opacity:.2; } 100% { top: 6%; opacity:.2; } }
  .ph-scanline { animation: ph-scan 3s ease-in-out infinite; }
  /* Pop-in for the verified badge / graded check (only once revealed) */
  @keyframes ph-pop-in { 0% { opacity:0; transform: scale(.6); } 70% { transform: scale(1.12); } 100% { opacity:1; transform: scale(1); } }
  .is-visible .ph-pop-in { animation: ph-pop-in .45s ease both; }

  /* Hover states */
  .ph-btn-primary { transition: transform .18s cubic-bezier(0.34,1.56,0.64,1), box-shadow .18s ease; }
  .ph-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(35,131,226,0.32); }
  .ph-btn-primary:active { transform: translateY(0); box-shadow: 0 4px 12px rgba(35,131,226,0.28); }
  .ph-btn-primary:focus-visible { outline: none; box-shadow: 0 0 0 3px #fff, 0 0 0 6px rgba(35,131,226,0.55); }
  /* The big hero/closing CTAs sit gently raised even at rest, for presence. */
  .ph-cta-primary { box-shadow: 0 4px 14px rgba(35,131,226,0.25); }
  .ph-nav-link { transition: color .15s; cursor: pointer; }
  .ph-nav-link:hover { color: ${C.text} !important; }
  .ph-cta-secondary { transition: background .15s, border-color .15s; }
  .ph-cta-secondary:hover { background: ${C.bgSoft}; border-color: ${C.textMuted}; }
  .ph-input:focus { border-color: ${C.accent}; box-shadow: 0 0 0 3px ${C.accentSoft}; outline: none; }
  .ph-lang-btn { transition: all .15s ease; cursor: pointer; }

  /* Keyboard focus affordance across landing controls. The primary CTA carries
     its own ring (.ph-btn-primary:focus-visible above); these cover the rest. */
  .ph-nav-link:focus-visible, .ph-cta-secondary:focus-visible, .ph-lang-btn:focus-visible,
  .ph-mobile-code-btn:focus-visible, .ph-rail-stop:focus-visible {
    outline: 2px solid ${C.accent}; outline-offset: 3px; border-radius: 8px;
  }

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
    /* Hero machine stacks vertically: inputs row → core → output cards. The
       horizontal wires are dropped (the vertical flow reads on its own). */
    .ph-machine-grid { flex-direction: column !important; gap: 16px !important; }
    .ph-mc-wire { display: none !important; }
    .ph-mc-inputs { width: 100% !important; flex-direction: row !important; flex-wrap: wrap !important; justify-content: center !important; }
    .ph-mc-outputs { width: 100% !important; max-width: 360px !important; margin: 0 auto !important; }
    .ph-tagline { font-size: 36px !important; line-height: 1.18 !important; }
    .ph-sub { font-size: 15px !important; }
    .ph-cta-primary { font-size: 15px !important; padding: 12px 26px !important; }
    .ph-section { padding: 56px 22px !important; }
    .ph-hero { padding: 64px 22px 48px !important; min-height: auto !important; }
    .ph-how-grid, .ph-why-grid { grid-template-columns: 1fr !important; }
    .ph-print-grid { grid-template-columns: 1fr !important; }
    .ph-ins-grid { grid-template-columns: 1fr !important; }
    .ph-live-grid { grid-template-columns: 1fr !important; }
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
    .ph-float, .ph-morph-from, .ph-morph-to, .ph-fade, .ph-scroll-cue,
    .ph-pulse-dot, .ph-progress-bar, .ph-scanline, .is-visible .ph-pop-in,
    .ph-hero-enter > * { animation: none !important; }
    .ph-morph-to { opacity: 0; }
    .ph-reveal, .ph-stagger > *, .ph-hero-enter > * { opacity: 1 !important; transform: none !important; transition: none !important; }
    .ph-hero [data-card] { opacity: 1 !important; scale: 1 !important; transition: none !important; }
    /* Hero machine → static "before → after" snapshot: parts visible, loops off. */
    .ph-mc-packet, .ph-mc-core-ring, .ph-mc-ping, .ph-mc-verified, .ph-mc-qcard::after { animation: none !important; }
    .ph-mc-packet, .ph-mc-ping, .ph-mc-qcard::after { display: none !important; }
    .ph-hero .ph-mc-inputs, .ph-hero .ph-mc-core-wrap, .ph-hero .ph-mc-wire, .ph-hero .ph-mc-qcard { opacity: 1 !important; transform: none !important; transition: none !important; }
    /* Headline number holds on the honest anchor (30), never flips. */
    .ph-secs-flip { animation: none !important; }
  }
`;
