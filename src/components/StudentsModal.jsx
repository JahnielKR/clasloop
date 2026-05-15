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
    // PR 28.8: bulk remove
    selectAll: "Select all",
    selectAria: "Select student",
    selectedCount: "{n} selected",
    bulkRemove: "Remove selected",
    bulkCancel: "Clear",
    bulkConfirmTitle: "Remove {n} students?",
    bulkConfirmBody: "They'll lose access to this class. Their answer history stays in the database but won't be shown to them here. They can rejoin with the class code anytime.",
    bulkError: "Could not remove the students. Try again.",
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
    // PR 28.8: bulk remove
    selectAll: "Seleccionar todos",
    selectAria: "Seleccionar estudiante",
    selectedCount: "{n} seleccionados",
    bulkRemove: "Remover seleccionados",
    bulkCancel: "Limpiar",
    bulkConfirmTitle: "¿Remover {n} estudiantes?",
    bulkConfirmBody: "Van a perder acceso a esta clase. Su historial de respuestas queda en la base de datos pero no se les muestra aquí. Pueden volver a unirse con el código de clase cuando quieran.",
    bulkError: "No se pudieron remover los estudiantes. Intentá de nuevo.",
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
    // PR 28.8: bulk remove
    selectAll: "모두 선택",
    selectAria: "학생 선택",
    selectedCount: "{n}명 선택됨",
    bulkRemove: "선택한 학생 제거",
    bulkCancel: "선택 해제",
    bulkConfirmTitle: "학생 {n}명을 제거하시겠습니까?",
    bulkConfirmBody: "이 수업에 대한 접근 권한이 사라집니다. 답변 기록은 데이터베이스에 남지만 여기에 표시되지 않습니다. 언제든 수업 코드로 다시 참여할 수 있습니다.",
    bulkError: "학생들을 제거할 수 없습니다. 다시 시도하세요.",
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
  // PR 28.8: selection state for bulk remove. Set<string> of class_member.id.
  // Lives independently of `students` so re-fetches don't blow it away,
  // but the cleanup effect below prunes stale ids when students changes.
  const [selectedIds, setSelectedIds] = useState(new Set());
  // PR 28.8: unified confirm modal state. The shape carries everything
  // we need to know "which path was used":
  //   { kind: "single", id, name }          → from the per-row Remove button
  //   { kind: "bulk", ids: [...] }          → from the bulk action bar
  // Replaces the previous single-only `confirmRemove`.
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  // Fetch students when modal opens. Joining profiles lets us show
  // the student's full_name (if signed up properly) and avatar_id.
  useEffect(() => {
    if (!open || !classId) return;
    // PR 28.8: open is a fresh entry — reset selection. Otherwise a
    // teacher closing and re-opening for a different class would
    // inherit stale selected ids.
    setSelectedIds(new Set());
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

  // PR 28.8: prune stale selections when the students list shrinks.
  // Otherwise an id that just got removed could linger in selectedIds
  // and confuse the count badge ("3 selected" but only 2 highlighted).
  useEffect(() => {
    setSelectedIds(prev => {
      const valid = new Set(students.map(s => s.id));
      let changed = false;
      const next = new Set();
      for (const id of prev) {
        if (valid.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [students]);

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

  // PR 28.8: handles both single and bulk deletes through the same
  // path — we just route the supabase query on confirmRemove.kind.
  //
  // For bulk, we use .in("id", ids) — a single round trip that the
  // PR 27 RLS policy already supports (each row is individually
  // checked against `class_id IN (teacher's classes)`).
  //
  // count === ids.length checks that every row we tried to remove
  // actually got removed; if RLS hides some of them (shouldn't
  // happen in practice — teacher is owner of class — but defensive),
  // we surface an error and refetch instead of pretending success.
  const handleRemove = async () => {
    if (!confirmRemove) return;
    setRemoving(true);
    const ids = confirmRemove.kind === "bulk"
      ? confirmRemove.ids
      : [confirmRemove.id];
    const { error, count } = await supabase
      .from("class_members")
      .delete({ count: "exact" })
      .in("id", ids);
    if (error || count !== ids.length) {
      console.error(
        "[clasloop] remove student(s) failed:",
        error || `expected ${ids.length} rows deleted, got ${count}`
      );
      alert(confirmRemove.kind === "bulk" ? t.bulkError : t.removeError);
      setRemoving(false);
      return;
    }
    // Optimistic update: drop affected rows locally without a refetch.
    // The selection-pruning effect above will clear them from
    // selectedIds in the next render.
    const idSet = new Set(ids);
    setStudents(prev => prev.filter(s => !idSet.has(s.id)));
    setConfirmRemove(null);
    setRemoving(false);
  };

  // PR 28.8: per-row checkbox toggle. The row click area is the
  // checkbox itself (not the whole row) to preserve clicks on the
  // existing Remove button on the right.
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // PR 28.8: "select all" tri-state. Clicking it:
  //   - selects every visible student when 0 or partial are selected
  //   - clears selection when all are already selected
  const visibleCount = students.length;
  const selectedCount = selectedIds.size;
  const allSelected = visibleCount > 0 && selectedCount === visibleCount;
  const someSelected = selectedCount > 0 && !allSelected;
  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(students.map(s => s.id)));
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
            <>
              {/* PR 28.8: select-all header sits above the list and
                  mirrors per-row checkbox column. Tri-state via the
                  native `indeterminate` property (set imperatively via
                  ref callback since React doesn't expose it as a prop). */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "6px 0 10px",
                borderBottom: `1px solid ${C.border}`,
                marginBottom: 2,
              }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected; }}
                  onChange={toggleSelectAll}
                  aria-label={t.selectAll}
                  style={{
                    width: 18, height: 18,
                    cursor: "pointer",
                    flexShrink: 0,
                    accentColor: C.accent,
                  }}
                />
                <span style={{
                  fontSize: 12,
                  color: C.textMuted,
                  fontWeight: 500,
                }}>
                  {t.selectAll}
                </span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {students.map(m => {
                const { avId, url } = avatarFor(m);
                const av = getAvatarById(avId);
                const isSelected = selectedIds.has(m.id);
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
                    {/* PR 28.8: selection checkbox. Sits on the far
                        left so the existing avatar/name/Remove layout
                        stays visually anchored. */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(m.id)}
                      aria-label={t.selectAria}
                      style={{
                        width: 18, height: 18,
                        cursor: "pointer",
                        flexShrink: 0,
                        accentColor: C.accent,
                      }}
                    />
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
                      onClick={() => setConfirmRemove({
                        kind: "single",
                        id: m.id,
                        name: displayName(m),
                      })}
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
            </>
          )}
        </div>

        {/* PR 28.8: bulk action bar — appears only when something is
            selected. Sits inside the modal body (sticky bottom of the
            internal flex column) so it's always reachable without
            scrolling. Mirrors Gmail's "{n} selected · Action" pattern. */}
        {selectedCount > 0 && (
          <div style={{
            borderTop: `1px solid ${C.border}`,
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: C.bgSoft,
            flexShrink: 0,
          }}>
            <span style={{
              fontSize: 13,
              fontWeight: 600,
              color: C.text,
              flex: 1,
            }}>
              {t.selectedCount.replace("{n}", String(selectedCount))}
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              style={{
                background: "transparent",
                border: `1px solid ${C.border}`,
                color: C.textSecondary,
                padding: "7px 12px",
                borderRadius: 7,
                fontSize: 12.5,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "'Outfit',sans-serif",
              }}
            >
              {t.bulkCancel}
            </button>
            <button
              onClick={() => setConfirmRemove({
                kind: "bulk",
                ids: Array.from(selectedIds),
              })}
              style={{
                background: C.red,
                border: "none",
                color: "#fff",
                padding: "7px 14px",
                borderRadius: 7,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'Outfit',sans-serif",
              }}
            >
              {t.bulkRemove}
            </button>
          </div>
        )}
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
              {/* PR 28.8: title swaps per kind. Single keeps the
                  named "Remove Pedro?"; bulk shows "Remove 3 students?". */}
              {confirmRemove.kind === "bulk"
                ? t.bulkConfirmTitle.replace("{n}", String(confirmRemove.ids.length))
                : t.removeConfirmTitle.replace("{name}", confirmRemove.name)}
            </h3>
            <p style={{
              fontSize: 13, lineHeight: 1.5,
              color: C.textSecondary,
              margin: "0 0 18px",
            }}>
              {confirmRemove.kind === "bulk" ? t.bulkConfirmBody : t.removeConfirmBody}
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
