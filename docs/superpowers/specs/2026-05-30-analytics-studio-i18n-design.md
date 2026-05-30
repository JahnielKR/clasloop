# Analytics Studio — Ola A: internacionalización (i18n) del Studio

**Fecha:** 2026-05-30
**Estado:** Diseño aprobado — listo para plan
**Origen:** El usuario reporta que al Analytics Studio "le faltan varias cosas,
aparte de los idiomas". Auditoría profunda de `/school` (8 páginas + 33
componentes + shell + cableado de rutas) confirma que el Studio está 100%
hardcodeado en español pese a que la app soporta `en/es/ko`.

> **Programa completo (3 olas):** esta spec cubre **solo la Ola A (idiomas)**.
> La Ola B (rediseño de Reportes: composer/cotejos + previsualización) y la Ola C
> (pulido: migrar controles nativos al sistema de diseño, encabezados, estados,
> a11y) tendrán su propia spec + plan, cada una en una rama fresca desde `main`
> (patrón [[analytics-studio]] — no apilar PRs).

---

## Contexto

La app ya tiene un sistema i18n funcionando (PR 73-135):

- `useT(namespace, lang)` / `getStrings(namespace, lang)` en `src/i18n/index.js`.
- `en.ts` es la **fuente de verdad**; `es.ts` y `ko.ts` se tipan como `Locale`
  (derivado de `en.ts`), así que TypeScript falla en compile si falta o sobra
  una key. Hay un `locale-parity.test.ts`.
- El idioma de la UI vive en `App.jsx` (`lang` state: localStorage
  `clasloop_lang` → `profile.language` → `navigator.language` → `"en"`), y se
  pasa a las páginas vía `commonProps` (`<Page {...commonProps} />`).

El comentario en `i18n/index.js` ya anticipa la pieza que falta:
> *"hoy NO usa React context… En el futuro, si agregamos un LanguageContext,
> este es el lugar para leerlo (con fallback al argumento explícito)."*

## Problema (evidencia)

1. **El Studio entero está en español hardcodeado.**
   - `0/33` componentes en `src/components/analytics/` usan i18n (grep `useI18n|t(`
     → sin matches).
   - `7/8` páginas no usan i18n. La excepción, `Director.jsx`, está **a medio
     cablear**: importa `useT("director", pageLang)` pero solo usa **1 string**
     (`t.noClasses`); el resto está fijo ("% correcto", "Clases", "Alumnos",
     "Sesiones", "Analytics"…).
   - El shell (`StudioShell.jsx`) tiene el menú lateral fijo: "Resumen / Clase /
     Estudiante / Temas / En vivo / Reportes / Analista Cleo / Tu uso de Cleo".
   - Efecto: con la app en English o 한국어, todo `/school` sigue en español.

2. **La IA ignora el idioma del docente.** `lang: "es"` hardcodeado en la
   generación de repasos y el chat de Cleo:
   - `src/pages/Director.jsx:91`
   - `src/pages/analytics/ClassDetail.jsx:132` (+ `lang="es"` en `<CleoStrip>` línea 242)
   - `src/pages/analytics/LiveCommandCenter.jsx:88`
   - `src/pages/analytics/StudentProfile.jsx:125`
   - `src/pages/analytics/CleoAnalyst.jsx:74` (body del POST a `/api/cleo-chat`)
   - Además, los `saveClassReviewDeck({ lang: gen.inferredLang || "es" })` caen a
     `"es"` como fallback en vez del idioma de la UI.
   - Efecto: un profe con la UI en inglés recibe preguntas generadas y respuestas
     de Cleo en español.

3. **El export sale siempre en español.** `src/lib/analytics/report-model.ts`
   tiene los títulos de sección y labels de columna fijos ("Indicadores clave",
   "Dominio por tema", "% correcto", "Tema", "Retención"…). El PDF/CSV/XLSX no
   respeta el idioma.

4. **Registro de español inconsistente.** Varias vistas usan voseo ("Creá uno",
   "Lanzá una", "Elegí una clase", "preguntame", "probá de nuevo") mientras el
   resto de la app tiende a "tú" neutro. (Polish que se resuelve al reescribir
   los textos hacia `es.ts`.)

## Objetivo / criterios de éxito

- Toda cadena visible de `/school` se renderiza en el idioma activo (`en/es/ko`).
- Los outputs de IA (repasos generados, chat de Cleo, narrativas de CleoStrip) y
  los reportes exportados usan el idioma del docente.
- `es.ts` y `ko.ts` quedan completos (lo garantiza el tipado `Locale` +
  `locale-parity.test.ts`).
- Sin regresiones en las superficies que ya usaban i18n (Settings, PublicHome,
  ClassReport, Director).
- Gate verde: `tsc`, `npm run lint`, `vitest`. Smoke logueado con Playwright en
  EN (y spot-check KO).

## Solución propuesta

### 1. Arquitectura: `LanguageProvider` + `useLang()` + `useT` consciente del contexto

En lugar de prop-drillear `lang` por 40 archivos:

- **`src/i18n/LanguageContext.js`** (nuevo): `createContext("en")` + un
  `LanguageProvider` y un hook `useLang()` (= `useContext`).
- **`App.jsx`**: envolver el árbol de contenido con
  `<LanguageProvider value={lang}>` (el `lang` state ya existe). Re-renderiza solo
  por cambio de idioma.
- **`src/i18n/index.js`**: `useT(namespace, lang)` pasa a leer el idioma del
  contexto cuando `lang` es `undefined`. Llamada **incondicional** a
  `useContext(LanguageContext)` (el default `"en"` cubre el caso sin provider),
  y el argumento explícito **gana** si se pasa → backward-compatible. `getStrings`
  (no-React) se queda igual, con `lang` explícito.

Resultado: cada componente del Studio hace `const t = useT("studioCommon")` (o el
namespace que sea) sin recibir `lang` por props. Los callers actuales que pasan
`lang` explícito (Settings, PublicHome, ClassReport, Director) no cambian de
comportamiento.

> Decisión: se elige modificar `useT` (en vez de solo añadir `useLang`) porque es
> exactamente lo que documenta `i18n/index.js` y reduce el boilerplate en los 33
> componentes. El riesgo de tocar un primitivo compartido se mitiga con un test
> unitario del fallback de contexto (ver Verificación).

### 2. Mapa de namespaces (en `en.ts` + `es.ts` + `ko.ts`)

- `studioShell` — menú/nav, eyebrow "Analytics", hints contextuales, header.
- `studioCommon` — términos compartidos por muchos componentes: labels de período
  (7/30/90 días), labels de KPI (% correcto, Participantes, Respuestas, Tiempo
  medio), estados/tiers (Riesgo/Estable/Subiendo, Fuerte/Medio/Débil), headers de
  tabla (Alumno, Retención, Riesgo, Última actividad, Estado), vacíos/errores
  genéricos, botones (Exportar, Generar repaso, Eliminar…).
- Por página: `director` (extender el existente), `classDetail`, `studentProfile`,
  `topicMastery`, `liveCommandCenter`, `cleoAnalyst`, `reports` (página Reports +
  ReportComposer + ReportList), `cleoUsage`.
- `reportModel` — títulos de sección + headers de columna + labels de KPI del
  export, consumidos vía `getStrings("reportModel", lang)` desde la lib pura.

Las cadenas con interpolación usan el patrón función ya presente en los locales
(p. ej. `repeatedNote: (name) => …`), no concatenación.

### 3. Migración de superficies

Reemplazar cada literal por `t.*` en:

- **Shell:** `StudioShell.jsx`.
- **Páginas (8):** `Director.jsx` (completar), `ClassDetail.jsx`,
  `StudentProfile.jsx`, `TopicMastery.jsx`, `LiveCommandCenter.jsx`,
  `CleoAnalyst.jsx`, `Reports.jsx`, `CleoUsage.jsx`.
- **Componentes (33):** todos los de `src/components/analytics/`. Cada uno toma su
  `lang` con `useLang()` y lee de `studioCommon` y/o su namespace de página.

### 4. Fix de idioma de la IA

En los 6 sitios listados arriba, reemplazar `lang: "es"` / `lang="es"` por el
`lang` activo. En los `saveClassReviewDeck`, el fallback pasa de
`gen.inferredLang || "es"` a `gen.inferredLang || lang`. Confirmar en el plan que
`CleoStrip`/`CleoStudentStrip` propagan `lang` al endpoint `analytics-narrative`.

### 5. Localización del export

`buildClassReportModel` / `buildOverviewReportModel` reciben `lang` (o un objeto de
labels resuelto vía `getStrings("reportModel", lang)`) y lo usan para títulos y
columnas. Los callers (Director, ClassDetail, Reports) ya conocen `lang`.

### 6. Registro del español

Al volcar los textos a `es.ts`, reescribir en "tú" neutro (sin voseo), coherente
con namespaces existentes como `avatarOnboarding`/`community`.

## Fuera de alcance (Olas B/C)

- Rediseño del composer de reportes / los "cotejos" (checkboxes/selects nativos →
  sistema de diseño) y previsualización del reporte → **Ola B**.
- Migración del resto de controles nativos (filtros, inputs), encabezados
  consistentes, estados vacíos/foco/teclado, limpieza de `periodToRange`
  duplicado → **Ola C**.

## Verificación

- **TS compile** + `locale-parity.test.ts` → cero keys faltantes en `es`/`ko`.
- **Test unitario nuevo:** `useT` sin `lang` explícito lee el contexto; con `lang`
  explícito, el explícito gana (de-risk del cambio al primitivo).
- `npm run lint` (gate; regla rules-of-hooks por los nuevos hooks) + `vitest`.
- **Smoke logueado (Playwright):** poner la app en English, recorrer las 8 vistas
  de `/school` (Resumen, Clase, Estudiante, Temas, En vivo, Reportes, Analista
  Cleo, Tu uso de Cleo) y confirmar que no quede español; spot-check en 한국어; verificar
  que un repaso generado y una respuesta de Cleo salgan en el idioma correcto, y
  que un export PDF/CSV tenga los títulos traducidos.

## Riesgos / notas

- **Calidad del coreano:** se traduce con cuidado pero `ko` puede requerir repaso
  nativo posterior; se marca, no bloquea la Ola.
- **Formato de fechas/números:** asegurar que el formateo de fechas respete `lang`
  (patrón `toLocaleDateString(lang)` de `ClassReport.jsx`); los formatters de
  porcentaje/número son agnósticos.
- **Volumen:** son muchos archivos pero el cambio es mecánico y está blindado por
  el tipado `Locale` + el test de paridad.

## Archivos afectados (resumen)

- **Nuevos:** `src/i18n/LanguageContext.js`; test del fallback de `useT`.
- **i18n:** `src/i18n/index.js` (useT context-aware), `en.ts`, `es.ts`, `ko.ts`
  (namespaces nuevos).
- **App:** `src/App.jsx` (montar `LanguageProvider`).
- **Studio:** `StudioShell.jsx` + 8 páginas + 33 componentes de
  `src/components/analytics/`.
- **Lib:** `src/lib/analytics/report-model.ts` (export localizado).
