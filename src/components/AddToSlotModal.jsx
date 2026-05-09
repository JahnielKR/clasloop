// ─── AddToSlotModal ─────────────────────────────────────────────────────
//
// When the teacher clicks an empty warmup or exit-ticket slot in PlanView,
// this modal opens. It offers two paths:
//
//   1. Pick from library — search through decks the teacher already owns
//      that match this slot's section. Select one, it gets attached to
//      the slot (unit_id + position UPDATE) and the modal closes.
//
//   2. Create a new one — opens the deck editor with section + unit + class
//      pre-filled, the way ClassPage routed before this modal existed.
//
// The point of the modal: avoid the dead-end where every empty slot
// dropped the teacher into a fresh editor. Most teachers already have
// a deck that fits — they just need a way to slot it in.
//
// What this component does NOT do:
//   - Show decks from OTHER teachers (favorites, community) — those flow
//     through "Customize favorite" elsewhere; here we keep it to the
//     teacher's own library
//   - Filter by class — we show all the teacher's decks of the matching
//     section across classes, since the most common reuse case is
//     adapting a warmup from "Spanish 9th A" to "Spanish 9th B"
//   - Allow multi-select — one slot, one deck
//
// Schema interaction:
//   Selecting an existing deck does:
//     update decks set unit_id = <activeUnit.id>, position = <nextPos>
//     where id = <pickedDeck.id>
//   Position math: highest current position in (class, section, unit)
//   plus 1, so the picked deck lands at the end of the day stack. The
//   teacher can drag-reorder later in All-decks view.

import { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { C, MONO } from "./tokens";
import SectionBadge, { sectionAccent } from "./SectionBadge";

const i18n = {
  en: {
    titleWarmup: "Add a warmup to Day {n}",
    titleExit: "Add an exit ticket to Day {n}",
    tabLibrary: "Pick from library",
    tabCreate: "Create a new one",
    searchPlaceholder: "Search your decks…",
    emptyLibrary: "No decks of this type yet. Create your first one.",
    emptySearch: "No matches. Try a different search or create a new one.",
    fromClass: "from",
    questions: "questions",
    pick: "Add to slot",
    createButton: "Create a new one",
    cancel: "Cancel",
    addingError: "Could not add the deck. Try again.",
  },
  es: {
    titleWarmup: "Agregar un warmup al Día {n}",
    titleExit: "Agregar un exit ticket al Día {n}",
    tabLibrary: "Elegir de mi biblioteca",
    tabCreate: "Crear uno nuevo",
    searchPlaceholder: "Busca en tus decks…",
    emptyLibrary: "Aún no tienes decks de este tipo. Crea el primero.",
    emptySearch: "Sin resultados. Prueba otra búsqueda o crea uno nuevo.",
    fromClass: "de",
    questions: "preguntas",
    pick: "Agregar al slot",
    createButton: "Crear uno nuevo",
    cancel: "Cancelar",
    addingError: "No se pudo agregar el deck. Intenta de nuevo.",
  },
  ko: {
    titleWarmup: "{n}일차에 워밍업 추가",
    titleExit: "{n}일차에 종료 티켓 추가",
    tabLibrary: "라이브러리에서 선택",
    tabCreate: "새로 만들기",
    searchPlaceholder: "내 덱 검색…",
    emptyLibrary: "이 유형의 덱이 아직 없습니다. 첫 번째 덱을 만들어보세요.",
    emptySearch: "결과 없음. 다른 검색어를 시도하거나 새로 만드세요.",
    fromClass: "—",
    questions: "문제",
    pick: "슬롯에 추가",
    createButton: "새로 만들기",
    cancel: "취소",
    addingError: "덱을 추가할 수 없습니다. 다시 시도하세요.",
  },
};

export default function AddToSlotModal({
  open,
  onClose,
  classId,
  classes = [],
  activeUnit,
  dayNumber,
  slotKind,            // "warmup" | "exit"
  decks,               // already-fetched deck list (full list, we filter)
  userId,              // for the library query — the teacher's own decks
  lang = "en",
  onPicked,            // callback(deck) — fired after successful UPDATE
  onCreate,            // callback() — fires the original "go to editor" flow
}) {
  const t = i18n[lang] || i18n.en;
  const section = slotKind === "warmup" ? "warmup" : "exit_ticket";

  const [tab, setTab] = useState("library"); // "library" | "create"
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Reset state every time the modal opens. Without this, leftover state
  // from the previous open (search query, selected tab, error) bleeds in.
  useEffect(() => {
    if (open) {
      setTab("library");
      setSearch("");
      setAdding(false);
      setErrorMsg("");
    }
  }, [open]);

  // Library candidates: teacher's own decks of the matching section,
  // EXCLUDING ones already in the active unit (they're already slotted).
  // Sorted: most recently created first — fresh content is more likely
  // what the teacher wants to grab.
  const libraryDecks = useMemo(() => {
    if (!decks || !activeUnit) return [];
    const filtered = decks
      .filter(d => d.section === section)
      .filter(d => d.unit_id !== activeUnit.id) // don't offer decks already here
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    if (!search.trim()) return filtered;
    const q = search.toLowerCase().trim();
    return filtered.filter(d =>
      (d.title || "").toLowerCase().includes(q) ||
      (d.subject || "").toLowerCase().includes(q) ||
      (d.tags || []).some(tg => (tg || "").toLowerCase().includes(q))
    );
  }, [decks, section, activeUnit, search]);

  // Class lookup so we can show "from {class.name}" on each result row
  const classMap = useMemo(() => {
    const m = {};
    (classes || []).forEach(c => { m[c.id] = c; });
    return m;
  }, [classes]);

  // Adding flow: UPDATE unit_id + position on the picked deck.
  // We compute the next position client-side from the current decks list
  // (the `decks` prop reflects the latest state), which is fine for the
  // small N per slot. Race-condition tolerable: worst case a teacher
  // double-adds and gets two decks at the same position; the All-decks
  // drag-reorder fixes it instantly.
  const handlePick = async (deck) => {
    if (adding) return;
    setAdding(true);
    setErrorMsg("");

    // Compute next position within this (class, section, unit). The
    // existing decks in this slot bucket are already in `decks` filtered
    // by class_id (the parent component fetched them that way).
    const inSameSlot = decks.filter(d =>
      d.unit_id === activeUnit.id && d.section === section
    );
    const nextPos = inSameSlot.length === 0
      ? 0
      : Math.max(...inSameSlot.map(d => d.position || 0)) + 1;

    // The deck might currently belong to a different class — if so,
    // also update class_id. Most teachers keep decks in their original
    // class but the library shows all of theirs, so this covers the
    // cross-class reuse case.
    const updates = {
      unit_id: activeUnit.id,
      position: nextPos,
    };
    if (deck.class_id !== classId) {
      updates.class_id = classId;
    }

    const { data, error } = await supabase
      .from("decks")
      .update(updates)
      .eq("id", deck.id)
      .select()
      .single();
    setAdding(false);
    if (error || !data) {
      setErrorMsg(t.addingError);
      return;
    }
    // Bubble up to PlanView so it can re-fetch / patch state and close
    onPicked && onPicked(data);
  };

  if (!open) return null;

  const title = (slotKind === "warmup" ? t.titleWarmup : t.titleExit)
    .replace("{n}", dayNumber);
  const stripeColor = sectionAccent(section);

  return (
    // Backdrop — click outside closes (a teacher who opened by accident
    // shouldn't have to hunt for an X button)
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 200, padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.bg,
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          width: "100%",
          maxWidth: 540,
          maxHeight: "85vh",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "18px 20px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 4, height: 24,
            borderRadius: 2,
            background: stripeColor,
          }} />
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 16, fontWeight: 700,
              color: C.text,
              letterSpacing: "-0.01em",
            }}>
              {title}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 22, lineHeight: 1,
              color: C.textMuted,
              cursor: "pointer",
              padding: 4,
            }}
            aria-label={t.cancel}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex",
          gap: 4,
          padding: "10px 20px 0",
          borderBottom: `1px solid ${C.border}`,
        }}>
          {[
            { id: "library", label: t.tabLibrary },
            { id: "create",  label: t.tabCreate },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setTab(opt.id)}
              style={{
                padding: "8px 12px",
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${tab === opt.id ? C.accent : "transparent"}`,
                color: tab === opt.id ? C.accent : C.textSecondary,
                fontFamily: "'Outfit', sans-serif",
                fontSize: 13, fontWeight: 500,
                cursor: "pointer",
                marginBottom: -1,
                transition: "color .12s ease, border-color .12s ease",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: 20,
        }}>
          {tab === "library" ? (
            <>
              {/* Search input */}
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t.searchPlaceholder}
                autoFocus
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  background: C.bg,
                  fontSize: 13.5,
                  fontFamily: "'Inter', sans-serif",
                  color: C.text,
                  marginBottom: 14,
                  outline: "none",
                  transition: "border-color .12s ease",
                }}
                onFocus={e => { e.currentTarget.style.borderColor = C.accent; }}
                onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
              />

              {errorMsg && (
                <div style={{
                  padding: "8px 12px",
                  background: C.redSoft || "#FEE",
                  color: C.red,
                  borderRadius: 6,
                  fontSize: 12,
                  marginBottom: 12,
                }}>
                  {errorMsg}
                </div>
              )}

              {/* Results list */}
              {libraryDecks.length === 0 ? (
                <div style={{
                  padding: "32px 16px",
                  textAlign: "center",
                  color: C.textMuted,
                  fontSize: 13,
                  lineHeight: 1.5,
                }}>
                  {search.trim() ? t.emptySearch : t.emptyLibrary}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {libraryDecks.map(deck => {
                    const cls = classMap[deck.class_id];
                    const qs = deck.questions || [];
                    return (
                      <button
                        key={deck.id}
                        onClick={() => handlePick(deck)}
                        disabled={adding}
                        style={{
                          background: C.bg,
                          border: `1px solid ${C.border}`,
                          borderLeft: `3px solid ${stripeColor}`,
                          borderRadius: 8,
                          padding: "10px 14px",
                          textAlign: "left",
                          cursor: adding ? "wait" : "pointer",
                          opacity: adding ? 0.5 : 1,
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          transition: "border-color .12s ease, background .12s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (adding) return;
                          e.currentTarget.style.background = C.bgSoft;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = C.bg;
                        }}
                      >
                        <SectionBadge section={deck.section} lang={lang} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontFamily: "'Outfit', sans-serif",
                            fontSize: 13.5, fontWeight: 600, color: C.text,
                            lineHeight: 1.3,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {deck.title}
                          </div>
                          <div style={{
                            fontSize: 11, color: C.textMuted,
                            marginTop: 2,
                            display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap",
                          }}>
                            <span>{qs.length} {t.questions}</span>
                            {cls && (
                              <>
                                <span style={{ width: 3, height: 3, background: C.textMuted, borderRadius: "50%" }} />
                                <span>{t.fromClass} {cls.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            // Create-new tab — minimal explainer + button
            <div style={{
              padding: "24px 12px",
              textAlign: "center",
            }}>
              <div style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 14, fontWeight: 600,
                color: C.text,
                marginBottom: 8,
              }}>
                {slotKind === "warmup"
                  ? (lang === "es" ? "Crear un nuevo warmup"
                     : lang === "ko" ? "새 워밍업 만들기"
                     : "Create a new warmup")
                  : (lang === "es" ? "Crear un nuevo exit ticket"
                     : lang === "ko" ? "새 종료 티켓 만들기"
                     : "Create a new exit ticket")
                }
              </div>
              <div style={{
                fontSize: 12.5, color: C.textSecondary,
                lineHeight: 1.5,
                marginBottom: 18,
                maxWidth: 380, margin: "0 auto 18px",
              }}>
                {lang === "es"
                  ? "Te llevamos al editor con la clase, la unidad y el tipo ya elegidos."
                  : lang === "ko"
                  ? "수업, 단원, 유형이 미리 선택된 편집기로 이동합니다."
                  : "We'll take you to the editor with class, unit, and session type already filled in."
                }
              </div>
              <button
                onClick={() => { onClose(); onCreate && onCreate(slotKind); }}
                style={{
                  padding: "10px 18px",
                  borderRadius: 8,
                  background: C.accent,
                  color: "#fff",
                  border: "none",
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 13.5, fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t.createButton} →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
