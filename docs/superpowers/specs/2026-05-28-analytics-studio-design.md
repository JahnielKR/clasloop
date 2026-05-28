# Analytics Studio — Diseño

**Fecha:** 2026-05-28
**Estado:** Brainstorming cerrado. Decisiones aprobadas por el usuario. Pendiente: implementación por fases, cada una con su propio spec → plan.
**Predecesor:** plan aceptado pero NO empezado "Director full analytics build-out" en `C:\Users\home\.claude\plans\analizame-todo-profundamente-y-floofy-bachman.md`. Este documento lo supera y amplía.

---

## 1. Resumen ejecutivo

Convertir la analítica del docente — hoy 3 niveles desconectados, read-only y descriptivos — en **Analytics Studio**: una sección de primer nivel, dedicada, tan profunda y pro que se sienta como una app completa por sí sola. Manteniendo el alcance al docente individual (sin entidad colegio, sin multi-profe), la profundidad se va al máximo: **7 vistas, drill-down consistente, 4 superpoderes transversales (Predictivo + Cleo / Comparar + Benchmarking / Reportes + Export + Email / En vivo), todo interactivo**.

La identidad visual se inspira en **Semrush** (grid de widgets, donut + barras + sparklines protagonistas, chips de período arriba) con la paleta y los tokens del proyecto. Cleo se vuelve parte de toda la app — no un bot aparte sino el cerebro analítico tejido en cada vista.

---

## 2. Decisiones del brainstorm (cerradas)

| Decisión | Valor elegido |
|----------|---------------|
| Alcance | **Docente a fondo.** Un docente sobre SUS clases. Sin entidad colegio, sin multi-profe, sin rol director. Auth/RLS actuales intactas. |
| Audiencias | **Solo el docente** por ahora. Estudiantes/familias quedan fuera de esta versión. |
| Superpoderes | Los **4** elegidos: Predictivo + Cleo · Comparar + Benchmarking · Reportes + Export + Email · En vivo + Command Center. |
| Identidad de marca IA | **Cleo** es el cerebro. La vista de chat con datos se llama **Analista Cleo**; el pilar es **Predictivo + Cleo**. Cleo aparece como franja viva en cada vista de detalle, no como bot aparte. |
| Arquitectura | **Approach A:** sección dedicada + capa de agregación en Postgres (RPCs `SECURITY DEFINER` + vistas materializadas donde el cálculo es pesado). |
| Identidad visual | **Rítmica Semrush:** grid de widgets con aire interno, donut + barras + sparklines protagonistas, chips de período, paleta del proyecto (azul + Cleo violeta — NO el naranja Semrush). |
| Interactividad | **"Vivo en todo":** hover en cada viz, click-drill en todo, crossfilter entre widgets, brush + zoom en tendencias, drawer lateral, count-up + transiciones, realtime en sesión activa, sort/filter en tablas, nav por teclado, `prefers-reduced-motion` respetado. |
| Anti-patrón | **Sin god-files.** Vistas son orquestadores delgados; bloques presentacionales con un solo trabajo; toda la matemática vive en `src/lib/analytics/*` como funciones puras unit-testeables. |
| Iconografía | Solo `CIcon` / `NavIcons` (sistema actual). **No** emojis en la UI real. |

---

## 3. Arquitectura de información (IA)

### 3.1 Ubicación y nombre

- **Ruta literal:** `/school` (se conserva para no romper enlaces ni el item del sidebar). En el sidebar, el label puede pasar de "School" a **"Analytics"** (decisión menor diferida; ver §10).
- **Hub:** Analytics Studio. Sub-navegación propia (sidebar interno o tabs) con 7 vistas.

### 3.2 Las 7 vistas

| # | Vista | Ruta | Resumen |
|---|-------|------|---------|
| 1 | Resumen | `/school` | Cross-clase. El cockpit del docente. KPIs globales, alertas, "pulso de hoy". |
| 2 | Clase | `/school/class/:classId` | El dashboard estrella. KPIs + tendencia + matriz de dominio + más falladas + roster + franja Cleo. Detalle abajo (§5). |
| 3 | Estudiante | `/school/student/:classId/:studentRef` | Perfil profundo por alumno. Hoy NO existe. |
| 4 | Temas / Currículo | `/school/topics/:classId?` | Matriz de dominio a escala + tendencia por tema + conceptos errados. |
| 5 | En vivo | `/school/live` | Command center realtime para sesiones activas + "pulso de hoy". |
| 6 | Reportes | `/school/reports` | Constructor de informes + export PDF/CSV/Excel + digest por email. |
| 7 | Analista Cleo | `/school/ask` | Chat con datos. Cleo recibe la salida de las RPCs como contexto. |

### 3.3 Hojas reusadas (drill-down más profundo)

| Página existente | Ruta | Reuso |
|------------------|------|-------|
| `src/pages/ClassInsights.jsx` | `/classes/:classId/insights` | Por-deck dentro de la clase. Linkeada desde Clase. |
| `src/pages/DeckResults.jsx` | `/decks/:deckId/results` | Por-pregunta dentro del deck. Linkeada desde Clase y Tema. |
| `src/pages/ClassReport.jsx` | `/classes/:classId/report` | El report imprimible "Cleo-opened". Puede absorberse en Reportes o quedar como atajo. |

### 3.4 El patrón de zoom (drill-down)

```
Resumen  →  Clase  →  ┬─ Estudiante  ┐
                      ├─ Tema        ├──→  Pregunta (reusa DeckResults)
                      └─ Deck        ┘
```

Una sola dirección de navegación, repetida en todas las vistas. Click en cualquier ítem profundiza siguiendo este árbol.

### 3.5 Los 4 superpoderes (transversales)

No son páginas aisladas; viven dentro de las vistas:

- **Predictivo + Cleo:** flags de riesgo en Resumen/Clase/roster · bandas de pronóstico en tendencias · detección de conceptos errados en Tema/Pregunta · vista Analista Cleo.
- **Comparar + Benchmarking:** toggle "Comparar" en Clase/Estudiante/Tema · período vs período · clase vs clase · alumno vs media · chips de percentil.
- **Reportes + Export + Email:** vista Reportes (constructor + digest configurable) · botón "Exportar / añadir a reporte" en cada vista.
- **En vivo + Command Center:** vista En vivo (realtime) · franja "pulso de hoy" en Resumen · alertas accionables.

---

## 4. Lectura del modelo de datos

Tablas relevantes (todas en `public`, ver `supabase/schema.sql`):

| Tabla | Columnas clave para analítica |
|-------|-------------------------------|
| `responses` | `session_id`, `participant_id`, `question_index`, `answer` (jsonb — base de conceptos errados), `is_correct`, `time_taken_ms`, `created_at`, `points`, `max_points`, `needs_review`, `teacher_grade` (correct/partial/incorrect), `teacher_feedback`, `graded_at` |
| `session_participants` | `session_id`, `student_name`, `student_id` (puede ser null), `joined_at`, `completed_at`, `is_guest`, `is_kicked` |
| `sessions` | `class_id`, `teacher_id`, `topic`, `session_type` (warmup/exitTicket), `activity_type`, `status`, `questions` (jsonb), `created_at`, `completed_at`, `deck_id`, `section` |
| `classes` | `teacher_id`, `name`, `grade`, `subject`, `class_code`, `created_at` |
| `class_members` | `class_id`, `student_name`, `student_id`, `joined_at` |
| `student_topic_progress` | `student_name`, `student_id`, `class_id`, `topic`, `retention_score`, `total_questions`, `correct_answers`, `last_reviewed_at` |
| `topic_retention` | `class_id`, `topic`, `subject`, `retention_score`, `session_count`, `last_reviewed_at`, `next_review_at`, `ease_factor`, `interval_days`, `deck_id`, `snoozed_until`, `dismissed` |
| `decks` | `author_id`, `class_id`, `unit_id`, `section`, `subject`, `grade`, `questions` (jsonb), `position` |
| `units` | `class_id`, `section`, `name`, `status` (planned/active/closed), `closed_at`, `closing_narrative` |
| `ai_generations` | `teacher_id`, `created_at`, `activity_type`, `num_questions`, `model_used`, `accepted_count`, `edited_count`, `regenerated_count`, `time_to_publish_ms` — **oro sin tocar para la analítica del propio uso del docente** |
| `scans` | `teacher_id`, `deck_id`, `score`, `total`, `answers_json`, `created_at` — OMR/papel |
| `session_insights` | `session_id`, `weak_points` (jsonb), `status` (pending/ready/empty/failed) |
| `achievements`, `student_unlocks` | gamificación; secundario |

**Identidad del alumno:** `student_id` cuando existe, `student_name` como fallback. Preferir siempre `student_id` cuando esté para no mezclar homónimos.

### 4.1 RPCs existentes a reusar

- `class_decks_summary(p_class_id)` → por-deck (% correcto, pending review, etc.).
- `deck_question_stats(p_deck_id, p_class_id)` → por-pregunta (correct/partial/incorrect, avg_time_ms, answer_distribution jsonb).
- `upsert_student_progress(...)` → escritura usada por la repetición espaciada (no relevante para lectura aquí).

---

## 5. Detalle visual — Detalle de Clase

El dashboard estrella. Mockup vivo: `.superpowers/brainstorm/<sesión>/content/class-detail-semrush-v2.html`.

### 5.1 Composición (de arriba a abajo)

1. **Toolbar:** breadcrumb · título de clase · **chips de período** (7d / 30d / 90d / Custom ▾) · botón **Comparar** · botón **Exportar**.
2. **Banda KPI** — 4 stat cards: Retención (con delta + sparkline), Participación, Sesiones, En riesgo (Cleo).
3. **Fila 2:**
   - **Tendencia** (2/3 ancho): bar chart con metric tabs (Retención / % correcto / Participación); pronóstico Cleo punteado; barras del período anterior translúcidas para comparar.
   - **Composición de respuestas** (1/3 ancho): donut (correcto/parcial/incorrecto/pendiente) con número grande al centro.
4. **Franja Cleo:** narrativa + 3 chips de acción (Generar repaso / Reenseñar / Ver en riesgo). Reusa `src/lib/close-unit-ai.js`.
5. **Fila 3 (3 columnas):** Top temas dominados (horizontal bars) · Top temas críticos (horizontal bars) · Más falladas (lista + botón "Generar repaso").
6. **Roster:** tabla con avatar, retención (mini-bar), tendencia 30d (sparkline), última actividad, estado (badge). Cada fila clickeable → Estudiante.

### 5.2 Interactividad (todo "vivo")

| Patrón | Comportamiento |
|--------|----------------|
| Hover en cada viz | Tooltip rico: valor exacto, delta vs período anterior, contexto (qué deck/sesión). |
| Click drill-down | Barra/segmento/celda/fila/sparkline/KPI tile → siguiente nivel del árbol de zoom. |
| Crossfilter | Click en un tema → highlight de preguntas y alumnos relacionados en otros widgets. |
| Brush + zoom | Drag de rango sobre la tendencia → re-filtra todo el dashboard a ese rango. |
| Drawer lateral | Click en alumno o pregunta → quick-peek lateral sin perder página. Esc cierra. |
| Sort/filter en tablas | Click en header para ordenar; input de filtro en cada tabla. |
| Updates suaves | `motion` para transiciones; CountUp para números cambiando. |
| Realtime | Durante sesión activa, los tiles de "hoy" reciben pushes de Supabase channels y se animan. |
| Cleo chips | Acción in-place (UI optimista, no recarga). |
| Keyboard nav | ↑↓ en listas, Enter para drill, Esc para cerrar drawer/modal. |
| `prefers-reduced-motion` | Animaciones off; interactividad mantenida (drill, hover, sort, etc. siguen). |

### 5.3 Tokens y look

- Tokens: `src/components/tokens/` (`C`, `SPACE`, `RADIUS`, `SHADOW`, `TYPE`, `MOTION`).
- Retención coloreada: `src/lib/scoring-thresholds.ts` (`pctColor`, `retentionTier`).
- Densidad: cards con aire interno (rítmica Semrush ≠ TradingView puro), pero dashboard infodenso en su conjunto.
- Acento: azul disciplinado. Violeta Cleo solo en la franja Cleo, el tag "Cleo" y la vista Analista Cleo.
- Iconos: solo `CIcon`/`NavIcons` (sistema del sidebar). NO emojis.

---

## 6. Motor de datos (backend)

### 6.1 Principio

El cliente **solo** llama a RPCs `SECURITY DEFINER` que verifican `teacher_id = auth.uid()`. Las vistas materializadas no tienen RLS y **nunca** se exponen directamente al cliente; se leen solo a través de las RPCs.

### 6.2 RPCs nuevos

Todos `SECURITY DEFINER`, mismo patrón que `class_decks_summary`/`deck_question_stats`. Guard de propiedad antes de devolver datos.

| RPC | Firma | Devuelve |
|-----|-------|----------|
| `analytics_overview` | `()` | Una llamada que reemplaza el N+1 de `useDirector`: todas las clases del docente + KPIs por clase + participación + Δ vs período anterior. |
| `class_analytics` | `(p_class_id uuid, p_from timestamptz, p_to timestamptz)` | KPIs de una clase + dominio por tema + lista de "más falladas". |
| `class_timeseries` | `(p_class_id uuid, p_metric text, p_granularity text, p_from timestamptz, p_to timestamptz)` | Serie temporal (lee `mv_class_daily`). Metric: retention/correct/participation. Granularity: day/week. |
| `student_detail` | `(p_class_id uuid, p_student_ref text)` | Trayectoria, dominio por tema, historial por sesión, más falladas, vs media de clase. `p_student_ref` resuelve `student_id` cuando hay, `student_name` como fallback. |
| `class_missed_questions` | `(p_class_id uuid, p_limit int)` | Top N preguntas con mayor error a nivel clase (extiende `deck_question_stats`). |
| `student_risk` | `(p_class_id uuid)` | Lista de alumnos con flag de riesgo + score. La heurística vive también en `src/lib/analytics/risk.ts` (para tests puros). |

### 6.3 Vistas materializadas

Solo donde el cálculo en vivo es pesado. Volúmenes de un docente son chicos → materializar todo sería over-engineering (YAGNI).

| MV | Granularidad | Razón |
|----|--------------|-------|
| `mv_class_daily` | clase × día | Serie temporal de retención/% correcto/participación. Lo más caro de calcular en vivo. |
| `mv_class_topic_weekly` | clase × tema × semana | Mini-tendencias por tema (heatmap pequeño). |

Refresco con `pg_cron` (precedente en `cleanup_expired_scans` y otros). Frecuencia inicial: cada 15-30 min. **Datos de hoy se leen en vivo, no de la MV** (frescura).

### 6.4 Capa React Query

Un hook cacheado por RPC, idéntico al patrón ya migrado en PR 170:

```
src/hooks/
  useAnalyticsOverview.js    // analytics_overview()
  useClassAnalytics.js       // class_analytics(...)
  useClassTimeseries.js      // class_timeseries(...)
  useStudentDetail.js        // student_detail(...)
  useClassMissed.js          // class_missed_questions(...)
  useStudentRisk.js          // student_risk(...)
```

Cada hook expone `data/loading/error` + un `invalidate()` para refrescar tras acciones (e.g., generar repaso, dismiss alerta).

### 6.5 Realtime (En vivo)

Canales Supabase ya usados en `SessionFlow.jsx` se reusan en la vista `/school/live` para tiles tipo "joined/responding/done" en tiempo real. No infra nueva.

### 6.6 Email digest

`pg_cron` → endpoint Vercel (`api/analytics-digest.js`) → reusa las RPCs → envía vía **Resend** (única dependencia externa nueva). Cierra los toggles de notificación de `Settings.jsx` que hoy no persisten (deuda del plan original, "Track A1"). Se hace en F7.

### 6.7 Export

- **PDF:** `jspdf` + `html2canvas` (ya instalados). Reusa `ClassReport.jsx` como precedente.
- **CSV:** vanilla (sin dep).
- **Excel:** dependencia nueva chica (`xlsx`/sheetjs o `exceljs` — decidir en F7).

---

## 7. Arquitectura de componentes (sin god-files)

### 7.1 Principio

- **Vistas (`src/pages/analytics/*`):** orquestadores delgados — fetch (vía hook), componen bloques. Sin matemática, sin transformaciones complejas.
- **Bloques (`src/components/analytics/*`):** presentacionales, un solo trabajo cada uno. Reciben datos ya cocinados.
- **Charts (`src/components/charts/*`):** wrappers `recharts` puros, reutilizables, con tooltips ricos y click handlers como standard.
- **Lib (`src/lib/analytics/*`):** **toda** la matemática, en funciones puras, unit-testeables sin React y sin login. Es donde vive la mayoría del valor verificable.

### 7.2 Estructura propuesta

```
src/pages/analytics/
  Overview.jsx              // /school
  ClassDetail.jsx           // /school/class/:id
  StudentProfile.jsx        // /school/student/:classId/:studentRef
  TopicMastery.jsx          // /school/topics/:classId?
  LiveCommandCenter.jsx     // /school/live
  Reports.jsx               // /school/reports
  CleoAnalyst.jsx           // /school/ask
  index.ts                  // barrel

src/components/analytics/
  StudioShell.jsx           // sub-nav + toolbar persistente
  PeriodChips.jsx           // 7d / 30d / 90d / Custom
  CompareToggle.jsx
  ClassFilter.jsx
  ExportMenu.jsx
  KpiBand.jsx               // banda de 4-5 stat cards
  StatCardWithSparkline.jsx
  CleoStrip.jsx             // franja Cleo (narrativa + acciones)
  TrendPanel.jsx            // tendencia con metric tabs + forecast + compare
  ResponseComposition.jsx   // panel: donut + leyenda + número al centro (envuelve Donut.jsx)
  TopicMatrix.jsx           // heatmap clickeable
  TopicBarList.jsx          // horizontal bars (dominados / críticos)
  MostMissedList.jsx        // lista + acciones reusando close-unit-ai
  RosterTable.jsx           // tabla con sparklines, mini-bars, badges
  StudentDrawer.jsx         // quick-peek lateral
  RiskBadge.jsx
  index.ts                  // barrel

src/components/charts/
  TrendBarChart.jsx         // recharts BarChart + forecast band + compare overlay
  Donut.jsx                 // primitivo donut (generaliza RetentionDonut.jsx existente)
  HorizontalBarList.jsx
  SparklineCell.jsx
  MasteryHeatmap.jsx
  DistributionBars.jsx      // para answer_distribution
  RetentionDonut.jsx        // existe; queda como wrapper de Donut.jsx con tiers
  RetentionBars.jsx         // existe
  index.ts

src/hooks/
  useAnalyticsOverview.js · useClassAnalytics.js · useClassTimeseries.js
  useStudentDetail.js · useClassMissed.js · useStudentRisk.js
  useCrossfilter.js         // estado de filtros transversales (clase, período, comparar, drill)

src/lib/analytics/
  metrics.ts                // KPI math, deltas, slopes
  risk.ts                   // heurística at-risk (pura, testeada)
  benchmark.ts              // comparaciones (período/clase/cohorte)
  forecast.ts               // regresión simple para bandas de pronóstico
  report-model.ts           // estructura del report builder
  export-csv.ts · export-pdf.ts · export-xlsx.ts
  index.ts

src/lib/cleo-analytics.ts   // arma el payload de contexto para Cleo
api/cleo-chat.js            // extendido para aceptar analytics context
api/analytics-digest.js     // F7: endpoint cron → Resend

supabase/migrations/<ts>_*.sql   // MVs + RPCs nuevas

src/routes.ts                    // patrones agregados + pathToPage + buildRoute
```

### 7.3 Estado transversal: `useCrossfilter`

El "crossfilter" requiere un estado compartido entre widgets dentro de una vista (qué clase, qué período, comparar on/off, qué entidad está hover/seleccionada para resaltar). Un Context + hook (`useCrossfilter`) dedicado mantiene esto. Cada widget consulta el estado para decidir si renderizar resaltado/atenuado.

---

## 8. Los 4 superpoderes — detalle

### 8.1 Predictivo + Cleo

- **`student_risk` heurística** — un solo source of truth, en JS, testeable: `src/lib/analytics/risk.ts` combina (a) trend slope de retención (`forecast.ts`), (b) participación reciente, (c) días desde última actividad, (d) varianza, y devuelve `score 0-100` + razones. La RPC `student_risk` **devuelve los insumos crudos** (slope, participación reciente, días desde última actividad, varianza) por alumno; el score final se calcula en cliente con la misma función. Esto deja la lógica testeable sin DB y evita duplicar la heurística en SQL.
- **Bandas de pronóstico** en la tendencia: regresión lineal simple en JS sobre la serie de la MV.
- **Conceptos errados:** análisis de `responses.answer` jsonb para detectar el "distractor más popular" por pregunta. Vive en `metrics.ts`.
- **Analista Cleo (`/school/ask`):** UI tipo chat. `api/cleo-chat.js` recibe un payload de contexto analítico (salida resumida de las RPCs relevantes a la pregunta, construido por `src/lib/cleo-analytics.ts`). Cleo responde grounded en números reales. Reusa Gemini Flash (ya configurado).
- **Franja Cleo** en cada detail-view alimentada con el mismo `cleo-analytics.ts`.

### 8.2 Comparar + Benchmarking

- `CompareToggle` en Clase/Estudiante/Tema.
- Modos: **período vs período anterior** (default cuando toggle on), **clase vs clase** (selector), **alumno vs media de su clase**.
- `src/lib/analytics/benchmark.ts`: funciones puras que toman dos series/datasets y devuelven `diff`/`pct_change`/`percentile_rank`.
- Visual: overlay translúcido en charts, chips de percentil en stat cards, ícono Δ en tablas.

### 8.3 Reportes + Export + Email

- **Vista Reportes (`/school/reports`):** report builder (drag-add de widgets desde catálogo a un canvas; configurable scope = clase/período). Persistencia en una tabla nueva `analytics_reports` (jsonb del modelo + metadata; teacher_id RLS).
- **Export en cada vista:** botón "Exportar" o "Añadir a reporte" → PDF (jspdf), CSV, Excel.
- **Email digest:** `pg_cron` → `api/analytics-digest.js` → Resend. Configuración del docente en Settings (al fin honra los toggles que hoy no persisten).

### 8.4 En vivo + Command Center

- **Vista En vivo (`/school/live`):** tiles realtime para la sesión activa (si hay una): joined/responding/done counts, % correcto en vivo, alertas (pregunta con > 60% error inmediato). Sin sesión activa = "Pulso de hoy" (sesiones programadas, lo que se viene).
- **Franja "Pulso de hoy"** en Resumen: resumen breve de la actividad del día (top sesión, mejor clase del día, alumno destacado, etc.).
- **Realtime:** canales Supabase ya usados en `SessionFlow.jsx`. Sin infra nueva.
- **Alertas accionables:** una alerta en vivo ofrece directo "Lanzar repaso" (reusa close-unit-ai) sin salir de la vista.

---

## 9. Fases

Cada fase es su propio ciclo **spec → plan → implementación** (branch-per-PR, como ya trabajan). Cada fase entrega valor sola; el orden de-riesga.

| Fase | Título | Contenido | Win visible |
|------|--------|-----------|-------------|
| **F0** | Cimientos | MVs (`mv_class_daily`, `mv_class_topic_weekly`) + RPCs núcleo (`analytics_overview`, `class_analytics`, `class_timeseries`) + guards `SECURITY DEFINER` + React Query hooks + `src/lib/analytics/metrics.ts` (puro, testeado) + `StudioShell` (sub-nav + toolbar persistente) + scaffolding de `src/components/charts/`. | Mata el N+1; Resumen carga en 1 llamada. |
| **F1** | Detalle de Clase ★ | Los 7 bloques (KpiBand · TrendPanel · CompositionDonut · CleoStrip · TopicBarList ×2 · MostMissedList · RosterTable) + acciones reusando `close-unit-ai`. La página ya tiene la rítmica Semrush y la interactividad base (hover, drill, crossfilter). | El dashboard estrella vivo. |
| **F2** | Perfil de Estudiante | `student_detail` RPC + vista StudentProfile (trayectoria, dominio por tema, historial por sesión, más falladas, vs media de clase). HOY NO EXISTE. | El click en un alumno del roster ya abre algo serio. |
| **F3** | Temas / Currículo + conceptos errados | TopicMastery view: matriz de dominio a escala, tendencia por tema, detección de conceptos errados leyendo `responses.answer` (distribución). | Misconception insight accionable. |
| **F4** | Comparar + Benchmarking | `CompareToggle` cableado en Clase/Estudiante/Tema; período vs período, clase vs clase, alumno vs media; percentiles. `benchmark.ts`. | "Contexto a cada número." |
| **F5** | Predictivo + Cleo | `student_risk` heurística + flags everywhere + forecast band en tendencias + vista **Analista Cleo** ("pregúntale a tus datos") + franja Cleo con contexto real. | La capa "alive + smart". |
| **F6** | En vivo / Command Center | Tiles de sesión en tiempo real + "pulso de hoy" en Resumen + alertas accionables. | La sensación de cockpit. |
| **F7** | Reportes + Export + Email | Constructor de informes + export PDF/CSV/Excel + digest semanal (`pg_cron` + Resend). Cierra los toggles de notificación que hoy mienten. | El producto cerrado: lleva la analítica fuera de la app. |

Tiempo orientativo: ~1-5 meses de ritmo tranquilo. F0 primero porque todo depende del motor.

---

## 10. Cuestiones abiertas / decisiones diferidas

- **Sidebar label:** ¿renombrar "School" → "Analytics" en el item del sidebar? Decisión de copy menor; resolver al implementar `StudioShell`.
- **Excel lib:** `xlsx` (sheetjs) vs `exceljs` — decidir en F7. Criterio: tamaño bundle + APIs de formato.
- **Resend:** crear cuenta + agregar `RESEND_API_KEY` a Vercel en F7.
- **Frecuencia exacta de refresh de MV:** arrancamos 30 min, ajustar tras medir.
- **Granularidad de "pulso de hoy":** depende de F6.
- **Excel: render client vs server-side:** decide en F7 según peso.
- **Modelo del Report Builder:** schema concreto de la tabla `analytics_reports` se define en F7.

---

## 11. Testing y verificación

Aprovechando las constraints documentadas en `memory/project_current_state.md`:

- **Lógica pura** en `src/lib/analytics/*` cubierta por `vitest` — **sin login, sin Supabase**. Es donde vive la mayoría del valor verificable.
- **RPCs** verificables read-only desde el anon key (técnica del PR 157, ya probada). Útil para spot-checks contra prod.
- **Smoke Playwright** en lo público posible; las vistas autenticadas requieren la cuenta de test `pedro@hola.com` (existe) — el usuario las verifica logueado.
- **Visual:** el usuario aprueba en navegador (con cuenta de test) — patrón ya establecido en R3 del UX audit.
- **Gates por fase:** `npm run lint && npm run typecheck && npm run test:run && npm run build`. E2E donde aplica.

---

## 12. Fuera de alcance (explícitamente)

- **Multi-profe / entidad colegio / rol director.** Confirmado en el brainstorm. Las RPCs ya van con `teacher_id` guard, así que sumar un nivel "colegio" más adelante no requiere rehacer (solo agregar otro guard encima).
- **Vistas para estudiante / familia.** Confirmado: solo el docente por ahora.
- **Migración a un Data Warehouse externo o BI embebido.** Postgres maneja los volúmenes; no aporta.
- **Edición en vivo del dashboard** (drag-resize de widgets en Resumen/Clase). El report builder de F7 sí permite componer, pero no rearma las vistas core.
- **Dashboards públicos / shareable links.** Diferido.

---

## 13. Referencias

| Recurso | Path |
|---------|------|
| Brainstorm visual (welcome + IA + dashboard v1 + arquitectura + fases + dashboard v2 Semrush) | `.superpowers/brainstorm/<session>/content/*.html` (local-only, gitignored, regenerado cada sesión) |
| Plan padre aceptado-pero-no-empezado | `C:\Users\home\.claude\plans\analizame-todo-profundamente-y-floofy-bachman.md` |
| Schema actual | `supabase/schema.sql` |
| Hook a reemplazar (N+1) | `src/hooks/useDirector.js` |
| Página actual a evolucionar | `src/pages/Director.jsx` |
| Páginas hojas a reusar | `src/pages/ClassInsights.jsx`, `src/pages/DeckResults.jsx`, `src/pages/ClassReport.jsx` |
| Acción reutilizable | `src/lib/close-unit-ai.js` (`generateSuggestedReviewQuestions`, `saveReviewDeck`) |
| Routing | `src/routes.ts` (`ROUTE_PATTERNS`, `buildRoute`, `pathToPage`) |
| Tokens | `src/components/tokens/` |
| Scoring tiers | `src/lib/scoring-thresholds.ts` (`pctColor`, `retentionTier`) |
| Charts existentes | `src/components/charts/RetentionDonut.jsx`, `RetentionBars.jsx` |
| Cleo backend | `api/cleo-chat.js`, `api/_lib/cleo-knowledge.js` |
| Cleo UI | `src/components/CleoChat.jsx` |
| Cron precedente | `cleanup_expired_scans()` (RPC en schema) |
| Lineamientos de diseño (Notion/TradingView/Sheets + Semrush para Studio) | `memory/feedback_design_direction.md` |
| Workflow PR | `memory/project_prs_workflow.md` |

---

## 14. Próximo paso

Detallar **Fase 0 (Cimientos)** vía `superpowers:writing-plans`. Esa fase entrega: las 2 MVs + las 3 RPCs núcleo + los hooks RQ correspondientes + `lib/analytics/metrics.ts` + `StudioShell` + scaffolding de `charts/`, y deja el Resumen cargando en 1 llamada (mata el N+1 de `useDirector`).
