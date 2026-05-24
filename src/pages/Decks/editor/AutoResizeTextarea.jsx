// ─── Auto-resizing textarea ──────────────────────────────────────────────
// Grows with content. Useful for question text where length varies a lot
// (one-liners → "MCQ" vs paragraph-length → word problems).

import { useRef, useEffect } from "react";
import { inputStyle as inp } from "../../../components/forms/field-styles";

export default function AutoResizeTextarea({ value, onChange, placeholder, minHeight = 44, maxHeight = 320, autoFocus = false, style = {}, ...rest }) {
  const ref = useRef(null);
  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(maxHeight, Math.max(minHeight, el.scrollHeight));
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- resize reads stable layout props (min/maxHeight); re-running only when `value` changes is intended
  useEffect(resize, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoFocus={autoFocus}
      rows={1}
      style={{
        ...inp,
        resize: "none",
        lineHeight: 1.5,
        minHeight,
        overflowY: "hidden",
        ...style,
      }}
      {...rest}
    />
  );
}
