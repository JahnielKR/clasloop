# Analytics Studio i18n (Ola A) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every user-facing string in the Analytics Studio (`/school`) render in the active UI language (en/es/ko), and make AI outputs + report exports respect that language.

**Architecture:** Add a `LanguageProvider` + `useLang()` hook fed by the existing `App.jsx` `lang` state, and make `useT(namespace, lang?)` fall back to that context when `lang` is omitted — so the 33 Studio components read the language without prop-drilling. Then migrate the shell, 8 pages and their components from hardcoded Spanish to `t.*`, add the trilingual namespaces (gated by `Locale` typing + `locale-parity.test`), fix the 6 hardcoded `lang:"es"` AI spots, and localize `report-model.ts` exports.

**Tech Stack:** React 18 (automatic JSX runtime), Vite, Vitest + Testing Library, TypeScript for the i18n locale files, ESLint (rules-of-hooks enforced).

**Spec:** `docs/superpowers/specs/2026-05-30-analytics-studio-i18n-design.md`

---

## Conventions used by every migration task

**Standard wiring snippet** (the exact lines to add when migrating a component/page):

```jsx
import { useLang } from "../../i18n/LanguageContext"; // adjust depth: pages/analytics → "../../i18n", components/analytics → "../../i18n"
import { useT } from "../../i18n";
// ...inside the component, before any early return:
const lang = useLang();
const t = useT("<namespace>", lang);
// then replace each hardcoded literal "Foo" with {t.foo}
```

> Import-depth note: files in `src/pages/analytics/` and `src/components/analytics/` are both 2 levels under `src/`, so both use `"../../i18n"` and `"../../i18n/LanguageContext"`. `src/pages/Director.jsx` is 1 level under `src/pages`, so it uses `"../i18n"` (it already imports `useT` from `"../i18n"`).

**Korean (`ko`) policy:** Tasks below give complete **en** + **es** dictionaries (es = the current text rewritten to neutral "tú", no voseo). For each task, also add the **same keys to `ko.ts`** translated to Korean; the `locale-parity` test FAILS until all three locales match, so completeness is enforced mechanically. Korean is flagged in the spec for later native review — translate as best as possible, do not block.

**Per-task verification baseline** (run at the end of every migration task, before commit):

```bash
npx tsc --noEmit                                   # Locale typing: es/ko must match en
npx vitest run src/i18n/__tests__/locale-parity.test.ts
npm run lint
```

Expected: tsc clean, parity green, lint clean.

---

## Task 1: `LanguageContext` + `useLang()`

**Files:**
- Create: `src/i18n/LanguageContext.js`
- Test: `src/i18n/__tests__/language-context.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/i18n/__tests__/language-context.test.jsx
import { render, screen } from "@testing-library/react";
import { LanguageProvider, useLang } from "../LanguageContext";

function Probe() {
  return <span>lang={useLang()}</span>;
}

describe("LanguageContext", () => {
  it("useLang returns the provider value", () => {
    render(
      <LanguageProvider value="ko">
        <Probe />
      </LanguageProvider>,
    );
    expect(screen.getByText("lang=ko")).toBeInTheDocument();
  });

  it("useLang defaults to 'en' with no provider", () => {
    render(<Probe />);
    expect(screen.getByText("lang=en")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/i18n/__tests__/language-context.test.jsx`
Expected: FAIL — cannot resolve `../LanguageContext`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/i18n/LanguageContext.js
//
// Provides the active UI language to the whole tree so components (esp. the
// 33 Analytics Studio components) can read it without prop-drilling. Fed by
// App.jsx's existing `lang` state. Anticipated by i18n/index.js's note about
// a future LanguageContext.
import { createContext, useContext } from "react";

const LanguageContext = createContext("en");

export function LanguageProvider({ value, children }) {
  return (
    <LanguageContext.Provider value={value || "en"}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}

export default LanguageContext;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/i18n/__tests__/language-context.test.jsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/i18n/LanguageContext.js src/i18n/__tests__/language-context.test.jsx
git commit -m "feat(i18n): LanguageContext + useLang hook"
```

---

## Task 2: Make `useT` read the context when `lang` is omitted

**Files:**
- Modify: `src/i18n/index.js` (the `useT` function)
- Test: `src/i18n/__tests__/useT-context.test.jsx`

- [ ] **Step 1: Write the failing test**

Uses the existing `community` namespace (`back` = "Back" in en, "Volver" in es).

```jsx
// src/i18n/__tests__/useT-context.test.jsx
import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "../LanguageContext";
import { useT } from "../index";

function Probe({ explicit }) {
  const t = useT("community", explicit); // explicit may be undefined
  return <span>{t.back}</span>;
}

describe("useT context fallback", () => {
  it("uses the context language when no explicit lang is passed", () => {
    render(
      <LanguageProvider value="es">
        <Probe />
      </LanguageProvider>,
    );
    expect(screen.getByText("Volver")).toBeInTheDocument();
  });

  it("explicit lang argument wins over context", () => {
    render(
      <LanguageProvider value="es">
        <Probe explicit="en" />
      </LanguageProvider>,
    );
    expect(screen.getByText("Back")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/i18n/__tests__/useT-context.test.jsx`
Expected: FAIL — first test renders "Back" (current `useT` ignores context, defaults to "en").

- [ ] **Step 3: Implement — make `useT` context-aware**

In `src/i18n/index.js`, add the import at the top:

```js
import { useContext } from "react";
import LanguageContext from "./LanguageContext";
```

Replace the existing `useT` function with:

```js
export function useT(namespace, lang) {
  // Hooks must run unconditionally; read the context every render. An explicit
  // `lang` arg still wins (back-compat for callers that pass lang as a prop:
  // Settings, PublicHome, ClassReport, Director). Falls back to FALLBACK_LANG
  // when neither is set (e.g. rendered outside a provider).
  const ctxLang = useContext(LanguageContext);
  return getStrings(namespace, lang || ctxLang || FALLBACK_LANG);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/i18n/__tests__/useT-context.test.jsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Guard against regressions in existing i18n callers**

Run: `npx vitest run src/i18n src/components/__tests__ src/onboarding/__tests__`
Expected: PASS (existing locale/onboarding tests unaffected — explicit-lang callers still work).

- [ ] **Step 6: Commit**

```bash
git add src/i18n/index.js src/i18n/__tests__/useT-context.test.jsx
git commit -m "feat(i18n): useT falls back to LanguageContext when lang omitted"
```

---

## Task 3: Mount `LanguageProvider` in `App.jsx`

**Files:**
- Modify: `src/App.jsx` (wrap the authed content wrapper, ~line 1027)

- [ ] **Step 1: Add the import**

Near the other i18n imports in `src/App.jsx`:

```js
import { LanguageProvider } from "./i18n/LanguageContext";
```

- [ ] **Step 2: Wrap the content wrapper**

The page tree renders inside `<div style={{ marginLeft: ... flex:1, minWidth:0 ... }}>` containing `<Suspense>` (around line 1027). Wrap that `<div>`'s children (or the `<div>` itself) with the provider so every page + the chrome reads the language:

```jsx
<div style={{ marginLeft: isMobile ? 0 : (open ? 210 : 56), flex: 1, minWidth: 0, transition: "margin-left .2s", minHeight: "100vh", background: C.bgSoft, paddingBottom: showBottomNav ? 64 : undefined }}>
  <LanguageProvider value={lang}>
    <Suspense fallback={<PageSuspenseFallback />}>
      {/* ...existing content... */}
    </Suspense>
  </LanguageProvider>
</div>
```

- [ ] **Step 3: Verify the app still builds & existing tests pass**

Run: `npx tsc --noEmit && npm run lint && npx vitest run src/components/__tests__`
Expected: clean / PASS.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat(i18n): mount LanguageProvider around the authed page tree"
```

---

## Task 4: `studioShell` + `studioCommon` namespaces + migrate `StudioShell` (reference pattern)

This task establishes the EXACT pattern, register, and Korean-quality bar that every later migration task mirrors.

**Files:**
- Modify: `src/i18n/en.ts`, `src/i18n/es.ts`, `src/i18n/ko.ts` (add 2 namespaces)
- Modify: `src/components/analytics/StudioShell.jsx`, `src/components/analytics/PeriodChips.jsx`
- Test: `src/components/analytics/__tests__/StudioShell.i18n.test.jsx`

- [ ] **Step 1: Add the `studioShell` + `studioCommon` namespaces to `en.ts`**

Insert after the existing `director` namespace:

```ts
studioShell: {
  eyebrow: "Analytics",
  navOverview: "Overview",
  navClass: "Class",
  navStudent: "Student",
  navTopics: "Topics",
  navLive: "Live",
  navReports: "Reports",
  navAsk: "Ask Cleo",
  navCleo: "Your Cleo usage",
  hintClass: "Opens from a class in Overview",
  hintStudent: "Opens from a student in the roster",
  hintTopics: "Opens from a topic in the class detail",
},
studioCommon: {
  // KPI labels
  pctCorrect: "% correct",
  participants: "Participants",
  responses: "Responses",
  avgTime: "Avg. time",
  classes: "Classes",
  students: "Students",
  sessions: "Sessions",
  retention: "Retention",
  // table / roster
  roster: "Roster",
  colStudent: "Student",
  colRetention: "Retention",
  colRisk: "Risk",
  colLastActivity: "Last activity",
  colStatus: "Status",
  filterByName: "Filter by name…",
  noStudents: "No students registered.",
  noMatch: (q: string) => `No students match "${q}".`,
  // statuses / tiers
  statusRisk: "At risk",
  statusRising: "Rising",
  statusStable: "Stable",
  tierStrong: "Strong",
  tierMedium: "Medium",
  tierWeak: "Weak",
  // actions / generic
  export: "Export",
  generateReview: "Generate review",
  generatingReview: "Generating review…",
  delete: "Delete",
  loading: "Loading…",
  periodCustom: "Custom",
},
```

- [ ] **Step 2: Add the identical keys to `es.ts` (neutral "tú", no voseo)**

```ts
studioShell: {
  eyebrow: "Analytics",
  navOverview: "Resumen",
  navClass: "Clase",
  navStudent: "Estudiante",
  navTopics: "Temas",
  navLive: "En vivo",
  navReports: "Reportes",
  navAsk: "Analista Cleo",
  navCleo: "Tu uso de Cleo",
  hintClass: "Se abre desde una clase en el Resumen",
  hintStudent: "Se abre desde un alumno del roster",
  hintTopics: "Se abre desde un tema del detalle de clase",
},
studioCommon: {
  pctCorrect: "% correcto",
  participants: "Participantes",
  responses: "Respuestas",
  avgTime: "Tiempo medio",
  classes: "Clases",
  students: "Alumnos",
  sessions: "Sesiones",
  retention: "Retención",
  roster: "Roster",
  colStudent: "Alumno",
  colRetention: "Retención",
  colRisk: "Riesgo",
  colLastActivity: "Última actividad",
  colStatus: "Estado",
  filterByName: "Filtrar por nombre…",
  noStudents: "Sin alumnos registrados.",
  noMatch: (q) => `Sin alumnos que coincidan con "${q}".`,
  statusRisk: "En riesgo",
  statusRising: "Subiendo",
  statusStable: "Estable",
  tierStrong: "Fuerte",
  tierMedium: "Medio",
  tierWeak: "Débil",
  export: "Exportar",
  generateReview: "Generar repaso",
  generatingReview: "Generando repaso…",
  delete: "Eliminar",
  loading: "Cargando…",
  periodCustom: "Personalizado",
},
```

- [ ] **Step 3: Add the identical keys to `ko.ts`** (Korean; mirror every key — the parity test enforces presence). Suggested:

```ts
studioShell: {
  eyebrow: "Analytics",
  navOverview: "개요",
  navClass: "학급",
  navStudent: "학생",
  navTopics: "주제",
  navLive: "실시간",
  navReports: "리포트",
  navAsk: "Cleo 분석",
  navCleo: "내 Cleo 사용",
  hintClass: "개요의 학급에서 열립니다",
  hintStudent: "명단의 학생에서 열립니다",
  hintTopics: "학급 상세의 주제에서 열립니다",
},
studioCommon: {
  pctCorrect: "정답률",
  participants: "참여자",
  responses: "응답",
  avgTime: "평균 시간",
  classes: "학급",
  students: "학생",
  sessions: "세션",
  retention: "정착도",
  roster: "명단",
  colStudent: "학생",
  colRetention: "정착도",
  colRisk: "위험",
  colLastActivity: "최근 활동",
  colStatus: "상태",
  filterByName: "이름으로 필터…",
  noStudents: "등록된 학생이 없습니다.",
  noMatch: (q) => `"${q}"와 일치하는 학생이 없습니다.`,
  statusRisk: "위험",
  statusRising: "상승",
  statusStable: "안정",
  tierStrong: "강함",
  tierMedium: "보통",
  tierWeak: "약함",
  export: "내보내기",
  generateReview: "복습 생성",
  generatingReview: "복습 생성 중…",
  delete: "삭제",
  loading: "불러오는 중…",
  periodCustom: "사용자 지정",
},
```

- [ ] **Step 4: Write the failing render test for the shell**

```jsx
// src/components/analytics/__tests__/StudioShell.i18n.test.jsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "../../../i18n/LanguageContext";
import StudioShell from "../StudioShell";

function renderAt(lang) {
  return render(
    <MemoryRouter>
      <LanguageProvider value={lang}>
        <StudioShell view="overview" title="X"><div /></StudioShell>
      </LanguageProvider>
    </MemoryRouter>,
  );
}

describe("StudioShell i18n", () => {
  it("renders English nav under en", () => {
    renderAt("en");
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Reports")).toBeInTheDocument();
  });
  it("renders Spanish nav under es", () => {
    renderAt("es");
    expect(screen.getByText("Resumen")).toBeInTheDocument();
    expect(screen.getByText("Reportes")).toBeInTheDocument();
  });
});
```

Run: `npx vitest run src/components/analytics/__tests__/StudioShell.i18n.test.jsx`
Expected: FAIL (shell currently renders hardcoded "Resumen" regardless of lang → the `en` case fails on "Overview").

- [ ] **Step 5: Migrate `StudioShell.jsx`**

- Add the standard wiring: `import { useLang } from "../../i18n/LanguageContext";` + `import { useT } from "../../i18n";` and inside the component `const lang = useLang(); const t = useT("studioShell", lang);`.
- Replace the `NAV_ITEMS` `label` values with `t.*`. Since `t` isn't available at module scope, move the labels into the component: build `NAV_ITEMS` with a `labelKey` and read `t[item.labelKey]`, OR map ids → `t`:

```jsx
const NAV_ITEMS = [
  { id: "overview", labelKey: "navOverview", route: ROUTES.SCHOOL },
  { id: "class", labelKey: "navClass" },
  { id: "student", labelKey: "navStudent" },
  { id: "topics", labelKey: "navTopics" },
  { id: "live", labelKey: "navLive", route: buildRoute.analyticsLive() },
  { id: "reports", labelKey: "navReports", route: buildRoute.analyticsReports() },
  { id: "ask", labelKey: "navAsk", route: buildRoute.analyticsAsk() },
  { id: "cleo", labelKey: "navCleo", route: buildRoute.analyticsCleo() },
];
```

- Replace `{item.label}` with `{t[item.labelKey]}`.
- Replace the two literal `"Analytics"` eyebrow strings with `{t.eyebrow}`.
- Replace `CONTEXTUAL_HINT` lookups with `t.hintClass/hintStudent/hintTopics` (map by id, e.g. `t[\`hint${id[0].toUpperCase()}${id.slice(1)}\`]` or an inline `{ class: t.hintClass, student: t.hintStudent, topics: t.hintTopics }`).

- [ ] **Step 6: Migrate `PeriodChips.jsx`** — localize only the "Custom" chip (7d/30d/90d are universal). Remove the duplicated module-level `CHIPS` (the component redefines it internally; keep one). Add wiring and set the custom label:

```jsx
import { useLang } from "../../i18n/LanguageContext";
import { useT } from "../../i18n";
// inside component:
const t = useT("studioCommon", useLang());
const CHIPS = [
  { id: "d7", label: "7d" },
  { id: "d30", label: "30d" },
  { id: "d90", label: "90d" },
  { id: "custom", label: t.periodCustom },
];
```

- [ ] **Step 7: Run the shell test + baseline verification**

Run: `npx vitest run src/components/analytics/__tests__/StudioShell.i18n.test.jsx`
Expected: PASS (2 tests).
Then run the baseline (tsc + parity + lint). Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add src/i18n/en.ts src/i18n/es.ts src/i18n/ko.ts src/components/analytics/StudioShell.jsx src/components/analytics/PeriodChips.jsx src/components/analytics/__tests__/StudioShell.i18n.test.jsx
git commit -m "feat(i18n): studioShell + studioCommon namespaces; migrate shell + period chips"
```

---

## Task 5: Migrate Overview (`Director`) + its components

**Files:**
- Modify: `src/i18n/{en,es,ko}.ts` (extend `director` namespace)
- Modify: `src/pages/Director.jsx`
- Modify: `src/components/analytics/{ClassTable,RiskOverviewList,CriticalTopicsList,PulseStrip,StatCardWithSparkline}.jsx`
- Test: `src/pages/__tests__/Director.i18n.test.jsx` (lightweight)

- [ ] **Step 1: Extend the `director` namespace** (keep existing keys `pageTitle/subtitle/noClasses/loading/error`). Add to en / es / ko:

| key | en | es |
|---|---|---|
| title | Analytics | Analytics |
| riskTitle | Students at risk | Alumnos en riesgo |
| riskEmpty | No at-risk students right now. | Ningún alumno en riesgo ahora mismo. |
| criticalTitle | Critical topics | Temas críticos |
| criticalEmpty | No critical topics. | Sin temas críticos. |
| classesTable | Classes | Clases |

(Add the same keys to `ko.ts`.) Component-shared labels ("% correct", "Classes", "Students", "Sessions", "Retention", "Generate review", "Export") come from `studioCommon`.

- [ ] **Step 2: Migrate `Director.jsx`**
- It already has `const t = useT("director", pageLang)`. Replace the hardcoded KPI labels with `studioCommon` — add `const c = useT("studioCommon", pageLang);` and use `c.pctCorrect / c.classes / c.students / c.sessions`.
- Replace `title="Analytics"` → `title={t.title}`; the `<StudioShell>` nav already localizes itself.
- Replace remaining literals with `t.*` / `c.*`.
- **AI lang fix:** line ~91 `generateClassReviewQuestions({ …, lang: "es" })` → `lang: pageLang`; and the `saveClassReviewDeck({ …, lang: gen.inferredLang || "es" })` → `|| pageLang`.

- [ ] **Step 3: Migrate the components** — `ClassTable` (header labels → `studioCommon` cols + its own title via `director.classesTable`), `RiskOverviewList` (title → `director.riskTitle`, empty → `director.riskEmpty`), `CriticalTopicsList` (`director.criticalTitle/criticalEmpty` + `studioCommon.generateReview/generatingReview`), `PulseStrip` (its labels — see Task 7 if shared; otherwise local), `StatCardWithSparkline` (no literal copy except what callers pass). Each gets the standard wiring `const t = useT("studioCommon", useLang())` (+ `director` where needed).

- [ ] **Step 4: Write a lightweight render test**

```jsx
// src/pages/__tests__/Director.i18n.test.jsx — assert the EN KPI label shows under en.
// (Mock the hooks to return [] so it renders the empty state quickly, OR assert the
// studioCommon label text appears. Keep it minimal — full data flow is covered by smoke.)
```
Assert: under `<LanguageProvider value="en">`, the Director empty-state text is `t.noClasses` in English ("No classes yet…").

Run the test; expect PASS after migration.

- [ ] **Step 5: Baseline verification + commit**

Run baseline (tsc + parity + lint) + the new test. Then:

```bash
git add src/i18n/en.ts src/i18n/es.ts src/i18n/ko.ts src/pages/Director.jsx src/components/analytics/ClassTable.jsx src/components/analytics/RiskOverviewList.jsx src/components/analytics/CriticalTopicsList.jsx src/components/analytics/PulseStrip.jsx src/components/analytics/StatCardWithSparkline.jsx src/pages/__tests__/Director.i18n.test.jsx
git commit -m "feat(i18n): migrate Overview (Director) + cards; AI uses UI lang"
```

---

## Task 6: Migrate Reports (`Reports` + `ReportComposer` + `ReportList`)

**Files:**
- Modify: `src/i18n/{en,es,ko}.ts` (add `reports` namespace)
- Modify: `src/pages/analytics/Reports.jsx`, `src/components/analytics/ReportComposer.jsx`, `src/components/analytics/ReportList.jsx`

- [ ] **Step 1: Add the `reports` namespace** (en / es; mirror to ko):

| key | en | es |
|---|---|---|
| title | Reports | Reportes |
| saved | Saved reports | Reportes guardados |
| empty | You haven't saved any reports yet. Create one with the form. | Aún no guardaste ningún reporte. Crea uno con el formulario. |
| newReport | New report | Nuevo reporte |
| name | Name | Nombre |
| namePlaceholder | E.g. Monthly report 5A | Ej: Reporte mensual 5A |
| classLabel | Class | Clase |
| period | Period | Período |
| sections | Sections | Secciones |
| save | Save report | Guardar reporte |
| saving | Saving… | Guardando… |
| sectionsCount | (n) => `${n} sections` | (n) => `${n} secciones` |
| secKpis | Key indicators | Indicadores clave |
| secTopics | Mastery by topic | Dominio por tema |
| secMostMissed | Most missed questions | Preguntas más falladas |
| periodD7 | 7 days | 7 días |
| periodD30 | 30 days | 30 días |
| periodD90 | 90 days | 90 días |

> Note: `SECTION_TYPES` in `report-model.ts` currently owns the section labels (`secKpis/secTopics/secMostMissed`). Keep `report-model.ts` as the export source of truth (Task 13 localizes it via the `reportModel` namespace) but in the **composer UI**, render section labels from `reports.secKpis/...` keyed by section id, so the on-screen checkboxes localize. Map: `{ kpis: t.secKpis, topics: t.secTopics, most_missed: t.secMostMissed }[s.id]`.

- [ ] **Step 2: Migrate `Reports.jsx`** — `title="Reportes"` → `t.title`; "Reportes guardados" → `t.saved`; the `PERIOD_LABEL` map values → `t.periodD7/D30/D90`.

- [ ] **Step 3: Migrate `ReportComposer.jsx`** — wiring + replace: "Nuevo reporte"→`t.newReport`, "Nombre"→`t.name`, placeholder→`t.namePlaceholder`, "Clase"→`t.classLabel`, "Período"→`t.period`, "Secciones"→`t.sections`, the period button labels→`t.periodD7/D30/D90` (replace the module-level `PERIODS` labels by reading them in-component), section checkbox labels→the id→label map above, "Guardar reporte"/"Guardando…"→`t.save`/`t.saving`.

- [ ] **Step 4: Migrate `ReportList.jsx`** — empty state→`t.empty`; "{n} secciones · {period}"→`` `${t.sectionsCount(n)} · ${period}` ``; "Eliminar"/title→`studioCommon.delete`.

- [ ] **Step 5: Baseline verification + commit**

```bash
git add src/i18n/en.ts src/i18n/es.ts src/i18n/ko.ts src/pages/analytics/Reports.jsx src/components/analytics/ReportComposer.jsx src/components/analytics/ReportList.jsx
git commit -m "feat(i18n): migrate Reports view (composer + list)"
```

---

## Task 7: Migrate Live Command Center (`LiveCommandCenter` + `LiveTile`)

**Files:**
- Modify: `src/i18n/{en,es,ko}.ts` (add `liveCenter` namespace)
- Modify: `src/pages/analytics/LiveCommandCenter.jsx`, `src/components/analytics/LiveTile.jsx`

- [ ] **Step 1: Add the `liveCenter` namespace** (en / es; mirror ko):

| key | en | es |
|---|---|---|
| title | Live | En vivo |
| activeSession | Active session | Sesión activa |
| receivingLive | receiving live updates | recibiendo actualizaciones en vivo |
| connecting | connecting… | conectando… |
| backToSession | Back to session | Volver a la sesión |
| connected | Connected | Conectados |
| responding | Responding | Respondiendo |
| finished | Finished | Terminaron |
| pctLive | Live % correct | % correcto en vivo |
| alertsTitle | Session alerts | Alertas de la sesión |
| alertLine | (n, p) => `Question ${n}: ${p}% errors.` | (n, p) => `Pregunta ${n}: ${p}% de error.` |
| launchReview | Launch review | Lanzar repaso |
| noActive | No active sessions right now. Launch one from | Sin sesiones activas ahora mismo. Inicia una desde |
| sessionsLink | Sessions | Sesiones |
| toSeeTiles | to see live tiles here. | para ver los tiles en vivo aquí. |
| todaySessions | Today's sessions | Sesiones de hoy |
| pctToday | % correct today | % correcto hoy |
| topClass | Top class | Top clase |
| topStudent | Top student | Top alumno |
| respShort | (n) => `${n} resp.` | (n) => `${n} resp.` |

- [ ] **Step 2: Migrate `LiveCommandCenter.jsx`** — standard wiring (`const lang = useLang(); const t = useT("liveCenter", lang);`); replace all literals with `t.*` (note `alertLine(a.question_index + 1, a.error_rate)`). **AI lang fix:** line ~88 `lang: "es"` → `lang`; save fallback `|| "es"` → `|| lang`.

- [ ] **Step 3: Migrate `LiveTile.jsx`** — it receives `label` as a prop (already localized by the parent); no literal copy expected. Verify and leave logic intact.

- [ ] **Step 4: Baseline verification + commit**

```bash
git add src/i18n/en.ts src/i18n/es.ts src/i18n/ko.ts src/pages/analytics/LiveCommandCenter.jsx src/components/analytics/LiveTile.jsx
git commit -m "feat(i18n): migrate Live Command Center; AI uses UI lang"
```

---

## Task 8: Migrate `CleoAnalyst`

**Files:**
- Modify: `src/i18n/{en,es,ko}.ts` (add `cleoAnalyst` namespace)
- Modify: `src/pages/analytics/CleoAnalyst.jsx`

- [ ] **Step 1: Add `cleoAnalyst` namespace** (en / es; mirror ko):

| key | en | es |
|---|---|---|
| title | Ask Cleo | Analista Cleo |
| greeting | Hi, I'm Cleo. Pick a class above and ask me anything about your data — who's falling behind, what to reteach, what deck to build. | Hola, soy Cleo. Elige una clase arriba y pregúntame lo que quieras de tus datos — quiénes vienen flojos, qué reenseñar, qué deck armar. |
| classLabel | Class: | Clase: |
| selectPlaceholder | — Select — | — Selecciona — |
| noClassHint | With no class selected Cleo answers generally; with a class it can read your real numbers. | Sin una clase seleccionada Cleo responde en general; con una clase puede leer tus números reales. |
| inputPlaceholder | What should I ask Cleo about this class? | ¿Qué le pregunto a Cleo sobre esta clase? |
| send | Send | Enviar |
| thinking | Cleo is thinking… | Cleo está pensando… |
| cleoPrefix | Cleo: | Cleo: |
| errReply | I couldn't answer right now — try again. | No pude responder ahora — intenta de nuevo. |
| errNetwork | Network error — try again. | Error de red — intenta de nuevo. |

- [ ] **Step 2: Migrate `CleoAnalyst.jsx`** — standard wiring; replace the initial greeting, header, select option, hint, message prefix, input placeholder, send button, "thinking", and the two error fallbacks with `t.*`. **AI lang fix:** the POST body `lang: "es"` → `lang` (line ~74).

- [ ] **Step 3: Baseline verification + commit**

```bash
git add src/i18n/en.ts src/i18n/es.ts src/i18n/ko.ts src/pages/analytics/CleoAnalyst.jsx
git commit -m "feat(i18n): migrate Cleo Analyst; chat uses UI lang"
```

---

## Task 9: Migrate `CleoUsage`

**Files:**
- Modify: `src/i18n/{en,es,ko}.ts` (add `cleoUsage` namespace)
- Modify: `src/pages/analytics/CleoUsage.jsx`
- Existing test: `src/pages/analytics/__tests__/CleoUsage.test.jsx` (update expectations if they assert Spanish literals)

- [ ] **Step 1: Add `cleoUsage` namespace** (en / es; mirror ko):

| key | en | es |
|---|---|---|
| title | Your Cleo usage | Tu uso de Cleo |
| generations | Generations | Generaciones |
| generationsHint | Times you generated questions with Cleo this period | Veces que generaste preguntas con Cleo en este período |
| acceptance | Acceptance rate | Tasa de aceptación |
| acceptanceHint | % of questions you published exactly as Cleo produced them | % de preguntas que publicaste tal cual salieron de Cleo |
| editedPct | % edited | % editado |
| editedHint | % of questions you rewrote before publishing | % de preguntas que reescribiste antes de publicar |
| ttp | Time-to-publish | Time-to-publish |
| ttpHint | Median time between generating and saving the deck | Mediana del tiempo entre generar y guardar el deck |
| goldNote | Acceptance rate, % edited and time-to-publish appear once you save Cleo-generated decks — capture started on 05/30, so older generations don't have them. The volume and distributions below count everything. | La tasa de aceptación, el % editado y el time-to-publish aparecen cuando guardes decks generados con Cleo — la captura empezó el 30/05, así que las generaciones anteriores no los tienen. El volumen y las distribuciones de abajo sí cuentan todo. |
| byType | By question type | Por tipo de pregunta |
| byModel | By model | Por modelo |
| byInput | By input type | Por tipo de entrada |
| emptyTitle | You haven't used Cleo this period yet | Aún no has usado Cleo en este período |
| emptyBody | Generate a warmup or exam with Cleo and come back: you'll see your acceptance rate, how much you edit its questions, and how long you take to publish. | Genera un warmup o examen con Cleo y vuelve aquí: verás tu tasa de aceptación, cuánto editas sus preguntas y cuánto tardas en publicar. |
| errBox | We couldn't load your usage data. | No se pudieron cargar tus datos de uso. |

Also localize the `TYPE_LABELS` / `INPUT_LABELS` maps (Mixto/Imagen/Opción múltiple/… and Texto/PDF/Imagen/…) — move them behind a small per-lang lookup or add `cleoUsage.typeMix`, etc. Minimal approach: add `typeLabels` / `inputLabels` sub-objects to the namespace and read by code.

- [ ] **Step 2: Migrate `CleoUsage.jsx`** — standard wiring; replace all `StatCardWithSparkline` labels/hints, the gold note, distribution titles, empty state, and error box with `t.*`; replace `TYPE_LABELS`/`INPUT_LABELS` with the localized lookups.

- [ ] **Step 3: Update the existing test** — open `src/pages/analytics/__tests__/CleoUsage.test.jsx`; if it asserts Spanish literals (e.g. "Generaciones"), wrap the render in `<LanguageProvider value="es">` so the assertions still hold, or switch assertions to `en`. Keep it green.

- [ ] **Step 4: Baseline verification + commit**

```bash
git add src/i18n/en.ts src/i18n/es.ts src/i18n/ko.ts src/pages/analytics/CleoUsage.jsx src/pages/analytics/__tests__/CleoUsage.test.jsx
git commit -m "feat(i18n): migrate Cleo Usage view"
```

---

## Task 10: Migrate `ClassDetail` (the star view) + its components

**Files:**
- Modify: `src/i18n/{en,es,ko}.ts` (add `classDetail` namespace)
- Modify: `src/pages/analytics/ClassDetail.jsx`
- Modify: `src/components/analytics/{KpiBand,CleoStrip,TrendPanel,ResponseCompositionPanel,TopicBarListPanel,MostMissedList,RosterTable,StudentDrawer,CompareToggle}.jsx`

- [ ] **Step 1: Add `classDetail` namespace** (en / es; mirror ko). Include the page title + each panel's title + the error banner. Concrete keys (extract every literal from the listed files; the ones found in audit):

| key | en | es |
|---|---|---|
| title | Class | Clase |
| errorLoading | (msg) => `Error loading the class: ${msg}` | (msg) => `Error cargando la clase: ${msg}` |
| trendTitle | Trend | Tendencia |
| compositionTitle | Response composition | Composición de respuestas |
| dominatedTitle | Strongest topics | Temas dominados |
| criticalTitle | Topics to reteach | Temas a reenseñar |
| mostMissedTitle | Most missed | Más falladas |
| compareOff | Compare: off | Comparar: no |
| comparePrev | vs previous period | vs período anterior |

> For `RosterTable` use `studioCommon` (`roster`, `colStudent`, `colRetention`, `colRisk`, `colLastActivity`, `colStatus`, `filterByName`, `noStudents`, `noMatch`, `statusRisk/Rising/Stable`). For `KpiBand` use `studioCommon` KPI labels. Extract any other literal you find in these files into `classDetail` with a descriptive key (e.g. `StudentDrawer` buttons, `CleoStrip` CTA copy). Do not leave any quoted Spanish.

- [ ] **Step 2: Migrate `ClassDetail.jsx`** — standard wiring (`const lang = useLang();`); `title="Clase"`→`t.title`; error banner→`t.errorLoading(String(error.message||error))`. **AI lang fix:** line ~132 `lang: "es"`→`lang`; save fallback→`|| lang`; line ~242 `<CleoStrip … lang="es">`→`lang={lang}`.

- [ ] **Step 3: Migrate each component** — apply the standard wiring; `RosterTable` → `studioCommon`; `KpiBand` → `studioCommon`; the panels → `classDetail.*`. `MostMissedList`, `TopicBarListPanel` are shared with Task 12 — give them their own keys in `studioCommon` if reused, else `classDetail`. Ensure `CompareToggle` labels come from `classDetail.compareOff/comparePrev`.

- [ ] **Step 4: Update `RosterTable` status labels** — `statusFor()` currently returns Spanish labels ("Riesgo"/"Subiendo"/"Estable"). Change it to return a tone + a key, and render `t[key]` (`statusRisk/statusRising/statusStable`) in the cell, so the status localizes.

- [ ] **Step 5: Baseline verification + commit**

```bash
git add src/i18n/en.ts src/i18n/es.ts src/i18n/ko.ts src/pages/analytics/ClassDetail.jsx src/components/analytics/KpiBand.jsx src/components/analytics/CleoStrip.jsx src/components/analytics/TrendPanel.jsx src/components/analytics/ResponseCompositionPanel.jsx src/components/analytics/TopicBarListPanel.jsx src/components/analytics/MostMissedList.jsx src/components/analytics/RosterTable.jsx src/components/analytics/StudentDrawer.jsx src/components/analytics/CompareToggle.jsx
git commit -m "feat(i18n): migrate Class Detail + panels; CleoStrip + AI use UI lang"
```

---

## Task 11: Migrate `StudentProfile` + its components

**Files:**
- Modify: `src/i18n/{en,es,ko}.ts` (add `studentProfile` namespace)
- Modify: `src/pages/analytics/StudentProfile.jsx`
- Modify: `src/components/analytics/{StudentKpiBand,CleoStudentStrip,TrajectoryPanel,StudentMostFailedList,TopicMatrix,RiskBadge,StudentRiskCard}.jsx`

- [ ] **Step 1: Add `studentProfile` namespace** — open `StudentProfile.jsx` and each listed component, extract every user-facing literal into descriptive keys (en / es; mirror ko). Reuse `studioCommon` for shared terms (retention, risk, statuses, tiers). Known anchors: page `title` ("Student"/"Estudiante"), panel titles (trajectory, most-failed, topic matrix), `RiskBadge` level labels, `StudentRiskCard` copy.

- [ ] **Step 2: Migrate `StudentProfile.jsx`** — standard wiring; replace literals. **AI lang fix:** line ~125 `lang: "es"`→`lang`; any save fallback→`|| lang`; pass `lang` to `CleoStudentStrip` if it takes a `lang` prop.

- [ ] **Step 3: Migrate each component** — standard wiring; `studentProfile.*` + `studioCommon.*`. `RiskBadge` level labels (e.g. high/medium/low → "Alto/Medio/Bajo") via `studioCommon` or `studentProfile`.

- [ ] **Step 4: Baseline verification + commit**

```bash
git add src/i18n/en.ts src/i18n/es.ts src/i18n/ko.ts src/pages/analytics/StudentProfile.jsx src/components/analytics/StudentKpiBand.jsx src/components/analytics/CleoStudentStrip.jsx src/components/analytics/TrajectoryPanel.jsx src/components/analytics/StudentMostFailedList.jsx src/components/analytics/TopicMatrix.jsx src/components/analytics/RiskBadge.jsx src/components/analytics/StudentRiskCard.jsx
git commit -m "feat(i18n): migrate Student Profile + cards; AI uses UI lang"
```

---

## Task 12: Migrate `TopicMastery` + its components

**Files:**
- Modify: `src/i18n/{en,es,ko}.ts` (add `topicMastery` namespace)
- Modify: `src/pages/analytics/TopicMastery.jsx`
- Modify: `src/components/analytics/{TopicTrendPanel,TopicQuestionsList,MisconceptionPanel}.jsx` (+ shared `MostMissedList`, `TopicBarListPanel` if not already done in Task 10)

- [ ] **Step 1: Add `topicMastery` namespace** — open `TopicMastery.jsx` + listed components; extract every literal (en / es; mirror ko). Anchors: page `title` ("Topics"/"Temas"), trend panel title, questions-list headers, `MisconceptionPanel` copy (e.g. "Most common wrong answer"). Reuse `studioCommon` for shared terms.

- [ ] **Step 2: Migrate the page + components** — standard wiring; replace literals with `topicMastery.*` / `studioCommon.*`. (No hardcoded `lang:"es"` here — TopicMastery has no AI generation.)

- [ ] **Step 3: Baseline verification + commit**

```bash
git add src/i18n/en.ts src/i18n/es.ts src/i18n/ko.ts src/pages/analytics/TopicMastery.jsx src/components/analytics/TopicTrendPanel.jsx src/components/analytics/TopicQuestionsList.jsx src/components/analytics/MisconceptionPanel.jsx
git commit -m "feat(i18n): migrate Topic Mastery + panels"
```

---

## Task 13: Localize report exports (`report-model.ts`)

**Files:**
- Modify: `src/i18n/{en,es,ko}.ts` (add `reportModel` namespace)
- Modify: `src/lib/analytics/report-model.ts`
- Modify callers: `src/pages/Director.jsx`, `src/pages/analytics/ClassDetail.jsx`, `src/pages/analytics/Reports.jsx`
- Test: `src/lib/analytics/__tests__/report-model.test.ts` (extend)

- [ ] **Step 1: Add `reportModel` namespace** (en / es; mirror ko):

| key | en | es |
|---|---|---|
| secKpis | Key indicators | Indicadores clave |
| secTopics | Mastery by topic | Dominio por tema |
| secMostMissed | Most missed questions | Preguntas más falladas |
| kpiPctCorrect | % correct | % correcto |
| kpiParticipants | Participants | Participantes |
| kpiResponses | Responses | Respuestas |
| kpiAvgTime | Avg. time (ms) | Tiempo medio (ms) |
| colTopic | Topic | Tema |
| colRetention | Retention | Retención |
| colQuestion | Question | Pregunta |
| colError | Error | Error |
| overviewTitle | General summary | Resumen general |
| avgRetention | Average retention | Retención promedio |
| activeClasses | Active classes | Clases activas |
| students | Students | Estudiantes |
| sessions | Sessions | Sesiones |
| colClass | Class | Clase |
| reportTitle | (name, period) => `Report — ${name} (${period})` | (name, period) => `Reporte — ${name} (${period})` |
| overviewReportTitle | (period) => `General report (${period})` | (period) => `Reporte general (${period})` |
| qPrefix | (n) => `Q. ${n}` | (n) => `P. ${n}` |

- [ ] **Step 2: Write the failing test**

```ts
// add to src/lib/analytics/__tests__/report-model.test.ts
import { buildClassReportModel } from "../report-model";

it("localizes section titles by lang", () => {
  const en = buildClassReportModel({ className: "5A", period: "30 days", lang: "en",
    classAnalytics: { kpis: { pct_correct: 80 } }, sections: ["kpis"] });
  expect(en.sections[0].title).toBe("Key indicators");
  const es = buildClassReportModel({ className: "5A", period: "30 días", lang: "es",
    classAnalytics: { kpis: { pct_correct: 80 } }, sections: ["kpis"] });
  expect(es.sections[0].title).toBe("Indicadores clave");
});
```

Run: `npx vitest run src/lib/analytics/__tests__/report-model.test.ts`
Expected: FAIL — `buildClassReportModel` doesn't accept `lang` yet (titles hardcoded Spanish).

- [ ] **Step 3: Implement** — `report-model.ts` imports `getStrings` from `"../../i18n"`; both builders accept `lang: string` (default `"en"`); resolve `const t = getStrings("reportModel", lang)` and replace every hardcoded title/column/label/`SECTION_TYPES` label and the title templates with `t.*`. Keep `SECTION_TYPES` ids stable (`kpis/topics/most_missed`); its `label` becomes a function of lang OR move composer labels to the `reports` namespace (Task 6 already did) and keep `SECTION_TYPES` as ids only.

- [ ] **Step 4: Run the test** — Expected: PASS.

- [ ] **Step 5: Update callers** — pass `lang`: `Director.jsx` `buildOverviewReportModel({ …, lang: pageLang })`; `ClassDetail.jsx` `buildClassReportModel({ …, lang })`; `Reports.jsx` `buildClassReportModel({ …, lang })` (add `const lang = useLang();` in Reports).

- [ ] **Step 6: Baseline verification + commit**

```bash
git add src/i18n/en.ts src/i18n/es.ts src/i18n/ko.ts src/lib/analytics/report-model.ts src/lib/analytics/__tests__/report-model.test.ts src/pages/Director.jsx src/pages/analytics/ClassDetail.jsx src/pages/analytics/Reports.jsx
git commit -m "feat(i18n): localize report exports (report-model)"
```

---

## Task 14: Final verification (full gate + leftover sweep + Playwright smoke)

**Files:** none (verification only)

- [ ] **Step 1: Full automated gate**

```bash
npx tsc --noEmit
npm run lint
npx vitest run
```
Expected: tsc clean, lint clean, all tests pass (parity green proves es/ko complete).

- [ ] **Step 2: Leftover hardcoded-language sweep**

```bash
# No hardcoded AI language left in the Studio:
grep -rn "lang: *\"es\"\|lang=\"es\"" src/pages/analytics src/pages/Director.jsx src/components/analytics
# Expected: no output.
```

Then scan for likely leftover Spanish UI literals (manual review of any hits — some may be comments, which are fine):

```bash
grep -rnE "\"(Resumen|Clase|Estudiante|Reportes|Alumno|Sesiones|Riesgo|Guardar|Eliminar|Cargando|Sin |Generar)" src/components/analytics src/pages/analytics src/pages/Director.jsx
# Expected: only matches inside code comments or the i18n call sites, not raw JSX text.
```

- [ ] **Step 3: Playwright smoke logged-in (English)**

Use the test teacher `pedro@hola.com` (see memory `reference_test_env`; copy `.env` into the worktree; dev server on :3000/:3001). With Playwright:
1. Log in, open **Settings**, switch UI language to **English**.
2. Visit each `/school` view and assert no Spanish remains:
   - `/school` (Overview), `/school/live`, `/school/reports`, `/school/ask`, `/school/cleo`
   - `/school/class/<id>` (Spanish 1 class id `0b7d3ec3-994a-41c1-a0af-a1427e8d3801`), then drill to a student and a topic.
3. Assert anchor strings render in English (e.g. nav "Overview"/"Reports", roster "Student", KPI "% correct").
4. On Class Detail, click **Generate review** and confirm the generated deck/questions come back in **English** (not Spanish).
5. Open the Reports composer, build a report, **Export → PDF/CSV**, and confirm section titles are English.

- [ ] **Step 4: Playwright spot-check (Korean)**

Switch Settings → 한국어; visit `/school` + one class detail; confirm nav + KPI labels render Korean (e.g. "개요", "정답률"). Flag any awkward Korean for later native review (per spec risk note) — do not block.

- [ ] **Step 5: Update the project memory**

Append to `project_analytics_studio.md`: Ola A (i18n) shipped — LanguageProvider + useLang + context-aware useT; Studio fully localized en/es/ko; AI respects UI lang; exports localized. Note Ola B (reports redesign) + Ola C (polish) still pending.

---

## Self-review notes (coverage vs spec)

- §Arquitectura → Tasks 1-3 (LanguageContext/useLang, context-aware useT, provider mount).
- §Namespaces + §Migración → Tasks 4-12 (shell + studioCommon + 8 pages + 33 components).
- §Fix de idioma de la IA → folded into Tasks 5,7,8,10,11 + swept in Task 14 Step 2.
- §Localización del export → Task 13.
- §Registro del español → enforced by writing es entries in neutral "tú" throughout (Tasks 4-13).
- §Verificación → per-task baseline + Task 14 (full gate + smoke EN/KO).
- Korean completeness → enforced by `Locale` typing + `locale-parity.test` every task.
