import { useState } from "react";
import { supabase } from "../lib/supabase";
import { LogoMark, CIcon } from "../components/Icons";
import { Avatar as CatalogAvatar, AVATARS } from "../components/Avatars";
import { C } from "../components/tokens";

const i18n = {
  en: {
    welcome: "Welcome, {name}!",
    pickOne: "Pick your avatar",
    sub: "You can change it any time from Settings.",
    selected: "Looking good!",
    continue: "Continue",
    saving: "Saving...",
  },
  es: {
    welcome: "¡Bienvenido, {name}!",
    pickOne: "Elige tu avatar",
    sub: "Puedes cambiarlo cuando quieras desde Configuración.",
    selected: "¡Te queda bien!",
    continue: "Continuar",
    saving: "Guardando...",
  },
  ko: {
    welcome: "환영합니다, {name}님!",
    pickOne: "아바타를 선택하세요",
    sub: "설정에서 언제든지 변경할 수 있습니다.",
    selected: "잘 어울려요!",
    continue: "계속",
    saving: "저장 중...",
  },
};

const css = `
  @keyframes ao-fade { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
  .ao-fade { animation: ao-fade .35s ease both }
  @keyframes ao-pop { 0% { transform:scale(.8); opacity:0 } 60% { transform:scale(1.08); opacity:1 } 100% { transform:scale(1); opacity:1 } }
  .ao-pop { animation: ao-pop .3s ease both }
  .ao-tile { transition: transform .15s ease, box-shadow .15s ease; cursor: pointer; }
  .ao-tile:hover { transform: translateY(-2px); box-shadow: 0 4px 14px rgba(0,0,0,0.08); }
`;

export default function AvatarOnboarding({ profile, lang = "en", onDone }) {
  const t = i18n[lang] || i18n.en;
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  // The 10 starter avatars are flagged with starter:true in the catalog.
  // These are unlocked from day one for every account.
  const startAvatars = AVATARS.filter(a => a.starter === true);

  const firstName = (profile?.full_name || "").trim().split(/\s+/)[0] || "";

  const handleConfirm = async () => {
    if (!selected || !profile?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_id: selected })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      console.error("Failed to save avatar:", error);
      return;
    }
    onDone(selected);
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.bgSoft,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "'Outfit',sans-serif",
    }}>
      <style>{css}</style>
      <div className="ao-fade" style={{
        background: C.bg, borderRadius: 18, border: `1px solid ${C.border}`,
        padding: "32px 28px", maxWidth: 480, width: "100%",
        boxShadow: "0 6px 28px rgba(0,0,0,0.06)", textAlign: "center",
      }}>
        <div style={{ display: "inline-flex", marginBottom: 14 }}>
          <LogoMark size={42} />
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: C.text }}>
          {t.welcome.replace("{name}", firstName)}
        </h1>
        <p style={{ fontSize: 14, color: C.textSecondary, marginBottom: 4 }}>
          {t.pickOne}
        </p>
        <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 24 }}>
          {t.sub}
        </p>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10,
          marginBottom: 24,
        }}>
          {startAvatars.map(av => {
            const isSel = selected === av.id;
            return (
              <button
                key={av.id}
                className="ao-tile"
                onClick={() => setSelected(av.id)}
                style={{
                  padding: 8, borderRadius: 12,
                  background: isSel ? C.accentSoft : "transparent",
                  border: isSel ? `2px solid ${C.accent}` : `2px solid transparent`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transform: isSel ? "scale(1.05)" : "scale(1)",
                  transition: "transform .15s ease, background .15s ease, border-color .15s ease",
                }}
              >
                <CatalogAvatar id={av.id} size={56} />
              </button>
            );
          })}
        </div>

        {selected && (
          <p className="ao-pop" style={{
            fontSize: 13, color: C.green, fontWeight: 600, marginBottom: 16,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <CIcon name="sparkle" size={14} inline /> {t.selected}
          </p>
        )}

        <button
          onClick={handleConfirm}
          disabled={!selected || saving}
          style={{
            width: "100%", padding: "13px",
            borderRadius: 10, fontSize: 15, fontWeight: 600,
            background: (!selected || saving) ? C.bgSoft : `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
            color: (!selected || saving) ? C.textMuted : "#fff",
            border: "none",
            cursor: (!selected || saving) ? "default" : "pointer",
            fontFamily: "'Outfit',sans-serif",
          }}
        >
          {saving ? t.saving : t.continue}
        </button>
      </div>
    </div>
  );
}
