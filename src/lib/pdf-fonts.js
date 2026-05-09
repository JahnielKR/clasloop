// ─── pdf-fonts ───────────────────────────────────────────────────────────
//
// jsPDF's default fonts (Helvetica, Times) don't support CJK characters.
// For Korean decks we lazy-load NotoSansKR and register it on the doc.
// "Lazy" because the font is ~1.5MB — we only fetch it if a Korean deck
// is actually being exported, and we cache the fetched bytes between
// exports in the same session.
//
// Why CDN instead of bundling the font with the app:
//   - Bundling adds 1.5MB to every initial load, even for teachers who
//     never export Korean PDFs (the majority).
//   - jsdelivr serves the font cached and gzipped, ~600KB transfer.
//   - The fetch happens once per browser session; subsequent exports
//     reuse the in-memory cache.
//
// If the CDN is unreachable or the font fails to register, we surface
// an error to the caller — they can fall back to telling the user
// "Korean PDF export needs internet, try again later." For now we let
// the error propagate; the alternative (silently using Helvetica which
// renders ?? for Korean) is worse.

import jsPDF from "jspdf";

// CDN URL for NotoSansKR Regular. Using cdn.jsdelivr.net which mirrors
// Google Fonts and is generally fast + cached. The font file itself is
// from Google Noto, which is open-licensed (SIL OFL).
const NOTO_KR_URL =
  "https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/OTF/Korean/NotoSansCJKkr-Regular.otf";

// In-memory cache. Key = url, value = base64 string of the font bytes.
// Cleared on page reload, which is fine — fetch is fast on warm CDN.
let cachedFontBase64 = null;

/**
 * Ensure the Korean-capable font is registered on the given jsPDF doc.
 * Idempotent: calling multiple times in the same session reuses the
 * cached font bytes.
 *
 * Sets the active font to "NotoSansKR" with weight "normal". Caller
 * must explicitly setFont("NotoSansKR", "bold") if it wants bold —
 * since we only register one weight, "bold" calls fall back to fake-
 * bold (jsPDF synthesizes it), which is visually acceptable.
 */
export async function ensureKoreanFont(doc) {
  if (!cachedFontBase64) {
    const res = await fetch(NOTO_KR_URL);
    if (!res.ok) {
      throw new Error(`Failed to load Korean font: ${res.status}`);
    }
    const buf = await res.arrayBuffer();
    cachedFontBase64 = arrayBufferToBase64(buf);
  }
  // Register on this jsPDF instance. "addFileToVFS" stores the font
  // bytes inside jsPDF's virtual file system; "addFont" maps a logical
  // name (NotoSansKR) to the file + style (normal) so subsequent
  // setFont("NotoSansKR", "normal") calls work.
  doc.addFileToVFS("NotoSansKR.ttf", cachedFontBase64);
  doc.addFont("NotoSansKR.ttf", "NotoSansKR", "normal");
  // We don't have a separate Bold file — synthetic bold is fine for
  // a school exam header. If we add a Bold variant later, register it
  // here as a second entry.
  doc.addFont("NotoSansKR.ttf", "NotoSansKR", "bold");
}

// ArrayBuffer → base64 (jsPDF's addFileToVFS expects base64 string,
// not raw bytes). We process in 8KB chunks to avoid stack overflow on
// large fonts when calling String.fromCharCode(...args).
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + chunk)
    );
  }
  return btoa(binary);
}
