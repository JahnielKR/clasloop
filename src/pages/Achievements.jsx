import { useState } from "react";
import { CIcon } from "../components/Icons";

const C = {
  bg: "#FFFFFF", bgSoft: "#F7F7F5", accent: "#2383E2", accentSoft: "#E8F0FE",
  green: "#0F7B6C", greenSoft: "#EEFBF5", orange: "#D9730D", orangeSoft: "#FFF3E0",
  red: "#E03E3E", redSoft: "#FDECEC", purple: "#6940A5", purpleSoft: "#F3EEFB",
  yellow: "#D4A017", yellowSoft: "#FEF9E7", pink: "#AD1A72",
  text: "#191919", textSecondary: "#6B6B6B", textMuted: "#9B9B9B",
  border: "#E8E8E4", shadow: "0 1px 3px rgba(0,0,0,0.04)",
};
const MONO = "'JetBrains Mono', monospace";

const RARITY = {
  common: { bg: C.bgSoft, border: C.border, text: C.textSecondary, label: { en: "Common", es: "Común", ko: "일반" }, glow: "none" },
  rare: { bg: C.accentSoft, border: C.accent + "44", text: C.accent, label: { en: "Rare", es: "Raro", ko: "레어" }, glow: `0 0 12px ${C.accent}22` },
  epic: { bg: C.purpleSoft, border: C.purple + "44", text: C.purple, label: { en: "Epic", es: "Épico", ko: "에픽" }, glow: `0 0 16px ${C.purple}22` },
  legendary: { bg: C.orangeSoft, border: C.orange + "44", text: C.orange, label: { en: "Legendary", es: "Legendario", ko: "전설" }, glow: `0 0 20px ${C.orange}33` },
  secret: { bg: "#1a1a2e14", border: "#1a1a2e33", text: "#1a1a2e", label: { en: "Secret", es: "Secreto", ko: "비밀" }, glow: `0 0 20px rgba(26,26,46,.15)` },
};

const CATS = {
  learning: { icon: "book", label: { en: "Learning", es: "Aprendizaje", ko: "학습" }, color: C.accent },
  streak: { icon: "fire", label: { en: "Streaks", es: "Rachas", ko: "연속" }, color: C.orange },
  mastery: { icon: "brain", label: { en: "Mastery", es: "Dominio", ko: "마스터" }, color: C.purple },
  social: { icon: "handshake", label: { en: "Social", es: "Social", ko: "소셜" }, color: C.green },
  special: { icon: "sparkle", label: { en: "Special", es: "Especial", ko: "특별" }, color: C.pink },
};

const ACHS = [
  { id: "first_answer", cat: "learning", rarity: "common", icon: "target", title: { en: "First Shot", es: "Primer Disparo", ko: "첫 번째 답" }, desc: { en: "Answer your first question", es: "Responde tu primera pregunta", ko: "첫 문제에 답하기" }, progress: 1, goal: 1, unlocked: true, xp: 10 },
  { id: "ten_correct", cat: "learning", rarity: "common", icon: "sparkle", title: { en: "Getting Started", es: "Empezando", ko: "시작이 반" }, desc: { en: "Get 10 correct answers", es: "Obtén 10 respuestas correctas", ko: "10문제 맞추기" }, progress: 10, goal: 10, unlocked: true, xp: 25 },
  { id: "fifty_correct", cat: "learning", rarity: "rare", icon: "levelup", title: { en: "On a Roll", es: "En Racha", ko: "달리는 중" }, desc: { en: "Get 50 correct answers", es: "Obtén 50 correctas", ko: "50문제 맞추기" }, progress: 47, goal: 50, unlocked: false, xp: 50 },
  { id: "hundred_correct", cat: "learning", rarity: "epic", icon: "trophy", title: { en: "Centurion", es: "Centurión", ko: "백전백승" }, desc: { en: "Get 100 correct answers", es: "Obtén 100 correctas", ko: "100문제 맞추기" }, progress: 47, goal: 100, unlocked: false, xp: 100 },
  { id: "five_hundred", cat: "learning", rarity: "legendary", icon: "crown", title: { en: "Knowledge King", es: "Rey del Conocimiento", ko: "지식의 왕" }, desc: { en: "Get 500 correct answers", es: "Obtén 500 correctas", ko: "500문제 맞추기" }, progress: 47, goal: 500, unlocked: false, xp: 250 },
  { id: "perfect_session", cat: "learning", rarity: "rare", icon: "check", title: { en: "Perfect Score", es: "Puntaje Perfecto", ko: "만점" }, desc: { en: "Get 100% in a session", es: "Obtén 100% en una sesión", ko: "세션에서 100%" }, progress: 1, goal: 1, unlocked: true, xp: 50 },
  { id: "streak_3", cat: "streak", rarity: "common", icon: "warmup", title: { en: "Warming Up", es: "Calentando", ko: "워밍업" }, desc: { en: "3-day streak", es: "Racha de 3 días", ko: "3일 연속" }, progress: 3, goal: 3, unlocked: true, xp: 15 },
  { id: "streak_7", cat: "streak", rarity: "rare", icon: "fire", title: { en: "On Fire", es: "En Llamas", ko: "불타는 중" }, desc: { en: "7-day streak", es: "Racha de 7 días", ko: "7일 연속" }, progress: 5, goal: 7, unlocked: false, xp: 50 },
  { id: "streak_14", cat: "streak", rarity: "epic", icon: "comet", title: { en: "Unstoppable", es: "Imparable", ko: "멈출 수 없어" }, desc: { en: "14-day streak", es: "Racha de 14 días", ko: "14일 연속" }, progress: 5, goal: 14, unlocked: false, xp: 100 },
  { id: "streak_30", cat: "streak", rarity: "legendary", icon: "diamond", title: { en: "Diamond Discipline", es: "Disciplina de Diamante", ko: "다이아몬드 습관" }, desc: { en: "30-day streak", es: "Racha de 30 días", ko: "30일 연속" }, progress: 5, goal: 30, unlocked: false, xp: 300 },
  { id: "streak_100", cat: "streak", rarity: "secret", icon: "night", title: { en: "Eternal Learner", es: "Aprendiz Eterno", ko: "영원한 학습자" }, desc: { en: "100-day streak", es: "Racha de 100 días", ko: "100일 연속" }, progress: 5, goal: 100, unlocked: false, xp: 1000 },
  { id: "first_strong", cat: "mastery", rarity: "common", icon: "book", title: { en: "First Mastery", es: "Primer Dominio", ko: "첫 마스터" }, desc: { en: "Get 'Strong' on a topic", es: "Obtén 'Fuerte' en un tema", ko: "주제에서 '강함'" }, progress: 1, goal: 1, unlocked: true, xp: 30 },
  { id: "five_strong", cat: "mastery", rarity: "rare", icon: "book", title: { en: "Scholar", es: "Erudito", ko: "학자" }, desc: { en: "Get 'Strong' on 5 topics", es: "'Fuerte' en 5 temas", ko: "5개 주제 '강함'" }, progress: 4, goal: 5, unlocked: false, xp: 75 },
  { id: "all_strong", cat: "mastery", rarity: "legendary", icon: "student", title: { en: "Valedictorian", es: "El Mejor", ko: "수석 졸업" }, desc: { en: "'Strong' on ALL topics", es: "'Fuerte' en TODOS", ko: "모든 주제 '강함'" }, progress: 4, goal: 8, unlocked: false, xp: 500 },
  { id: "rescue", cat: "mastery", rarity: "epic", icon: "refresh", title: { en: "Comeback Kid", es: "Remontada", ko: "역전의 명수" }, desc: { en: "Bring 'Weak' to 'Strong'", es: "'Débil' a 'Fuerte'", ko: "'약함'에서 '강함'으로" }, progress: 0, goal: 1, unlocked: false, xp: 100 },
  { id: "first_warmup", cat: "social", rarity: "common", icon: "warmup", title: { en: "Early Bird", es: "Madrugador", ko: "얼리버드" }, desc: { en: "Join your first warmup", es: "Únete a tu primer warmup", ko: "첫 워밍업 참여" }, progress: 1, goal: 1, unlocked: true, xp: 10 },
  { id: "ten_sessions", cat: "social", rarity: "rare", icon: "ticket", title: { en: "Regular", es: "Regular", ko: "단골" }, desc: { en: "Attend 10 sessions", es: "Asiste a 10 sesiones", ko: "10번 세션 참여" }, progress: 10, goal: 10, unlocked: true, xp: 50 },
  { id: "class_top", cat: "social", rarity: "epic", icon: "medal", title: { en: "Top of the Class", es: "El Mejor de la Clase", ko: "반에서 1등" }, desc: { en: "Get #1 in a live session", es: "Obtén el #1 en vivo", ko: "라이브 세션 1등" }, progress: 1, goal: 1, unlocked: true, xp: 75 },
  { id: "night_owl", cat: "special", rarity: "rare", icon: "night", title: { en: "Night Owl", es: "Búho Nocturno", ko: "올빼미" }, desc: { en: "Study after 10 PM", es: "Estudia después de 10 PM", ko: "밤 10시 이후 공부" }, progress: 1, goal: 1, unlocked: true, xp: 25 },
  { id: "weekend", cat: "special", rarity: "rare", icon: "weekend", title: { en: "Weekend Warrior", es: "Guerrero de Fin de Semana", ko: "주말 전사" }, desc: { en: "Study on a weekend", es: "Estudia un fin de semana", ko: "주말에 공부하기" }, progress: 1, goal: 1, unlocked: true, xp: 25 },
  { id: "speed_demon", cat: "special", rarity: "epic", icon: "speed", title: { en: "Speed Demon", es: "Demonio de la Velocidad", ko: "스피드 귀신" }, desc: { en: "5 answers in under 15 sec", es: "5 respuestas en menos de 15 seg", ko: "5문제를 15초 안에" }, progress: 0, goal: 1, unlocked: false, xp: 100 },
  { id: "multilingual", cat: "special", rarity: "legendary", icon: "multilingual", title: { en: "Polyglot", es: "Políglota", ko: "다국어 능력자" }, desc: { en: "Sessions in 3 languages", es: "Sesiones en 3 idiomas", ko: "3개 언어로 세션" }, progress: 2, goal: 3, unlocked: false, xp: 200 },
  { id: "founding", cat: "special", rarity: "secret", icon: "founding", title: { en: "Founding Member", es: "Miembro Fundador", ko: "창립 멤버" }, desc: { en: "Join during beta", es: "Únete durante la beta", ko: "베타 기간에 가입" }, progress: 1, goal: 1, unlocked: true, xp: 500 },
];

const i18n = {
  en: { pageTitle: "Achievements", subtitle: "Your trophies and milestones", unlocked: "Unlocked", locked: "Locked", all: "All", totalXP: "Total XP", achievementsUnlocked: "achievements unlocked", nextUnlock: "Next unlock", close: "Close", earned: "Earned!", keepGoing: "Keep going!", almost: "Almost there!", xpReward: "XP Reward" },
  es: { pageTitle: "Logros", subtitle: "Tus trofeos e hitos", unlocked: "Desbloqueados", locked: "Bloqueados", all: "Todos", totalXP: "XP Total", achievementsUnlocked: "logros desbloqueados", nextUnlock: "Próximo logro", close: "Cerrar", earned: "¡Obtenido!", keepGoing: "¡Sigue así!", almost: "¡Ya casi!", xpReward: "Recompensa XP" },
  ko: { pageTitle: "업적", subtitle: "트로피와 이정표", unlocked: "잠금 해제", locked: "잠김", all: "전체", totalXP: "총 XP", achievementsUnlocked: "개 업적 달성", nextUnlock: "다음 잠금 해제", close: "닫기", earned: "획득!", keepGoing: "계속 가자!", almost: "거의 다 됐어!", xpReward: "XP 보상" },
};

const css = `
  .ach-card { transition: all .2s ease; cursor: pointer; }
  .ach-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,.08) !important; }
  .ach-filter { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .ach-filter:hover { background: #E8F0FE !important; border-color: #2383E244 !important; color: #2383E2 !important; }
  .ach-stat { transition: all .2s ease; }
  .ach-stat:hover { transform: translateY(-2px); box-shadow: 0 2px 8px rgba(0,0,0,.06); }
  .ach-next { transition: all .2s ease; cursor: pointer; }
  .ach-next:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(35,131,226,.1); }
  .ach-close { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .ach-close:hover { background: #E8F0FE !important; color: #2383E2 !important; }
  .ach-lang { transition: all .12s ease; cursor: pointer; }
  .ach-lang:hover { background: #E8F0FE !important; color: #2383E2 !important; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes popIn { from { opacity: 0; transform: scale(.85); } to { opacity: 1; transform: scale(1); } }
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  .fade-up { animation: fadeUp .3s ease-out both; }
`;

const Bar = ({ value, max = 100, color = C.accent, h = 6 }) => (
  <div style={{ width: "100%", height: h, background: C.bgSoft, borderRadius: h }}>
    <div style={{ width: `${Math.min((value / max) * 100, 100)}%`, height: "100%", borderRadius: h, background: color, transition: "width .5s ease" }} />
  </div>
);

function PageHeader({ title, icon, lang, setLang }) {
  return (
    <div style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, padding: "14px 28px", margin: "-28px -20px 24px -20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CIcon name={icon} size={28} />
          <h1 style={{ fontFamily: "'Outfit'", fontSize: 18, fontWeight: 700 }}>{title}</h1>
        </div>
        <div style={{ display: "flex", gap: 2, background: C.bgSoft, borderRadius: 8, padding: 3 }}>
          {[["en", "EN"], ["es", "ES"], ["ko", "한"]].map(([c, l]) => (
            <button key={c} className="ach-lang" onClick={() => setLang(c)} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: lang === c ? C.bg : "transparent", color: lang === c ? C.text : C.textMuted, border: "none", boxShadow: lang === c ? "0 1px 2px rgba(0,0,0,0.06)" : "none" }}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AchCard({ ach, l, t, onClick }) {
  const r = RARITY[ach.rarity], cat = CATS[ach.cat];
  const isSecret = ach.rarity === "secret" && !ach.unlocked;
  return (
    <div className="ach-card" onClick={onClick} style={{
      background: C.bg, borderRadius: 12, padding: 16,
      border: `1px solid ${ach.unlocked ? r.border : C.border}`,
      boxShadow: ach.unlocked ? r.glow : C.shadow,
      opacity: ach.unlocked ? 1 : 0.65, position: "relative", overflow: "hidden",
    }}>
      {ach.unlocked && (ach.rarity === "legendary" || ach.rarity === "secret") && (
        <div style={{ position: "absolute", inset: 0, borderRadius: 12, background: `linear-gradient(90deg, transparent, ${r.text}08, transparent)`, backgroundSize: "200% 100%", animation: "shimmer 3s infinite linear", pointerEvents: "none" }} />
      )}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, position: "relative" }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0, background: ach.unlocked ? r.bg : C.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", filter: ach.unlocked ? "none" : "grayscale(1)", border: `1px solid ${ach.unlocked ? r.border : C.border}` }}>
          {isSecret ? <span style={{ fontSize: 20, color: C.textMuted }}>?</span> : <CIcon name={ach.icon} size={20} inline />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>{isSecret ? "???" : ach.title[l]}</h3>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: r.bg, color: r.text }}>{r.label[l]}</span>
          </div>
          <p style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.4, marginBottom: 8 }}>
            {isSecret ? (l === "ko" ? "계속 탐험해서 발견하세요!" : l === "es" ? "¡Sigue explorando!" : "Keep exploring to discover!") : ach.desc[l]}
          </p>
          {!ach.unlocked && !isSecret && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Bar value={ach.progress} max={ach.goal} color={cat.color} h={5} />
              <span style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, fontFamily: MONO, whiteSpace: "nowrap" }}>{ach.progress}/{ach.goal}</span>
            </div>
          )}
          {ach.unlocked && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CIcon name="check" size={12} inline /><span style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>{t.earned}</span>
              <span style={{ fontSize: 11, color: C.textMuted }}>·</span>
              <span style={{ fontSize: 11, color: C.purple, fontWeight: 600 }}>+{ach.xp} XP</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AchModal({ ach, l, t, onClose }) {
  const r = RARITY[ach.rarity], cat = CATS[ach.cat];
  const pct = Math.round((ach.progress / ach.goal) * 100);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bg, borderRadius: 16, padding: 32, maxWidth: 380, width: "100%", textAlign: "center", animation: "popIn .3s cubic-bezier(.34,1.56,.64,1)", border: `2px solid ${r.border}`, boxShadow: `0 24px 48px rgba(0,0,0,.12), ${r.glow}` }}>
        <div style={{ width: 72, height: 72, borderRadius: 18, background: r.bg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", border: `2px solid ${r.border}`, boxShadow: r.glow }}>
          <CIcon name={ach.icon} size={28} inline />
        </div>
        <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: r.bg, color: r.text, marginBottom: 12 }}>{r.label[l]}</span>
        <h2 style={{ fontFamily: "'Outfit'", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{ach.title[l]}</h2>
        <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.5, marginBottom: 20 }}>{ach.desc[l]}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", marginBottom: 16 }}>
          <CIcon name={cat.icon} size={14} inline />
          <span style={{ fontSize: 13, color: C.textSecondary }}>{cat.label[l]}</span>
        </div>
        {!ach.unlocked ? (
          <div style={{ marginBottom: 20 }}>
            <Bar value={ach.progress} max={ach.goal} color={cat.color} h={8} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 12, color: C.textMuted }}>{pct}%</span>
              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: MONO, color: cat.color }}>{ach.progress}/{ach.goal}</span>
            </div>
            <p style={{ fontSize: 13, color: pct >= 80 ? C.orange : C.textMuted, fontWeight: 500, marginTop: 8 }}>{pct >= 80 ? t.almost : t.keepGoing}</p>
          </div>
        ) : (
          <div style={{ padding: "12px 16px", borderRadius: 10, background: C.greenSoft, marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <CIcon name="check" size={14} inline />
            <span style={{ fontSize: 14, fontWeight: 600, color: C.green }}>{t.earned}</span>
          </div>
        )}
        <div style={{ padding: "10px 16px", borderRadius: 8, background: C.purpleSoft, display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: C.purple, fontWeight: 600 }}>{t.xpReward}: +{ach.xp} XP</span>
        </div>
        <br />
        <button className="ach-close" onClick={onClose} style={{ padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 500, background: C.bgSoft, color: C.textSecondary, marginTop: 8 }}>{t.close}</button>
      </div>
    </div>
  );
}

export default function Achievements({ lang: pageLang = "en", setLang: pageSetLang }) {
  const [lang, setLangLocal] = useState(pageLang);
  const setLang = pageSetLang || setLangLocal;
  const l = pageLang || lang;
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const t = i18n[l] || i18n.en;

  const unlockedCount = ACHS.filter(a => a.unlocked).length;
  const totalXP = ACHS.filter(a => a.unlocked).reduce((s, a) => s + a.xp, 0);
  const nextUnlock = ACHS.filter(a => !a.unlocked && a.rarity !== "secret").sort((a, b) => (b.progress / b.goal) - (a.progress / a.goal))[0];
  const filtered = filter === "all" ? ACHS : filter === "unlocked" ? ACHS.filter(a => a.unlocked) : filter === "locked" ? ACHS.filter(a => !a.unlocked) : ACHS.filter(a => a.cat === filter);

  return (
    <div style={{ padding: "28px 20px" }}>
      <style>{css}</style>
      <PageHeader title={t.pageTitle} icon="trophy" lang={l} setLang={setLang} />
      {selected && <AchModal ach={selected} l={l} t={t} onClose={() => setSelected(null)} />}

      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <p style={{ fontSize: 14, color: C.textSecondary, marginBottom: 20 }}>{t.subtitle}</p>

        {/* Stats */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <div className="ach-stat" style={{ flex: 1, padding: "16px 18px", borderRadius: 10, background: C.bg, border: `1px solid ${C.border}`, textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: MONO, color: C.accent }}>{unlockedCount}/{ACHS.length}</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{t.achievementsUnlocked}</div>
          </div>
          <div className="ach-stat" style={{ flex: 1, padding: "16px 18px", borderRadius: 10, background: C.bg, border: `1px solid ${C.border}`, textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: MONO, color: C.purple }}>{totalXP.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{t.totalXP}</div>
          </div>
        </div>

        {/* Next unlock */}
        {nextUnlock && (
          <div className="ach-next" onClick={() => setSelected(nextUnlock)} style={{
            padding: "14px 18px", borderRadius: 10, marginBottom: 20,
            background: `linear-gradient(135deg, ${C.accentSoft}, ${C.purpleSoft})`,
            border: `1px solid ${C.accent}22`,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <CIcon name={nextUnlock.icon} size={28} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.purple }}>{t.nextUnlock}: {nextUnlock.title[l]}</div>
              <div style={{ marginTop: 4 }}><Bar value={nextUnlock.progress} max={nextUnlock.goal} color={C.purple} h={5} /></div>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: MONO, color: C.purple }}>{Math.round((nextUnlock.progress / nextUnlock.goal) * 100)}%</span>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, flexWrap: "wrap" }}>
          {[["all", t.all], ["unlocked", t.unlocked], ["locked", t.locked], ...Object.entries(CATS).map(([k, v]) => [k, v.label[l]])].map(([k, label]) => (
            <button key={k} className="ach-filter" onClick={() => setFilter(k)} style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500,
              background: filter === k ? C.accentSoft : C.bg,
              color: filter === k ? C.accent : C.textSecondary,
              border: `1px solid ${filter === k ? C.accent + "33" : C.border}`,
            }}>{label}</button>
          ))}
        </div>

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 }}>
          {filtered.map((ach, i) => (
            <div key={ach.id} className="fade-up" style={{ animationDelay: `${i * .03}s` }}>
              <AchCard ach={ach} l={l} t={t} onClick={() => setSelected(ach)} />
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="fade-up" style={{ textAlign: "center", padding: 48 }}>
            <CIcon name="trophy" size={36} />
            <p style={{ fontSize: 15, color: C.textMuted, fontWeight: 500, marginTop: 12 }}>
              {l === "ko" ? "이 카테고리에 아직 업적이 없습니다" : l === "es" ? "Sin logros en esta categoría" : "No achievements in this category"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
