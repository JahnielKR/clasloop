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
import { sanitizeQuestionMath } from "./latex";
import { sanitizeFilename } from "./pdf-styles/shared";
import { getPalette } from "./pdf-styles/palettes";
import { savePdfCrossPlatform } from "./native-pdf";
import * as classic from "./pdf-styles/classic";
import * as modern from "./pdf-styles/modern";
import * as editorial from "./pdf-styles/editorial";
import * as framed from "./pdf-styles/framed";
import { drawScanSheet } from "./pdf-styles/scanner";

// PR 46: scanner ya NO es un estilo. Sigue siendo una página que se
// puede prepender al exam pero el style picker no lo muestra.
const STYLES = { classic, modern, editorial, framed };

// Track A: styles whose renderers draw real LaTeX (KaTeX rasterised inline).
// These receive the raw deck (with $…$); any non-listed style would get the
// latexToAscii fallback. All four styles are migrated now — the ASCII fallback
// remains only for the scanner sheet (a b+w utility page that isn't math-aware).
const MATH_NATIVE_STYLES = new Set(["classic", "modern", "editorial", "framed"]);

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
  // PR 81: el check no es solo deck.language === "ko". La AI a veces genera
  // contenido en coreano pero el deck queda con language en otro idioma
  // (porque el user seleccionó otro en el dropdown del panel AI, o porque
  // el field language quedó vacío al guardar). Detectamos hangul en el
  // contenido también — si está presente, cargamos NotoSansKR aunque el
  // language field diga otra cosa.
  //
  // Rango hangul U+AC00 a U+D7A3 cubre las sílabas pre-compuestas
  // completas; cubre el 99.99% del coreano moderno. Si vale la pena en
  // el futuro, extender a Hangul Jamo (U+1100-U+11FF) o Compatibility
  // Jamo (U+3130-U+318F).
  const HANGUL_RE = /[\uAC00-\uD7A3]/;
  const hasKoreanContent = (() => {
    try {
      const stringified = JSON.stringify({
        title: deck.title,
        description: deck.description,
        questions: deck.questions,
      });
      return HANGUL_RE.test(stringified);
    } catch {
      return false;
    }
  })();
  const useKorean =
    (deck.language || "").toLowerCase() === "ko" || hasKoreanContent;
  if (useKorean) {
    await ensureKoreanFont(doc);
  }
  const fontFamily = useKorean
    ? "NotoSansKR"
    : (STYLE_DEFAULTS[style]?.fontFamily || "helvetica");

  // PR 32: resolve palette by id
  const palette = getPalette(paletteId);

  const renderOpts = { lang, fontFamily, palette };

  // Track A (A1): the PDF fonts (Helvetica for en/es, a content-subset
  // NotoSansKR for ko) don't carry math glyphs like π, √ or ≤, so render any
  // $…$ LaTeX as readable ASCII before drawing. Doing it once here covers every
  // style + the answer key + the scan sheet. The on-screen quiz renders the
  // exact formula (KaTeX); this is the print-safe approximation. Korean
  // detection above runs on the raw deck, so it's unaffected.
  // Styles migrated to render real LaTeX (KaTeX rasterised inline) get the RAW
  // deck (with $…$); the rest still get the ASCII fallback until they're
  // migrated too. The scanner sheet is always ASCII — it's a b+w utility page,
  // not math-aware.
  const asciiDeck = Array.isArray(deck.questions)
    ? { ...deck, questions: deck.questions.map(sanitizeQuestionMath) }
    : deck;
  const pdfDeck = MATH_NATIVE_STYLES.has(style) ? deck : asciiDeck;

  if (variant === "answer_key") {
    await renderer.renderAnswerKey(doc, pdfDeck, classObj, renderOpts);
  } else if (variant === "exam_with_scan") {
    // Página 1: scan sheet (b+w, sin estilo). Helvetica forzada para
    // que sea legible en cualquier impresora, sin importar el style.
    await drawScanSheet(doc, asciiDeck, classObj, { lang, fontFamily: useKorean ? "NotoSansKR" : "helvetica" });
    doc.addPage();
    // Páginas 2..N: exam normal con el style elegido
    await renderer.renderExam(doc, pdfDeck, classObj, renderOpts);
  } else {
    await renderer.renderExam(doc, pdfDeck, classObj, renderOpts);
  }

  let suffix = "_exam";
  if (variant === "answer_key") suffix = "_answers";
  else if (variant === "exam_with_scan") suffix = "_exam_scan";
  const fname = sanitizeFilename(deck.title || "deck") + suffix + ".pdf";
  // PR 54 (FASE 2 Capacitor): en native, doc.save() no funciona porque
  // los blob: URLs no disparan download manager. savePdfCrossPlatform
  // hace doc.save() en web y filesystem + share sheet en native.
  await savePdfCrossPlatform(doc, fname);
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
