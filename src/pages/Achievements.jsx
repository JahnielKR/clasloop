import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { CIcon } from "../components/Icons";
import { Avatar as CatalogAvatar, AVATARS } from "../components/Avatars";
import { getStudentStats } from "../lib/unlock-checker";
import { useIsMobile } from "../components/MobileMenuButton";
import PageHeader from "../components/PageHeader";
import { C as BASE_C, MONO } from "../components/tokens";

// Achievements adds two domain-specific colors (pink for "rare" tier
// avatars) on top of the shared palette.
const C = BASE_C;

const RARITY = {
  common:    { bg: C.bgSoft,    border: C.border,        text: C.textSecondary, label: { en: "Common",    es: "Común",      ko: "일반"   } },
  rare:      { bg: C.accentSoft, border: C.accent + "44", text: C.accent,        label: { en: "Rare",      es: "Raro",       ko: "레어"   } },
  legendary: { bg: C.orangeSoft, border: C.orange + "44", text: C.orange,        label: { en: "Legendary", es: "Legendario", ko: "전설"   } },
};

const i18n = {
  en: {
    pageTitle: "Achievements",
    subtitle: "Unlock new avatars by playing and learning",
    all: "All", unlocked: "Unlocked", locked: "Locked",
    total: "unlocked", common: "Common", rare: "Rare", legendary: "Legendary",
    nextUnlock: "Closest to unlock",
    close: "Close",
    earned: "Earned!",
    progressLabel: "Progress",
    teacherNotice: "Achievements are designed for students.",
    teacherNoticeHint: "Students earn avatars by playing live sessions, building streaks, and reaching retention goals.",
    starter: "Starter avatar",
    starterHint: "Available from day one.",
    // Unlock condition descriptions
    cond_sessions: "Complete {n} sessions",
    cond_streak: "Reach a {n}-day streak",
    cond_perfect: "Get 100% in {n} session(s)",
    cond_answers: "Answer {n} questions correctly",
    cond_topics: "Master {n} topics (≥70% retention)",
    cond_comeback: "Return after {n} days away",
    cond_retention: "Average retention ≥ {n}%",
    loading: "Loading...",
    noProgress: "Start a session to begin earning avatars",
  },
  es: {
    pageTitle: "Logros",
    subtitle: "Desbloquea nuevos avatares jugando y aprendiendo",
    all: "Todos", unlocked: "Desbloqueados", locked: "Bloqueados",
    total: "desbloqueados", common: "Común", rare: "Raro", legendary: "Legendario",
    nextUnlock: "Más cerca de desbloquear",
    close: "Cerrar",
    earned: "¡Obtenido!",
    progressLabel: "Progreso",
    teacherNotice: "Los logros están diseñados para estudiantes.",
    teacherNoticeHint: "Los estudiantes ganan avatares jugando sesiones en vivo, construyendo rachas y alcanzando metas de retención.",
    starter: "Avatar inicial",
    starterHint: "Disponible desde el primer día.",
    cond_sessions: "Completa {n} sesiones",
    cond_streak: "Logra una racha de {n} días",
    cond_perfect: "Obtén 100% en {n} sesión(es)",
    cond_answers: "Responde {n} preguntas correctamente",
    cond_topics: "Domina {n} temas (≥70% retención)",
    cond_comeback: "Regresa después de {n} días",
    cond_retention: "Retención promedio ≥ {n}%",
    loading: "Cargando...",
    noProgress: "Empieza una sesión para empezar a ganar avatares",
  },
  ko: {
    pageTitle: "업적",
    subtitle: "플레이하고 배우면서 새로운 아바타를 잠금 해제하세요",
    all: "전체", unlocked: "잠금 해제됨", locked: "잠김",
    total: "개 잠금 해제", common: "일반", rare: "레어", legendary: "전설",
    nextUnlock: "잠금 해제 직전",
    close: "닫기",
    earned: "획득!",
    progressLabel: "진행도",
    teacherNotice: "업적은 학생을 위해 설계되었습니다.",
    teacherNoticeHint: "학생은 라이브 세션을 플레이하고, 연속 기록을 쌓고, 보존율 목표를 달성하여 아바타를 얻습니다.",
    starter: "시작 아바타",
    starterHint: "처음부터 사용 가능합니다.",
    cond_sessions: "{n}개 세션 완료",
    cond_streak: "{n}일 연속 달성",
    cond_perfect: "{n}개 세션에서 100% 달성",
    cond_answers: "{n}개 문제 정답",
    cond_topics: "{n}개 주제 마스터 (≥70% 보존)",
    cond_comeback: "{n}일 후 복귀",
    cond_retention: "평균 보존율 ≥ {n}%",
    loading: "로딩 중...",
    noProgress: "세션을 시작하여 아바타 획득을 시작하세요",
  },
};

const css = `
  .ach-card { transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease; cursor: pointer; }
  .ach-card:hover { transform: translateY(-2px); box-shadow: 0 4px 14px rgba(0,0,0,0.08); }
  .ach-filter { transition: all .15s ease; cursor: pointer; }
  .ach-stat { transition: all .15s ease; }
  .ach-stat:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,.06); }
  @keyframes ach-fade { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
  .ach-fade { animation: ach-fade .3s ease both }
  @keyframes ach-pop { 0% { opacity:0; transform:scale(.9) } 100% { opacity:1; transform:scale(1) } }
  .ach-pop { animation: ach-pop .3s ease both }
  @keyframes ach-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  .ach-progress-fill { background: linear-gradient(90deg, var(--c1), var(--c2), var(--c1)); background-size: 200% 100%; animation: ach-shimmer 2.5s linear infinite; }
`;

// ─── Unlock condition → progress ──────────────────────────────────────────
// Given an avatar's unlock spec and the student's stats, return:
//   { current, target, percent, doneText }
function evalProgress(unlock, stats) {
  if (!unlock) return null;
  if (!stats) return { current: 0, target: 1, percent: 0 };

  switch (unlock.type) {
    case "sessions":
      return { current: Math.min(stats.sessionsCount, unlock.count), target: unlock.count, percent: Math.min(100, (stats.sessionsCount / unlock.count) * 100) };
    case "streak":
      return { current: Math.min(stats.streakDays, unlock.days), target: unlock.days, percent: Math.min(100, (stats.streakDays / unlock.days) * 100) };
    case "perfect":
      return { current: Math.min(stats.perfectSessions, unlock.count), target: unlock.count, percent: Math.min(100, (stats.perfectSessions / unlock.count) * 100) };
    case "answers":
      return { current: Math.min(stats.answersCorrect, unlock.count), target: unlock.count, percent: Math.min(100, (stats.answersCorrect / unlock.count) * 100) };
    case "topics":
      return { current: Math.min(stats.topicsMastered, unlock.count), target: unlock.count, percent: Math.min(100, (stats.topicsMastered / unlock.count) * 100) };
    case "comeback":
      return { current: Math.min(stats.comebackDays, unlock.days), target: unlock.days, percent: Math.min(100, (stats.comebackDays / unlock.days) * 100) };
    case "retention":
      return { current: Math.min(stats.avgRetention, unlock.min), target: unlock.min, percent: Math.min(100, (stats.avgRetention / unlock.min) * 100) };
    default:
      return { current: 0, target: 1, percent: 0 };
  }
}

function unlockText(unlock, t) {
  if (!unlock) return "";
  switch (unlock.type) {
    case "sessions":  return t.cond_sessions.replace("{n}", unlock.count);
    case "streak":    return t.cond_streak.replace("{n}", unlock.days);
    case "perfect":   return t.cond_perfect.replace("{n}", unlock.count);
    case "answers":   return t.cond_answers.replace("{n}", unlock.count);
    case "topics":    return t.cond_topics.replace("{n}", unlock.count);
    case "comeback":  return t.cond_comeback.replace("{n}", unlock.days);
    case "retention": return t.cond_retention.replace("{n}", unlock.min);
    default: return "";
  }
}

// ─── Card per avatar ──────────────────────────────────────────────────────
function AvatarCard({ avatar, unlocked, progress, lang, t, onClick }) {
  const rarity = RARITY[avatar.rarity] || RARITY.common;
  const isStarter = avatar.starter === true;
  const condText = isStarter ? t.starterHint : unlockText(avatar.unlock, t);
  const name = avatar.name?.[lang] || avatar.name?.en || avatar.id;

  return (
    <button
      className="ach-card"
      onClick={onClick}
      style={{
        background: C.bg, borderRadius: 12,
        border: `1px solid ${unlocked ? rarity.border : C.border}`,
        padding: 14, textAlign: "left", cursor: "pointer",
        fontFamily: "'Outfit',sans-serif",
        display: "flex", flexDirection: "column", gap: 10,
        opacity: unlocked ? 1 : 0.85,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ filter: unlocked ? "none" : "grayscale(0.7) opacity(0.6)", flexShrink: 0 }}>
          <CatalogAvatar id={avatar.id} size={52} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, color: unlocked ? C.text : C.textSecondary }}>
            {name}
          </div>
          <div style={{
            display: "inline-block", marginTop: 4,
            padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600,
            background: rarity.bg, color: rarity.text,
            border: `1px solid ${rarity.border}`,
          }}>
            {rarity.label[lang]}
          </div>
        </div>
        {unlocked && (
          <div style={{ flexShrink: 0, color: C.green }}>
            <CIcon name="check" size={20} />
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.4 }}>
        {condText}
      </div>

      {/* Progress bar (hidden for starters and already-unlocked) */}
      {!isStarter && !unlocked && progress && (
        <div>
          <div style={{
            height: 6, background: C.bgSoft, borderRadius: 4, overflow: "hidden",
          }}>
            <div
              className="ach-progress-fill"
              style={{
                "--c1": rarity.text,
                "--c2": rarity.text + "AA",
                width: `${progress.percent}%`, height: "100%",
                transition: "width .5s ease",
              }}
            />
          </div>
          <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4, fontFamily: MONO, textAlign: "right" }}>
            {progress.current} / {progress.target}
          </div>
        </div>
      )}
    </button>
  );
}

// ─── Detail modal ─────────────────────────────────────────────────────────
function AchModal({ avatar, unlocked, progress, lang, t, onClose }) {
  const rarity = RARITY[avatar.rarity] || RARITY.common;
  const isStarter = avatar.starter === true;
  const condText = isStarter ? t.starterHint : unlockText(avatar.unlock, t);
  const name = avatar.name?.[lang] || avatar.name?.en || avatar.id;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} className="ach-pop" style={{
        background: C.bg, borderRadius: 16, border: `1px solid ${unlocked ? rarity.border : C.border}`,
        padding: 32, maxWidth: 380, width: "100%", textAlign: "center",
        boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
      }}>
        <div style={{
          display: "inline-flex", marginBottom: 12,
          filter: unlocked ? "none" : "grayscale(0.7) opacity(0.7)",
        }}>
          <CatalogAvatar id={avatar.id} size={108} />
        </div>

        <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          {name}
        </h2>

        <div style={{
          display: "inline-block", marginBottom: 14,
          padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
          background: rarity.bg, color: rarity.text,
          border: `1px solid ${rarity.border}`,
        }}>
          {rarity.label[lang]}
        </div>

        {unlocked && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "8px 14px", borderRadius: 10,
            background: C.greenSoft, color: C.green,
            fontSize: 13, fontWeight: 600, marginBottom: 14,
          }}>
            <CIcon name="check" size={14} inline /> {t.earned}
          </div>
        )}

        <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5, marginBottom: 18 }}>
          {condText}
        </p>

        {!isStarter && !unlocked && progress && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11, color: C.textMuted }}>
              <span>{t.progressLabel}</span>
              <span style={{ fontFamily: MONO, color: C.text }}>{progress.current} / {progress.target}</span>
            </div>
            <div style={{ height: 8, background: C.bgSoft, borderRadius: 4, overflow: "hidden" }}>
              <div
                className="ach-progress-fill"
                style={{
                  "--c1": rarity.text,
                  "--c2": rarity.text + "AA",
                  width: `${progress.percent}%`, height: "100%",
                  transition: "width .5s ease",
                }}
              />
            </div>
          </div>
        )}

        <button onClick={onClose} style={{
          padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: C.bgSoft, color: C.textSecondary, border: `1px solid ${C.border}`,
          cursor: "pointer", fontFamily: "'Outfit',sans-serif",
        }}>{t.close}</button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────
export default function Achievements({ lang = "en", setLang, profile = null, onOpenMobileMenu }) {
  const isMobile = useIsMobile();
  const t = i18n[lang] || i18n.en;
  const [filter, setFilter] = useState("all"); // all | unlocked | locked
  const [rarityFilter, setRarityFilter] = useState("all"); // all | common | rare | legendary
  const [selected, setSelected] = useState(null);
  const [stats, setStats] = useState(null);
  const [unlocks, setUnlocks] = useState({}); // { avatarId: true }
  const [loading, setLoading] = useState(true);

  // ── Teacher notice ──
  const isTeacher = profile?.role === "teacher";

  // ── Load student data ──
  useEffect(() => {
    if (!profile?.id || isTeacher) { setLoading(false); return; }
    (async () => {
      try {
        const [s, u] = await Promise.all([
          getStudentStats(profile.id),
          supabase.from("student_unlocks").select("avatar_id").eq("student_id", profile.id),
        ]);
        setStats(s);
        const map = {};
        (u?.data || []).forEach(row => { map[row.avatar_id] = true; });
        setUnlocks(map);
      } catch (e) {
        console.error("Achievements load error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.id, isTeacher]);

  // ── Build merged list with unlock + progress info ──
  const enriched = AVATARS.map(av => {
    const isStarter = av.starter === true;
    const unlocked = isStarter || !!unlocks[av.id];
    const progress = !isStarter ? evalProgress(av.unlock, stats) : null;
    return { avatar: av, unlocked, progress };
  });

  // ── Stats for the header ──
  const totalUnlocked = enriched.filter(e => e.unlocked).length;
  const totalAvatars = enriched.length;
  const byRarity = {
    common: enriched.filter(e => e.avatar.rarity === "common"),
    rare: enriched.filter(e => e.avatar.rarity === "rare"),
    legendary: enriched.filter(e => e.avatar.rarity === "legendary"),
  };

  // ── Closest to unlocking (from locked, sorted by progress %) ──
  const closest = enriched
    .filter(e => !e.unlocked && e.progress && e.progress.percent < 100)
    .sort((a, b) => b.progress.percent - a.progress.percent)[0];

  // ── Apply filters ──
  let visible = enriched;
  if (filter === "unlocked") visible = visible.filter(e => e.unlocked);
  else if (filter === "locked") visible = visible.filter(e => !e.unlocked);
  if (rarityFilter !== "all") visible = visible.filter(e => e.avatar.rarity === rarityFilter);

  // ── Teacher view ──
  if (isTeacher) {
    return (
      <div style={{ padding: "28px 20px" }}>
        <style>{css}</style>
        <PageHeader title={t.pageTitle} lang={lang} setLang={setLang} onOpenMobileMenu={onOpenMobileMenu} />
        <div className="ach-fade" style={{ maxWidth: 480, margin: "60px auto", textAlign: "center", padding: "20px" }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: C.purpleSoft, color: C.purple,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            marginBottom: 16,
          }}>
            <CIcon name="trophy" size={28} inline />
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 8 }}>
            {t.teacherNotice}
          </h2>
          <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5 }}>
            {t.teacherNoticeHint}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "28px 20px" }}>
        <style>{css}</style>
        <PageHeader title={t.pageTitle} lang={lang} setLang={setLang} onOpenMobileMenu={onOpenMobileMenu} />
        <p style={{ textAlign: "center", color: C.textMuted, padding: 40 }}>{t.loading}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 20px" }}>
      <style>{css}</style>
      <PageHeader title={t.pageTitle} lang={lang} setLang={setLang} onOpenMobileMenu={onOpenMobileMenu} />
      {selected && (
        <AchModal
          avatar={selected.avatar}
          unlocked={selected.unlocked}
          progress={selected.progress}
          lang={lang}
          t={t}
          onClose={() => setSelected(null)}
        />
      )}

      <div className="ach-fade" style={{ maxWidth: 800, margin: "0 auto" }}>
        <p style={{ fontSize: 14, color: C.textSecondary, marginBottom: 20 }}>{t.subtitle}</p>

        {/* Top stats */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <div className="ach-stat" style={{
            flex: "1 1 200px", padding: "16px 18px", borderRadius: 10,
            background: C.bg, border: `1px solid ${C.border}`,
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: MONO, color: C.accent, lineHeight: 1 }}>
              {totalUnlocked}<span style={{ fontSize: 18, color: C.textMuted }}>/{totalAvatars}</span>
            </div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{t.total}</div>
          </div>
          {["common", "rare", "legendary"].map(r => {
            const list = byRarity[r];
            const u = list.filter(e => e.unlocked).length;
            return (
              <div key={r} className="ach-stat" style={{
                flex: "1 1 100px", padding: "16px 18px", borderRadius: 10,
                background: C.bg, border: `1px solid ${RARITY[r].border}`,
              }}>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: MONO, color: RARITY[r].text, lineHeight: 1 }}>
                  {u}<span style={{ fontSize: 14, color: C.textMuted }}>/{list.length}</span>
                </div>
                <div style={{ fontSize: 11, color: RARITY[r].text, marginTop: 4, fontWeight: 600 }}>
                  {t[r]}
                </div>
              </div>
            );
          })}
        </div>

        {/* Closest to unlock */}
        {closest && (
          <button
            onClick={() => setSelected(closest)}
            style={{
              width: "100%", padding: "14px 18px", borderRadius: 10, marginBottom: 20,
              background: `linear-gradient(135deg, ${C.accentSoft}, ${C.purpleSoft})`,
              border: `1px solid ${C.accent}22`,
              cursor: "pointer", fontFamily: "'Outfit',sans-serif",
              display: "flex", alignItems: "center", gap: 12, textAlign: "left",
            }}
          >
            <div style={{ flexShrink: 0 }}>
              <CatalogAvatar id={closest.avatar.id} size={44} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: C.purple, fontWeight: 600, marginBottom: 2 }}>{t.nextUnlock}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>
                {closest.avatar.name?.[lang] || closest.avatar.name?.en}
              </div>
              <div style={{ height: 5, background: "rgba(255,255,255,0.6)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${closest.progress.percent}%`, height: "100%", background: C.accent, transition: "width .5s ease" }} />
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.purple, fontFamily: MONO, flexShrink: 0 }}>
              {Math.round(closest.progress.percent)}%
            </div>
          </button>
        )}

        {/* Filters */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {["all", "unlocked", "locked"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="ach-filter"
              style={{
                padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: filter === f ? C.accentSoft : C.bg,
                color: filter === f ? C.accent : C.textSecondary,
                border: `1px solid ${filter === f ? C.accent + "44" : C.border}`,
                fontFamily: "'Outfit',sans-serif",
              }}
            >{t[f]}</button>
          ))}
          {!isMobile && <div style={{ width: 1, height: 28, background: C.border, margin: "0 4px" }} />}
          {["all", "common", "rare", "legendary"].map(r => (
            <button
              key={r}
              onClick={() => setRarityFilter(r)}
              className="ach-filter"
              style={{
                padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: rarityFilter === r ? (RARITY[r]?.bg || C.accentSoft) : C.bg,
                color: rarityFilter === r ? (RARITY[r]?.text || C.accent) : C.textSecondary,
                border: `1px solid ${rarityFilter === r ? (RARITY[r]?.border || C.accent + "44") : C.border}`,
                fontFamily: "'Outfit',sans-serif",
              }}
            >{t[r] || t.all}</button>
          ))}
        </div>

        {/* Cards grid */}
        {visible.length === 0 ? (
          <p style={{ textAlign: "center", color: C.textMuted, padding: 40, fontSize: 13 }}>—</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {visible.map(item => (
              <AvatarCard
                key={item.avatar.id}
                avatar={item.avatar}
                unlocked={item.unlocked}
                progress={item.progress}
                lang={lang}
                t={t}
                onClick={() => setSelected(item)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
