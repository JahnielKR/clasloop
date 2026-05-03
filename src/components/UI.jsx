import { C, FONTS } from '../constants';

export function Logo({ s = 20 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: s + 4, height: s + 4, borderRadius: 7, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width={s * .6} height={s * .6} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="1.8"/><path d="M12 8v4l2.5 2.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <span style={{ fontSize: s * .75, fontWeight: 700, letterSpacing: "-.03em", color: C.text }}>{`clasloop`}</span>
    </div>
  );
}

export function Btn({ children, v = "primary", onClick, disabled, style = {}, full }) {
  const base = { padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, width: full ? "100%" : "auto", opacity: disabled ? .4 : 1, pointerEvents: disabled ? "none" : "auto" };
  const vs = {
    primary: { background: C.accent, color: "#fff" },
    secondary: { background: C.bg, color: C.text, border: `1px solid ${C.border}` },
    danger: { background: C.redSoft, color: C.red },
    ghost: { background: "transparent", color: C.textSecondary, padding: "8px 4px" },
    accent: { background: C.accentSoft, color: C.accent },
    success: { background: C.greenSoft, color: C.green, border: `1px solid ${C.green}33` },
    google: { background: C.bg, color: C.text, border: `1px solid ${C.border}`, fontWeight: 500 },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...vs[v], ...style }}>{children}</button>;
}

export function Card({ children, style = {}, className = "" }) {
  return (
    <div className={className} style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, boxShadow: C.shadow, ...style }}>
      {children}
    </div>
  );
}

export function LangSw({ lang, setLang }) {
  return (
    <div style={{ display: "flex", gap: 2, background: C.bgSoft, borderRadius: 8, padding: 3, border: `1px solid ${C.border}` }}>
      {[["en", "EN"], ["es", "ES"], ["ko", "한"]].map(([c, l]) => (
        <button key={c} onClick={() => setLang(c)} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: lang === c ? C.bg : "transparent", color: lang === c ? C.text : C.textMuted, boxShadow: lang === c ? C.shadow : "none" }}>{l}</button>
      ))}
    </div>
  );
}

export function Nav({ lang, setLang, onBack, right }) {
  return (
    <div style={{ padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: C.bg, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {onBack && <Btn v="ghost" onClick={onBack} style={{ padding: "6px 0", fontSize: 13 }}>←</Btn>}
        <Logo s={20} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{right}<LangSw lang={lang} setLang={setLang} /></div>
    </div>
  );
}

export function Bar({ value, max = 100, color = C.accent, h = 6 }) {
  return (
    <div style={{ width: "100%", height: h, background: C.bgSoft, borderRadius: h }}>
      <div style={{ width: `${Math.min((value / max) * 100, 100)}%`, height: "100%", borderRadius: h, background: color, transition: "width .5s ease" }} />
    </div>
  );
}

export function Timer({ sec, total }) {
  const pct = total > 0 ? (sec / total) * 100 : 0;
  const col = pct > 50 ? C.green : pct > 25 ? C.orange : C.red;
  return (
    <div style={{ width: 40, height: 40, borderRadius: "50%", background: `conic-gradient(${col} ${pct}%, ${C.bgSoft} ${pct}%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, fontFamily: FONTS.mono, color: col }}>{sec}</div>
    </div>
  );
}

export function Stat({ label, value, color = C.accent }) {
  return (
    <div style={{ padding: "16px 18px", borderRadius: 10, background: C.bg, border: `1px solid ${C.border}`, flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: FONTS.mono, lineHeight: 1 }}>{value}</div>
    </div>
  );
}
