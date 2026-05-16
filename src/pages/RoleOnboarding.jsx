// ─── RoleOnboarding ──────────────────────────────────────────────────────
//
// PR 43: Pantalla obligatoria post-signup/signin que aparece UNA SOLA VEZ
// (cuando un user autenticado no tiene profile todavía). El user elige
// si es profesor o estudiante. La elección crea el profile en la DB con
// el rol seleccionado.
//
// Esta pantalla es la ÚNICA forma de crear un profile. El trigger SQL
// que antes hacía esto automáticamente fue eliminado en el migration
// pr43_drop_auto_profile_trigger.sql.
//
// Props:
//   user      - el auth user (de supabase.auth.getUser())
//   lang      - código de idioma (en/es/ko)
//   onCreated - callback(profile) cuando el user elige y el insert
//               tiene éxito. El padre actualiza setProfile.
//
// La elección NO se puede cambiar después desde la UI — es una decisión
// de producto: 1 cuenta = 1 rol. Si necesitan otro rol, usan otro email.

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { LogoMark, TeacherInline, StudentInline } from "../components/Icons";
import { C } from "../components/tokens";

const I18N = {
  en: {
    welcome: "Welcome to Clasloop",
    subtitle: "Which one are you?",
    teacher: "I'm a Teacher",
    teacherDesc: "Create classes, build decks, run quizzes for students",
    student: "I'm a Student",
    studentDesc: "Join your teacher's class and answer their quizzes",
    warning: "This choice can't be changed later.",
    creating: "Setting up your account…",
    error: "Something went wrong. Try again.",
    // Confirm step (PR 43.2)
    confirmTitle: "Are you sure?",
    confirmTeacher: "You're about to create a Teacher account.",
    confirmStudent: "You're about to create a Student account.",
    confirmDetail: "This can't be changed later. If you need the other role, you'll have to use a different email.",
    confirmBack: "Go back",
    confirmYes: "Yes, create my account",
  },
  es: {
    welcome: "Bienvenido a Clasloop",
    subtitle: "¿Cuál te describe mejor?",
    teacher: "Soy Profesor",
    teacherDesc: "Creá clases, armá decks y tomá quizzes a estudiantes",
    student: "Soy Estudiante",
    studentDesc: "Unite a la clase de tu profe y respondé sus quizzes",
    warning: "Esta elección no se puede cambiar después.",
    creating: "Configurando tu cuenta…",
    error: "Algo salió mal. Intentá de nuevo.",
    confirmTitle: "¿Estás seguro?",
    confirmTeacher: "Estás por crear una cuenta de Profesor.",
    confirmStudent: "Estás por crear una cuenta de Estudiante.",
    confirmDetail: "Esto no se puede cambiar después. Si necesitás el otro rol, vas a tener que usar otro email.",
    confirmBack: "Volver",
    confirmYes: "Sí, crear mi cuenta",
  },
  ko: {
    welcome: "Clasloop에 오신 것을 환영합니다",
    subtitle: "어느 쪽이신가요?",
    teacher: "교사입니다",
    teacherDesc: "수업을 만들고 덱을 구성하며 학생들에게 퀴즈를 실시",
    student: "학생입니다",
    studentDesc: "선생님의 수업에 참여하고 퀴즈에 답하기",
    warning: "이 선택은 나중에 변경할 수 없습니다.",
    creating: "계정을 설정하는 중…",
    error: "문제가 발생했습니다. 다시 시도해 주세요.",
    confirmTitle: "확실합니까?",
    confirmTeacher: "교사 계정을 만들려고 합니다.",
    confirmStudent: "학생 계정을 만들려고 합니다.",
    confirmDetail: "나중에 변경할 수 없습니다. 다른 역할이 필요하면 다른 이메일을 사용해야 합니다.",
    confirmBack: "돌아가기",
    confirmYes: "예, 계정 만들기",
  },
};

export default function RoleOnboarding({ user, lang = "en", onCreated }) {
  const t = I18N[lang] || I18N.en;
  const [step, setStep] = useState("select"); // "select" | "confirm"
  const [pickedRole, setPickedRole] = useState(null); // "teacher" | "student"
  const [submitting, setSubmitting] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [error, setError] = useState("");

  // Click en una card del select step: solo guardamos la elección y
  // pasamos al confirm step. No tocamos la DB todavía.
  const handlePickRole = (role) => {
    if (submitting) return;
    setPickedRole(role);
    setStep("confirm");
    setError("");
  };

  // Click "Atrás" en el confirm step: volvemos al select sin crear nada.
  const handleBack = () => {
    if (submitting) return;
    setStep("select");
    setPickedRole(null);
    setError("");
  };

  // Click "Sí, crear mi cuenta" en el confirm step: ESTO recién crea
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
          // Si Google nos pasó una avatar URL, la guardamos. Los students
          // de todas formas eligen avatar después; los teachers pueden
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

  // ─── Card builder ──────────────────────────────────────────────────────
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

        {/* Step: SELECT — elegir rol entre 2 cards */}
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

        {/* Step: CONFIRM — confirmación con Atrás/Confirmar */}
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
              >← {t.confirmBack}</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
