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
import * as classic from "./pdf-styles/classic";
import * as modern from "./pdf-styles/modern";
import * as editorial from "./pdf-styles/editorial";
import * as framed from "./pdf-styles/framed";

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
export async function exportPDF(deck, classObj, opts = {}) {
  const {
    style = "classic",
    variant = "exam",     // "exam" | "answer_key"
    lang = "en",
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

  const renderOpts = { lang, fontFamily };

  if (variant === "answer_key") {
    await renderer.renderAnswerKey(doc, deck, classObj, renderOpts);
  } else {
    await renderer.renderExam(doc, deck, classObj, renderOpts);
  }

  const suffix = variant === "answer_key" ? "_answers" : "_exam";
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
