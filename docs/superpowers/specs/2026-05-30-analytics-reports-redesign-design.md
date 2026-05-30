# Analytics Studio — Ola B: Reports / "cotejos" redesign + live preview

**Fecha:** 2026-05-30
**Estado:** Diseño aprobado — listo para plan
**Origen:** El usuario reportó que en Reportes "en la parte de secciones no se ve
bien los cotejos, están desorganizados y lo que dicen también". Auditoría
confirma: el composer usa `<input type="checkbox">` + `<select>` + botones
nativos sin el sistema de diseño, no hay previsualización (el reporte se arma a
ciegas y solo se puede exportar), y la lista de guardados muestra poco.

> **Programa (3 olas):** Ola A (idiomas) ✅ code-complete + gate-green en la rama.
> Esta spec = **Ola B (rediseño de Reportes)**. Ola C (pulido del resto de
> controles nativos del Studio) tendrá su propia spec.

---

## Contexto (estado real del código)

- **`src/pages/analytics/Reports.jsx`** — orquestador. Layout actual: grid de 2
  columnas (composer + lista guardados). Ya i18n (`useT("reports")`, `useLang`).
- **`src/components/analytics/ReportComposer.jsx`** — form de selección (NO
  drag-drop canvas): nombre + clase + período + qué secciones incluir. Hoy:
  `<input>` nativo, `<select>` nativo, botones de período ad-hoc, y los
  **checkboxes nativos** de secciones (los "cotejos"). Al guardar persiste un
  `model` en `analytics_reports`.
- **`src/components/analytics/ReportList.jsx`** — lista guardados: nombre +
  "N secciones · período" + ExportMenu + eliminar.
- **`src/lib/analytics/report-model.ts`** — `SECTION_TYPES = [{id:"kpis"},
  {id:"topics"},{id:"most_missed"}]` (solo ids; labels localizados en UI).
  `buildClassReportModel({className, period, classAnalytics, sections, lang})`
  **renderiza las secciones en el orden del array `sections`** → el orden ya se
  respeta en export (PDF/CSV/XLSX) sin tocar los exporters.
- **Datos para preview:** `useClassAnalytics(classId, {from,to})` (RPC
  `class_analytics`) devuelve `{kpis, topic_mastery, most_missed}` — exactamente
  lo que las 3 secciones necesitan.
- **Primitivos disponibles:** `Button`, `Card`, `FieldLabel` (real),
  `selectable.js` (`selectableCard`/`selectableChip`/`selectedCheckStyle`),
  charts `RetentionDonut` / `RetentionBars` / `HorizontalBarList` (ya usados por
  `ClassReport.jsx`). Tier de color: `scoring-thresholds.retentionTier`.
  - **OJO:** `src/components/forms/field-styles.js` es un stub roto (se importa a
    sí mismo, sin exports, nadie lo usa) — **no usarlo**. Los inputs/select se
    estilizan con estilos inline basados en tokens (`C` de `components/tokens`),
    igual que el composer actual (`inputStyle`/`labelStyle` locales) y el resto
    del Studio. Para labels usar el primitivo real `FieldLabel`.

## Problema

1. **Cotejos crudos/desorganizados:** checkboxes + select + botones nativos sin
   estilo del sistema → se ven inconsistentes y "desordenados". (Queja directa.)
2. **Textos secos:** las secciones solo tienen un label ("Indicadores clave"…),
   sin describir qué incluye cada una. (Queja "lo que dicen".)
3. **Sin previsualización:** el docente arma el reporte a ciegas; solo puede
   exportar y abrir el archivo para ver si quedó bien.
4. **Sin control de orden:** el orden de secciones es fijo.
5. **Lista pobre:** "N secciones · período" — sin clase ni fecha.

## Objetivo / criterios de éxito

- Los "cotejos" se ven como tarjetas seleccionables del sistema de diseño, con
  label + descripción de una línea, ✓ al seleccionar, y reordenables.
- Hay **previsualización en vivo con datos reales** del reporte (las secciones
  elegidas, en el orden elegido), reutilizando los charts existentes.
- El export (PDF/CSV/XLSX) refleja las secciones y el **orden** elegidos.
- La lista de guardados muestra clase · período · fecha · nº secciones.
- en/es/ko completos (parity test + tipado). Gate verde: tsc, lint, vitest,
  build. Render-smoke en inglés sin fugas de español.

## Solución — 4 unidades

### 1. `src/lib/analytics/report-sections.js` (nuevo, puro)
Catálogo único de las 3 secciones, consumido por composer y preview para que la
lista y el orden no se dupliquen:
```js
export const REPORT_SECTIONS = [
  { id: "kpis",        labelKey: "secKpis",       descKey: "secKpisDesc" },
  { id: "topics",      labelKey: "secTopics",     descKey: "secTopicsDesc" },
  { id: "most_missed", labelKey: "secMostMissed", descKey: "secMostMissedDesc" },
];
```
Helpers puros para reordenar (testeable sin React):
```js
export function moveSection(order, id, dir) { /* sube/baja id; no-op en bordes */ }
```
`labelKey` reusa las keys ya existentes en el namespace `reports`
(`secKpis/secTopics/secMostMissed`). Las `descKey` son nuevas.

### 2. `ReportComposer.jsx` (rewrite)
Form con el sistema de diseño, **ligeramente controlado** para alimentar el
preview:
- Estado interno `{ name, classId, period, sections }` (sections = array
  ordenado de ids). En cada cambio llama `onDraftChange(draft)`; `onSave(draft)`
  igual que hoy.
- **Nombre:** input con estilo inline basado en tokens (reusa el `inputStyle`
  local del composer, ya consistente) + `FieldLabel`.
- **Clase:** `<select>` nativo estilizado con el mismo `inputStyle` (no existe
  primitivo Select; es 1 control, no hace falta crear uno).
- **Período:** chips `selectableChip` (d7/d30/d90) — reemplaza los botones ad-hoc.
- **Secciones (cotejos):** `selectableCard` por cada sección **en el orden
  actual del draft**, con label (`t[labelKey]`) + descripción (`t[descKey]`) +
  ✓ (`selectedCheckStyle`) cuando está incluida. Cada tarjeta:
  - click → toggle incluida/excluida;
  - botones **↑ / ↓** (con `aria-label`) → `moveSection`; deshabilitados en los
    bordes. Teclado-accesible (son `<button>`s).
- **Guardar:** `Button` del sistema (reemplaza el botón inline).

> **Decisión: reordenar con ↑/↓, NO drag-and-drop.** Son 3 ítems; ↑/↓ es
> accesible por teclado/lector, cero dependencias nuevas, y evita dnd-kit (que
> [[current-state]] marca como código muerto/parqueado problemático en ClassPage).

### 3. `ReportPreview.jsx` (nuevo)
Recibe el draft `{classId, period, sections}`. Resuelve `from/to` desde el
período (memoizado por período — lección del loop de [[analytics-studio]]:
nunca derivar `new Date()` en el cuerpo del render hacia un queryKey) y usa
`useClassAnalytics(classId, {from,to})`. Renderiza **solo las secciones
incluidas, en orden**, reusando charts:
- `kpis` → tarjetas KPI (% correcto, participantes, respuestas, tiempo medio).
- `topics` → `RetentionBars` (o `HorizontalBarList`) de `topic_mastery`.
- `most_missed` → lista compacta de más falladas (P. N · tema · % error).
Estados: **sin clase elegida** (placeholder guía), **loading** (skeleton),
**vacío** (sin datos en la ventana). Encabezado del preview = nombre del
reporte (o el de la clase) + período, al estilo `ClassReport`.

### 4. `Reports.jsx` (reweave)
Sube el `draft` a estado del page (lifted), lo comparte composer↔preview:
- Layout: **composer (izq) + preview (der)** en grid responsive
  (`repeat(auto-fit, minmax(min(100%, 320px), 1fr))`, patrón Ola 6); apila en
  móvil.
- **Lista de guardados full-width debajo**, enriquecida: nombre · clase ·
  período · fecha (`created_at`) · "N secciones". (Los campos ya vienen de
  `useReports`; solo se muestran.)
- `handleSave` arma el `model` desde el draft (incluye `sections` ordenado, ya
  lo hace) — sin cambios de esquema/DB.

## i18n
Nuevas keys en el namespace `reports` (en/es/ko):
- `secKpisDesc`, `secTopicsDesc`, `secMostMissedDesc` (descripciones de 1 línea).
- `previewTitle`, `previewEmpty` (sin datos), `previewNoClass` (elige una clase),
  `previewLoading`.
- `moveUp`, `moveDown` (aria-labels), `included`/`excluded` si hiciera falta.
- Lista: `savedClass`, `savedDate` o un formateador de fecha localizado
  (`toLocaleDateString(lang)` como en ClassReport).
es.ts en "tú" neutro; ko.ts best-effort. El export sigue usando el namespace
`reportModel` ya existente (Ola A) — sin cambios.

## Fuera de alcance
- Nuevos tipos de sección (donut de distribución, alumnos en riesgo, etc.).
- Drag-and-drop.
- Render de charts dentro del PDF (el PDF/CSV/XLSX siguen texto/tabla; **la
  previsualización** es la superficie visual nueva, el formato de export no
  cambia).
- Reportes scope "student"/"overview" desde esta vista (sigue scope "class").

## Verificación
- **Pure:** `report-sections.test.js` — `moveSection` sube/baja/no-op en bordes;
  catálogo expone los 3 ids.
- **Componentes:** `ReportComposer` (toggle incluye/excluye; ↑/↓ cambia el orden
  del draft emitido). `ReportPreview` (mock `useClassAnalytics` → renderiza las
  secciones en orden; estados no-class/loading/empty).
- **Parity:** `locale-parity` verde (nuevas keys en los 3 locales).
- **Render-smoke (inglés):** montar composer+preview bajo
  `<LanguageProvider value="en">`, afirmar textos en inglés y **cero español**
  (la disciplina de [[silent-edit-failures]]).
- **Gate:** `tsc` 0, `npm run lint` 0 errores, `vitest` verde, `npm run build` OK.
- **Smoke logueado (Playwright, si hay credencial):** /school/reports — elegir
  clase, ver el preview con datos reales, reordenar y ver el orden reflejado,
  exportar y confirmar el orden en el archivo.

## Archivos afectados
- **Nuevos:** `src/lib/analytics/report-sections.js` (+test);
  `src/components/analytics/ReportPreview.jsx` (+test).
- **Rewrite:** `src/components/analytics/ReportComposer.jsx` (+test).
- **Modify:** `src/pages/analytics/Reports.jsx` (lifted draft + layout + lista
  enriquecida); `src/i18n/{en,es,ko}.ts` (keys nuevas en `reports`).
- **Sin cambios:** `report-model.ts` (ya ordena por array), exporters, DB/esquema.
