// src/components/analytics/MisconceptionPanel.jsx
//
// F3 Analytics Studio: panel de concepto erróneo. Toma la pregunta TOP
// (más fallada) del tema y muestra su answer_distribution con la opción
// CORRECTA resaltada en verde y la opción WRONG-más-popular marcada como
// "misconception". i18n: useT("topicMastery"); optionLabel recibe `t`.
//
// Props:
//   question: la primera entry de topic_detail.questions
//   onDrillDeck: (deckId) => void

import {
  correctKeyForMcq,
  correctKeyForTf,
  pickTopMisconception,
  decorateDistribution,
} from "../../lib/analytics/misconceptions";
import { C } from "../tokens";
import { useLang } from "../../i18n/LanguageContext";
import { useT } from "../../i18n";

function correctKeyFor(q) {
  if (!q) return null;
  return correctKeyForMcq(q) || correctKeyForTf(q);
}

function optionLabel(q, key, t) {
  if (!q) return key;
  if (q.type === "mcq" && Array.isArray(q.options)) {
    const idx = Number(key);
    if (Number.isInteger(idx) && q.options[idx] != null) {
      return q.options[idx] || t.optionN(idx + 1);
    }
  }
  if (q.type === "tf") {
    if (key === "true") return t.trueLabel;
    if (key === "false") return t.falseLabel;
  }
  return key;
}

export default function MisconceptionPanel({ question, onDrillDeck }) {
  const t = useT("topicMastery", useLang());
  if (!question) {
    return (
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{t.misconceptionTitle}</div>
        <div style={{ opacity: 0.45, fontSize: 13 }}>{t.noFeatured}</div>
      </div>
    );
  }

  const q = question.question; // the deck's question jsonb
  const correctKey = correctKeyFor(q);
  const entries = decorateDistribution(question.answer_distribution || {}, correctKey);
  const topMis = pickTopMisconception(question.answer_distribution || {}, correctKey);
  const totalCount = entries.reduce((s, e) => s + e.count, 0) || 1;

  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <b style={{ fontSize: 13 }}>{t.misconceptionSubtitle}</b>
        <span style={{ marginLeft: "auto", fontSize: 11, color: C.red, fontWeight: 600 }}>
          {t.errShort(Math.round(question.error_rate))}
        </span>
      </div>
      <div style={{ fontSize: 13, marginBottom: 10, color: C.text }}>
        {q?.q || t.qLabel(question.question_index + 1)}
      </div>
      {topMis && (
        <div
          style={{
            background: C.orangeSoft,
            border: `1px solid ${C.orange}`,
            borderRadius: 6,
            padding: "6px 9px",
            fontSize: 12,
            marginBottom: 10,
          }}
        >
          <b>{t.dominantMis}</b> "{optionLabel(q, topMis.key, t)}" — {t.chosenSentence(topMis.count, Math.round((topMis.count / totalCount) * 100))}
        </div>
      )}
      <div style={{ fontSize: 12, lineHeight: 1.7 }}>
        {entries.map((e) => {
          const pct = Math.round((e.count / totalCount) * 100);
          const isWrongTop = topMis && e.key === topMis.key;
          return (
            <div key={e.key} style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0" }}>
              <span style={{ flex: "0 0 130px", color: e.isCorrect ? C.green : isWrongTop ? C.red : C.text }}>
                {optionLabel(q, e.key, t)}
                {e.isCorrect && <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 700 }}>{t.correctMark}</span>}
              </span>
              <span aria-hidden style={{ flex: 1, height: 6, background: C.bgSoft, borderRadius: 3, overflow: "hidden" }}>
                <span
                  style={{
                    display: "block",
                    height: "100%",
                    width: `${pct}%`,
                    background: e.isCorrect ? C.green : isWrongTop ? C.red : C.textMuted,
                    borderRadius: 3,
                  }}
                />
              </span>
              <span style={{ flex: "0 0 60px", textAlign: "right", fontWeight: 600 }}>
                {e.count} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
      {question.deck_id && (
        <button
          onClick={() => onDrillDeck?.(question.deck_id)}
          style={{
            marginTop: 10,
            border: `1px solid ${C.accent}`,
            color: C.accent,
            background: "transparent",
            padding: "2px 9px",
            borderRadius: 6,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          {t.viewInDeck}
        </button>
      )}
    </div>
  );
}
