// ─── Clasloop Icon System v2 — Complete ─────────────
// Replaces ALL emojis across the entire app
// Style: Filled shapes with soft backgrounds, brand colors, personality

const D = {
  blue: "#2383E2", purple: "#6940A5", green: "#0F7B6C", orange: "#D9730D",
  red: "#E03E3E", gold: "#D4A017", muted: "#9B9B9B", bg: "#F7F7F5",
};

const S = (size, vb, children) => (
  <svg width={size} height={size} viewBox={vb || "0 0 24 24"} fill="none" xmlns="http://www.w3.org/2000/svg">{children}</svg>
);

// ─── Logo ───────────────────────────────────────────
export function LogoMark({ size = 28 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.25, background: `linear-gradient(135deg, ${D.blue}, ${D.purple})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {S(size * 0.6, "0 0 20 20", <>
        <path d="M10.5,4 C7.5,4 5.5,6.5 5.5,10 C5.5,13.5 7.5,16 10.5,16" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
        <path d="M11.5,4 L11.5,16 L15.5,16" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="15.5" cy="16" r="1.3" fill="#FFEAA7"/>
      </>)}
    </div>
  );
}

// ─── Icon with Background Container ─────────────────
function IconBg({ bg, border, size = 32, children }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.28, background: bg, border: `1px solid ${border || "transparent"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {children}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// SIDEBAR NAV ICONS (with background)
// ══════════════════════════════════════════════════════

export function SessionsIcon({ size = 32, active = false }) {
  const c = active ? D.blue : D.muted;
  return (
    <IconBg bg={active ? "#E8F0FE" : D.bg} border={active ? D.blue + "33" : "transparent"} size={size}>
      {S(size * 0.55, "0 0 24 24", <>
        <rect x="3" y="4" width="18" height="14" rx="3" fill={active ? D.blue + "18" : "none"} stroke={c} strokeWidth="2"/>
        <path d="M10,8 L10,14 L15,11 Z" fill={active ? D.blue + "33" : "none"} stroke={c} strokeWidth="1.8" strokeLinejoin="round"/>
        <path d="M16,18 C14,21 18,22 20,20" stroke={active ? D.orange : D.muted + "66"} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      </>)}
    </IconBg>
  );
}

export function AIGenIcon({ size = 32, active = false }) {
  const c = active ? D.purple : D.muted;
  return (
    <IconBg bg={active ? "#F3EEFB" : D.bg} border={active ? D.purple + "33" : "transparent"} size={size}>
      {S(size * 0.55, "0 0 24 24", <>
        <path d="M12,3 C8.5,3 6,5.5 6,9 C6,11.5 7.5,13.5 9,14.5 L9,18 C9,19 10,20 11,20 L13,20 C14,20 15,19 15,18 L15,14.5 C16.5,13.5 18,11.5 18,9 C18,5.5 15.5,3 12,3 Z" fill={active ? D.purple + "15" : "none"} stroke={c} strokeWidth="1.8" strokeLinejoin="round"/>
        <circle cx="10" cy="9" r="1.2" fill={c}/>
        <circle cx="14" cy="9" r="1.2" fill={c}/>
        <path d="M10,12 C10,12 11,13.5 12,13.5 C13,13.5 14,12 14,12" stroke={c} strokeWidth="1.3" strokeLinecap="round" fill="none"/>
        <circle cx="18" cy="3" r="1.8" fill={active ? D.gold : D.muted + "44"}/>
        <circle cx="20" cy="6" r="1" fill={active ? D.gold : D.muted + "33"}/>
      </>)}
    </IconBg>
  );
}

export function SchoolIcon({ size = 32, active = false }) {
  const c = active ? D.green : D.muted;
  return (
    <IconBg bg={active ? "#EEFBF5" : D.bg} border={active ? D.green + "33" : "transparent"} size={size}>
      {S(size * 0.55, "0 0 24 24", <>
        <path d="M5,20 L5,11 L12,6 L19,11 L19,20" fill={active ? D.green + "12" : "none"} stroke={c} strokeWidth="1.8" strokeLinejoin="round"/>
        <rect x="9" y="14" width="6" height="6" rx="1" stroke={c} strokeWidth="1.5"/>
        <circle cx="12" cy="11" r="1.5" fill={c} opacity="0.4"/>
        <path d="M17,7 L17,4 L20,5.5 Z" fill={active ? D.orange : D.muted + "66"}/>
      </>)}
    </IconBg>
  );
}

export function CommunityIcon({ size = 32, active = false }) {
  const c1 = active ? D.blue : D.muted;
  const c2 = active ? D.purple : D.muted;
  return (
    <IconBg bg={active ? "#E8F0FE" : D.bg} border={active ? D.blue + "33" : "transparent"} size={size}>
      {S(size * 0.55, "0 0 24 24", <>
        <circle cx="8" cy="8" r="3.5" fill={active ? D.blue + "15" : "none"} stroke={c1} strokeWidth="1.8"/>
        <circle cx="16" cy="8" r="3.5" fill={active ? D.purple + "15" : "none"} stroke={c2} strokeWidth="1.8"/>
        <path d="M2,20 C2,16 4.5,14 8,14 C10,14 11.5,14.7 12,15.5" stroke={c1} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
        <path d="M12,15.5 C12.5,14.7 14,14 16,14 C19.5,14 22,16 22,20" stroke={c2} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
        <circle cx="12" cy="18" r="1.5" fill={active ? D.green : D.muted + "55"}/>
      </>)}
    </IconBg>
  );
}

export function NotificationsIcon({ size = 32, active = false, badge = 0 }) {
  const c = active ? D.orange : D.muted;
  return (
    <IconBg bg={active ? "#FFF3E0" : D.bg} border={active ? D.orange + "33" : "transparent"} size={size}>
      {S(size * 0.55, "0 0 24 24", <>
        <path d="M6,16 C6,10 8.5,5 12,5 C15.5,5 18,10 18,16 L20,18 L4,18 Z" fill={active ? D.orange + "15" : "none"} stroke={c} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>
        <path d="M10,19 C10,20.5 10.8,22 12,22 C13.2,22 14,20.5 14,19" stroke={c} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <line x1="12" y1="2" x2="12" y2="5" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
        {badge > 0 && <><circle cx="17" cy="6" r="4" fill={D.red}/><text x="17" y="8" textAnchor="middle" fontSize="6" fill="#fff" fontWeight="600" fontFamily="sans-serif">{badge > 9 ? "9+" : badge}</text></>}
      </>)}
    </IconBg>
  );
}

export function SettingsIcon({ size = 32, active = false }) {
  const c1 = active ? D.blue : D.muted;
  const c2 = active ? D.purple : D.muted;
  return (
    <IconBg bg={active ? D.bg : D.bg} border={active ? D.blue + "22" : "transparent"} size={size}>
      {S(size * 0.55, "0 0 24 24", <>
        <line x1="4" y1="7" x2="20" y2="7" stroke={D.muted + "66"} strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="4" y1="12" x2="20" y2="12" stroke={D.muted + "66"} strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="4" y1="17" x2="20" y2="17" stroke={D.muted + "66"} strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="9" cy="7" r="2.8" fill="#fff" stroke={active ? D.blue : D.muted} strokeWidth="1.8"/>
        <circle cx="9" cy="7" r="1" fill={active ? D.blue : D.muted}/>
        <circle cx="15" cy="12" r="2.8" fill="#fff" stroke={active ? D.purple : D.muted} strokeWidth="1.8"/>
        <circle cx="15" cy="12" r="1" fill={active ? D.purple : D.muted}/>
        <circle cx="11" cy="17" r="2.8" fill="#fff" stroke={active ? D.green : D.muted} strokeWidth="1.8"/>
        <circle cx="11" cy="17" r="1" fill={active ? D.green : D.muted}/>
      </>)}
    </IconBg>
  );
}

export function JoinSessionIcon({ size = 32, active = false }) {
  const c = active ? D.green : D.muted;
  return (
    <IconBg bg={active ? "#EEFBF5" : D.bg} border={active ? D.green + "33" : "transparent"} size={size}>
      {S(size * 0.55, "0 0 24 24", <>
        <rect x="6" y="3" width="14" height="18" rx="3" fill={active ? D.green + "12" : "none"} stroke={c} strokeWidth="1.8"/>
        <circle cx="13" cy="12" r="4" stroke={c} strokeWidth="1.5" strokeDasharray="3 2.5" fill="none"/>
        <line x1="13" y1="9.5" x2="13" y2="14.5" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="10.5" y1="12" x2="15.5" y2="12" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M2,12 L6,12" stroke={active ? D.blue : D.muted + "66"} strokeWidth="2" strokeLinecap="round"/>
        <path d="M3,10 L6,12 L3,14" stroke={active ? D.blue : D.muted + "66"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </>)}
    </IconBg>
  );
}

export function ProgressIcon({ size = 32, active = false }) {
  return (
    <IconBg bg={active ? "#E8F0FE" : D.bg} border={active ? D.blue + "33" : "transparent"} size={size}>
      {S(size * 0.55, "0 0 24 24", <>
        <rect x="3" y="14" width="5" height="8" rx="1.5" fill={active ? D.blue + "30" : "none"} stroke={active ? D.blue : D.muted} strokeWidth="1.5"/>
        <rect x="10" y="9" width="5" height="13" rx="1.5" fill={active ? D.purple + "30" : "none"} stroke={active ? D.purple : D.muted} strokeWidth="1.5"/>
        <rect x="17" y="4" width="5" height="18" rx="1.5" fill={active ? D.green + "30" : "none"} stroke={active ? D.green : D.muted} strokeWidth="1.5"/>
        <path d="M5,12 L12,7 L19,3" stroke={active ? D.orange : D.muted + "55"} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2.5 2.5" fill="none"/>
        <circle cx="19" cy="3" r="2" fill={active ? D.orange : D.muted + "44"}/>
      </>)}
    </IconBg>
  );
}

export function AchievementsIcon({ size = 32, active = false }) {
  const c = active ? D.orange : D.muted;
  return (
    <IconBg bg={active ? "#FEF9E7" : D.bg} border={active ? D.gold + "33" : "transparent"} size={size}>
      {S(size * 0.55, "0 0 24 24", <>
        <path d="M8,3 L16,3 L16,11 C16,14.5 14,17 12,17 C10,17 8,14.5 8,11 Z" fill={active ? D.gold + "18" : "none"} stroke={c} strokeWidth="1.8" strokeLinejoin="round"/>
        <path d="M8,6 L5,6 C4,6 3,7 3,8 C3,10.5 5.5,11.5 8,10.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <path d="M16,6 L19,6 C20,6 21,7 21,8 C21,10.5 18.5,11.5 16,10.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <line x1="12" y1="17" x2="12" y2="19" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M8,21 L16,21 L15,19 L9,19 Z" fill={active ? D.gold + "22" : "none"} stroke={c} strokeWidth="1.5" strokeLinejoin="round"/>
        <circle cx="12" cy="8.5" r="2" fill={active ? D.gold : D.muted + "44"}/>
      </>)}
    </IconBg>
  );
}

export function ActivitiesIcon({ size = 32, active = false }) {
  const c = active ? D.green : D.muted;
  return (
    <IconBg bg={active ? "#EEFBF5" : D.bg} border={active ? D.green + "33" : "transparent"} size={size}>
      {S(size * 0.55, "0 0 24 24", <>
        <path d="M4,8 L10,8 C10,6 11.5,5 12,5 C12.5,5 14,6 14,8 L20,8 L20,13 C18.5,13 17,14 17,15 C17,16 18.5,17 20,17 L20,20 L4,20 L4,17 C5.5,17 7,16 7,15 C7,14 5.5,13 4,13 Z" fill={active ? D.green + "12" : "none"} stroke={c} strokeWidth="1.8" strokeLinejoin="round"/>
        <circle cx="10" cy="14" r="1.5" fill={active ? D.blue : D.muted + "44"}/>
        <circle cx="14" cy="14" r="1.5" fill={active ? D.purple : D.muted + "44"}/>
      </>)}
    </IconBg>
  );
}

// ══════════════════════════════════════════════════════
// INLINE ICONS (no background, for use inside buttons/text)
// ══════════════════════════════════════════════════════

export function TeacherInline({ size = 20 }) {
  return S(size, "0 0 24 24", <>
    <rect x="4" y="2" width="16" height="12" rx="2" stroke={D.blue} strokeWidth="1.8" fill={D.blue + "12"}/>
    <line x1="8" y1="6" x2="16" y2="6" stroke={D.blue} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="8" y1="9" x2="13" y2="9" stroke={D.blue} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    <path d="M6,14 L12,18 L18,14" stroke={D.purple} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <line x1="12" y1="18" x2="12" y2="22" stroke={D.purple} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="8" y1="22" x2="16" y2="22" stroke={D.purple} strokeWidth="1.5" strokeLinecap="round"/>
  </>);
}

export function StudentInline({ size = 20 }) {
  return S(size, "0 0 24 24", <>
    <circle cx="12" cy="9" r="5" stroke={D.green} strokeWidth="1.8" fill={D.green + "12"}/>
    <path d="M4,21 C4,16.5 7.5,14 12,14 C16.5,14 20,16.5 20,21" stroke={D.green} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    <path d="M12,4 L14.5,6.5 L12,5.5 L9.5,6.5 Z" fill={D.gold} stroke={D.gold} strokeWidth="0.5" strokeLinejoin="round"/>
  </>);
}

export function WarmupInline({ size = 18 }) {
  return S(size, "0 0 24 24", <>
    <path d="M4,18 C4,12.5 7.5,8 12,8 C16.5,8 20,12.5 20,18" stroke={D.orange} strokeWidth="2" strokeLinecap="round" fill="none"/>
    <line x1="12" y1="2" x2="12" y2="5" stroke={D.gold} strokeWidth="2" strokeLinecap="round"/>
    <line x1="5.5" y1="6" x2="7.5" y2="8" stroke={D.gold} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="18.5" y1="6" x2="16.5" y2="8" stroke={D.gold} strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="12" cy="14" r="2" fill={D.orange}/>
    <line x1="3" y1="18" x2="21" y2="18" stroke={D.orange} strokeWidth="1.5" strokeLinecap="round"/>
  </>);
}

export function ExitTicketInline({ size = 18 }) {
  return S(size, "0 0 24 24", <>
    <path d="M4,4 L20,4 L20,10 C18.5,10 17.5,11 17.5,12 C17.5,13 18.5,14 20,14 L20,20 L4,20 L4,14 C5.5,14 6.5,13 6.5,12 C6.5,11 5.5,10 4,10 Z" stroke={D.purple} strokeWidth="1.8" strokeLinejoin="round" fill={D.purple + "10"}/>
    <path d="M10,12 L11.5,13.5 L14.5,10.5" stroke={D.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </>);
}

export function UploadInline({ size = 18 }) {
  return S(size, "0 0 24 24", <>
    <rect x="4" y="4" width="16" height="16" rx="3" stroke={D.blue} strokeWidth="1.8" fill={D.blue + "10"}/>
    <line x1="12" y1="9" x2="12" y2="16" stroke={D.blue} strokeWidth="2" strokeLinecap="round"/>
    <path d="M8,12 L12,8 L16,12" stroke={D.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </>);
}

export function TypeInline({ size = 18 }) {
  return S(size, "0 0 24 24", <>
    <rect x="4" y="4" width="16" height="16" rx="3" stroke={D.purple} strokeWidth="1.8" fill={D.purple + "10"}/>
    <line x1="8" y1="9" x2="16" y2="9" stroke={D.purple} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="8" y1="13" x2="14" y2="13" stroke={D.purple} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    <line x1="8" y1="17" x2="12" y2="17" stroke={D.purple} strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>
  </>);
}

export function RocketInline({ size = 18 }) {
  return S(size, "0 0 24 24", <>
    <path d="M12,2 C12,2 8,6 8,14 L6,16 L8,18 L10,16 L14,16 L16,18 L18,16 L16,14 C16,6 12,2 12,2 Z" stroke={D.blue} strokeWidth="1.8" strokeLinejoin="round" fill={D.blue + "12"}/>
    <circle cx="12" cy="10" r="2" fill={D.purple}/>
    <path d="M10,20 L12,22 L14,20" stroke={D.orange} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </>);
}

export function SpinnerInline({ size = 18 }) {
  return S(size, "0 0 24 24", <>
    <circle cx="12" cy="12" r="9" stroke={D.blue + "33"} strokeWidth="2" fill="none"/>
    <path d="M12,3 A9,9 0 0,1 21,12" stroke={D.blue} strokeWidth="2" strokeLinecap="round" fill="none"/>
  </>);
}

export function WaitingInline({ size = 24 }) {
  return S(size, "0 0 24 24", <>
    <circle cx="12" cy="12" r="9" stroke={D.blue} strokeWidth="1.8" fill={D.blue + "08"}/>
    <line x1="12" y1="7" x2="12" y2="12" stroke={D.blue} strokeWidth="2" strokeLinecap="round"/>
    <line x1="12" y1="12" x2="16" y2="14" stroke={D.purple} strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="12" r="1.5" fill={D.blue}/>
  </>);
}

export function CheckInline({ size = 16, color = D.green }) {
  return S(size, "0 0 24 24", <>
    <circle cx="12" cy="12" r="10" fill={color + "15"} stroke={color} strokeWidth="1.8"/>
    <path d="M8,12 L11,15 L17,9" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </>);
}

export function XInline({ size = 16, color = D.red }) {
  return S(size, "0 0 24 24", <>
    <circle cx="12" cy="12" r="10" fill={color + "15"} stroke={color} strokeWidth="1.8"/>
    <path d="M8,8 L16,16 M16,8 L8,16" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none"/>
  </>);
}

export function WarningInline({ size = 16 }) {
  return S(size, "0 0 24 24", <>
    <path d="M12,3 L22,20 L2,20 Z" fill={D.orange + "15"} stroke={D.orange} strokeWidth="1.8" strokeLinejoin="round"/>
    <line x1="12" y1="10" x2="12" y2="14" stroke={D.orange} strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="17" r="1" fill={D.orange}/>
  </>);
}

export function BackArrow({ size = 16 }) {
  return S(size, "0 0 24 24", <>
    <line x1="19" y1="12" x2="5" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12,5 L5,12 L12,19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </>);
}

export function FileIcon({ name = "", size = 20 }) {
  const ext = name.split(".").pop()?.toLowerCase();
  const c = ext === "pdf" ? D.red : ext === "pptx" ? D.orange : ext === "docx" ? D.blue : D.green;
  return S(size, "0 0 24 24", <>
    <path d="M6,2 L14,2 L20,8 L20,22 L6,22 Z" fill={c + "10"} stroke={c} strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M14,2 L14,8 L20,8" fill="none" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/>
    <line x1="9" y1="13" x2="17" y2="13" stroke={c} strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
    <line x1="9" y1="16" x2="15" y2="16" stroke={c} strokeWidth="1.2" strokeLinecap="round" opacity="0.3"/>
  </>);
}

export function FolderIcon({ size = 28 }) {
  return S(size, "0 0 24 24", <>
    <path d="M2,6 L2,19 C2,20 3,21 4,21 L20,21 C21,21 22,20 22,19 L22,9 C22,8 21,7 20,7 L11,7 L9,4 L4,4 C3,4 2,5 2,6 Z" fill={D.blue + "12"} stroke={D.blue} strokeWidth="1.5" strokeLinejoin="round"/>
    <line x1="8" y1="14" x2="16" y2="14" stroke={D.blue} strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
  </>);
}

export function LiveIcon({ size = 18 }) {
  return S(size, "0 0 24 24", <>
    <rect x="3" y="6" width="18" height="12" rx="2" stroke={D.blue} strokeWidth="1.8" fill={D.blue + "10"}/>
    <circle cx="12" cy="12" r="3" fill={D.green}/>
    <path d="M7,12 A5,5 0 0,1 12,7" stroke={D.green} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.4"/>
    <path d="M17,12 A5,5 0 0,1 12,17" stroke={D.green} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.4"/>
  </>);
}

// ─── Profile avatars ────────────────────────────────
export function TeacherAvatar({ size = 30 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg, ${D.blue}22, ${D.purple}22)`, border: `1.5px solid ${D.blue}44`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {S(size * 0.6, "0 0 24 24", <>
        <rect x="5" y="3" width="14" height="10" rx="2" stroke={D.blue} strokeWidth="1.8" fill={D.blue + "15"}/>
        <line x1="9" y1="7" x2="15" y2="7" stroke={D.blue} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M7,13 L12,16.5 L17,13" stroke={D.purple} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <line x1="12" y1="16.5" x2="12" y2="21" stroke={D.purple} strokeWidth="1.5" strokeLinecap="round"/>
      </>)}
    </div>
  );
}

export function StudentAvatar({ size = 30 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg, ${D.green}22, ${D.blue}22)`, border: `1.5px solid ${D.green}44`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {S(size * 0.6, "0 0 24 24", <>
        <circle cx="12" cy="9" r="4.5" stroke={D.green} strokeWidth="1.8" fill={D.green + "15"}/>
        <path d="M5,21 C5,17 8,15 12,15 C16,15 19,17 19,21" stroke={D.green} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
        <circle cx="12" cy="5" r="1.5" fill={D.gold}/>
      </>)}
    </div>
  );
}

// ─── Default export ─────────────────────────────────
const Icon = {
  LogoMark, SessionsIcon, AIGenIcon, SchoolIcon, CommunityIcon,
  NotificationsIcon, SettingsIcon, JoinSessionIcon, ProgressIcon,
  AchievementsIcon, ActivitiesIcon,
  TeacherInline, StudentInline, WarmupInline, ExitTicketInline,
  UploadInline, TypeInline, RocketInline, SpinnerInline, WaitingInline,
  CheckInline, XInline, WarningInline, BackArrow, FileIcon, FolderIcon,
  LiveIcon, TeacherAvatar, StudentAvatar,
};

// ─── CIcon: Universal branded icon with colored bg ──
// Usage: <CIcon name="brain" /> or <CIcon name="fire" size={28} />
// Replaces ALL emojis across the app with consistent branded icons
const ICON_DEFS = {
  // ── Learning & Knowledge ──
  brain: { color: D.purple, d: "M12,3 C8.5,3 6,5.5 6,9 C6,11.5 7.5,13.5 9,14.5 L9,18 C9,19 10,20 11,20 L13,20 C14,20 15,19 15,18 L15,14.5 C16.5,13.5 18,11.5 18,9 C18,5.5 15.5,3 12,3 Z", extra: (c) => <><circle cx="10" cy="9" r="1.2" fill={c}/><circle cx="14" cy="9" r="1.2" fill={c}/></> },
  book: { color: D.blue, d: "M4,4 L4,18 C4,19.5 5.5,20 7,20 L20,20 L20,4 L7,4 C5.5,4 4,4.5 4,6 Z", extra: (c) => <><line x1="8" y1="8" x2="16" y2="8" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" opacity="0.6"/><line x1="8" y1="11" x2="14" y2="11" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" opacity="0.4"/><line x1="8" y1="14" x2="12" y2="14" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" opacity="0.3"/></> },
  study: { color: D.blue, d: "M4,19 L12,14 L20,19 M4,15 L12,10 L20,15", extra: (c) => <circle cx="12" cy="7" r="3" fill={c} opacity="0.4"/> },
  question: { color: D.purple, d: "M12,2 A10,10 0 1,0 12,22 A10,10 0 1,0 12,2", extra: (c) => <><path d="M9,9 C9,7 10.5,6 12,6 C13.5,6 15,7 15,9 C15,11 12,11 12,13" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none"/><circle cx="12" cy="16.5" r="1.2" fill="#fff"/></> },
  lightbulb: { color: D.gold, d: "M12,2 C8,2 5,5 5,9 C5,12 7,14 8,15 L8,18 C8,19 9,20 10,20 L14,20 C15,20 16,19 16,18 L16,15 C17,14 19,12 19,9 C19,5 16,2 12,2 Z", extra: (c) => <><line x1="10" y1="22" x2="14" y2="22" stroke={c} strokeWidth="1.5" strokeLinecap="round"/><path d="M10,15 L14,15" stroke="#fff" strokeWidth="1" opacity="0.4"/></> },

  // ── Gamification ──
  fire: { color: D.orange, d: "M12,2 C6,10 4,14 8,20 C8,16 10,12 12,10 C14,12 16,16 16,20 C20,14 18,10 12,2 Z" },
  star: { color: D.gold, d: "M12,3 L14.5,8.5 L20.5,9 L16,13.5 L17,19.5 L12,17 L7,19.5 L8,13.5 L3.5,9 L9.5,8.5 Z" },
  trophy: { color: D.orange, d: "M8,3 L16,3 L16,11 C16,14.5 14,17 12,17 C10,17 8,14.5 8,11 Z", extra: (c) => <><path d="M8,6 L5,6 C4,6 3,7 3,8 C3,10.5 5.5,11.5 8,10.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" fill="none"/><path d="M16,6 L19,6 C20,6 21,7 21,8 C21,10.5 18.5,11.5 16,10.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" fill="none"/><line x1="12" y1="17" x2="12" y2="19" stroke={c} strokeWidth="1.5"/><path d="M8,21 L16,21 L15,19 L9,19 Z" stroke={c} strokeWidth="1.5" fill="none"/></> },
  medal: { color: D.gold, d: "M8,2 L10,8 L12,2 L14,8 L16,2", extra: (c) => <circle cx="12" cy="15" r="6" fill={c} opacity="0.3" stroke={c} strokeWidth="1.5"/> },
  crown: { color: D.gold, d: "M3,18 L5,8 L9,12 L12,6 L15,12 L19,8 L21,18 Z" },
  xp: { color: D.purple, d: "M12,3 L14.5,8.5 L20.5,9 L16,13.5 L17,19.5 L12,17 L7,19.5 L8,13.5 L3.5,9 L9.5,8.5 Z", extra: (c) => <circle cx="12" cy="12" r="2.5" fill="#fff" opacity="0.5"/> },
  levelup: { color: D.green, d: "M4,20 L12,4 L20,20 Z", extra: (c) => <path d="M12,11 L12,16 M10,13 L12,11 L14,13" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/> },
  streak: { color: D.orange, d: "M12,2 C6,10 4,14 8,20 C8,16 10,12 12,10 C14,12 16,16 16,20 C20,14 18,10 12,2 Z" },
  diamond: { color: D.blue, d: "M12,2 L4,10 L12,22 L20,10 Z", extra: (c) => <path d="M4,10 L20,10" stroke="#fff" strokeWidth="1" opacity="0.4"/> },
  comet: { color: D.orange, d: "M20,4 C16,4 10,8 6,14 C4,17 8,20 11,18 C15,14 18,8 20,4 Z", extra: (c) => <circle cx="8" cy="16" r="2" fill="#fff" opacity="0.5"/> },

  // ── Status & Progress ──
  check: { color: D.green, d: "M12,2 A10,10 0 1,0 12,22 A10,10 0 1,0 12,2", extra: () => <path d="M8,12 L11,15 L17,9" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/> },
  cross: { color: D.red, d: "M12,2 A10,10 0 1,0 12,22 A10,10 0 1,0 12,2", extra: () => <path d="M8,8 L16,16 M16,8 L8,16" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none"/> },
  warning: { color: D.orange, d: "M12,3 L22,20 L2,20 Z", extra: () => <><line x1="12" y1="10" x2="12" y2="14" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="17" r="1" fill="#fff"/></> },
  chart: { color: D.blue, d: "", extra: (c) => <><rect x="3" y="14" width="4.5" height="7" rx="1" fill={c} opacity="0.5"/><rect x="9.5" y="9" width="4.5" height="12" rx="1" fill={c} opacity="0.7"/><rect x="16" y="4" width="4.5" height="17" rx="1" fill={c} opacity="0.9"/></> },
  target: { color: D.red, d: "M12,2 A10,10 0 1,0 12,22 A10,10 0 1,0 12,2", extra: (c) => <><circle cx="12" cy="12" r="6" fill="none" stroke="#fff" strokeWidth="1.2" opacity="0.4"/><circle cx="12" cy="12" r="2" fill="#fff" opacity="0.6"/></> },
  clock: { color: D.blue, d: "M12,2 A10,10 0 1,0 12,22 A10,10 0 1,0 12,2", extra: (c) => <><line x1="12" y1="7" x2="12" y2="12" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/><line x1="12" y1="12" x2="16" y2="14" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></> },
  hourglass: { color: D.purple, d: "M6,2 L18,2 L18,4 C18,9 14,12 14,12 C14,12 18,15 18,20 L18,22 L6,22 L6,20 C6,15 10,12 10,12 C10,12 6,9 6,4 Z" },

  // ── Actions ──
  rocket: { color: D.blue, d: "M12,2 C12,2 8,6 8,14 L6,16 L8,18 L10,16 L14,16 L16,18 L18,16 L16,14 C16,6 12,2 12,2 Z", extra: (c) => <><circle cx="12" cy="10" r="2" fill="#fff" opacity="0.5"/><path d="M10,20 L12,22 L14,20" stroke={c} strokeWidth="1.5" fill="none"/></> },
  sparkle: { color: D.gold, d: "", extra: (c) => <><path d="M12,2 L13.5,9 L20,8 L14.5,12 L18,18 L12,14 L6,18 L9.5,12 L4,8 L10.5,9 Z" fill={c} opacity="0.8"/></> },
  magic: { color: D.purple, d: "M4,20 L14,10 L16,8 L20,4 L18,8 L16,10 Z", extra: (c) => <><circle cx="18" cy="6" r="1.5" fill={D.gold}/><circle cx="8" cy="6" r="1" fill={D.gold} opacity="0.5"/><circle cx="6" cy="10" r="1" fill={D.gold} opacity="0.3"/></> },
  refresh: { color: D.green, d: "", extra: (c) => <><path d="M20,12 A8,8 0 1,1 12,4" stroke={c} strokeWidth="2" strokeLinecap="round" fill="none"/><path d="M12,2 L14,4 L12,6" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></> },
  plus: { color: D.green, d: "M12,2 A10,10 0 1,0 12,22 A10,10 0 1,0 12,2", extra: () => <><line x1="12" y1="8" x2="12" y2="16" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><line x1="8" y1="12" x2="16" y2="12" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></> },

  // ── People ──
  teacher: { color: D.blue, d: "M5,3 L19,3 L19,13 L5,13 Z", extra: (c) => <><line x1="9" y1="7" x2="15" y2="7" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/><line x1="9" y1="10" x2="13" y2="10" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/><path d="M7,13 L12,17 L17,13" stroke={c} strokeWidth="1.8" fill="none"/><line x1="12" y1="17" x2="12" y2="21" stroke={c} strokeWidth="1.5"/></> },
  student: { color: D.green, d: "", extra: (c) => <><circle cx="12" cy="9" r="5" fill={c} opacity="0.2" stroke={c} strokeWidth="1.8"/><path d="M4,21 C4,16.5 7.5,14 12,14 C16.5,14 20,16.5 20,21" stroke={c} strokeWidth="1.8" strokeLinecap="round" fill="none"/><path d="M12,4 L14.5,6.5 L12,5.5 L9.5,6.5 Z" fill={D.gold}/></> },
  people: { color: D.blue, d: "", extra: (c) => <><circle cx="8" cy="8" r="3.5" fill={c} opacity="0.2" stroke={c} strokeWidth="1.5"/><circle cx="16" cy="8" r="3.5" fill={D.purple} opacity="0.2" stroke={D.purple} strokeWidth="1.5"/><path d="M2,20 C2,16 5,13 8,13 C10,13 11.5,14 12,15" stroke={c} strokeWidth="1.5" strokeLinecap="round" fill="none"/><path d="M12,15 C12.5,14 14,13 16,13 C19,13 22,16 22,20" stroke={D.purple} strokeWidth="1.5" strokeLinecap="round" fill="none"/></> },
  handshake: { color: D.green, d: "", extra: (c) => <><path d="M2,12 L7,8 L11,12 L15,8 L22,12" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M7,12 L7,18 M17,12 L17,18" stroke={c} strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/></> },

  // ── Session types ──
  warmup: { color: D.orange, d: "M4,18 C4,12.5 7.5,8 12,8 C16.5,8 20,12.5 20,18", extra: (c) => <><line x1="12" y1="2" x2="12" y2="5" stroke={D.gold} strokeWidth="2" strokeLinecap="round"/><line x1="5.5" y1="6" x2="7.5" y2="8" stroke={D.gold} strokeWidth="1.5" strokeLinecap="round"/><line x1="18.5" y1="6" x2="16.5" y2="8" stroke={D.gold} strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="14" r="2" fill={D.gold}/><line x1="3" y1="18" x2="21" y2="18" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></> },
  ticket: { color: D.purple, d: "M4,4 L20,4 L20,10 C18.5,10 17.5,11 17.5,12 C17.5,13 18.5,14 20,14 L20,20 L4,20 L4,14 C5.5,14 6.5,13 6.5,12 C6.5,11 5.5,10 4,10 Z", extra: (c) => <path d="M10,12 L11.5,13.5 L14.5,10.5" stroke={D.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/> },
  pin: { color: D.green, d: "M6,3 L18,3 L18,21 L6,21 Z", extra: (c) => <><circle cx="12" cy="12" r="4" stroke="#fff" strokeWidth="1.5" strokeDasharray="3 2" fill="none"/><line x1="12" y1="9.5" x2="12" y2="14.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/><line x1="9.5" y1="12" x2="14.5" y2="12" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></> },

  // ── Activity types ──
  mcq: { color: D.blue, d: "", extra: (c) => <><circle cx="7" cy="7" r="3" fill="none" stroke={c} strokeWidth="1.8"/><circle cx="7" cy="17" r="3" fill={c} opacity="0.3" stroke={c} strokeWidth="1.8"/><circle cx="7" cy="17" r="1.2" fill={c}/><line x1="13" y1="7" x2="21" y2="7" stroke={c} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/><line x1="13" y1="17" x2="21" y2="17" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></> },
  truefalse: { color: D.green, d: "", extra: () => <><path d="M3,12 L7,16 L13,8" stroke={D.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/><line x1="15" y1="10" x2="21" y2="16" stroke={D.red} strokeWidth="2.5" strokeLinecap="round"/><line x1="21" y1="10" x2="15" y2="16" stroke={D.red} strokeWidth="2.5" strokeLinecap="round"/></> },
  fillblank: { color: D.orange, d: "", extra: (c) => <><line x1="3" y1="16" x2="9" y2="16" stroke={c} strokeWidth="2" strokeLinecap="round"/><line x1="11" y1="16" x2="21" y2="16" stroke={c} strokeWidth="2" strokeLinecap="round" strokeDasharray="2 2.5"/><path d="M15,12 L15,8" stroke={c} strokeWidth="2" strokeLinecap="round"/></> },
  ordering: { color: D.purple, d: "", extra: (c) => <><rect x="3" y="3" width="14" height="5" rx="2" fill={c} opacity="0.3" stroke={c} strokeWidth="1.2"/><rect x="3" y="10" width="14" height="5" rx="2" fill={c} opacity="0.5" stroke={c} strokeWidth="1.2"/><rect x="3" y="17" width="14" height="5" rx="2" fill={c} opacity="0.7" stroke={c} strokeWidth="1.2"/><path d="M20,15 L21,12 L20,9" stroke={D.orange} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></> },
  matching: { color: "#AD1A72", d: "", extra: () => <><circle cx="5" cy="7" r="3" fill="none" stroke={D.blue} strokeWidth="1.8"/><circle cx="5" cy="17" r="3" fill="none" stroke={D.purple} strokeWidth="1.8"/><circle cx="19" cy="7" r="3" fill="none" stroke={D.green} strokeWidth="1.8"/><circle cx="19" cy="17" r="3" fill="none" stroke={D.orange} strokeWidth="1.8"/><line x1="8" y1="7" x2="16" y2="17" stroke={D.blue} strokeWidth="1" opacity="0.4"/><line x1="8" y1="17" x2="16" y2="7" stroke={D.purple} strokeWidth="1" opacity="0.4"/></> },
  poll: { color: D.gold, d: "", extra: (c) => <><rect x="3" y="16" width="4.5" height="5" rx="1" fill={D.blue}/><rect x="9.5" y="8" width="4.5" height="13" rx="1" fill={D.purple}/><rect x="16" y="12" width="4.5" height="9" rx="1" fill={D.green}/></> },

  // ── Misc ──
  globe: { color: D.green, d: "M12,2 A10,10 0 1,0 12,22 A10,10 0 1,0 12,2", extra: (c) => <><ellipse cx="12" cy="12" rx="4" ry="10" fill="none" stroke="#fff" strokeWidth="1" opacity="0.4"/><line x1="2" y1="12" x2="22" y2="12" stroke="#fff" strokeWidth="1" opacity="0.4"/></> },
  flag: { color: D.red, d: "M5,3 L5,21 M5,3 L19,8 L5,13" },
  shield: { color: D.blue, d: "M12,2 L4,6 L4,12 C4,17 8,21 12,22 C16,21 20,17 20,12 L20,6 Z", extra: (c) => <path d="M9,12 L11,14 L15,10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/> },
  bell: { color: D.orange, d: "M6,16 C6,10 8.5,5 12,5 C15.5,5 18,10 18,16 L20,18 L4,18 Z", extra: (c) => <><path d="M10,19 C10,20.5 10.8,22 12,22 C13.2,22 14,20.5 14,19" stroke={c} strokeWidth="1.5" strokeLinecap="round" fill="none"/><line x1="12" y1="2" x2="12" y2="5" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></> },
  sleep: { color: D.muted, d: "", extra: (c) => <><text x="7" y="10" fontSize="8" fontWeight="700" fill={c} opacity="0.3">Z</text><text x="12" y="15" fontSize="10" fontWeight="700" fill={c} opacity="0.5">Z</text><text x="16" y="20" fontSize="12" fontWeight="700" fill={c} opacity="0.7">Z</text></> },
  alert: { color: D.red, d: "M12,2 A10,10 0 1,0 12,22 A10,10 0 1,0 12,2", extra: () => <><line x1="12" y1="8" x2="12" y2="13" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/><circle cx="12" cy="16.5" r="1.3" fill="#fff"/></> },
  paint: { color: D.purple, d: "M4,18 C4,16 6,14 8,14 L16,6 C17,5 19,5 20,6 C21,7 21,9 20,10 L12,18 C12,20 10,22 8,22 C6,22 4,20 4,18 Z" },
  music: { color: D.purple, d: "M8,18 A3,3 0 1,1 8,12 L8,4 L18,2 L18,16 A3,3 0 1,1 18,10", extra: (c) => <line x1="8" y1="4" x2="18" y2="2" stroke={c} strokeWidth="1.5"/> },
  sports: { color: D.green, d: "M12,2 A10,10 0 1,0 12,22 A10,10 0 1,0 12,2", extra: (c) => <><path d="M12,2 C8,6 8,18 12,22" stroke="#fff" strokeWidth="1.2" fill="none" opacity="0.5"/><path d="M2,12 L22,12" stroke="#fff" strokeWidth="1.2" opacity="0.5"/></> },
  map: { color: D.green, d: "M3,6 L9,3 L15,6 L21,3 L21,18 L15,21 L9,18 L3,21 Z", extra: (c) => <><line x1="9" y1="3" x2="9" y2="18" stroke="#fff" strokeWidth="1" opacity="0.3"/><line x1="15" y1="6" x2="15" y2="21" stroke="#fff" strokeWidth="1" opacity="0.3"/></> },
  science: { color: D.green, d: "M9,3 L9,10 L4,19 C3,21 5,22 7,22 L17,22 C19,22 21,21 20,19 L15,10 L15,3", extra: (c) => <><line x1="7" y1="3" x2="17" y2="3" stroke={c} strokeWidth="1.5" strokeLinecap="round"/><circle cx="11" cy="17" r="1.5" fill="#fff" opacity="0.5"/><circle cx="14" cy="15" r="1" fill="#fff" opacity="0.3"/></> },
  math: { color: D.blue, d: "M3,3 L21,3 L21,21 L3,21 Z", extra: () => <><text x="12" y="10" textAnchor="middle" fontSize="6" fontWeight="700" fill="#fff" opacity="0.7" fontFamily="sans-serif">+−</text><text x="12" y="18" textAnchor="middle" fontSize="6" fontWeight="700" fill="#fff" opacity="0.7" fontFamily="sans-serif">×÷</text></> },
  history: { color: D.orange, d: "M4,4 C4,4 8,2 12,4 C16,6 20,4 20,4 L20,18 C20,18 16,20 12,18 C8,16 4,18 4,18 Z" },
  language: { color: D.blue, d: "M4,4 L20,4 L20,16 L14,16 L12,20 L10,16 L4,16 Z", extra: (c) => <><text x="12" y="12.5" textAnchor="middle" fontSize="7" fontWeight="600" fill="#fff" opacity="0.7" fontFamily="sans-serif">Aa</text></> },
  geo: { color: D.green, d: "M12,2 A10,10 0 1,0 12,22 A10,10 0 1,0 12,2", extra: (c) => <><ellipse cx="12" cy="12" rx="4" ry="10" fill="none" stroke="#fff" strokeWidth="1" opacity="0.4"/><path d="M3,8 L21,8 M3,16 L21,16" stroke="#fff" strokeWidth="1" opacity="0.3"/></> },
  art: { color: D.purple, d: "M12,2 A10,10 0 1,0 12,22 A10,10 0 1,0 12,2", extra: () => <><circle cx="8" cy="8" r="1.5" fill={D.red}/><circle cx="15" cy="7" r="1.5" fill={D.blue}/><circle cx="8" cy="15" r="1.5" fill={D.green}/><circle cx="16" cy="14" r="1.5" fill={D.gold}/><circle cx="12" cy="18" r="2" fill="#fff"/></> },
  other: { color: D.muted, d: "M12,2 A10,10 0 1,0 12,22 A10,10 0 1,0 12,2", extra: () => <><circle cx="8" cy="12" r="1.3" fill="#fff"/><circle cx="12" cy="12" r="1.3" fill="#fff"/><circle cx="16" cy="12" r="1.3" fill="#fff"/></> },
  // ── Subjects as mini icons ──
  night: { color: "#1a1a2e", d: "M12,2 C7,2 3,6 3,12 C3,18 8,22 14,22 C10,20 8,16 8,12 C8,7 10,4 14,2 C13.3,2 12.6,2 12,2 Z", extra: (c) => <circle cx="17" cy="7" r="1.5" fill={D.gold}/> },
  weekend: { color: D.blue, d: "M4,4 L20,4 L20,20 L4,20 Z", extra: (c) => <><line x1="4" y1="8" x2="20" y2="8" stroke="#fff" strokeWidth="1.2" opacity="0.4"/><text x="12" y="16" textAnchor="middle" fontSize="8" fontWeight="700" fill="#fff" opacity="0.7" fontFamily="sans-serif">7</text></> },
  speed: { color: D.gold, d: "", extra: (c) => <><path d="M13,2 L5,14 L11,14 L10,22 L19,10 L13,10 Z" fill={c} opacity="0.8" stroke={c} strokeWidth="1"/></> },
  multilingual: { color: D.blue, d: "M12,2 A10,10 0 1,0 12,22 A10,10 0 1,0 12,2", extra: (c) => <><text x="12" y="14" textAnchor="middle" fontSize="7" fontWeight="600" fill="#fff" opacity="0.8" fontFamily="sans-serif">Ab</text><ellipse cx="12" cy="12" rx="4" ry="10" fill="none" stroke="#fff" strokeWidth="0.8" opacity="0.3"/></> },
  founding: { color: D.blue, d: "M12,2 C12,2 8,6 8,14 L6,16 L8,18 L10,16 L14,16 L16,18 L18,16 L16,14 C16,6 12,2 12,2 Z", extra: (c) => <><circle cx="12" cy="10" r="2" fill="#fff" opacity="0.5"/><path d="M10,20 L12,22 L14,20" stroke={D.orange} strokeWidth="1.5" fill="none"/></> },
  news: { color: D.blue, d: "M4,3 L20,3 L20,21 L4,21 Z", extra: (c) => <><rect x="7" y="6" width="10" height="5" rx="1" fill="#fff" opacity="0.3"/><line x1="7" y1="14" x2="17" y2="14" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" opacity="0.4"/><line x1="7" y1="17" x2="14" y2="17" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" opacity="0.3"/></> },
};

export function CIcon({ name, size = 24, inline = false }) {
  const def = ICON_DEFS[name];
  if (!def) return <span style={{ fontSize: size * 0.8 }}>{name}</span>;

  const iconSize = inline ? size : size * 0.55;
  const c = def.color;

  const svg = S(iconSize, "0 0 24 24", <>
    {def.d && <path d={def.d} fill={inline ? "none" : c} opacity={inline ? 1 : 0.2} stroke={c} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>}
    {def.extra && def.extra(c)}
  </>);

  if (inline) return svg;

  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: c + "14", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      {svg}
    </div>
  );
}

export default Icon;
