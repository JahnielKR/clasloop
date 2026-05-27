// ─── src/pages/Decks/editor/QuestionImageAI.jsx ──────────────────────────
// Per-question "Generate with AI" affordance for the deck editor. Collapsed,
// it's a small button next to "+ Add image"; expanded, it shows a prompt
// textarea prefilled with the question text (editable) plus Generate / Cancel.
// Generation itself lives in the hook (generateQImage); this is just the UI.
import { useState } from "react";
import { CIcon } from "../../../components/Icons";
import { C } from "../styles";
import { addMiniBtn } from "./constants";

export default function QuestionImageAI({ defaultPrompt = "", generating = false, onGenerate, t }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        className="dk-add-mini"
        style={{ ...addMiniBtn, marginBottom: 10 }}
        onClick={() => { setPrompt(defaultPrompt || ""); setOpen(true); }}
      >
        <CIcon name="sparkle" size={12} inline /> {t.generateImageAI}
      </button>
    );
  }

  const run = async () => {
    const p = prompt.trim();
    if (!p || generating) return;
    await onGenerate(p);
    setOpen(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={t.aiImagePromptPlaceholder}
        rows={2}
        disabled={generating}
        autoFocus
        style={{
          width: "100%", padding: "8px 10px", fontSize: 12.5,
          border: `1px solid ${C.border}`, borderRadius: 8,
          background: C.bg, color: C.text, fontFamily: "'Outfit',sans-serif",
          boxSizing: "border-box", resize: "vertical",
        }}
      />
      <div style={{ display: "flex", gap: 6 }}>
        <button
          type="button"
          onClick={run}
          disabled={generating || !prompt.trim()}
          style={{
            flex: 1, padding: "7px 10px", fontSize: 12.5, fontWeight: 600,
            border: "none", borderRadius: 8,
            cursor: generating || !prompt.trim() ? "default" : "pointer",
            background: C.accent, color: "#fff", fontFamily: "'Outfit',sans-serif",
            opacity: generating || !prompt.trim() ? 0.6 : 1,
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          {generating
            ? t.generatingImage
            : (<><CIcon name="sparkle" size={12} inline color="#fff" /> {t.generate}</>)}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={generating}
          style={{
            padding: "7px 12px", fontSize: 12.5, fontWeight: 500,
            border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer",
            background: C.bg, color: C.textSecondary, fontFamily: "'Outfit',sans-serif",
          }}
        >
          {t.cancelImageAI}
        </button>
      </div>
    </div>
  );
}
