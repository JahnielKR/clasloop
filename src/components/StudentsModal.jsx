// ─── StudentsModal — list of students in a class with remove action ─────
//
// PR 27: gives the teacher a real view of who joined their class.
// Before this, the teacher only saw a count badge — they couldn't see
// names, couldn't see when each student joined, and couldn't kick
// anyone (other than asking Anthropic, which... doesn't help).
//
// Now: a modal opened from the "View students" button in ClassPage
// header. Lists every student with avatar + name + joined date +
// remove button. Remove is gated behind a confirm to prevent fat-finger.
//
// Auth model: the RLS policy added in phase27_class_members_teacher_remove.sql
// allows DELETE only when the row's class belongs to the teacher
// running the request. So the UI can call DELETE freely — the DB
// enforces ownership.

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { C } from "./tokens";
import { getAvatarById } from "./Avatars";

const i18n = {
  en: {
    title: "Students in this class",
    subtitle: "{n} student",
    subtitlePlural: "{n} students",
    empty: "No students have joined yet. Share the class code so they can sign up.",
    joinedOn: "Joined {date}",
    remove: "Remove",
    removeAria: "Remove student from class",
    removeConfirmTitle: "Remove {name}?",
    removeConfirmBody: "They'll lose access to this class. Their answer history stays in the database but won't be shown to them here. They can rejoin with the class code anytime.",
    removeYes: "Remove",
    removeNo: "Cancel",
    removeError: "Could not remove the student. Try again.",
    close: "Close",
    loading: "Loading…",
  },
  es: {
    title: "Estudiantes en esta clase",
    subtitle: "{n} estudiante",
    subtitlePlural: "{n} estudiantes",
    empty: "Ningún estudiante se ha unido aún. Compartí el código de clase para que se registren.",
    joinedOn: "Se unió el {date}",
    remove: "Remover",
    removeAria: "Remover estudiante de la clase",
    removeConfirmTitle: "¿Remover a {name}?",
    removeConfirmBody: "Va a perder acceso a esta clase. Su historial de respuestas queda en la base de datos pero no se le muestra aquí. Puede volver a unirse con el código de clase cuando quiera.",
    removeYes: "Remover",
    removeNo: "Cancelar",
    removeError: "No se pudo remover al estudiante. Intentá de nuevo.",
    close: "Cerrar",
    loading: "Cargando…",
  },
  ko: {
    title: "이 수업의 학생들",
    subtitle: "학생 {n}명",
    subtitlePlural: "학생 {n}명",
    empty: "아직 학생이 참여하지 않았습니다. 수업 코드를 공유하여 등록하도록 하세요.",
    joinedOn: "{date} 참여",
    remove: "삭제",
    removeAria: "학생을 수업에서 제거",
    removeConfirmTitle: "{name} 학생을 제거하시겠습니까?",
    removeConfirmBody: "이 수업에 대한 접근 권한이 사라집니다. 답변 기록은 데이터베이스에 남지만 여기에 표시되지 않습니다. 언제든 수업 코드로 다시 참여할 수 있습니다.",
    removeYes: "제거",
    removeNo: "취소",
    removeError: "학생을 제거할 수 없습니다. 다시 시도하세요.",
    close: "닫기",
    loading: "로딩 중…",
  },
};

function formatJoinedDate(rawIso, lang) {
  if (!rawIso) return "";
  const d = new Date(rawIso);
  if (Number.isNaN(d.getTime())) return "";
  const locale = lang === "es" ? "es" : lang === "ko" ? "ko" : "en-US";
  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric", month: "short", day: "numeric",
    }).format(d);
  } catch {
    return d.toDateString();
  }
}

export default function StudentsModal({
  open,
  classId,
  className,
  lang = "en",
  onClose,
}) {
  const t = i18n[lang] || i18n.en;
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  // confirm modal state — { id, name } | null
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  // Fetch students when modal opens. Joining profiles lets us show
  // the student's full_name (if signed up properly) and avatar_id.
  useEffect(() => {
    if (!open || !classId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("class_members")
        .select(`
          id,
          student_id,
          student_name,
          joined_at,
          profiles (
            id,
            full_name,
            avatar_id,
            avatar_url
          )
        `)
        .eq("class_id", classId)
        .order("joined_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        console.error("[clasloop] StudentsModal fetch failed:", error);
        setStudents([]);
      } else {
        setStudents(data || []);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, classId]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Esc closes (unless a confirm sub-modal is open or we're removing)
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (confirmRemove) {
        if (!removing) setConfirmRemove(null);
      } else {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, confirmRemove, removing, onClose]);

  if (!open) return null;

  const handleRemove = async () => {
    if (!confirmRemove) return;
    setRemoving(true);
    const { error, count } = await supabase
      .from("class_members")
      .delete({ count: "exact" })
      .eq("id", confirmRemove.id);
    if (error || count === 0) {
      console.error("[clasloop] remove student failed:", error || "0 rows affected");
      alert(t.removeError);
      setRemoving(false);
      return;
    }
    // Optimistic update: drop the row locally without a refetch.
    setStudents(prev => prev.filter(s => s.id !== confirmRemove.id));
    setConfirmRemove(null);
    setRemoving(false);
  };

  const count = students.length;
  const subtitle = (count === 1 ? t.subtitle : t.subtitlePlural).replace("{n}", count);

  const displayName = (m) =>
    m.profiles?.full_name?.trim() || m.student_name || "—";

  const avatarFor = (m) => {
    const avId = m.profiles?.avatar_id || "fox";
    const url = m.profiles?.avatar_url || null;
    return { avId, url };
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !confirmRemove) onClose();
      }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(15, 18, 25, 0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          background: C.bg,
          borderRadius: 16,
          width: "100%",
          maxWidth: 520,
          maxHeight: "82vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 70px rgba(0, 0, 0, 0.35)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "22px 24px 18px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexShrink: 0,
        }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{
              fontSize: 18, fontWeight: 700,
              margin: "0 0 3px",
              color: C.text,
              letterSpacing: "-0.01em",
            }}>
              {t.title}
            </h2>
            <p style={{
              fontSize: 13, color: C.textSecondary,
              margin: 0,
            }}>
              {className} · {subtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={t.close}
            style={{
              background: "transparent",
              border: "none",
              padding: 4,
              color: C.textSecondary,
              cursor: "pointer",
              flexShrink: 0,
              borderRadius: 6,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = C.bgSoft; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body — scrolling list */}
        <div style={{
          padding: "8px 24px 18px",
          overflowY: "auto",
          flex: 1,
        }}>
          {loading ? (
            <div style={{ padding: 30, textAlign: "center", color: C.textMuted, fontSize: 14 }}>
              {t.loading}
            </div>
          ) : students.length === 0 ? (
            <div style={{
              padding: "40px 16px",
              textAlign: "center",
              color: C.textMuted,
              fontSize: 14,
              lineHeight: 1.5,
            }}>
              {t.empty}
            </div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {students.map(m => {
                const { avId, url } = avatarFor(m);
                const av = getAvatarById(avId);
                return (
                  <li
                    key={m.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 0",
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 40, height: 40,
                      borderRadius: 10,
                      background: av?.bg || C.bgSoft,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      flexShrink: 0,
                      overflow: "hidden",
                    }}>
                      {url ? (
                        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span>{av?.emoji || "🦊"}</span>
                      )}
                    </div>

                    {/* Name + joined date */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14.5, fontWeight: 600,
                        color: C.text,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {displayName(m)}
                      </div>
                      <div style={{
                        fontSize: 12, color: C.textMuted,
                      }}>
                        {t.joinedOn.replace("{date}", formatJoinedDate(m.joined_at, lang))}
                      </div>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => setConfirmRemove({ id: m.id, name: displayName(m) })}
                      aria-label={t.removeAria}
                      style={{
                        background: "transparent",
                        border: `1px solid ${C.border}`,
                        color: C.red,
                        padding: "6px 12px",
                        borderRadius: 7,
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: "pointer",
                        fontFamily: "'Outfit', sans-serif",
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(224, 62, 62, 0.06)";
                        e.currentTarget.style.borderColor = C.red;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderColor = C.border;
                      }}
                    >
                      {t.remove}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Confirm remove — nested dialog with its own backdrop click */}
      {confirmRemove && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget && !removing) setConfirmRemove(null); }}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(15, 18, 25, 0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
            zIndex: 300,
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            style={{
              background: C.bg,
              borderRadius: 14,
              maxWidth: 380,
              width: "100%",
              padding: "22px 22px 18px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.30)",
            }}
          >
            <h3 style={{
              fontSize: 16, fontWeight: 700,
              margin: "0 0 8px",
              color: C.text,
            }}>
              {t.removeConfirmTitle.replace("{name}", confirmRemove.name)}
            </h3>
            <p style={{
              fontSize: 13, lineHeight: 1.5,
              color: C.textSecondary,
              margin: "0 0 18px",
            }}>
              {t.removeConfirmBody}
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmRemove(null)}
                disabled={removing}
                style={{
                  background: "transparent",
                  border: `1px solid ${C.border}`,
                  color: C.textSecondary,
                  padding: "8px 14px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: removing ? "not-allowed" : "pointer",
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                {t.removeNo}
              </button>
              <button
                onClick={handleRemove}
                disabled={removing}
                style={{
                  background: C.red,
                  border: "none",
                  color: "#fff",
                  padding: "8px 16px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: removing ? "wait" : "pointer",
                  fontFamily: "'Outfit', sans-serif",
                  opacity: removing ? 0.7 : 1,
                }}
              >
                {removing ? t.loading : t.removeYes}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
