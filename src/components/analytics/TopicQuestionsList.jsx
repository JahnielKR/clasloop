// src/components/analytics/TopicQuestionsList.jsx
//
// F3 Analytics Studio: lista compacta de las preguntas falladas del tema
// (las que no son la TOP — esa la come MisconceptionPanel). Click → DeckResults.
// i18n: useT("topicMastery").

import { C } from "../tokens";
import { useLang } from "../../i18n/LanguageContext";
import { useT } from "../../i18n";

export default function TopicQuestionsList({ questions = [], onItemClick }) {
  const t = useT("topicMastery", useLang());
  // El primer item ya lo muestra MisconceptionPanel.
  const rest = questions.slice(1, 8);

  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
        {t.otherQuestions}
      </div>
      {rest.length === 0 ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 4 }}>
          {t.noOtherQuestions}
        </div>
      ) : (
        <div style={{ fontSize: 13, lineHeight: 1.65 }}>
          {rest.map((it, i) => (
            <div
              key={`${it.deck_id}-${it.question_index}`}
              onClick={onItemClick ? () => onItemClick(it) : undefined}
              style={{
                borderBottom: i < rest.length - 1 ? `1px solid ${C.bgSoft}` : "none",
                padding: "3px 0",
                cursor: onItemClick ? "pointer" : "default",
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {it.question?.q || t.qLabel(it.question_index + 1)}
              </span>
              <b style={{ color: it.error_rate >= 60 ? C.red : it.error_rate >= 40 ? C.orange : C.green }}>
                {t.errShort(Math.round(it.error_rate))}
              </b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
