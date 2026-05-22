import { C } from "../../../components/tokens";
import { useReveal } from "../useReveal";

// Question-type pills. PR (landing scaffold): moved out of the monolith +
// reveal-on-scroll + anchor id. The interactive auto-cycle/mini-render
// upgrade lands in a later PR.
export default function QuestionTypes({ t }) {
  const [ref, visible] = useReveal();

  const types = [
    { color: "#2383E2", label: t.typeMcq },
    { color: "#1D9E75", label: t.typeTf },
    { color: "#D85A30", label: t.typeFill },
    { color: "#BA7517", label: t.typeOrder },
    { color: "#534AB7", label: t.typeMatch },
    { color: "#D4537E", label: t.typeOpen },
    { color: "#0F7B6C", label: t.typeSentence },
    { color: "#993C1D", label: t.typeSlider },
    { color: "#7F77DD", label: t.typePoll },
  ];

  return (
    <div
      id="types"
      ref={ref}
      className={`ph-anchor ph-reveal ${visible ? "is-visible" : ""}`}
      style={{
        padding: "0 32px 90px",
        display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap",
      }}
    >
      {types.map(p => (
        <div key={p.label} style={{
          padding: "11px 22px", background: C.bg,
          border: `1px solid ${C.border}`, borderRadius: 100,
          fontSize: 17, color: C.textSecondary, fontWeight: 500,
          display: "flex", alignItems: "center", gap: 9,
        }}>
          <span style={{ color: p.color, fontSize: 14 }}>●</span>
          {p.label}
        </div>
      ))}
    </div>
  );
}
