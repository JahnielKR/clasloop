// ─── pdf-export ──────────────────────────────────────────────────────────
//
// PDF generation for decks. After the PR 29.0 refactor this module is
// a thin DISPATCHER over per-style renderers in src/lib/pdf-styles/.
//
// Public API:
//   exportPDF(deck, classObj, { style, variant, lang })   ← new unified
//   exportExamPDF(deck, classObj, lang)                   ← legacy shim
//   exportAnswerKeyPDF(deck, classObj, lang)              ← legacy shim
//
// Styles:
//   "classic"   → sober, professional textbook look (default)
//   "modern"    → colorful, youth-friendly card-based layout
//   "editorial" → premium, serif-driven magazine layout
//   "framed"    → formal exam paper with decorative border + serif
//
// Variants:
//   "exam"        → student-facing exam (questions + space to answer)
//   "answer_key"  → teacher's answer key (one-line answer per question)
//
// Korean support: NotoSansKR is lazy-loaded for deck.language === "ko".
// Other languages use jsPDF's default Helvetica, which covers Latin-1.

import jsPDF from "jspdf";
import { ensureKoreanFont } from "./pdf-fonts";
import { sanitizeFilename } from "./pdf-styles/shared";
import { getPalette } from "./pdf-styles/palettes";
import * as classic from "./pdf-styles/classic";
import * as modern from "./pdf-styles/modern";
import * as editorial from "./pdf-styles/editorial";
import * as framed from "./pdf-styles/framed";
import { drawScanSheet } from "./pdf-styles/scanner";

// PR 46: scanner ya NO es un estilo. Sigue siendo una página que se
// puede prepender al exam pero el style picker no lo muestra.
const STYLES = { classic, modern, editorial, framed };

// Style preferences for default fonts. Framed uses serif (times) for the
// academic-paper feel; the others use the dispatcher's chosen font
// (helvetica for non-Korean, NotoSansKR for Korean).
const STYLE_DEFAULTS = {
  framed: { fontFamily: "times" },
};

// ─── Main dispatcher ─────────────────────────────────────────────────────
// `style` and `variant` default to backwards-compatible values so callers
// that don't know about the new API get the same PDF they used to get.
//
// PR 46: nueva variante "exam_with_scan" — preempt the exam with a
// scannable answer sheet (bubbles + QR + fiducials). El style elegido
// solo afecta a las páginas de las preguntas (la hoja del scanner es
// siempre b+w austera, sin estilo).
export async function exportPDF(deck, classObj, opts = {}) {
  const {
    style = "classic",
    variant = "exam",     // "exam" | "exam_with_scan" | "answer_key"
    lang = "en",
    paletteId = "default", // PR 32
  } = opts;

  const renderer = STYLES[style] || STYLES.classic;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // Korean decks need a CJK-capable font registered before any draw call.
  const useKorean = (deck.language || "").toLowerCase() === "ko";
  if (useKorean) {
    await ensureKoreanFont(doc);
  }
  const fontFamily = useKorean
    ? "NotoSansKR"
    : (STYLE_DEFAULTS[style]?.fontFamily || "helvetica");

  // PR 32: resolve palette by id
  const palette = getPalette(paletteId);

  const renderOpts = { lang, fontFamily, palette };

  if (variant === "answer_key") {
    await renderer.renderAnswerKey(doc, deck, classObj, renderOpts);
  } else if (variant === "exam_with_scan") {
    // Página 1: scan sheet (b+w, sin estilo). Helvetica forzada para
    // que sea legible en cualquier impresora, sin importar el style.
    await drawScanSheet(doc, deck, classObj, { lang, fontFamily: useKorean ? "NotoSansKR" : "helvetica" });
    doc.addPage();
    // Páginas 2..N: exam normal con el style elegido
    await renderer.renderExam(doc, deck, classObj, renderOpts);
  } else {
    await renderer.renderExam(doc, deck, classObj, renderOpts);
  }

  let suffix = "_exam";
  if (variant === "answer_key") suffix = "_answers";
  else if (variant === "exam_with_scan") suffix = "_exam_scan";
  const fname = sanitizeFilename(deck.title || "deck") + suffix + ".pdf";
  doc.save(fname);
}

// ─── Legacy shims ────────────────────────────────────────────────────────
// Existing call sites in src/pages/Decks.jsx use these names. Keeping
// them avoids touching the UI in this PR — that's PR 29.1's scope.
// Both delegate to exportPDF with style="classic" (the original behavior).
export async function exportExamPDF(deck, classObj, lang = "en") {
  return exportPDF(deck, classObj, { style: "classic", variant: "exam", lang });
}

export async function exportAnswerKeyPDF(deck, classObj, lang = "en") {
  return exportPDF(deck, classObj, { style: "classic", variant: "answer_key", lang });
}
