// ─── pdf-fonts ───────────────────────────────────────────────────────────
//
// jsPDF's default fonts (Helvetica, Times) don't support CJK characters.
// For Korean PDFs we load NotoSansKR and register it on the doc.
//
// PR 82: how this changed
//
// Antes (BROKEN): fetcheábamos `NotoSansCJKkr-Regular.otf` desde un CDN.
// jsPDF intentaba parsearla como TTF, fallaba silenciosamente, y todos
// los chars del PDF (incluso los ASCII en inglés) salían shifted -31.
// El bug se vio recién después de PR 81 cuando ahora SIEMPRE detectamos
// hangul en el contenido — pero era latente desde el principio.
//
// Ahora: el TTF correcto está embebido en el bundle como módulo separado
// (`noto-sans-kr-data.js`). Vite lo deja en un chunk que se carga solo
// cuando se importa dinámicamente. Esto significa:
//   - Bundle inicial sigue chico (font NO se incluye)
//   - Cuando un teacher exporta un PDF coreano, el browser baja el chunk
//     (~700KB, cacheado por el SW de Vite/PWA)
//   - Funciona offline después de la primera vez
//   - Sin dependencias de CDNs externos
//
// El archivo `noto-sans-kr-data.js` es AUTO-GENERADO por
// `scripts/prepare-fonts.cjs`. Si Google actualiza la font y queremos
// la versión nueva, corremos `npm run prepare-fonts` y commiteamos.

import jsPDF from "jspdf";

// Cache del módulo importado dinámicamente. Una vez cargado en la sesión,
// reusa la misma referencia para todas las exportaciones siguientes.
let fontModulePromise = null;

/**
 * Ensure the Korean-capable font is registered on the given jsPDF doc.
 * Idempotent: calling multiple times in the same session reuses the
 * dynamic import promise.
 *
 * Sets up the font under name "NotoSansKR" with weights "normal" and
 * "bold" (bold is synthesized by jsPDF since we only embed Regular).
 */
export async function ensureKoreanFont(doc) {
  if (!fontModulePromise) {
    // Dynamic import → Vite creates a separate chunk for this. The chunk
    // is fetched on first call, then cached in memory + by the browser.
    fontModulePromise = import("./noto-sans-kr-data.js");
  }
  const { NOTO_SANS_KR_BASE64 } = await fontModulePromise;

  if (NOTO_SANS_KR_BASE64 === "PLACEHOLDER_RUN_NPM_PREPARE_FONTS") {
    throw new Error(
      "NotoSansKR font data not generated. Run `npm run prepare-fonts` first.",
    );
  }

  // Register on this jsPDF instance.
  doc.addFileToVFS("NotoSansKR.ttf", NOTO_SANS_KR_BASE64);
  doc.addFont("NotoSansKR.ttf", "NotoSansKR", "normal");
  // Synthetic bold — jsPDF fakes it since we don't have a separate Bold TTF.
  // Visually acceptable for school exam headers.
  doc.addFont("NotoSansKR.ttf", "NotoSansKR", "bold");
}
