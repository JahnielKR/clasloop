// â”€â”€â”€ RoleOnboarding â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//
// PR 43: Pantalla obligatoria post-signup/signin que aparece UNA SOLA VEZ
// (cuando un user autenticado no tiene profile todavÃ­a). El user elige
// si es profesor o estudiante. La elecciÃ³n crea el profile en la DB con
// el rol seleccionado.
//
// Esta pantalla es la ÃšNICA forma de crear un profile. El trigger SQL
// que antes hacÃ­a esto automÃ¡ticamente fue eliminado en el migration
// pr43_drop_auto_profile_trigger.sql.
//
// Props:
//   user      - el auth user (de supabase.auth.getUser())
//   lang      - cÃ³digo de idioma (en/es/ko)
//   onCreated - callback(profile) cuando el user elige y el insert
//               tiene Ã©xito. El padre actualiza setProfile.
//
// La elecciÃ³n NO se puede cambiar despuÃ©s desde la UI â€” es una decisiÃ³n
// de producto: 1 cuenta = 1 rol. Si necesitan otro rol, usan otro email.

// PR 74: i18n centralizado
import { useT } from "../i18n";
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { LogoMark, TeacherInline, StudentInline } from "../components/Icons";
import { C } from "../components/tokens";

// PR 74: el bloque i18n local fue movido a src/i18n/{en,es,ko}.js
// bajo el namespace "roleOnboarding".

export default function RoleOnboarding({ user, lang = "en", onCreated }) {
  const t = useT("roleOnboarding", lang);
  const [step, setStep] = useState("select"); // "select" | "confirm"
  const [pickedRole, setPickedRole] = useState(null); // "teacher" | "student"
  const [submitting, setSubmitting] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [error, setError] = useState("");

  // Click en una card del select step: solo guardamos la elecciÃ³n y
  // pasamos al confirm step. No tocamos la DB todavÃ­a.
  const handlePickRole = (role) => {
    if (submitting) return;
    setPickedRole(role);
    setStep("confirm");
    setError("");
  };

  // Click "AtrÃ¡s" en el confirm step: volvemos al select sin crear nada.
  const handleBack = () => {
    if (submitting) return;
    setStep("select");
    setPickedRole(null);
    setError("");
  };

  // Click "SÃ­, crear mi cuenta" en el confirm step: ESTO reciÃ©n crea
  // el profile en la DB.
  const handleConfirm = async () => {
    if (submitting || !pickedRole) return;
    setSubmitting(true);
    setError("");

    const fullName =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      (user?.email ? user.email.split("@")[0] : "User");

    const avatarFromMetadata = user?.user_metadata?.avatar_url || null;

    try {
      const { data, error: insertErr } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          full_name: fullName,
          role: pickedRole,
          // Si Google nos pasÃ³ una avatar URL, la guardamos. Los students
          // de todas formas eligen avatar despuÃ©s; los teachers pueden
          // dejarla.
          avatar_url: avatarFromMetadata,
        })
        .select()
        .single();

      if (insertErr) {
        console.error("[clasloop] RoleOnboarding profile insert failed:", insertErr);
        setError(t.error);
        setSubmitting(false);
        return;
      }
      onCreated?.(data);
    } catch (err) {
      console.error("[clasloop] RoleOnboarding exception:", err);
      setError(t.error);
      setSubmitting(false);
    }
  };

  // â”€â”€â”€ Card builder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const buildCard = (role, label, desc, Icon, accentColor) => {
    const isHovered = hoveredCard === role;
    return (
      <button
        key={role}
        onClick={() => handlePickRole(role)}
        onMouseEnter={() => setHoveredCard(role)}
        onMouseLeave={() => setHoveredCard(null)}
        disabled={submitting}
        style={{
          // Layout
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          width: "100%",
          padding: "32px 24px",
          minHeight: 220,
          // Visuals
          background: C.bg,
          border: `2px solid ${isHovered ? accentColor : C.border}`,
          borderRadius: 14,
          cursor: submitting ? "default" : "pointer",
          opacity: submitting ? 0.6 : 1,
          // Hover lift
          transform: isHovered && !submitting ? "translateY(-2px)" : "translateY(0)",
          transition: "transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease",
          boxShadow: isHovered && !submitting
            ? `0 8px 24px -8px ${accentColor}30`
            : "none",
          // Reset button defaults
          fontFamily: "inherit",
          textAlign: "center",
        }}
      >
        <div style={{
          width: 64, height: 64,
          borderRadius: "50%",
          background: isHovered ? `${accentColor}18` : C.bgSoft,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.18s",
        }}>
          <Icon size={32} color={accentColor} />
        </div>
        <div>
          <div style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 18,
            fontWeight: 700,
            color: C.text,
            marginBottom: 4,
          }}>{label}</div>
          <div style={{
            fontSize: 13,
            color: C.textSecondary,
            lineHeight: 1.4,
            maxWidth: 240,
            margin: "0 auto",
          }}>{desc}</div>
        </div>
      </button>
    );
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: C.bgSoft,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    }}>
      <div style={{ maxWidth: step === "confirm" ? 460 : 720, width: "100%" }}>

        {/* Step: SELECT â€” elegir rol entre 2 cards */}
        {step === "select" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
                <LogoMark size={52} />
              </div>
              <h1 style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 30,
                fontWeight: 700,
                color: C.text,
                marginBottom: 8,
                letterSpacing: "-0.02em",
              }}>{t.welcome}</h1>
              <p style={{
                fontSize: 16,
                color: C.textSecondary,
                fontFamily: "'Outfit', sans-serif",
              }}>{t.subtitle}</p>
            </div>

            {error && (
              <div style={{
                background: C.redSoft,
                color: C.red,
                padding: "12px 16px",
                borderRadius: 9,
                marginBottom: 20,
                textAlign: "center",
                fontSize: 14,
              }}>{error}</div>
            )}

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
              marginBottom: 24,
            }}>
              {buildCard("teacher", t.teacher, t.teacherDesc, TeacherInline, C.accent)}
              {buildCard("student", t.student, t.studentDesc, StudentInline, C.purple)}
            </div>

            <p style={{
              textAlign: "center",
              fontSize: 12,
              color: C.textMuted,
              fontFamily: "'Outfit', sans-serif",
              marginTop: 8,
            }}>{t.warning}</p>
          </>
        )}

        {/* Step: CONFIRM â€” confirmaciÃ³n con AtrÃ¡s/Confirmar */}
        {step === "confirm" && (
          <div style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: 32,
            textAlign: "center",
          }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
              {pickedRole === "teacher"
                ? <TeacherInline size={48} />
                : <StudentInline size={48} />}
            </div>
            <h2 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 22,
              fontWeight: 700,
              color: C.text,
              marginBottom: 10,
            }}>{t.confirmTitle}</h2>
            <p style={{
              fontSize: 15,
              color: C.text,
              fontFamily: "'Outfit', sans-serif",
              marginBottom: 8,
              fontWeight: 600,
            }}>
              {pickedRole === "teacher" ? t.confirmTeacher : t.confirmStudent}
            </p>
            <p style={{
              fontSize: 13,
              color: C.textSecondary,
              fontFamily: "'Outfit', sans-serif",
              lineHeight: 1.5,
              marginBottom: 24,
            }}>{t.confirmDetail}</p>

            {submitting && (
              <p style={{
                fontSize: 13,
                color: C.textSecondary,
                marginBottom: 14,
              }}>{t.creating}</p>
            )}
            {error && (
              <div style={{
                background: C.redSoft,
                color: C.red,
                padding: "10px 14px",
                borderRadius: 9,
                marginBottom: 16,
                fontSize: 13,
              }}>{error}</div>
            )}

            <div style={{ display: "flex", gap: 10, flexDirection: "column" }}>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                style={{
                  padding: "13px 18px",
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 600,
                  background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
                  color: "#fff",
                  border: "none",
                  cursor: submitting ? "default" : "pointer",
                  opacity: submitting ? 0.6 : 1,
                  fontFamily: "'Outfit', sans-serif",
                }}
              >{t.confirmYes}</button>
              <button
                onClick={handleBack}
                disabled={submitting}
                style={{
                  padding: "13px 18px",
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 600,
                  background: "transparent",
                  color: C.textSecondary,
                  border: `1px solid ${C.border}`,
                  cursor: submitting ? "default" : "pointer",
                  opacity: submitting ? 0.6 : 1,
                  fontFamily: "'Outfit', sans-serif",
                }}
              >{"\u2190"} {t.confirmBack}</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
