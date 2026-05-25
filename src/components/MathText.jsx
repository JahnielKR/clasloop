// ─── src/components/MathText.jsx ─────────────────────────────────────────
// Track A (A1): renders a string that may carry LaTeX between $…$ (inline) or
// $$…$$ (display). Math spans are rendered by KaTeX; everything else is plain
// text. Used on every surface a student or teacher READS question content (the
// live quiz, the editor list). Strings without math take a fast path and do no
// KaTeX work, so existing decks render exactly as before.
//
// The PDF export does NOT use this component — it can't run KaTeX's HTML — and
// falls back to latexToAscii() (see src/lib/latex.js) instead.

import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { parseMathSegments, hasMath } from "../lib/latex";

export default function MathText({ children, text, as: Tag = "span", ...rest }) {
  const raw =
    typeof text === "string" ? text : typeof children === "string" ? children : "";

  const segments = useMemo(() => (hasMath(raw) ? parseMathSegments(raw) : null), [raw]);

  // Fast path: no math → render the string untouched.
  if (!segments) return <Tag {...rest}>{raw}</Tag>;

  return (
    <Tag {...rest}>
      {segments.map((seg, i) => {
        if (seg.type === "text") return <span key={i}>{seg.value}</span>;
        let html;
        try {
          // KaTeX output is generated markup (not user HTML), so inserting it
          // is safe. throwOnError:false makes a malformed formula render in red
          // rather than throw; the catch is a belt-and-suspenders fallback.
          html = katex.renderToString(seg.value, {
            throwOnError: false,
            displayMode: !!seg.display,
          });
        } catch {
          return <span key={i}>{seg.value}</span>;
        }
        return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </Tag>
  );
}
