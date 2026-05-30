# Analytics Reports redesign (Ola B) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/school/reports` so the section "cotejos" are design-system selectable cards (label + description + reorder), with a live data-backed preview of the report and an enriched saved-reports list.

**Architecture:** A pure catalog/reorder lib (`report-sections.js`) feeds both a rewritten `ReportComposer` (selectable cards + ↑/↓ reorder + period chips, lightly controlled via `onDraftChange`) and a new `ReportPreview` (fetches real data via `useClassAnalytics`, renders the selected sections in order reusing existing charts). `Reports.jsx` lifts the draft state and lays out composer + preview side by side with the saved list below. Export already honors section order (`buildClassReportModel` renders by array order) — no exporter/DB changes.

**Tech Stack:** React 18 (automatic JSX runtime), Vite, Vitest + Testing Library, TypeScript for i18n locale files, ESLint, Recharts (existing charts), React Query (`useClassAnalytics`).

**Spec:** `docs/superpowers/specs/2026-05-30-analytics-reports-redesign-design.md`

---

## Environment note (READ FIRST — this bit the Ola A build hard)

In this worktree, **a Bash command that exits non-zero CANCELS every other tool
call in the same message** — including Edits/Writes that ran "before" it. That
silently reverted edits and produced false-green commits all through Ola A.

**Rules for executing this plan:**
1. Never put a verification `Bash` call in the same message as `Edit`/`Write`.
   Do edits in one message; run the gate in the next.
2. After any committed task, re-read the changed files (or `git show --stat`) to
   confirm what's actually on disk before moving on.
3. A piped `... | tail`/`| grep` swallows the runner's exit code — capture to a
   file and read it, or check `${PIPESTATUS[0]}`.
4. The worktree needs `.env` (copied from the main checkout) for the full vitest
   suite; the i18n/pure/component tests in this plan don't need it.

**Per-task verification baseline** (run as its OWN message, after the edits):

```bash
npx tsc --noEmit
npx vitest run src/i18n/__tests__/locale-parity.test.ts
npx eslint src/components/analytics src/pages/analytics
```
Expected: tsc clean, parity PASS, eslint 0 errors (the repo baseline is 0
errors / ~129 pre-existing warnings — never conflate warnings with errors).

---

## Data shapes (ground truth — from the real code)

`useClassAnalytics(classId, { from, to })` returns the RPC `class_analytics`:
```
{
  kpis: { pct_correct:number, unique_participants:number,
          responses_total:number, responses_correct:number, avg_time_ms:number },
  topic_mastery: [{ topic:string, retention_score:number, ... }],
  most_missed:   [{ question_index:number, topic:string, error_rate:number, deck_id?:string }],
}
```
`RetentionBars` takes `data={[{ label, value }]}` (value 0..100).
Formatters (`src/lib/analytics/formatters`): `formatPercent`, `formatNumber`, `formatDurationShort`.
`AnimatedNumber` (`src/components/analytics/AnimatedNumber`): `<AnimatedNumber value={n} format={fn} />`.
The `reports` i18n namespace ALREADY has: `title, saved, empty, newReport, name,
namePlaceholder, classLabel, period, sections, save, saving, sectionsCount(n),
secKpis, secTopics, secMostMissed, periodD7, periodD30, periodD90`.

---

## File structure

- **Create** `src/lib/analytics/report-sections.js` — `REPORT_SECTIONS` catalog + pure `moveSection(order, id, dir)`.
- **Create** `src/lib/analytics/__tests__/report-sections.test.js`.
- **Create** `src/components/analytics/ReportPreview.jsx` — live preview.
- **Create** `src/components/analytics/__tests__/ReportPreview.test.jsx`.
- **Rewrite** `src/components/analytics/ReportComposer.jsx` — selectable cards + reorder + chips + `onDraftChange`.
- **Create** `src/components/analytics/__tests__/ReportComposer.test.jsx`.
- **Modify** `src/pages/analytics/Reports.jsx` — lift draft, layout, enriched list.
- **Modify** `src/i18n/en.ts`, `es.ts`, `ko.ts` — new `reports` keys.
- **Modify** `src/components/analytics/__tests__/studio-i18n-smoke.test.jsx` — add composer/preview EN render-smoke.

---

## Task 1: `report-sections.js` (pure catalog + reorder)

**Files:**
- Create: `src/lib/analytics/report-sections.js`
- Test: `src/lib/analytics/__tests__/report-sections.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/lib/analytics/__tests__/report-sections.test.js
/* @vitest-environment node */
import { describe, it, expect } from "vitest";
import { REPORT_SECTIONS, moveSection } from "../report-sections";

describe("report-sections", () => {
  it("exposes the 3 section ids with label + desc keys", () => {
    expect(REPORT_SECTIONS.map((s) => s.id)).toEqual(["kpis", "topics", "most_missed"]);
    for (const s of REPORT_SECTIONS) {
      expect(typeof s.labelKey).toBe("string");
      expect(typeof s.descKey).toBe("string");
    }
  });

  it("moveSection up swaps with the previous id", () => {
    expect(moveSection(["kpis", "topics", "most_missed"], "topics", "up"))
      .toEqual(["topics", "kpis", "most_missed"]);
  });

  it("moveSection down swaps with the next id", () => {
    expect(moveSection(["kpis", "topics", "most_missed"], "topics", "down"))
      .toEqual(["kpis", "most_missed", "topics"]);
  });

  it("moveSection is a no-op at the boundaries", () => {
    expect(moveSection(["kpis", "topics"], "kpis", "up")).toEqual(["kpis", "topics"]);
    expect(moveSection(["kpis", "topics"], "topics", "down")).toEqual(["kpis", "topics"]);
  });

  it("moveSection is a no-op when id is absent", () => {
    expect(moveSection(["kpis"], "topics", "up")).toEqual(["kpis"]);
  });

  it("returns a NEW array (does not mutate input)", () => {
    const input = ["kpis", "topics"];
    const out = moveSection(input, "topics", "up");
    expect(out).not.toBe(input);
    expect(input).toEqual(["kpis", "topics"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (own message): `npx vitest run src/lib/analytics/__tests__/report-sections.test.js`
Expected: FAIL — cannot resolve `../report-sections`.

- [ ] **Step 3: Implement**

```js
// src/lib/analytics/report-sections.js
//
// Ola B: single catalog of the report's sections. Both the composer (selectable
// cards) and the preview (render order) import this so the list + ids never
// drift. labelKey reuses the existing `reports` i18n keys; descKey are new.
// Pure — no React, no Supabase.

export const REPORT_SECTIONS = [
  { id: "kpis", labelKey: "secKpis", descKey: "secKpisDesc" },
  { id: "topics", labelKey: "secTopics", descKey: "secTopicsDesc" },
  { id: "most_missed", labelKey: "secMostMissed", descKey: "secMostMissedDesc" },
];

// Return a NEW order array with `id` moved one slot up/down. No-op at the
// boundaries or when `id` isn't present. `dir` is "up" | "down".
export function moveSection(order, id, dir) {
  const i = order.indexOf(id);
  if (i === -1) return [...order];
  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= order.length) return [...order];
  const next = [...order];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (own message): `npx vitest run src/lib/analytics/__tests__/report-sections.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics/report-sections.js src/lib/analytics/__tests__/report-sections.test.js
git commit -m "feat(reports): pure report-sections catalog + moveSection reorder"
```

---

## Task 2: i18n keys for the new `reports` strings

**Files:**
- Modify: `src/i18n/en.ts`, `src/i18n/es.ts`, `src/i18n/ko.ts` (inside the existing `reports:` namespace)

> The `reports` namespace already exists in all three. Add the keys below to the
> SAME object in each file. Do all three in ONE message (Edits only — no Bash),
> then verify parity in the next message. Keep es in neutral "tú".

- [ ] **Step 1: Add to `en.ts` `reports:` (after `periodD90`)**

```ts
    secKpisDesc: "Key numbers: % correct, participants, responses, avg. time.",
    secTopicsDesc: "Retention per topic, strongest to weakest.",
    secMostMissedDesc: "The questions with the highest error rate.",
    previewTitle: "Preview",
    previewNoClass: "Pick a class to preview its report.",
    previewLoading: "Loading preview…",
    previewEmpty: "No data for this class in the selected period.",
    moveUp: "Move up",
    moveDown: "Move down",
    includedLabel: "Included",
    savedSectionsCount: (n: number) => `${n} ${n === 1 ? "section" : "sections"}`,
    kpiPctCorrect: "% correct",
    kpiParticipants: "Participants",
    kpiResponses: "Responses",
    kpiAvgTime: "Avg. time",
    mostMissedQ: (n: number) => `Q. ${n}`,
    errSuffix: (p: number) => `${p}% err`,
```

- [ ] **Step 2: Add to `es.ts` `reports:` (same keys, neutral "tú")**

```ts
    secKpisDesc: "Cifras clave: % correcto, participantes, respuestas, tiempo medio.",
    secTopicsDesc: "Retención por tema, de mayor a menor.",
    secMostMissedDesc: "Las preguntas con mayor tasa de error.",
    previewTitle: "Previsualización",
    previewNoClass: "Elige una clase para previsualizar su reporte.",
    previewLoading: "Cargando previsualización…",
    previewEmpty: "Sin datos para esta clase en el período elegido.",
    moveUp: "Subir",
    moveDown: "Bajar",
    includedLabel: "Incluida",
    savedSectionsCount: (n) => `${n} ${n === 1 ? "sección" : "secciones"}`,
    kpiPctCorrect: "% correcto",
    kpiParticipants: "Participantes",
    kpiResponses: "Respuestas",
    kpiAvgTime: "Tiempo medio",
    mostMissedQ: (n) => `P. ${n}`,
    errSuffix: (p) => `${p}% err`,
```

- [ ] **Step 3: Add to `ko.ts` `reports:` (same keys, Korean)**

```ts
    secKpisDesc: "핵심 수치: 정답률, 참여자, 응답, 평균 시간.",
    secTopicsDesc: "주제별 정착도, 높은 순에서 낮은 순.",
    secMostMissedDesc: "오답률이 가장 높은 문제.",
    previewTitle: "미리보기",
    previewNoClass: "리포트를 미리 보려면 학급을 선택하세요.",
    previewLoading: "미리보기 불러오는 중…",
    previewEmpty: "선택한 기간에 이 학급의 데이터가 없습니다.",
    moveUp: "위로",
    moveDown: "아래로",
    includedLabel: "포함됨",
    savedSectionsCount: (n) => `${n}개 섹션`,
    kpiPctCorrect: "정답률",
    kpiParticipants: "참여자",
    kpiResponses: "응답",
    kpiAvgTime: "평균 시간",
    mostMissedQ: (n) => `${n}번`,
    errSuffix: (p) => `오답률 ${p}%`,
```

- [ ] **Step 4: Verify parity + types (own message)**

```bash
npx tsc --noEmit
npx vitest run src/i18n/__tests__/locale-parity.test.ts
```
Expected: tsc clean; parity 3 tests PASS. (If parity fails, a key is missing/typo'd in one locale — fix that locale, don't delete keys from the others.)

- [ ] **Step 5: Commit**

```bash
git add src/i18n/en.ts src/i18n/es.ts src/i18n/ko.ts
git commit -m "feat(i18n): reports keys for section descriptions, preview, reorder, saved list"
```

---

## Task 3: Rewrite `ReportComposer` (selectable cards + reorder + chips + lifted draft)

**Files:**
- Rewrite: `src/components/analytics/ReportComposer.jsx`
- Test: `src/components/analytics/__tests__/ReportComposer.test.jsx`

**Interface contract (used by Task 5):**
`<ReportComposer classes onSave saving onDraftChange />`
- `classes`: `[{ class_id, class_name }]` (from `useAnalyticsOverview`).
- `onDraftChange(draft)`: called whenever name/classId/period/sections change.
  `draft = { name, classId, period, sections }` (sections = ordered id array).
- `onSave(draft)`: called on the Save button with the same shape (only when valid).
- `saving`: boolean (disables the Save button, shows `t.saving`).

- [ ] **Step 1: Write the failing test**

```jsx
// src/components/analytics/__tests__/ReportComposer.test.jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LanguageProvider } from "../../../i18n/LanguageContext";
import ReportComposer from "../ReportComposer";

const classes = [{ class_id: "c1", class_name: "Spanish 1" }];

function renderComposer(props = {}) {
  return render(
    <LanguageProvider value="en">
      <ReportComposer classes={classes} onSave={() => {}} onDraftChange={() => {}} {...props} />
    </LanguageProvider>,
  );
}

describe("ReportComposer", () => {
  it("renders the 3 sections with English labels + descriptions", () => {
    renderComposer();
    expect(screen.getByText("Key indicators")).toBeInTheDocument();
    expect(screen.getByText("Mastery by topic")).toBeInTheDocument();
    expect(screen.getByText("Most missed questions")).toBeInTheDocument();
    // descriptions present
    expect(screen.getByText(/Retention per topic/)).toBeInTheDocument();
  });

  it("emits a draft with all 3 sections selected by default", () => {
    const onDraftChange = vi.fn();
    renderComposer({ onDraftChange });
    // initial effect fires once with the default draft
    const last = onDraftChange.mock.calls.at(-1)?.[0];
    expect(last.sections).toEqual(["kpis", "topics", "most_missed"]);
    expect(last.classId).toBe("c1");
  });

  it("toggling a section card removes it from the draft", () => {
    const onDraftChange = vi.fn();
    renderComposer({ onDraftChange });
    fireEvent.click(screen.getByText("Mastery by topic"));
    const last = onDraftChange.mock.calls.at(-1)[0];
    expect(last.sections).toEqual(["kpis", "most_missed"]);
  });

  it("Move down reorders the emitted draft", () => {
    const onDraftChange = vi.fn();
    renderComposer({ onDraftChange });
    // first section "Key indicators" has a Move down button
    const downBtns = screen.getAllByLabelText("Move down");
    fireEvent.click(downBtns[0]);
    const last = onDraftChange.mock.calls.at(-1)[0];
    expect(last.sections).toEqual(["topics", "kpis", "most_missed"]);
  });

  it("Save passes the current draft", () => {
    const onSave = vi.fn();
    renderComposer({ onSave });
    fireEvent.change(screen.getByPlaceholderText(/Monthly report/i), { target: { value: "May" } });
    fireEvent.click(screen.getByText("Save report"));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: "May", classId: "c1" }));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run (own message): `npx vitest run src/components/analytics/__tests__/ReportComposer.test.jsx`
Expected: FAIL (old composer has no `onDraftChange`, no Move buttons, sections render as native checkboxes).

- [ ] **Step 3: Implement the rewrite**

```jsx
// src/components/analytics/ReportComposer.jsx
//
// Ola B: report composer with the design system. Sections are selectable cards
// (label + description + ✓) that can be reordered with ↑/↓; period is segmented
// chips. Lightly controlled — emits the draft on every change for the live
// preview. i18n: useT("reports").

import { useEffect, useMemo, useState } from "react";
import { C } from "../tokens";
import { FieldLabel } from "../forms/FieldLabel";
import { inputStyle, selectStyle } from "../forms/field-styles";
import { selectableCard, selectableChip, selectedCheckStyle } from "../ui/selectable";
import Button from "../ui/Button";
import { REPORT_SECTIONS, moveSection } from "../../lib/analytics/report-sections";
import { useLang } from "../../i18n/LanguageContext";
import { useT } from "../../i18n";

const PERIODS = ["d7", "d30", "d90"];

export default function ReportComposer({ classes = [], onSave, saving = false, onDraftChange }) {
  const t = useT("reports", useLang());
  const [name, setName] = useState("");
  const [classId, setClassId] = useState(classes[0]?.class_id || "");
  const [period, setPeriod] = useState("d30");
  // sections = ordered array of included ids; starts with all 3 in catalog order.
  const [sections, setSections] = useState(REPORT_SECTIONS.map((s) => s.id));

  const periodLabel = useMemo(
    () => ({ d7: t.periodD7, d30: t.periodD30, d90: t.periodD90 }),
    [t],
  );

  const draft = useMemo(
    () => ({ name: name.trim(), classId, period, sections }),
    [name, classId, period, sections],
  );

  // Emit the draft whenever it changes so the preview can follow.
  useEffect(() => {
    onDraftChange?.(draft);
  }, [draft, onDraftChange]);

  function toggle(id) {
    setSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }
  function move(id, dir) {
    setSections((prev) => moveSection(prev, id, dir));
  }

  const valid = name.trim() && classId && sections.length > 0;

  // Render the cards in the current section order; excluded ids go after,
  // in catalog order, so they remain reachable to re-add.
  const orderedIncluded = sections;
  const excluded = REPORT_SECTIONS.map((s) => s.id).filter((id) => !sections.includes(id));
  const renderOrder = [...orderedIncluded, ...excluded];
  const meta = (id) => REPORT_SECTIONS.find((s) => s.id === id);

  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{t.newReport}</div>

      <FieldLabel>{t.name}</FieldLabel>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t.namePlaceholder}
        style={{ ...inputStyle, marginBottom: 12 }}
      />

      <FieldLabel>{t.classLabel}</FieldLabel>
      <select value={classId} onChange={(e) => setClassId(e.target.value)} style={{ ...selectStyle, marginBottom: 12 }}>
        {classes.map((c) => (
          <option key={c.class_id} value={c.class_id}>{c.class_name || c.class_id}</option>
        ))}
      </select>

      <FieldLabel>{t.period}</FieldLabel>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            className="cl-selectable"
            onClick={() => setPeriod(p)}
            aria-pressed={period === p}
            style={{ padding: "4px 11px", borderRadius: 6, fontSize: 13, cursor: "pointer", ...selectableChip(period === p) }}
          >
            {periodLabel[p]}
          </button>
        ))}
      </div>

      <FieldLabel>{t.sections}</FieldLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {renderOrder.map((id) => {
          const m = meta(id);
          const included = sections.includes(id);
          const pos = sections.indexOf(id);
          return (
            <div
              key={id}
              className="cl-selectable"
              onClick={() => toggle(id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(id); } }}
              style={{ position: "relative", borderRadius: 8, padding: "10px 12px", cursor: "pointer", ...selectableCard(included) }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{t[m.labelKey]}</div>
                  <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>{t[m.descKey]}</div>
                </div>
                {included && (
                  <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button" aria-label={t.moveUp} title={t.moveUp}
                      disabled={pos <= 0}
                      onClick={() => move(id, "up")}
                      style={arrowBtn(pos <= 0)}
                    >↑</button>
                    <button
                      type="button" aria-label={t.moveDown} title={t.moveDown}
                      disabled={pos >= sections.length - 1}
                      onClick={() => move(id, "down")}
                      style={arrowBtn(pos >= sections.length - 1)}
                    >↓</button>
                  </div>
                )}
                {included && (
                  <span style={{ ...selectedCheckStyle(), width: 18, height: 18, fontSize: 12, flexShrink: 0 }}>✓</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Button onClick={() => valid && onSave?.(draft)} disabled={!valid || saving}>
        {saving ? t.saving : t.save}
      </Button>
    </div>
  );
}

const arrowBtn = (disabled) => ({
  width: 24, height: 24, borderRadius: 6, border: `1px solid ${C.border}`,
  background: C.bg, color: disabled ? C.textMuted : C.textSecondary,
  cursor: disabled ? "not-allowed" : "pointer", fontSize: 12, lineHeight: 1,
});
```

> **Button API (verified from `src/components/ui/Button.jsx`):** named props
> `{ variant="primary", tone, size="md", loading, disabled, leftIcon, rightIcon,
> fullWidth, type="button", onClick, children, ...rest }`. `onClick` is an
> explicit named prop. So `<Button onClick={...} disabled={...}>{label}</Button>`
> is correct (defaults to `variant="primary"`). Do NOT pass `tone="primary"` —
> `tone` is only for solid semantic fills (success/warning/danger); leave it unset.

- [ ] **Step 4: Run the test to verify it passes**

Run (own message): `npx vitest run src/components/analytics/__tests__/ReportComposer.test.jsx`
Expected: PASS (5 tests). If "Save report"/labels don't match, it's because the
`reports` EN values are `Save report`/`Key indicators`/etc. — assert the real
values from `en.ts`.

- [ ] **Step 5: Baseline verify (own message)**

```bash
npx tsc --noEmit
npx eslint src/components/analytics/ReportComposer.jsx
```
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/analytics/ReportComposer.jsx src/components/analytics/__tests__/ReportComposer.test.jsx
git commit -m "feat(reports): redesign composer — selectable section cards + reorder + chips + live draft"
```

---

## Task 4: `ReportPreview` (live, data-backed)

**Files:**
- Create: `src/components/analytics/ReportPreview.jsx`
- Test: `src/components/analytics/__tests__/ReportPreview.test.jsx`

**Interface:** `<ReportPreview draft={{ classId, period, sections }} className />`
(`className` = the display name of the class, for the header; optional.)

- [ ] **Step 1: Write the failing test (mock `useClassAnalytics`)**

```jsx
// src/components/analytics/__tests__/ReportPreview.test.jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "../../../i18n/LanguageContext";

const { mockUse } = vi.hoisted(() => ({ mockUse: vi.fn() }));
vi.mock("../../../hooks/useClassAnalytics", () => ({
  useClassAnalytics: (...a) => mockUse(...a),
}));

import ReportPreview from "../ReportPreview";

function renderPreview(draft) {
  return render(
    <LanguageProvider value="en">
      <ReportPreview draft={draft} className="Spanish 1" />
    </LanguageProvider>,
  );
}

beforeEach(() => mockUse.mockReset());

describe("ReportPreview", () => {
  it("prompts to pick a class when none selected", () => {
    mockUse.mockReturnValue({ data: null, isPending: false });
    renderPreview({ classId: "", period: "d30", sections: ["kpis"] });
    expect(screen.getByText("Pick a class to preview its report.")).toBeInTheDocument();
  });

  it("shows the empty state when the class has no data", () => {
    mockUse.mockReturnValue({ data: { kpis: {}, topic_mastery: [], most_missed: [] }, isPending: false });
    renderPreview({ classId: "c1", period: "d30", sections: ["kpis", "topics", "most_missed"] });
    expect(screen.getByText("No data for this class in the selected period.")).toBeInTheDocument();
  });

  it("renders included sections in order; KPI section shows the % correct label", () => {
    mockUse.mockReturnValue({
      data: {
        kpis: { pct_correct: 80, unique_participants: 10, responses_total: 100, avg_time_ms: 9000 },
        topic_mastery: [{ topic: "Saludos", retention_score: 76 }],
        most_missed: [{ question_index: 2, topic: "Saludos", error_rate: 70 }],
      },
      isPending: false,
    });
    renderPreview({ classId: "c1", period: "d30", sections: ["topics", "kpis"] });
    // both sections render
    expect(screen.getByText("% correct")).toBeInTheDocument();
    expect(screen.getByText("Saludos")).toBeInTheDocument();
    // order: the "topics" section heading appears before the KPI section heading
    const topicsH = screen.getByText("Mastery by topic");
    const kpisH = screen.getByText("Key indicators");
    expect(topicsH.compareDocumentPosition(kpisH) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run (own message): `npx vitest run src/components/analytics/__tests__/ReportPreview.test.jsx`
Expected: FAIL — cannot resolve `../ReportPreview`.

- [ ] **Step 3: Implement**

```jsx
// src/components/analytics/ReportPreview.jsx
//
// Ola B: live, data-backed preview of the report being composed. Fetches real
// class_analytics for the draft's class+period and renders the selected sections
// IN ORDER, reusing the existing charts. States: no-class / loading / empty.
// i18n: useT("reports"). Memoize from/to by period (render-loop lesson — never
// derive new Date() into a queryKey in the render body).

import { useMemo } from "react";
import { C } from "../tokens";
import { RetentionBars } from "../charts";
import { useClassAnalytics } from "../../hooks/useClassAnalytics";
import { formatPercent, formatNumber, formatDurationShort } from "../../lib/analytics/formatters";
import { REPORT_SECTIONS } from "../../lib/analytics/report-sections";
import { useLang } from "../../i18n/LanguageContext";
import { useT } from "../../i18n";

function periodToRange(period) {
  const now = new Date();
  const ms = (d) => d * 24 * 60 * 60 * 1000;
  const days = period === "d7" ? 7 : period === "d90" ? 90 : 30;
  return { from: new Date(now.getTime() - ms(days)).toISOString(), to: now.toISOString() };
}

const card = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14, marginBottom: 12 };
const sectionTitle = { fontSize: 13, fontWeight: 700, marginBottom: 10, color: C.text };

export default function ReportPreview({ draft, className }) {
  const t = useT("reports", useLang());
  const { classId, period, sections } = draft || {};
  const { from, to } = useMemo(() => periodToRange(period || "d30"), [period]);
  const q = useClassAnalytics(classId || null, { from, to });

  if (!classId) {
    return <div style={{ ...card, color: C.textMuted, fontSize: 13 }}>{t.previewNoClass}</div>;
  }
  if (q.isPending) {
    return <div style={{ ...card, color: C.textMuted, fontSize: 13 }}>{t.previewLoading}</div>;
  }

  const a = q.data || {};
  const kpis = a.kpis || {};
  const topics = a.topic_mastery || [];
  const missed = a.most_missed || [];
  const empty = !kpis.responses_total && topics.length === 0 && missed.length === 0;
  if (empty) {
    return <div style={{ ...card, color: C.textMuted, fontSize: 13 }}>{t.previewEmpty}</div>;
  }

  const renderSection = (id) => {
    if (id === "kpis") {
      const items = [
        [t.kpiPctCorrect, formatPercent(kpis.pct_correct)],
        [t.kpiParticipants, formatNumber(kpis.unique_participants)],
        [t.kpiResponses, formatNumber(kpis.responses_total)],
        [t.kpiAvgTime, formatDurationShort(kpis.avg_time_ms)],
      ];
      return (
        <div key={id} style={card}>
          <div style={sectionTitle}>{t.secKpis}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8 }}>
            {items.map(([label, val]) => (
              <div key={label} style={{ background: C.bgSoft, borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{val}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (id === "topics") {
      const data = topics
        .filter((tp) => tp.retention_score != null)
        .map((tp) => ({ label: tp.topic, value: Math.round(Number(tp.retention_score)) }));
      return (
        <div key={id} style={card}>
          <div style={sectionTitle}>{t.secTopics}</div>
          {data.length === 0 ? <div style={{ fontSize: 13, color: C.textMuted }}>—</div> : <RetentionBars data={data} />}
        </div>
      );
    }
    if (id === "most_missed") {
      return (
        <div key={id} style={card}>
          <div style={sectionTitle}>{t.secMostMissed}</div>
          {missed.length === 0 ? (
            <div style={{ fontSize: 13, color: C.textMuted }}>—</div>
          ) : (
            <div style={{ fontSize: 13, lineHeight: 1.7 }}>
              {missed.slice(0, 5).map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.mostMissedQ(Number(m.question_index) + 1)}{m.topic ? ` · ${m.topic}` : ""}
                  </span>
                  <b style={{ color: m.error_rate >= 60 ? C.red : m.error_rate >= 40 ? C.orange : C.green }}>
                    {t.errSuffix(Math.round(Number(m.error_rate)))}
                  </b>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: C.textSecondary }}>
        {t.previewTitle}{className ? ` — ${className}` : ""}
      </div>
      {(sections || []).filter((id) => REPORT_SECTIONS.some((s) => s.id === id)).map(renderSection)}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (own message): `npx vitest run src/components/analytics/__tests__/ReportPreview.test.jsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Baseline verify (own message)**

```bash
npx tsc --noEmit
npx eslint src/components/analytics/ReportPreview.jsx
```
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/analytics/ReportPreview.jsx src/components/analytics/__tests__/ReportPreview.test.jsx
git commit -m "feat(reports): live data-backed ReportPreview (reuses RetentionBars + KPIs)"
```

---

## Task 5: Reweave `Reports.jsx` (lifted draft + layout + enriched list)

**Files:**
- Modify: `src/pages/analytics/Reports.jsx`

- [ ] **Step 1: Lift the draft + render composer + preview + list**

Replace the body of `Reports()` so it owns a `draft` state, passes
`onDraftChange={setDraft}` to the composer, renders `<ReportPreview>` beside it,
and keeps the saved list below. Full file:

```jsx
// src/pages/analytics/Reports.jsx
//
// Ola B: /school/reports. Composer (left) + live preview (right) sharing a
// lifted draft; saved-reports list full-width below. The saved `model` is the
// recipe (incl. ordered sections); export re-fetches fresh data and builds the
// model — buildClassReportModel renders sections in array order.

import { useState } from "react";
import { StudioShell } from "../../components/analytics";
import Skeleton from "../../components/ui/Skeleton";
import ReportComposer from "../../components/analytics/ReportComposer";
import ReportPreview from "../../components/analytics/ReportPreview";
import ReportList from "../../components/analytics/ReportList";
import { useAnalyticsOverview } from "../../hooks/useAnalyticsOverview";
import { useReports, useCreateReport, useDeleteReport } from "../../hooks/useReports";
import { buildClassReportModel } from "../../lib/analytics/report-model";
import { supabase } from "../../lib/supabase";
import { C } from "../../components/tokens";
import { useLang } from "../../i18n/LanguageContext";
import { useT } from "../../i18n";

function periodToRange(period) {
  const now = new Date();
  const ms = (d) => d * 24 * 60 * 60 * 1000;
  const days = period === "d7" ? 7 : period === "d90" ? 90 : 30;
  return { from: new Date(now.getTime() - ms(days)).toISOString(), to: now.toISOString() };
}

export default function Reports() {
  const lang = useLang();
  const t = useT("reports", lang);
  const PERIOD_LABEL = { d7: t.periodD7, d30: t.periodD30, d90: t.periodD90 };
  const overviewQ = useAnalyticsOverview();
  const classes = overviewQ.data ?? [];
  const reportsQ = useReports();
  const createM = useCreateReport();
  const deleteM = useDeleteReport();
  const [deletingId, setDeletingId] = useState(null);
  const [draft, setDraft] = useState(null);

  const draftClassName =
    classes.find((c) => c.class_id === draft?.classId)?.class_name || "";

  function handleSave({ name, classId, period, sections }) {
    const cls = classes.find((c) => c.class_id === classId);
    createM.mutate({
      name,
      scope: "class",
      class_id: classId,
      period: PERIOD_LABEL[period] || period,
      model: {
        scope: "class",
        period: PERIOD_LABEL[period] || period,
        periodId: period,
        className: cls?.class_name || "",
        sections,
      },
    });
  }

  async function buildModelForReport(report) {
    const m = report.model || {};
    const { from, to } = periodToRange(m.periodId || "d30");
    const { data } = await supabase.rpc("class_analytics", {
      p_class_id: report.class_id,
      p_from: from,
      p_to: to,
    });
    return buildClassReportModel({
      className: m.className || "",
      period: m.period || report.period || "",
      lang,
      classAnalytics: data || {},
      sections: m.sections || ["kpis", "topics", "most_missed"],
    });
  }

  async function handleDelete(id) {
    setDeletingId(id);
    try {
      await deleteM.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <StudioShell view="reports" title={t.title}>
      <div style={{ padding: 18, background: C.bgSoft, minHeight: "100%" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
            gap: 16,
            alignItems: "start",
            marginBottom: 16,
          }}
        >
          <ReportComposer
            classes={classes}
            onSave={handleSave}
            saving={createM.isPending}
            onDraftChange={setDraft}
          />
          <ReportPreview draft={draft} className={draftClassName} />
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{t.saved}</div>
        {reportsQ.isPending ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton height={56} radius={8} />
            <Skeleton height={56} radius={8} />
          </div>
        ) : (
          <ReportList
            reports={reportsQ.data ?? []}
            onExportModel={buildModelForReport}
            onDelete={handleDelete}
            deletingId={deletingId}
          />
        )}
      </div>
    </StudioShell>
  );
}
```

- [ ] **Step 2: Enrich the saved-list row in `ReportList.jsx`**

Open `src/components/analytics/ReportList.jsx`. It already shows
`{t.sectionsCount(n)} · {period}`. Change the sub-line to include class + date,
using the report fields already fetched (`r.model?.className`, `r.created_at`).
Add `const lang = useLang();` if not present and a localized date. Replace the
sub-line `<div>` with:

```jsx
<div style={{ fontSize: 12, color: C.textSecondary }}>
  {[r.model?.className, r.period, fmtDate(r.created_at, lang)].filter(Boolean).join(" · ")}
  {" · "}{t.sectionsCount(r.model?.sections?.length ?? 0)}
</div>
```

and add near the top of the file:

```jsx
function fmtDate(iso, lang) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString(lang === "en" ? "en-US" : lang, { month: "short", day: "numeric" }); }
  catch { return ""; }
}
```

(Confirm `ReportList` imports `useLang`/`useT`; it already uses `t.sectionsCount`
and `studioCommon.delete` from Ola A — keep those.)

- [ ] **Step 3: Baseline verify (own message)**

```bash
npx tsc --noEmit
npx eslint src/pages/analytics/Reports.jsx src/components/analytics/ReportList.jsx
```
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/pages/analytics/Reports.jsx src/components/analytics/ReportList.jsx
git commit -m "feat(reports): composer+preview layout with lifted draft; enriched saved list"
```

---

## Task 6: Render-smoke + full gate

**Files:**
- Modify: `src/components/analytics/__tests__/studio-i18n-smoke.test.jsx`

- [ ] **Step 1: Add an EN render-smoke for composer + preview**

Append two cases to the existing `describe("Studio i18n render smoke (en)")`.
Mock `useClassAnalytics` at the top of the file (the composer needs no mock; the
preview does):

```jsx
// at top, with the other imports:
import ReportComposer from "../ReportComposer";
import ReportPreview from "../ReportPreview";
import { vi } from "vitest";

vi.mock("../../../hooks/useClassAnalytics", () => ({
  useClassAnalytics: () => ({
    data: { kpis: { pct_correct: 80, responses_total: 50 }, topic_mastery: [], most_missed: [] },
    isPending: false,
  }),
}));
```

```jsx
  it("ReportComposer renders English section cards, not Spanish checkboxes", () => {
    en(<ReportComposer classes={[{ class_id: "c1", class_name: "S1" }]} onSave={() => {}} onDraftChange={() => {}} />);
    expect(screen.getByText("Key indicators")).toBeInTheDocument();
    expect(screen.getByLabelText("Move down")).toBeInTheDocument();
    expect(screen.queryByText("Indicadores clave")).not.toBeInTheDocument();
  });

  it("ReportPreview renders English no-class prompt", () => {
    en(<ReportPreview draft={{ classId: "", period: "d30", sections: ["kpis"] }} />);
    expect(screen.getByText("Pick a class to preview its report.")).toBeInTheDocument();
  });
```

> If `vi` is already imported in that file, don't import it twice. If a top-level
> `vi.mock` for `useClassAnalytics` conflicts with another test file's mock,
> that's fine — mocks are per-file in vitest.

- [ ] **Step 2: Run the smoke file (own message)**

Run: `npx vitest run src/components/analytics/__tests__/studio-i18n-smoke.test.jsx`
Expected: PASS (14 tests).

- [ ] **Step 3: Full gate (own message, capture to files)**

```bash
npx tsc --noEmit; echo "tsc=$?"
npm run lint > /tmp/l.txt 2>&1; grep -oE "[0-9]+ errors" /tmp/l.txt | head -1
npx vitest run > /tmp/v.txt 2>&1; grep -E "Test Files|Tests " /tmp/v.txt | tail -2
npm run build > /tmp/b.txt 2>&1; echo "build=$?"
```
Expected: tsc=0, lint "0 errors", vitest 0 failed, build=0. (Run the full vitest
only with `.env` present in the worktree; otherwise the unrelated Supabase tests
fail to import — see env note.)

- [ ] **Step 4: Spanish-leak sweep (own message)**

```bash
grep -rnE '"[^"]*[áéíóúñ¿¡][^"]*"' src/components/analytics/ReportComposer.jsx src/components/analytics/ReportPreview.jsx src/components/analytics/ReportList.jsx src/pages/analytics/Reports.jsx src/lib/analytics/report-sections.js 2>/dev/null | grep -vE ':[0-9]+:\s*//'
```
Expected: no output (no Spanish string literals; middots `·` are fine and won't match this).

- [ ] **Step 5: Commit**

```bash
git add src/components/analytics/__tests__/studio-i18n-smoke.test.jsx
git commit -m "test(reports): EN render-smoke for composer cards + preview"
```

- [ ] **Step 6: Update memory**

Append to `project_studio_i18n.md` (or a new `project_studio_reports.md`): Ola B
shipped on the branch — composer cotejos → selectable cards + ↑/↓ reorder, live
ReportPreview, enriched saved list; export order honored; gate green. Note live
logged-in smoke still pending (creds).

---

## Self-review notes (coverage vs spec)

- §Solución unit 1 (report-sections) → Task 1.
- §Solución unit 2 (ReportComposer rewrite: cards + desc + reorder + chips + draft) → Task 3.
- §Solución unit 3 (ReportPreview live, states, charts, order) → Task 4.
- §Solución unit 4 (Reports reweave: layout + enriched list) → Task 5.
- §i18n (new reports keys, 3 locales) → Task 2.
- §Verificación (pure, component, parity, render-smoke, gate, sweep) → Tasks 1/3/4 tests + Task 6.
- §Reorder = ↑/↓ not drag-drop → Task 1 (`moveSection`) + Task 3 (buttons). No dnd-kit imported.
- §Export order honored → unchanged `report-model.ts`; saved `model.sections` is the ordered array (Task 5 handleSave).
- §Out of scope (no new sections / no drag-drop / no PDF charts / class scope only) → respected; no exporter or DB edits in any task.
