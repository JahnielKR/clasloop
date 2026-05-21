// ─── DeckTiles ─────────────────────────────────────────────────────────
//
// Extracted from Decks.jsx in PR 113 (split Decks.jsx). Behavior unchanged.
// The draggable deck-card family: DeckRow (a section row with its own
// DndContext), SortableDeckTile (drag wrapper), and DeckTile (the visual
// card). These are pure presentational components — all data and handlers
// arrive via props, no local state beyond useSortable's drag transform.
//
// Only DeckRow is consumed outside this module (by ClassDecksView in
// Decks.jsx); SortableDeckTile and DeckTile are internal but exported in
// case a DragOverlay or preview needs the bare tile later.
import SectionBadge, { sectionAccent } from "../../components/SectionBadge";
import { MONO } from "../../components/tokens";
import { C } from "./styles";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export function DeckRow({ decks, section, t, lang, isMobile, navigate, onEdit, onDelete, onTogglePublic, onDownloadPdf, onDragEnd }) {
  const stripe = sectionAccent(section);
  return (
    <div style={{
      display: "flex",
      alignItems: "stretch",
      gap: 10,
      marginBottom: 10,
    }}>
      {/* Section label on the left */}
      <div style={{
        flexShrink: 0,
        width: 90,
        padding: "8px 10px",
        background: "transparent",
        borderLeft: `3px solid ${stripe}`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}>
        <SectionBadge section={section} lang={lang} variant="compact" />
        <div style={{
          fontSize: 11, color: C.textMuted, marginTop: 4,
          fontFamily: MONO,
        }}>
          {decks.length}
        </div>
      </div>
      {/* Sortable tiles */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <DndContext
          // Each row is its own DndContext so drags stay within row.
          // The outer DndContext in ClassDecksView handles the overlay
          // rendering but each row's onDragEnd handles its own data.
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={decks.map(d => d.id)} strategy={rectSortingStrategy}>
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 140 : 170}px, 1fr))`,
              gap: 8,
            }}>
              {decks.map(d => (
                <SortableDeckTile
                  key={d.id}
                  deck={d}
                  t={t} lang={lang}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onTogglePublic={onTogglePublic}
                  onDownloadPdf={onDownloadPdf}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

// ─── SortableDeckTile — single deck card, draggable ────────────────────
function SortableDeckTile({ deck, t, lang, onEdit, onDelete, onTogglePublic, onDownloadPdf }) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: deck.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <DeckTile
        deck={deck}
        t={t} lang={lang}
        onEdit={onEdit}
        onDelete={onDelete}
        onTogglePublic={onTogglePublic}
        onDownloadPdf={onDownloadPdf}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

// ─── DeckTile — visual presentation of a single deck card ─────────────
export function DeckTile({ deck, t, lang, onEdit, onDelete, onTogglePublic, onDownloadPdf, dragHandleProps, isOverlay }) {
  const stripe = sectionAccent(deck.section);
  const qs = deck.questions || [];
  // Description: deck.description, falls back to nothing. We trim to
  // avoid showing a single space as if it were a value.
  const description = (deck.description || "").trim();
  // Language: deck.language is the deck's content language ("en"/"es"/"ko").
  // Show as uppercase 2-letter code so it's compact (EN / ES / KO).
  // If null/missing, hide the chip entirely.
  const deckLang = deck.language ? deck.language.toUpperCase() : null;
  // PR 86: el botón ↓ ahora abre directamente el PDFExportModal con
  // variant "exam" por default. El usuario cambia a "answers" desde
  // adentro del modal (el modal ya tiene un selector de variant).
  // Antes había un popover con dos botones (Exam / Answer key) que era
  // redundante con la UI del modal.

  return (
    <div style={{
      background: C.bg,
      border: `1px solid ${C.border}`,
      borderTop: `3px solid ${stripe}`,
      borderRadius: 8,
      padding: "10px 12px 10px",
      position: "relative",
      cursor: "default",
      transition: isOverlay ? "none" : "box-shadow .12s ease, transform .12s ease",
      boxShadow: isOverlay ? "0 8px 20px rgba(0,0,0,0.12)" : "none",
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}>
      {/* PR 8: PDF download — small ↓ button, top-right of the tile.
          PR 86: ahora abre directamente el modal con variant "exam" por
          default. El modal tiene su propio selector exam/answers, así
          que el popover viejo era redundante.
          Only rendered in Library context (when onDownloadPdf prop is
          supplied). The button is positioned absolute over the tile
          content so it doesn't push the title or eat horizontal space. */}
      {!isOverlay && onDownloadPdf && (
        <div
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            zIndex: 2,
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownloadPdf(deck, "exam");
            }}
            title={t.downloadPdf}
            aria-label={t.downloadPdf}
            style={{
              width: 26, height: 26,
              padding: 0,
              borderRadius: 5,
              background: "transparent",
              color: C.textSecondary,
              border: "1px solid transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'Outfit', sans-serif",
              transition: "background .12s ease, color .12s ease, border-color .12s ease",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = C.bgSoft;
              e.currentTarget.style.color = C.accent;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = C.textMuted;
            }}
          >
            {/* Bold download arrow. The Unicode ↓ rendered too thin
                and didn't have presence — teacher feedback called it
                "muy fino". This SVG draws a thick arrow with stroke 2.5,
                rounded caps, and a tray bar at the bottom (the classic
                "download" glyph used by Notion / Linear / GitHub). */}
            <svg
              width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 4v12" />
              <path d="M6 12l6 6 6-6" />
              <path d="M5 20h14" />
            </svg>
          </button>
        </div>
      )}
      {/* Drag handle area — title + description.
          Everything except the action buttons is grabable. */}
      <div
        {...(dragHandleProps || {})}
        style={{
          cursor: dragHandleProps ? "grab" : "default",
        }}
      >
        <div style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 13, fontWeight: 600,
          color: C.text,
          lineHeight: 1.3,
          marginBottom: description ? 4 : 0,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          minHeight: 32,
          // Right padding so the title text doesn't underflow the
          // absolutely-positioned download button.
          paddingRight: onDownloadPdf ? 30 : 0,
        }}>
          {deck.title}
        </div>
        {/* PR 7.1: description, single line with ellipsis. Only renders
            when there's an actual description to show — no empty rows. */}
        {description && (
          <div style={{
            fontSize: 11.5, color: C.textSecondary,
            lineHeight: 1.4,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {description}
          </div>
        )}
      </div>

      {/* Meta line — question count + language code + public dot.
          The count is the most prominent piece (mono font, slightly
          larger) because it's what teachers scan for first. Language
          and public status are secondary. */}
      <div style={{
        display: "flex", alignItems: "center",
        gap: 8, flexWrap: "wrap",
        fontSize: 11,
        color: C.textMuted,
      }}>
        <span style={{
          fontFamily: MONO,
          fontWeight: 600,
          color: C.textSecondary,
        }}>
          {qs.length} {qs.length === 1 ? t.questionSingular : t.questionPlural}
        </span>
        {deckLang && (
          <>
            <span>·</span>
            <span style={{
              fontFamily: MONO,
              padding: "1px 5px",
              borderRadius: 3,
              background: C.bgSoft,
              color: C.textSecondary,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}>{deckLang}</span>
          </>
        )}
        {deck.is_public && (
          <>
            <span>·</span>
            <span style={{ color: C.green, fontSize: 10.5 }}>●</span>
          </>
        )}
      </div>

      {/* Actions — Edit large (primary), Public + Delete medium.
          Edit is the everyday action ("I want to tweak this deck"),
          public/delete are occasional. So Edit takes 2/3 of the row,
          the two icon buttons share the remaining 1/3. */}
      {!isOverlay && (
        <div style={{
          display: "flex", gap: 4,
          paddingTop: 8,
          borderTop: `1px solid ${C.border}`,
        }}>
          <button
            onClick={() => onEdit(deck)}
            title={t.edit}
            style={{
              flex: 2,
              padding: "6px 8px",
              borderRadius: 5,
              background: C.bgSoft,
              color: C.text,
              border: `1px solid ${C.border}`,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Outfit', sans-serif",
              transition: "background .12s ease, border-color .12s ease, color .12s ease",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = C.accentSoft;
              e.currentTarget.style.borderColor = C.accent;
              e.currentTarget.style.color = C.accent;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = C.bgSoft;
              e.currentTarget.style.borderColor = C.border;
              e.currentTarget.style.color = C.text;
            }}
          >
            {t.edit}
          </button>
          <button
            onClick={() => onTogglePublic(deck)}
            title={deck.is_public ? t.makePrivate : t.makePublic}
            style={{
              flex: "0 0 auto",
              minWidth: 30,
              padding: "6px 8px",
              borderRadius: 5,
              background: deck.is_public ? C.greenSoft : "transparent",
              color: deck.is_public ? C.green : C.textSecondary,
              border: `1px solid ${deck.is_public ? C.green : C.border}`,
              fontSize: 11,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            {deck.is_public ? "●" : "○"}
          </button>
          <button
            onClick={() => {
              if (confirm(t.confirmDelete)) onDelete(deck.id);
            }}
            title={t.delete}
            style={{
              flex: "0 0 auto",
              minWidth: 30,
              padding: "6px 8px",
              borderRadius: 5,
              background: "transparent",
              color: C.textMuted,
              border: `1px solid ${C.border}`,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "'Outfit', sans-serif",
              lineHeight: 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
