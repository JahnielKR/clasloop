// ─── Decks page styles & color tokens ───────────────────────────────────────
// Shared between the page-level Decks.jsx (list view) and the
// CreateDeckEditor.jsx (create/edit view). Both files import from here so
// CSS classes and the extended color palette stay in one place.

import { C as BASE_C } from "../../components/tokens";

// Decks-specific palette extension — yellow tints used in deck list badges
// and the favorite-derived border.
export const C = BASE_C;

export const css = `
  .dk-tab { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .dk-tab:hover { background: ${C.accentSoft} !important; border-color: ${C.accent} !important; color: ${C.accent} !important; }
  .dk-card { transition: all .2s ease; cursor: pointer; }
  .dk-card:hover { border-color: ${C.accent} !important; box-shadow: 0 4px 16px rgba(35,131,226,.1) !important; transform: translateY(-2px); }
  .dk-group-header { transition: all .18s ease; cursor: pointer; }
  .dk-group-header:hover { transform: translateY(-1px); box-shadow: 0 3px 10px rgba(0,0,0,0.06); filter: brightness(0.98); }
  .dk-group-header:active { transform: translateY(0); }
  .dk-plus-tile { position: relative; }
  .dk-plus-tile:hover { background: ${C.accentSoft} !important; border-color: ${C.accent} !important; }
  .dk-plus-tile:hover .dk-plus-icon { transform: rotate(180deg) scale(1.08); background: ${C.accentSoft} !important; box-shadow: 0 0 0 6px ${C.accentSoft}; }
  .dk-plus-tile:active .dk-plus-icon { transform: rotate(180deg) scale(.95); }
  .dk-btn { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .dk-btn:hover { transform: translateY(-1px); filter: brightness(1.05); }
  .dk-btn-secondary:hover { background: ${C.accentSoft} !important; border-color: ${C.accent} !important; color: ${C.accent} !important; }
  .dk-btn-danger:hover { background: ${C.red} !important; color: #fff !important; }
  .dk-fav-customize { transition: all .15s ease; }
  .dk-fav-customize:hover { background: ${C.accent} !important; color: #fff !important; border-color: ${C.accent} !important; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(35,131,226,.25); }
  .dk-fav-customize:active { transform: translateY(0); }
  .dk-fav-remove { transition: all .15s ease; }
  .dk-fav-remove:hover { background: ${C.redSoft} !important; color: ${C.red} !important; border-color: ${C.red} !important; }
  .dk-pill { transition: all .15s ease; cursor: pointer; }
  .dk-pill:hover { background: ${C.accentSoft} !important; border-color: ${C.accent} !important; color: ${C.accent} !important; }
  .dk-color-swatch:hover { transform: scale(1.1); }
  .dk-color-swatch:active { transform: scale(.95); }
  .dk-icon-btn:hover { background: ${C.accentSoft} !important; border-color: ${C.accent} !important; transform: translateY(-1px); }
  .dk-icon-btn:active { transform: scale(.95); }
  .dk-editor-tab:hover { color: ${C.accent} !important; }
  .dk-mode-btn:hover { transform: translateY(-1px); }
  .dk-mode-btn:active { transform: scale(.97); }
  .dk-preset-btn:hover { transform: scale(1.04); box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important; }
  .dk-preset-btn:active { transform: scale(.97); }
  .dk-q-row { transition: background .15s ease, border-color .15s ease, box-shadow .2s ease, transform .12s ease; position: relative; }
  .dk-q-row:hover { border-color: ${C.accent} !important; box-shadow: 0 4px 14px rgba(35,131,226,0.10); transform: translateY(-1px); }
  .dk-q-row[data-expanded="true"] { border-color: ${C.accent} !important; box-shadow: 0 6px 18px rgba(35,131,226,0.15); }
  .dk-q-row[data-dragging="true"] { opacity: .4; transform: scale(.98); }
  .dk-q-ghost {
    position: fixed;
    pointer-events: none;
    z-index: 9999;
    transform: rotate(1.5deg) scale(1.02);
    transition: none;
    box-shadow: 0 14px 40px rgba(35,131,226,0.35), 0 4px 12px rgba(0,0,0,0.15);
    border-radius: 10px;
    overflow: hidden;
    opacity: 0.95;
  }
  .dk-q-ghost > * { background: ${C.bg} !important; }
  .dk-q-row[data-drop-target="true"]::before {
    content: "";
    position: absolute;
    top: -4px; left: 0; right: 0;
    height: 3px;
    background: ${C.accent};
    border-radius: 2px;
    box-shadow: 0 0 8px ${C.accent};
  }
  .dk-q-header { cursor: pointer; user-select: none; }
  .dk-q-handle { cursor: grab; color: ${C.textMuted}; transition: color .15s ease, transform .15s ease; }
  .dk-q-row:hover .dk-q-handle { color: ${C.accent}; }
  .dk-q-handle:hover { color: ${C.accent} !important; transform: scale(1.15); }
  .dk-q-handle:active { cursor: grabbing; }
  .dk-q-toggle:hover { background: ${C.accentSoft} !important; color: ${C.accent} !important; }
  .dk-q-delete:hover { background: ${C.redSoft} !important; color: ${C.red} !important; }
  .dk-type-card:hover { border-color: ${C.accent} !important; background: ${C.accentSoft} !important; transform: translateY(-2px); box-shadow: 0 4px 14px rgba(35,131,226,0.15); }
  .dk-type-card:active { transform: scale(.97); }
  .dk-add-another:hover { background: ${C.accentSoft} !important; border-color: ${C.accent} !important; }
  .dk-add-another:active { transform: scale(.99); }
  .dk-add-mini { transition: all .15s ease; }
  .dk-add-mini:hover { background: ${C.accentSoft} !important; border-color: ${C.accent} !important; color: ${C.accent} !important; }
  .dk-add-mini:active { transform: scale(.97); }
  @keyframes flashGlow {
    0%   { box-shadow: 0 0 0 0 ${C.accent}, 0 0 18px 6px ${C.accent}; }
    100% { box-shadow: 0 0 0 0 transparent, 0 0 0 0 transparent; }
  }
  .dk-q-flash { animation: flashGlow 1.4s ease-out; }
  .dk-input { transition: border-color .15s, box-shadow .15s; }
  .dk-input:hover { border-color: ${C.accent} !important; }
  .dk-input:focus { border-color: ${C.accent} !important; box-shadow: 0 0 0 3px ${C.accentSoft} !important; }
  .dk-back { transition: all .15s ease; cursor: pointer; }
  .dk-back:hover { background: ${C.accentSoft} !important; }
  .dk-q-card { transition: all .2s ease; }
  .dk-q-card:hover { border-color: ${C.accent} !important; }
  .dk-lang { transition: all .12s ease; cursor: pointer; }
  .dk-lang:hover { background: ${C.accentSoft} !important; color: ${C.accent} !important; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  .fade-up { animation: fadeUp .3s ease-out both; }
  @keyframes dk-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .dk-scroll-x { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; -ms-overflow-style: none; }
  .dk-scroll-x::-webkit-scrollbar { display: none; }
`;
