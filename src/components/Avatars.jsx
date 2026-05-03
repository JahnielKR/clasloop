// ─── Clasloop Avatar System ─────────────────────────
// 30 unique SVG character avatars with rarity tiers
// Usage: <Avatar id="fox" size={48} /> or <Avatar id="fox" size={48} locked />

const D = {
  blue: "#2383E2", purple: "#6940A5", green: "#0F7B6C", orange: "#D9730D",
  red: "#E03E3E", gold: "#D4A017", pink: "#C84B8B", cyan: "#0EA5E9",
  teal: "#14B8A6", lime: "#84CC16", amber: "#F59E0B", indigo: "#6366F1",
};

const RARITY = {
  free:      { label: { en: "Free", es: "Gratis", ko: "무료" }, bg: "#F7F7F5", border: "#E8E8E4", text: "#9B9B9B", glow: "none" },
  common:    { label: { en: "Common", es: "Común", ko: "일반" }, bg: "#E8F0FE", border: "#2383E244", text: "#2383E2", glow: "none" },
  rare:      { label: { en: "Rare", es: "Raro", ko: "레어" }, bg: "#F3EEFB", border: "#6940A544", text: "#6940A5", glow: `0 0 12px #6940A522` },
  epic:      { label: { en: "Epic", es: "Épico", ko: "에픽" }, bg: "#FFF3E0", border: "#D9730D44", text: "#D9730D", glow: `0 0 16px #D9730D22` },
  legendary: { label: { en: "Legendary", es: "Legendario", ko: "전설" }, bg: "#FEF9E7", border: "#D4A01744", text: "#D4A017", glow: `0 0 20px #D4A01733` },
  mythic:    { label: { en: "Mythic", es: "Mítico", ko: "신화" }, bg: "linear-gradient(135deg, #F3EEFB, #E8F0FE)", border: "#6366F144", text: "#6366F1", glow: `0 0 24px #6366F133` },
};

// ─── Character Definitions ──────────────────────────
// Each character has: id, name (3 langs), rarity, unlockLevel, colors, face definition
export const AVATARS = [
  // ── Free (10) — unlocked from the start ──
  { id: "loopy", name: { en: "Loopy", es: "Loopy", ko: "루피" }, rarity: "free", unlock: 0,
    body: "#2383E2", accent: "#6940A5", eyes: "happy", shape: "round" },
  { id: "sparky", name: { en: "Sparky", es: "Sparky", ko: "스파키" }, rarity: "free", unlock: 0,
    body: "#D9730D", accent: "#D4A017", eyes: "excited", shape: "round" },
  { id: "luna", name: { en: "Luna", es: "Luna", ko: "루나" }, rarity: "free", unlock: 0,
    body: "#6940A5", accent: "#C84B8B", eyes: "calm", shape: "round" },
  { id: "boba", name: { en: "Boba", es: "Boba", ko: "보바" }, rarity: "free", unlock: 0,
    body: "#0F7B6C", accent: "#14B8A6", eyes: "happy", shape: "round" },
  { id: "pip", name: { en: "Pip", es: "Pip", ko: "핍" }, rarity: "free", unlock: 0,
    body: "#E03E3E", accent: "#D9730D", eyes: "cheeky", shape: "round" },
  { id: "cloud", name: { en: "Cloud", es: "Nube", ko: "구름" }, rarity: "free", unlock: 0,
    body: "#0EA5E9", accent: "#2383E2", eyes: "sleepy", shape: "round" },
  { id: "mochi", name: { en: "Mochi", es: "Mochi", ko: "모찌" }, rarity: "free", unlock: 0,
    body: "#C84B8B", accent: "#6940A5", eyes: "happy", shape: "round" },
  { id: "leaf", name: { en: "Leaf", es: "Hoja", ko: "리프" }, rarity: "free", unlock: 0,
    body: "#84CC16", accent: "#0F7B6C", eyes: "calm", shape: "round" },
  { id: "sunny", name: { en: "Sunny", es: "Sol", ko: "써니" }, rarity: "free", unlock: 0,
    body: "#F59E0B", accent: "#D9730D", eyes: "excited", shape: "round" },
  { id: "pebble", name: { en: "Pebble", es: "Piedra", ko: "페블" }, rarity: "free", unlock: 0,
    body: "#6B6B6B", accent: "#9B9B9B", eyes: "calm", shape: "round" },

  // ── Common (6) — unlock at low levels ──
  { id: "bolt", name: { en: "Bolt", es: "Rayo", ko: "볼트" }, rarity: "common", unlock: 3,
    body: "#D4A017", accent: "#F59E0B", eyes: "excited", shape: "angular" },
  { id: "frost", name: { en: "Frost", es: "Hielo", ko: "프로스트" }, rarity: "common", unlock: 5,
    body: "#0EA5E9", accent: "#A4DDED", eyes: "calm", shape: "angular" },
  { id: "bloom", name: { en: "Bloom", es: "Flor", ko: "블룸" }, rarity: "common", unlock: 7,
    body: "#C84B8B", accent: "#F3EEFB", eyes: "happy", shape: "angular" },
  { id: "orbit", name: { en: "Orbit", es: "Órbita", ko: "오비트" }, rarity: "common", unlock: 8,
    body: "#6366F1", accent: "#2383E2", eyes: "curious", shape: "angular" },
  { id: "ember", name: { en: "Ember", es: "Brasa", ko: "엠버" }, rarity: "common", unlock: 10,
    body: "#E03E3E", accent: "#D4A017", eyes: "fierce", shape: "angular" },
  { id: "moss", name: { en: "Moss", es: "Musgo", ko: "모스" }, rarity: "common", unlock: 12,
    body: "#0F7B6C", accent: "#84CC16", eyes: "sleepy", shape: "angular" },

  // ── Rare (5) — unlock at mid levels ──
  { id: "nova", name: { en: "Nova", es: "Nova", ko: "노바" }, rarity: "rare", unlock: 15,
    body: "#6940A5", accent: "#D4A017", eyes: "cosmic", shape: "star" },
  { id: "pixel", name: { en: "Pixel", es: "Pixel", ko: "픽셀" }, rarity: "rare", unlock: 18,
    body: "#2383E2", accent: "#0EA5E9", eyes: "digital", shape: "square" },
  { id: "blaze", name: { en: "Blaze", es: "Llama", ko: "블레이즈" }, rarity: "rare", unlock: 20,
    body: "#D9730D", accent: "#E03E3E", eyes: "fierce", shape: "flame" },
  { id: "crystal", name: { en: "Crystal", es: "Cristal", ko: "크리스탈" }, rarity: "rare", unlock: 22,
    body: "#14B8A6", accent: "#0EA5E9", eyes: "sparkle", shape: "diamond" },
  { id: "shadow", name: { en: "Shadow", es: "Sombra", ko: "쉐도우" }, rarity: "rare", unlock: 25,
    body: "#1a1a2e", accent: "#6940A5", eyes: "mysterious", shape: "ghost" },

  // ── Epic (5) — unlock at high levels ──
  { id: "phoenix", name: { en: "Phoenix", es: "Fénix", ko: "피닉스" }, rarity: "epic", unlock: 28,
    body: "#D9730D", accent: "#D4A017", eyes: "majestic", shape: "winged" },
  { id: "nebula", name: { en: "Nebula", es: "Nebulosa", ko: "네뷸라" }, rarity: "epic", unlock: 30,
    body: "#6366F1", accent: "#C84B8B", eyes: "cosmic", shape: "cloud" },
  { id: "titan", name: { en: "Titan", es: "Titán", ko: "타이탄" }, rarity: "epic", unlock: 33,
    body: "#E03E3E", accent: "#D4A017", eyes: "fierce", shape: "crown" },
  { id: "aurora", name: { en: "Aurora", es: "Aurora", ko: "오로라" }, rarity: "epic", unlock: 35,
    body: "#0F7B6C", accent: "#0EA5E9", eyes: "dreamy", shape: "wave" },
  { id: "cipher", name: { en: "Cipher", es: "Cifra", ko: "사이퍼" }, rarity: "epic", unlock: 38,
    body: "#2383E2", accent: "#6940A5", eyes: "digital", shape: "hex" },

  // ── Legendary (3) — very high levels ──
  { id: "cosmos", name: { en: "Cosmos", es: "Cosmos", ko: "코스모스" }, rarity: "legendary", unlock: 40,
    body: "#1a1a2e", accent: "#D4A017", eyes: "galactic", shape: "cosmic" },
  { id: "prism", name: { en: "Prism", es: "Prisma", ko: "프리즘" }, rarity: "legendary", unlock: 45,
    body: "rainbow", accent: "#fff", eyes: "sparkle", shape: "prism" },
  { id: "zenith", name: { en: "Zenith", es: "Cénit", ko: "제니스" }, rarity: "legendary", unlock: 50,
    body: "#D4A017", accent: "#fff", eyes: "majestic", shape: "sun" },

  // ── Mythic (1) — the ultimate reward ──
  { id: "clasbot", name: { en: "Clasbot", es: "Clasbot", ko: "클래스봇" }, rarity: "mythic", unlock: 100,
    body: "#2383E2", accent: "#6940A5", eyes: "ai", shape: "bot" },
];

// ─── Eye Styles ─────────────────────────────────────
function Eyes({ type, x = 12, y = 11, s = 1 }) {
  const ex = x - 3.5 * s, ex2 = x + 3.5 * s;
  switch (type) {
    case "happy": return <><circle cx={ex} cy={y} r={1.8*s} fill="#1a1a2e"/><circle cx={ex2} cy={y} r={1.8*s} fill="#1a1a2e"/><circle cx={ex+0.6*s} cy={y-0.6*s} r={0.6*s} fill="#fff"/><circle cx={ex2+0.6*s} cy={y-0.6*s} r={0.6*s} fill="#fff"/><path d={`M${x-2*s},${y+3*s} Q${x},${y+5*s} ${x+2*s},${y+3*s}`} stroke="#1a1a2e" strokeWidth={1.2*s} strokeLinecap="round" fill="none"/></>;
    case "excited": return <><circle cx={ex} cy={y} r={2.2*s} fill="#1a1a2e"/><circle cx={ex2} cy={y} r={2.2*s} fill="#1a1a2e"/><circle cx={ex+0.8*s} cy={y-0.7*s} r={0.8*s} fill="#fff"/><circle cx={ex2+0.8*s} cy={y-0.7*s} r={0.8*s} fill="#fff"/><ellipse cx={x} cy={y+3.5*s} rx={2*s} ry={1.5*s} fill="#1a1a2e"/></>;
    case "calm": return <><path d={`M${ex-1.5*s},${y} Q${ex},${y-1.5*s} ${ex+1.5*s},${y}`} stroke="#1a1a2e" strokeWidth={1.5*s} strokeLinecap="round" fill="none"/><path d={`M${ex2-1.5*s},${y} Q${ex2},${y-1.5*s} ${ex2+1.5*s},${y}`} stroke="#1a1a2e" strokeWidth={1.5*s} strokeLinecap="round" fill="none"/><circle cx={x} cy={y+3*s} r={1*s} fill="#1a1a2e" opacity="0.3"/></>;
    case "cheeky": return <><circle cx={ex} cy={y} r={1.8*s} fill="#1a1a2e"/><path d={`M${ex2-1.5*s},${y+0.5*s} L${ex2+1.5*s},${y-1*s}`} stroke="#1a1a2e" strokeWidth={1.5*s} strokeLinecap="round"/><circle cx={ex+0.6*s} cy={y-0.6*s} r={0.5*s} fill="#fff"/><path d={`M${x-1.5*s},${y+3*s} Q${x+1*s},${y+5*s} ${x+2.5*s},${y+3*s}`} stroke="#1a1a2e" strokeWidth={1.2*s} strokeLinecap="round" fill="none"/></>;
    case "sleepy": return <><path d={`M${ex-1.5*s},${y} Q${ex},${y+1*s} ${ex+1.5*s},${y}`} stroke="#1a1a2e" strokeWidth={1.5*s} strokeLinecap="round" fill="none"/><path d={`M${ex2-1.5*s},${y} Q${ex2},${y+1*s} ${ex2+1.5*s},${y}`} stroke="#1a1a2e" strokeWidth={1.5*s} strokeLinecap="round" fill="none"/><circle cx={x} cy={y+3.5*s} r={0.8*s} fill="#1a1a2e" opacity="0.2"/></>;
    case "curious": return <><circle cx={ex} cy={y} r={2*s} fill="#1a1a2e"/><circle cx={ex2} cy={y-0.5*s} r={2.5*s} fill="#1a1a2e"/><circle cx={ex+0.5*s} cy={y-0.6*s} r={0.6*s} fill="#fff"/><circle cx={ex2+0.8*s} cy={y-1*s} r={0.8*s} fill="#fff"/></>;
    case "fierce": return <><path d={`M${ex-2*s},${y-1.5*s} L${ex+2*s},${y-0.5*s}`} stroke="#1a1a2e" strokeWidth={1.2*s} strokeLinecap="round"/><path d={`M${ex2-2*s},${y-0.5*s} L${ex2+2*s},${y-1.5*s}`} stroke="#1a1a2e" strokeWidth={1.2*s} strokeLinecap="round"/><circle cx={ex} cy={y+0.5*s} r={1.5*s} fill="#1a1a2e"/><circle cx={ex2} cy={y+0.5*s} r={1.5*s} fill="#1a1a2e"/><path d={`M${x-2*s},${y+3*s} L${x},${y+4*s} L${x+2*s},${y+3*s}`} stroke="#1a1a2e" strokeWidth={1.2*s} strokeLinecap="round" strokeLinejoin="round" fill="none"/></>;
    case "cosmic": return <><circle cx={ex} cy={y} r={2*s} fill="#D4A017"/><circle cx={ex2} cy={y} r={2*s} fill="#D4A017"/><circle cx={ex} cy={y} r={0.8*s} fill="#1a1a2e"/><circle cx={ex2} cy={y} r={0.8*s} fill="#1a1a2e"/></>;
    case "digital": return <><rect x={ex-2*s} y={y-1.5*s} width={4*s} height={3*s} rx={0.5*s} fill="#1a1a2e"/><rect x={ex2-2*s} y={y-1.5*s} width={4*s} height={3*s} rx={0.5*s} fill="#1a1a2e"/><rect x={ex-0.5*s} y={y-0.5*s} width={1*s} height={1*s} fill="#0EA5E9"/><rect x={ex2-0.5*s} y={y-0.5*s} width={1*s} height={1*s} fill="#0EA5E9"/></>;
    case "sparkle": return <><path d={`M${ex},${y-2*s} L${ex+0.5*s},${y-0.5*s} L${ex+2*s},${y} L${ex+0.5*s},${y+0.5*s} L${ex},${y+2*s} L${ex-0.5*s},${y+0.5*s} L${ex-2*s},${y} L${ex-0.5*s},${y-0.5*s} Z`} fill="#D4A017"/><path d={`M${ex2},${y-2*s} L${ex2+0.5*s},${y-0.5*s} L${ex2+2*s},${y} L${ex2+0.5*s},${y+0.5*s} L${ex2},${y+2*s} L${ex2-0.5*s},${y+0.5*s} L${ex2-2*s},${y} L${ex2-0.5*s},${y-0.5*s} Z`} fill="#D4A017"/></>;
    case "mysterious": return <><circle cx={ex} cy={y} r={1.5*s} fill="#6940A5"/><circle cx={ex2} cy={y} r={1.5*s} fill="#6940A5"/><circle cx={ex} cy={y} r={0.5*s} fill="#fff"/><circle cx={ex2} cy={y} r={0.5*s} fill="#fff"/></>;
    case "majestic": return <><circle cx={ex} cy={y} r={2*s} fill="#D4A017" opacity="0.3"/><circle cx={ex} cy={y} r={1.2*s} fill="#1a1a2e"/><circle cx={ex+0.4*s} cy={y-0.4*s} r={0.4*s} fill="#D4A017"/><circle cx={ex2} cy={y} r={2*s} fill="#D4A017" opacity="0.3"/><circle cx={ex2} cy={y} r={1.2*s} fill="#1a1a2e"/><circle cx={ex2+0.4*s} cy={y-0.4*s} r={0.4*s} fill="#D4A017"/></>;
    case "dreamy": return <><ellipse cx={ex} cy={y} rx={2*s} ry={1.2*s} fill="#1a1a2e" opacity="0.6"/><ellipse cx={ex2} cy={y} rx={2*s} ry={1.2*s} fill="#1a1a2e" opacity="0.6"/><circle cx={ex+0.8*s} cy={y-0.3*s} r={0.5*s} fill="#fff" opacity="0.6"/><circle cx={ex2+0.8*s} cy={y-0.3*s} r={0.5*s} fill="#fff" opacity="0.6"/></>;
    case "galactic": return <><circle cx={ex} cy={y} r={2.5*s} fill="none" stroke="#D4A017" strokeWidth={0.8*s}/><circle cx={ex} cy={y} r={1*s} fill="#D4A017"/><circle cx={ex2} cy={y} r={2.5*s} fill="none" stroke="#D4A017" strokeWidth={0.8*s}/><circle cx={ex2} cy={y} r={1*s} fill="#D4A017"/><circle cx={ex} cy={y-2.5*s} r={0.4*s} fill="#D4A017"/><circle cx={ex2} cy={y-2.5*s} r={0.4*s} fill="#D4A017"/></>;
    case "ai": return <><rect x={ex-2*s} y={y-2*s} width={4*s} height={4*s} rx={1*s} fill="#2383E2" opacity="0.3"/><rect x={ex2-2*s} y={y-2*s} width={4*s} height={4*s} rx={1*s} fill="#6940A5" opacity="0.3"/><circle cx={ex} cy={y} r={1*s} fill="#2383E2"/><circle cx={ex2} cy={y} r={1*s} fill="#6940A5"/><path d={`M${x-2*s},${y+3.5*s} Q${x},${y+5*s} ${x+2*s},${y+3.5*s}`} stroke="#2383E2" strokeWidth={1*s} strokeLinecap="round" fill="none"/></>;
    default: return <><circle cx={ex} cy={y} r={1.8*s} fill="#1a1a2e"/><circle cx={ex2} cy={y} r={1.8*s} fill="#1a1a2e"/></>;
  }
}

// ─── Shape decorations ──────────────────────────────
function ShapeDecor({ shape, accent, s = 1 }) {
  switch (shape) {
    case "angular": return <><path d={`M3,5 L5,2 L7,5`} fill={accent} opacity="0.3"/><path d={`M17,5 L19,2 L21,5`} fill={accent} opacity="0.3"/></>;
    case "star": return <><path d={`M12,1 L13,4 L16,4 L13.5,6 L14.5,9 L12,7 L9.5,9 L10.5,6 L8,4 L11,4 Z`} fill={accent} opacity="0.25"/></>;
    case "square": return <><rect x="3" y="3" width="3" height="3" rx="0.5" fill={accent} opacity="0.2"/><rect x="18" y="3" width="3" height="3" rx="0.5" fill={accent} opacity="0.2"/></>;
    case "flame": return <><path d={`M4,18 C2,14 4,8 7,6 C7,10 9,8 9,6 C12,10 7,14 4,18`} fill={accent} opacity="0.15"/><path d={`M20,18 C22,14 20,8 17,6 C17,10 15,8 15,6 C12,10 17,14 20,18`} fill={accent} opacity="0.15"/></>;
    case "diamond": return <><path d={`M12,1 L16,5 L12,9 L8,5 Z`} fill={accent} opacity="0.2" stroke={accent} strokeWidth="0.5"/></>;
    case "ghost": return <><path d={`M5,22 L5,20 L7,22 L9,20 L11,22`} fill={accent} opacity="0.15"/><path d={`M13,22 L15,20 L17,22 L19,20 L19,22`} fill={accent} opacity="0.15"/></>;
    case "winged": return <><path d={`M2,14 C0,10 2,7 5,8 L7,12`} fill={accent} opacity="0.2"/><path d={`M22,14 C24,10 22,7 19,8 L17,12`} fill={accent} opacity="0.2"/></>;
    case "cloud": return <><circle cx="5" cy="6" r="2.5" fill={accent} opacity="0.12"/><circle cx="19" cy="6" r="2.5" fill={accent} opacity="0.12"/><circle cx="12" cy="4" r="3" fill={accent} opacity="0.1"/></>;
    case "crown": return <><path d={`M5,4 L8,7 L12,3 L16,7 L19,4 L19,8 L5,8 Z`} fill={accent} opacity="0.25"/></>;
    case "wave": return <><path d={`M0,20 Q6,16 12,20 Q18,24 24,20`} fill={accent} opacity="0.1" stroke={accent} strokeWidth="0.5" opacity="0.2"/></>;
    case "hex": return <><path d={`M12,1 L18,4 L18,10 L12,13 L6,10 L6,4 Z`} fill="none" stroke={accent} strokeWidth="0.8" opacity="0.2"/></>;
    case "cosmic": return <><circle cx="4" cy="4" r="1" fill={accent} opacity="0.4"/><circle cx="20" cy="6" r="0.7" fill={accent} opacity="0.3"/><circle cx="6" cy="20" r="0.5" fill={accent} opacity="0.2"/><circle cx="18" cy="18" r="0.8" fill={accent} opacity="0.3"/></>;
    case "prism": return <><path d={`M12,1 L22,12 L12,23 L2,12 Z`} fill="none" stroke="url(#rainbowStroke)" strokeWidth="0.8" opacity="0.3"/></>;
    case "sun": return <>{[0,45,90,135,180,225,270,315].map((a,i) => <line key={i} x1="12" y1="12" x2={12+9*Math.cos(a*Math.PI/180)} y2={12+9*Math.sin(a*Math.PI/180)} stroke={accent} strokeWidth="0.5" opacity="0.15"/>)}</>;
    case "bot": return <><rect x="4" y="1" width="16" height="3" rx="1.5" fill={accent} opacity="0.2"/><circle cx="12" cy="1" r="1" fill={accent} opacity="0.3"/></>;
    default: return null;
  }
}

// ─── Avatar Component ───────────────────────────────
export function Avatar({ id, size = 48, locked = false, showName = false, lang = "en" }) {
  const avatar = AVATARS.find(a => a.id === id) || AVATARS[0];
  const rarity = RARITY[avatar.rarity];
  const s = size / 24;

  const bodyColor = avatar.body === "rainbow"
    ? "url(#rainbowFill)"
    : avatar.body;

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{
        width: size, height: size, borderRadius: size * 0.35,
        background: rarity.bg, border: `2px solid ${locked ? "#E8E8E4" : rarity.border}`,
        boxShadow: locked ? "none" : rarity.glow,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
        filter: locked ? "grayscale(1) opacity(0.4)" : "none",
      }}>
        <svg width={size * 0.85} height={size * 0.85} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="rainbowFill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#E03E3E"/><stop offset="25%" stopColor="#D9730D"/>
              <stop offset="50%" stopColor="#0F7B6C"/><stop offset="75%" stopColor="#2383E2"/>
              <stop offset="100%" stopColor="#6940A5"/>
            </linearGradient>
            <linearGradient id="rainbowStroke" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#E03E3E"/><stop offset="50%" stopColor="#2383E2"/>
              <stop offset="100%" stopColor="#6940A5"/>
            </linearGradient>
          </defs>

          {/* Shape decoration */}
          <ShapeDecor shape={avatar.shape} accent={avatar.accent} s={s * 0.7} />

          {/* Body */}
          <circle cx="12" cy="13" r="8" fill={bodyColor} opacity="0.2"/>
          <circle cx="12" cy="13" r="8" fill="none" stroke={bodyColor} strokeWidth="1.5"/>

          {/* Face */}
          <Eyes type={avatar.eyes} x={12} y={11} s={0.9} />

          {/* Accent cheeks */}
          <circle cx="7" cy="14" r="1.5" fill={avatar.accent} opacity="0.15"/>
          <circle cx="17" cy="14" r="1.5" fill={avatar.accent} opacity="0.15"/>
        </svg>

        {/* Lock overlay */}
        {locked && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,0.5)", borderRadius: size * 0.35,
          }}>
            <svg width={size*0.3} height={size*0.3} viewBox="0 0 24 24" fill="none">
              <rect x="5" y="11" width="14" height="10" rx="2" fill="#9B9B9B" opacity="0.6"/>
              <path d="M8,11 L8,8 C8,5 9.8,3 12,3 C14.2,3 16,5 16,8 L16,11" fill="none" stroke="#9B9B9B" strokeWidth="2" opacity="0.6"/>
            </svg>
          </div>
        )}
      </div>

      {showName && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: Math.max(10, size * 0.2), fontWeight: 600, color: locked ? "#9B9B9B" : "#191919" }}>
            {avatar.name[lang]}
          </div>
          <div style={{
            fontSize: Math.max(8, size * 0.15), fontWeight: 500,
            color: rarity.text, opacity: locked ? 0.5 : 1,
          }}>
            {rarity.label[lang]}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Avatar Picker Component ────────────────────────
export function AvatarPicker({ currentId, level = 0, onSelect, lang = "en", size = 56 }) {
  const byRarity = {};
  AVATARS.forEach(a => {
    if (!byRarity[a.rarity]) byRarity[a.rarity] = [];
    byRarity[a.rarity].push(a);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {Object.entries(byRarity).map(([rarity, avatars]) => (
        <div key={rarity}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: RARITY[rarity].text,
            marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            {RARITY[rarity].label[lang]} ({avatars.filter(a => a.unlock <= level).length}/{avatars.length})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {avatars.map(a => {
              const unlocked = a.unlock <= level;
              const selected = a.id === currentId;
              return (
                <div key={a.id} onClick={() => unlocked && onSelect(a.id)} style={{
                  cursor: unlocked ? "pointer" : "default",
                  padding: 4, borderRadius: size * 0.35 + 4,
                  border: selected ? `2px solid ${RARITY[a.rarity].text}` : "2px solid transparent",
                  transition: "all .15s",
                }}>
                  <Avatar id={a.id} size={size} locked={!unlocked} showName lang={lang} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export { RARITY };
export default Avatar;
