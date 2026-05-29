# Analytics Studio — Cockpit `/school` (Área 3)

**Fecha:** 2026-05-30
**Estado:** Diseño aprobado por el usuario. Pendiente: plan de implementación (writing-plans).
**Contexto:** Área 3 del audit de Analytics Studio. El programa F0–F9 está completo y en prod;
los 4 bugs que destapó el smoke test logueado están arreglados (PRs #81, #82). La vista
**Resumen** (`/school`, `src/pages/Director.jsx`) sigue siendo el dashboard VIEJO de tabs,
desfasado de la rítmica Semrush del resto del Studio. Spec maestro: `2026-05-28-analytics-studio-design.md` §3.2.

---

## 1. Objetivo

Convertir la puerta de entrada del Studio (`/school`) en un **cockpit cross-clase** que se
sienta tan pro como las vistas de detalle (F1–F9). Reemplaza el `Director.jsx` de tabs
(overview / byClass / students / alerts) por **una única vista scrolleable** con rítmica
Semrush, que **lidera con lo accionable** ("¿qué hago ahora?") y luego muestra el estado.

## 2. Decisiones del brainstorm (cerradas)

| Decisión | Valor |
|----------|-------|
| Propósito | **Centro de acción** — lidera con lo que necesita atención hoy; el estado va debajo. |
| Señales accionables | **Pulso de hoy · Alumnos en riesgo (cross-clase) · Temas críticos (cross-clase)**. (NO "por calificar".) |
| Alcance de datos | **+1 RPC nueva** (`overview_timeseries`) para sparklines de tendencia por clase. |
| Métrica primaria | **% correcto** en banda KPI + tabla de clases (coherente con ClassDetail, única serie diaria disponible). **Retención** (SM-2) reservada a "temas críticos". **Una métrica por bloque, sin mezclar** → no confunde. |
| Tabs viejos | Se disuelven: *alerts*→centro de acción · *byClass*→tabla de clases · *students*→drill desde riesgo/tabla · *overview*→banda KPI. |

## 3. Layout (de arriba a abajo)

1. **Toolbar** (StudioShell, ya existe): título "Analytics" · chips de período (7d/30d/90d) · Exportar.
2. **Banda KPI global** — 4 stat cards con count-up: **% correcto medio del período** (derivado de `overview_timeseries`: Σcorrect / Σtotal cross-clase) · clases activas · alumnos totales · sesiones (conteos de `analytics_overview`). Reutiliza `KpiBand` + `AnimatedNumber`. *(Los chips de período afectan el % correcto y los sparklines; los conteos de clases/alumnos son actuales.)*
3. **Centro de acción** (protagonista):
   - **Pulso de hoy** — `PulseStrip` (ya existe): sesiones de hoy + sesión en vivo si la hay.
   - **Alumnos en riesgo (cross-clase)** — top 5 alumnos por risk score de TODAS las clases (parámetro `n`, default 5), cada uno con su clase + `RiskBadge` + drill a `/school/student/:classId/:ref`.
   - **Temas críticos (cross-clase)** — temas con **retención < 40** de todas las clases, con botón "Generar repaso" (reusa el generador de F5) + drill a `/school/topics/:classId?topic=…`.
4. **Tabla de clases** (estado) — sorteable (`table-sort.ts`). Columnas: clase · **% correcto** (número + barra de tier verde/amarillo/rojo) · **sparkline de tendencia % correcto del período** (`SparklineCell`) + delta vs primer bucket · participación · sesiones · alumnos · última actividad. Fila clickeable → `ClassDetail`.

## 4. Datos

**RPC nueva — `overview_timeseries(p_from timestamptz, p_to timestamptz, p_granularity text)`**
- Lee `mv_class_daily` (ya tiene pct por día por clase — **no se crea MV nueva**).
- Devuelve un row por (clase, bucket): `class_id, bucket date, value numeric (pct_correct), responses_total int`.
- `SECURITY DEFINER` + guard `teacher_id = auth.uid()` vía la tabla `classes` (mismo patrón que `class_timeseries`).
- **Columnas cualificadas con alias de tabla** dentro del cuerpo (lección del bug 42702 de `class_timeseries`).
- Una sola llamada para todas las clases → alimenta sparklines + delta.

**Reutilizados (sin SQL nuevo):**
- `analytics_overview` (`useAnalyticsOverview`) → snapshot por clase (% correcto/retención/participación/sesiones/alumnos) + `topics_snapshot` (para temas críticos) + `students_snapshot`.
- `useTodayPulse` → pulso (ya arreglado, PR #81).
- `student_risk` (`useStudentRisk`) por clase → riesgo cross-clase juntando N resultados (paralelo, cacheado por React Query; barato para el caso típico de 1–8 clases). Si en el futuro el perfil de uso lo exige, se reemplaza por una RPC `risk_overview` única — fuera de alcance ahora.

## 5. Componentes y anti-god-file

**Reutilizar:** `StudioShell`, `KpiBand`, `AnimatedNumber`, `PulseStrip`, `RiskBadge`, `SparklineCell` (`src/components/charts/`), `ExportMenu`, `StudioSkeleton`, `table-sort.ts`.

**Crear (presentacionales, un solo trabajo):**
- `ClassTable` — análogo a `RosterTable`: tabla sorteable de clases con sparkline + delta por fila.
- `RiskOverviewList` — lista cross-clase de alumnos en riesgo.
- `CriticalTopicsList` — lista cross-clase de temas críticos con "Generar repaso".
- (El "centro de acción" se compone en `Director.jsx` con estos tres + `PulseStrip`.)

**Lib pura testeable — `src/lib/analytics/overview-aggregate.ts`** (sin React, sin Supabase):
- `topRiskStudents(perClassRisk[], n)` → junta y ordena alumnos en riesgo cross-clase.
- `criticalTopics(overviewRows, threshold=40)` → agrega temas <40 cross-clase, ordenados.
- `classTrend(timeseriesRows)` → por clase, serie para sparkline + delta (primer↔último bucket).
- `globalKpis(overviewRows)` → % correcto medio, totales.

**Hook nuevo:** `useOverviewTimeseries({from,to,granularity})` → 1 RPC, mismo patrón que `useClassTimeseries` (con `from/to` MEMOIZADOS — lección del bug del loop).

**`Director.jsx`** queda como orquestador delgado (fetch + compose), sin matemática inline. Toda la agregación cross-clase vive en la lib pura.

## 6. Interactividad y look

- Rítmica Semrush + tokens del Studio (`C`/`TYPE`/`SP`); dark-mode vía `var(--c-*)` (ya tokenizado en el resto). Usar `withAlpha()` para token+alpha (nunca concatenar hex).
- Tabla de clases: sort por columna (indicador ▲/▼), hover en filas, drill al click. Reduced-motion respetado (count-up + transiciones ya lo respetan).
- Skeletons (`StudioSkeleton`) durante carga; empty states cuando no hay clases/datos.
- Sin emojis — solo `CIcon`/`NavIcons`.

## 7. Testing y verificación

- **Unit (vitest):** `overview-aggregate.ts` (topRiskStudents, criticalTopics, classTrend deltas, globalKpis) con datos mock.
- **SQL:** `overview_timeseries` verificada contra la MV (devuelve buckets por clase; no error de ambigüedad).
- **En vivo (Playwright, logueado `pedro@hola.com`):** con los datos ya sembrados (8 alumnos, 6 sesiones, 4 temas) — banda KPI con count-up, centro de acción poblado (riesgo + temas + pulso), tabla de clases con sparkline, sort, drill a ClassDetail. Sin loops ni 400s.
- **Gate pre-push:** `npm run lint` + `typecheck` + `test:run` + `build`.

## 8. Fuera de alcance (explícito)

- RPC `risk_overview` agregada (se usa N×`student_risk` por ahora).
- Sparkline de **retención** (no hay serie diaria; el sparkline es de % correcto).
- Crossfilter/brush en el cockpit; filtros avanzados de la tabla de clases (solo sort + el período global).
- Área 4 (profundidad de datos: `ai_generations`/`scans`) — fase aparte.

## 9. Pasos (alto nivel; el detalle va en el plan)

1. Migración SQL `overview_timeseries` (+ aplicar en prod vía MCP).
2. Lib pura `overview-aggregate.ts` + tests.
3. Hook `useOverviewTimeseries`.
4. Componentes `ClassTable`, `RiskOverviewList`, `CriticalTopicsList`.
5. Reescribir `Director.jsx` como cockpit (orquestador delgado) + i18n.
6. Verificación en vivo + gate + PR.
