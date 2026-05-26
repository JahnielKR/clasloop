// ─── src/lib/pdf-math.js — real LaTeX math in the PDF export ─────────────────
//
// Track A (A1, "purist" PDF rework): the on-screen quiz renders math with
// KaTeX, but the PDF is drawn with jsPDF's text API (no HTML), so KaTeX's
// markup can't be drawn directly. Instead we:
//
//   1. preloadMathImages(questions) — rasterise every unique $…$ / $$…$$ span
//      ONCE (KaTeX → offscreen DOM → html2canvas, supersampled + transparent),
//      capturing its width/height and its ascent (top → text baseline). Metrics
//      are stored at a BASE point size and scaled at draw time.
//   2. drawRichText() — an inline line-layout engine: ordinary words stay
//      vector text (selectable, crisp), and each formula is placed as a small
//      image baseline-aligned on the line. Wrapping accounts for formula
//      widths; line advance grows for tall formulas.
//
// The layout itself (layoutRichText) is pure — no DOM, no jsPDF — so it's unit
// tested. Only mathToImage touches the browser; its quality is verified in the
// PDF preview.

import html2canvas from "html2canvas";
import katex from "katex";
import "katex/dist/katex.min.css";
import { parseMathSegments } from "./latex";

const PT_TO_MM = 0.352777;   // 1 typographic point in millimetres
const RASTER_SCALE = 4;      // supersample factor for crisp print output
const BASE_PT = 12;          // formulas are rasterised once at this size, then scaled
// Text metrics as a fraction of font size (em). Helvetica/Times-ish; only used
// to baseline-align formulas next to text, so approximate is fine.
const TEXT_ASCENT_EM = 0.75;
const TEXT_DESCENT_EM = 0.25;

const cacheKey = (latex, display) => `${display ? "D" : "I"}:${latex}`;

// ── KaTeX font loading ───────────────────────────────────────────────────
// html2canvas paints whatever fonts are loaded at capture time; if KaTeX's
// web fonts haven't loaded yet the formula rasterises in a fallback face. Force
// them in once and await document.fonts before the first capture.
let fontsReadyPromise = null;
function ensureMathFonts() {
  if (!fontsReadyPromise) {
    fontsReadyPromise = (async () => {
      const probe = document.createElement("span");
      probe.style.cssText = "position:absolute;left:-9999px;top:-9999px;font-size:20px;";
      probe.innerHTML = katex.renderToString("x^2+\\frac{1}{2}", { throwOnError: false });
      document.body.appendChild(probe);
      try {
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
      } catch { /* fonts API unavailable — proceed best-effort */ }
      probe.remove();
    })();
  }
  return fontsReadyPromise;
}

// ── Rasterise one formula ──────────────────────────────────────────────────
// Returns base-size metrics in mm: { dataUrl, wMm, hMm, ascentMm } or null.
async function mathToImage(latex, display) {
  await ensureMathFonts();

  const host = document.createElement("div");
  host.style.cssText =
    `position:absolute;left:-9999px;top:-9999px;` +
    `font-size:${BASE_PT}px;color:#111111;line-height:normal;` +
    (display ? "" : "white-space:nowrap;");
  // A zero-size inline-block sits on the text baseline; its top gives us the
  // baseline Y so we can measure the formula's ascent (top → baseline).
  host.innerHTML =
    `<span style="display:inline-block;width:0;height:0;"></span>` +
    katex.renderToString(latex, { throwOnError: false, displayMode: display });
  document.body.appendChild(host);

  try {
    const strut = host.firstElementChild;
    const katexEl = host.querySelector(".katex");
    if (!katexEl) return null;
    const baselineY = strut.getBoundingClientRect().top;
    const r = katexEl.getBoundingClientRect();

    const canvas = await html2canvas(katexEl, {
      backgroundColor: null,
      scale: RASTER_SCALE,
      logging: false,
    });
    const dataUrl = canvas.toDataURL("image/png");

    return {
      dataUrl,
      wMm: r.width * PT_TO_MM,
      hMm: r.height * PT_TO_MM,
      ascentMm: Math.max(0, baselineY - r.top) * PT_TO_MM,
    };
  } catch (err) {
    console.warn("[pdf-math] rasterise failed:", err);
    return null;
  } finally {
    host.remove();
  }
}

// Collect every distinct math span across a question's text fields.
function collectMathSpans(q, out) {
  const scan = (v) => {
    if (typeof v !== "string" || v.indexOf("$") === -1) return;
    for (const seg of parseMathSegments(v)) {
      if (seg.type === "math") out.set(cacheKey(seg.value, seg.display), { latex: seg.value, display: seg.display });
    }
  };
  if (!q || typeof q !== "object") return;
  scan(q.q);
  (q.options || []).forEach((o) => scan(typeof o === "string" ? o : o && o.text));
  scan(q.answer);
  (q.alternatives || []).forEach(scan);
  (q.items || []).forEach(scan);
  (q.pairs || []).forEach((p) => { if (p) { scan(p.left); scan(p.right); } });
  scan(q.required_word);
  scan(q.sample_answer);
}

/**
 * Rasterise every unique formula in the deck once. Returns a Map keyed by
 * cacheKey(latex, display) → base-size metrics (or null if it failed). Pass the
 * result to drawRichText / measureRichTextHeight. Safe to call when there's no
 * math (returns an empty Map and does no DOM work).
 */
export async function preloadMathImages(questions) {
  const wanted = new Map();
  for (const q of questions || []) collectMathSpans(q, wanted);
  const cache = new Map();
  for (const [key, { latex, display }] of wanted) {
    cache.set(key, await mathToImage(latex, display));
  }
  return cache;
}

// Look up a formula's metrics scaled to the given point size.
function scaledMetrics(mathCache, latex, display, fontSizePt) {
  const base = mathCache && mathCache.get(cacheKey(latex, display));
  if (!base) return null;
  const f = fontSizePt / BASE_PT;
  return { dataUrl: base.dataUrl, wMm: base.wMm * f, hMm: base.hMm * f, ascentMm: base.ascentMm * f };
}

// ── Pure inline layout ─────────────────────────────────────────────────────
// Lays out text + math into lines. No DOM, no jsPDF — `measureText(str)→mm` and
// `mathMetrics(latex,display)→{wMm,hMm,ascentMm}|null` are injected, so this is
// unit-testable. Returns { lines, totalHeight } where each line is an array of
// items ({kind:'text', str, x} | {kind:'math', latex, display, x, w, ascent})
// plus its own { baselineOffset } from the line's top, and `advance`.
export function layoutRichText(text, maxWidth, opts) {
  const {
    measureText,
    mathMetrics,
    lineAdvance,        // standard baseline-to-baseline advance (mm)
    spaceWidth,         // width of a space (mm)
    textAscentMm,
    textDescentMm,
  } = opts;

  const segments = parseMathSegments(typeof text === "string" ? text : "");

  // Flatten into a token stream: words (with trailing-space flag) + math.
  const tokens = [];
  for (const seg of segments) {
    if (seg.type === "math") {
      const m = mathMetrics(seg.value, seg.display);
      tokens.push({ kind: "math", latex: seg.value, display: seg.display, metrics: m });
    } else {
      const parts = seg.value.split(/(\s+)/); // keep whitespace runs
      for (const p of parts) {
        if (p === "") continue;
        if (/^\s+$/.test(p)) tokens.push({ kind: "space" });
        else tokens.push({ kind: "word", str: p });
      }
    }
  }

  const lines = [];
  let cur = { items: [], width: 0, ascent: textAscentMm, descent: textDescentMm };
  let pendingSpace = false;

  const pushLine = () => {
    lines.push(cur);
    cur = { items: [], width: 0, ascent: textAscentMm, descent: textDescentMm };
    pendingSpace = false;
  };

  for (const tok of tokens) {
    if (tok.kind === "space") { pendingSpace = cur.items.length > 0; continue; }

    let w, addItem;
    if (tok.kind === "word") {
      w = measureText(tok.str);
      addItem = (x) => cur.items.push({ kind: "text", str: tok.str, x });
    } else {
      // math: if it failed to rasterise, fall back to drawing the raw latex
      // as text so nothing silently vanishes.
      if (!tok.metrics) {
        const raw = tok.display ? `$$${tok.latex}$$` : `$${tok.latex}$`;
        w = measureText(raw);
        addItem = (x) => cur.items.push({ kind: "text", str: raw, x });
      } else {
        w = tok.metrics.wMm;
        const m = tok.metrics;
        addItem = (x) => {
          cur.items.push({ kind: "math", latex: tok.latex, display: tok.display, x, w: m.wMm, h: m.hMm, ascent: m.ascentMm, dataUrl: m.dataUrl });
          cur.ascent = Math.max(cur.ascent, m.ascentMm);
          cur.descent = Math.max(cur.descent, m.hMm - m.ascentMm);
        };
      }
    }

    const sp = pendingSpace ? spaceWidth : 0;
    // Wrap if this token doesn't fit (but never wrap an empty line).
    if (cur.items.length > 0 && cur.width + sp + w > maxWidth) {
      pushLine();
    } else if (pendingSpace) {
      cur.width += sp;
      pendingSpace = false;
    }
    addItem(cur.width);
    cur.width += w;
  }
  if (cur.items.length > 0 || lines.length === 0) lines.push(cur);

  // Compute per-line advance + baseline offset, and total height.
  let total = 0;
  for (const ln of lines) {
    const natural = ln.ascent + ln.descent;
    ln.advance = Math.max(lineAdvance, natural + 1);
    ln.baselineOffset = ln.ascent; // top of line → baseline
    total += ln.advance;
  }
  return { lines, totalHeight: total };
}

function textMetricsMm(fontSizePt) {
  return {
    ascent: fontSizePt * TEXT_ASCENT_EM * PT_TO_MM,
    descent: fontSizePt * TEXT_DESCENT_EM * PT_TO_MM,
  };
}

// ── Draw + measure (jsPDF) ─────────────────────────────────────────────────
// Caller MUST have set doc font family + size to match `fontSizePt` first
// (so getTextWidth / text drawing line up). `y` is the baseline of the first
// line, matching drawWrappedText. Returns the y after the last line.
export function drawRichText(doc, text, x, y, maxWidth, lineHeight, opts = {}) {
  const { fontSizePt = 11, mathCache = null } = opts;
  const { ascent, descent } = textMetricsMm(fontSizePt);
  const layout = layoutRichText(text, maxWidth, {
    measureText: (s) => doc.getTextWidth(s),
    mathMetrics: (latex, display) => scaledMetrics(mathCache, latex, display, fontSizePt),
    lineAdvance: lineHeight + 2,
    spaceWidth: doc.getTextWidth(" "),
    textAscentMm: ascent,
    textDescentMm: descent,
  });

  let lineTop = y - ascent; // first baseline is at y → line top is one ascent up
  for (const ln of layout.lines) {
    const baselineY = lineTop + ln.baselineOffset;
    for (const it of ln.items) {
      if (it.kind === "text") {
        doc.text(it.str, x + it.x, baselineY);
      } else {
        try {
          doc.addImage(it.dataUrl, "PNG", x + it.x, baselineY - it.ascent, it.w, it.h);
        } catch (err) {
          console.warn("[pdf-math] addImage failed:", err);
        }
      }
    }
    lineTop += ln.advance;
  }
  return y + layout.totalHeight;
}
