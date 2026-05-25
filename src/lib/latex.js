// ─── src/lib/latex.js — LaTeX helpers (pure, no React/KaTeX) ─────────────────
//
// Track A (A1): questions can carry math written as LaTeX between $…$ (inline)
// or $$…$$ (display). This module has the framework-free pieces so it can be
// used on BOTH surfaces without pulling KaTeX/React into the PDF bundle:
//
//   parseMathSegments(str)  → ordered [{type:'text'|'math', value, display}]
//                             used by the on-screen <MathText> (KaTeX) renderer.
//   latexToAscii(str)       → a readable ASCII rendering of the same string,
//                             used by the PDF export. The PDF fonts (Helvetica
//                             for en/es, a content-subset NotoSansKR for ko)
//                             don't carry math glyphs like π, √ or ≤, so a
//                             plain-ASCII form ("pi", "sqrt(x)", "<=") is the
//                             only thing guaranteed to print. It's approximate
//                             by design — the exact rendering is the live quiz.
//   sanitizeQuestionMath(q) → a question clone with every text field run
//                             through latexToAscii, for the PDF dispatcher.
//
// Delimiters are $…$ / $$…$$ (the universal LaTeX convention, and JSON-safe so
// the AI generator can emit them without backslash-escaping headaches). Caveat:
// two literal "$" amounts in one field (e.g. "$5 and $3") look like a math
// span — the AI is told to write currency as words to avoid this.

// $$…$$ (display) is matched before $…$ (inline). Inline spans don't cross
// newlines, which keeps a stray "$" from swallowing a whole paragraph.
const SEGMENT_RE = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

export function hasMath(str) {
  return typeof str === "string" && (/\$\$[\s\S]+?\$\$/.test(str) || /\$[^$\n]+?\$/.test(str));
}

/**
 * Split a string into text and math segments in order. A string with no math
 * returns a single text segment, so callers can always map over the result.
 */
export function parseMathSegments(str) {
  if (typeof str !== "string" || str === "") {
    return [{ type: "text", value: typeof str === "string" ? str : "" }];
  }
  const out = [];
  let last = 0;
  let m;
  SEGMENT_RE.lastIndex = 0;
  while ((m = SEGMENT_RE.exec(str)) !== null) {
    if (m.index > last) out.push({ type: "text", value: str.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ type: "math", value: m[1], display: true });
    else out.push({ type: "math", value: m[2], display: false });
    last = SEGMENT_RE.lastIndex;
  }
  if (last < str.length) out.push({ type: "text", value: str.slice(last) });
  if (out.length === 0) out.push({ type: "text", value: str });
  return out;
}

// LaTeX command → ASCII. Applied after the structural rules below, so by here
// \frac and \sqrt are already gone. Unknown commands fall back to their bare
// name (the backslash is dropped), which keeps output readable.
const SYMBOLS = {
  times: "*", cdot: "*", div: "/", ast: "*",
  pm: "+/-", mp: "-/+",
  leq: "<=", le: "<=", geq: ">=", ge: ">=",
  neq: "!=", ne: "!=", approx: "~=", equiv: "==", sim: "~",
  infty: "inf",
  to: "->", rightarrow: "->", Rightarrow: "=>", leftarrow: "<-", implies: "=>",
  ldots: "...", cdots: "...", dots: "...",
  sum: "sum", prod: "prod", int: "integral",
  angle: "angle",
  alpha: "alpha", beta: "beta", gamma: "gamma", delta: "delta",
  epsilon: "epsilon", varepsilon: "epsilon", zeta: "zeta", eta: "eta",
  theta: "theta", iota: "iota", kappa: "kappa", lambda: "lambda", mu: "mu",
  nu: "nu", xi: "xi", rho: "rho", sigma: "sigma", tau: "tau",
  phi: "phi", varphi: "phi", chi: "chi", psi: "psi", omega: "omega",
  pi: "pi",
  Delta: "Delta", Gamma: "Gamma", Theta: "Theta", Lambda: "Lambda",
  Sigma: "Sigma", Phi: "Phi", Psi: "Psi", Omega: "Omega", Pi: "Pi",
};

function mathToAscii(tex) {
  let s = String(tex == null ? "" : tex);
  // Escaped specials: \% \$ \# \_ \{ \} → the literal char.
  s = s.replace(/\\([%$#&_{}])/g, "$1");
  // Font/text wrappers → their content.
  s = s.replace(/\\(?:text|mathrm|mathbf|mathbb|mathit|mathsf|operatorname)\s*\{([^{}]*)\}/g, "$1");
  // \frac{A}{B} → (A)/(B). Looped a few times for shallow nesting.
  for (let i = 0; i < 3; i++) {
    s = s.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)");
  }
  // Roots.
  s = s.replace(/\\sqrt\s*\[([^\]]*)\]\s*\{([^{}]*)\}/g, "root[$1]($2)");
  s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, "sqrt($1)");
  // Degrees: 90^\circ → 90deg (before the generic symbol pass).
  s = s.replace(/\^?\\circ/g, "deg");
  // Braced super/subscripts → parenthesised; bare ^2 / _1 are left as-is.
  s = s.replace(/\^\s*\{([^{}]*)\}/g, "^($1)");
  s = s.replace(/_\s*\{([^{}]*)\}/g, "_($1)");
  // Spacing + sizing commands.
  s = s.replace(/\\(?:left|right|displaystyle|limits)/g, "");
  s = s.replace(/\\[,;:!> ]/g, " ");
  s = s.replace(/\\q?quad/g, " ");
  // Named commands → ASCII (known) or bare name (unknown).
  s = s.replace(/\\([a-zA-Z]+)/g, (_m, name) =>
    Object.prototype.hasOwnProperty.call(SYMBOLS, name) ? SYMBOLS[name] : name
  );
  // Drop leftover grouping braces and tidy whitespace.
  s = s.replace(/[{}]/g, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/**
 * A readable ASCII rendering of a string that may contain $…$ / $$…$$ math.
 * Non-strings pass through unchanged; strings without "$" are returned as-is.
 */
export function latexToAscii(str) {
  if (typeof str !== "string") return str;
  if (str.indexOf("$") === -1) return str;
  return parseMathSegments(str)
    .map((seg) => (seg.type === "math" ? mathToAscii(seg.value) : seg.value))
    .join("");
}

/**
 * Return a shallow question clone with every text field converted to ASCII
 * math, for the PDF export. Leaves non-text fields (correct, time_limit, min,
 * max, image_url…) untouched and never mutates the input.
 */
export function sanitizeQuestionMath(q) {
  if (!q || typeof q !== "object") return q;
  const out = { ...q };
  out.q = latexToAscii(out.q);
  if (Array.isArray(out.options)) {
    out.options = out.options.map((o) =>
      typeof o === "string"
        ? latexToAscii(o)
        : o && typeof o === "object"
        ? { ...o, text: latexToAscii(o.text) }
        : o
    );
  }
  out.answer = latexToAscii(out.answer);
  if (Array.isArray(out.alternatives)) out.alternatives = out.alternatives.map(latexToAscii);
  if (Array.isArray(out.items)) out.items = out.items.map(latexToAscii);
  if (Array.isArray(out.pairs)) {
    out.pairs = out.pairs.map((p) =>
      p && typeof p === "object" ? { ...p, left: latexToAscii(p.left), right: latexToAscii(p.right) } : p
    );
  }
  out.required_word = latexToAscii(out.required_word);
  out.unit = latexToAscii(out.unit);
  return out;
}
