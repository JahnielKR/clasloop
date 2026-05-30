# Instrumentar el "oro" de `ai_generations` (Analytics Studio — Área 4)

**Fecha:** 2026-05-30
**Estado:** Diseño aprobado por el usuario (enfoque "snapshot al guardar"). Pendiente: plan + implementación (en sesión fresca — toca el editor de decks, que es un god-file).
**Contexto:** Área 4 del audit. Las Áreas 1–3 del Studio están shipped (cockpit incluido, PRs #63–#84).

---

## 1. El hallazgo que reencuadra el Área 4

El Área 4 se concibió como "explotar el oro sin tocar de `ai_generations`". Al verificar prod (2026-05-30) el supuesto resultó **falso**:

- Hay **129 generaciones** (3 docentes, 4 modelos, 5 tipos) — pero las columnas del oro están **100% vacías**: `accepted_count`, `edited_count`, `regenerated_count`, `time_to_publish_ms`, `output_final` → **0 filas con dato**.
- La migración 045 lo advertía: *"Bloque 1 solo guarda raw; Bloques 7-8 llenan el resto"* — los Bloques 7-8 **nunca se implementaron**.
- `scans` está **vacío** (0 filas). OMR queda fuera de alcance.
- Lo que SÍ hay (volumen, tipos, modelos, `validation_dropped_count`) **ya lo muestra `AdminAIStats.jsx`** a nivel plataforma.

**Conclusión:** antes de hacer analítica del valor de la IA, hay que **CAPTURAR el oro**. El usuario eligió: *poblar primero, analizar después*. Este spec cubre la **instrumentación** (la captura). La analítica es una fase posterior, cuando haya datos acumulados.

## 2. Decisiones del brainstorm (cerradas)

| Decisión | Valor |
|----------|-------|
| Qué hacer | **Instrumentar** la captura del oro; la analítica es fase futura. |
| Enfoque | **Snapshot al guardar**: `generate` devuelve el `generation_id`; al guardar el deck, un endpoint recibe las preguntas finales y completa la fila. |
| Momento de "publicar" | **Guardar el deck** en el editor (`useDeckEditor`). |
| `accepted`/`edited` | Calculados **server-side** comparando `output_raw` vs las preguntas finales. |
| `scans` | **Fuera de alcance** (tabla vacía). |
| Analítica | **Fase posterior** (vista "Tu uso de Cleo"); no en este spec. |

## 3. Flujo actual (verificado)

1. **`api/generate.js`** genera + valida (Haiku) e inserta UNA fila en `ai_generations` (`teacher_id`, `activity_type`, `num_questions`, `model_used`, `input_type`, `input_size_chars`, `output_raw`, `output_filtered`, `validation_dropped_count`). **No devuelve el `id`**, no vincula a un deck, no toca las columnas del oro.
2. **`src/lib/ai.js` → `generateQuestions()`** hace `POST /api/generate` y devuelve `{ questions, warnings }` (sin el id).
3. **`AIGeneratePanel.jsx`** llama `generateQuestions()` y entrega las preguntas al editor vía `onGenerated(cleaned, warnings)`.
4. **`useDeckEditor.js`** anexa las preguntas al array `questions` del deck; el docente edita; al **guardar**, persiste el deck.

## 4. Diseño de la instrumentación

### 4.1 Backend

**`api/generate.js`** — devolver el id:
- Cambiar el insert a `.insert({...}).select('id').single()` y **devolver `generation_id`** en el JSON de respuesta (junto a `content`/`validation`).

**Endpoint nuevo `api/generation-publish.js`** (`requireTeacher`):
- Body: `{ generationId: uuid, finalQuestions: array }`.
- Carga la fila (`output_raw`, `created_at`, `teacher_id`); **verifica que `teacher_id === auth.uid()`** (no confiar en RLS sola; el endpoint usa service role).
- Calcula:
  - `output_final` = `finalQuestions`.
  - `time_to_publish_ms` = `now - created_at`.
  - `accepted_count` / `edited_count`: match de cada pregunta de `output_raw` con la más parecida en `finalQuestions` por el **texto de la pregunta** (`question`/`prompt`): idéntica → accepted; presente pero cambiada → edited; sin match → descartada. (Heurística simple; el desglose fino se afina en la analítica.)
- `UPDATE ai_generations SET output_final, time_to_publish_ms, accepted_count, edited_count WHERE id = generationId`.
- Idempotente: si `output_final` ya estaba seteado, **no sobrescribir** (la primera publicación gana — evita que re-guardar el deck infle el time-to-publish). 
- La math del match vive en una **lib pura testeable** `src/lib/ai-gold.js` (`diffRawVsFinal(raw, final) → { accepted, edited }`), reusada por el endpoint.

### 4.2 Frontend (editor de decks)

- **`ai.js` → `generateQuestions()`**: leer `data.generation_id` y devolver `{ questions, warnings, generationId }`.
- **`AIGeneratePanel.jsx`**: propagar el id → `onGenerated(cleaned, warnings, generationId)`.
- **`useDeckEditor.js`**:
  - Recordar los `generationId` de las generaciones que poblaron el deck en esta sesión de edición (un set/array en estado; un deck puede tener varias).
  - Al **guardar** el deck, tras persistir, llamar `publishGeneration(generationId, finalQuestions)` para cada id pendiente. **Fire-and-forget** (no bloquea ni rompe el guardado si falla — patrón del insert de `generate.js`).
  - Limpiar los ids ya publicados.

`finalQuestions` = el array `questions` del deck al guardar (las que sobrevivieron + ediciones). El match server-side las asocia a cada `output_raw`.

### 4.3 Schema

Sin tabla nueva; las columnas ya existen. **Sin `deck_id`** en `ai_generations` por ahora (YAGNI — el vínculo lo lleva el editor en runtime; añadir la FK es un cambio mayor y no lo necesita la captura). Si la analítica futura lo pide, se añade entonces.

## 5. Componentes y anti-god-file

- **Crear:** `api/generation-publish.js` (endpoint), `src/lib/ai-gold.js` (lib pura `diffRawVsFinal`, testeada).
- **Modificar (mínimo, quirúrgico):** `api/generate.js` (+`.select('id')`), `src/lib/ai.js` (propagar id), `src/pages/Decks/editor/AIGeneratePanel.jsx` (propagar id), `src/pages/Decks/editor/useDeckEditor.js` (recordar ids + llamar publish al guardar).
- **No tocar** la lógica de generación/validación ni el resto del editor. El editor es un god-file (~1.4k líneas) — el cambio se limita a 2 puntos (recibir el id en onGenerated; llamar publish en save).

## 6. Testing y verificación

- **Unit (vitest):** `ai-gold.diffRawVsFinal` — casos: todas aceptadas, algunas editadas, algunas descartadas, deck con preguntas manuales (sin raw), texto idéntico vs cambiado.
- **En vivo (sesión fresca):** generar un deck con IA (cuenta `pedro@hola.com`), editar 1-2 preguntas, guardar; verificar en prod (`select accepted_count, edited_count, time_to_publish_ms, output_final from ai_generations order by created_at desc limit 1`) que la fila quedó poblada y los conteos cuadran.
- **Gate:** `npm install` primero (lección #84), luego `lint + typecheck + test:run + build`. **Esperar el CI del PR verde antes de mergear.**

## 7. Fuera de alcance (explícito)

- La **analítica** del oro (vista "Tu uso de Cleo") — fase posterior, cuando haya datos.
- `scans` / OMR (tabla vacía).
- `regenerated_count` (requiere rastrear cada regeneración en el editor — más invasivo; YAGNI por ahora, la columna queda null).
- `deck_id` FK en `ai_generations`.
- Backfill de las 129 generaciones históricas (no tienen final; quedan null — la captura aplica de aquí en adelante).

## 8. Pasos (alto nivel; el detalle va en el plan)

1. Lib pura `ai-gold.js` (`diffRawVsFinal`) + tests.
2. `api/generate.js`: devolver `generation_id`.
3. `api/generation-publish.js`: endpoint (auth + ownership + update idempotente, usa `ai-gold`).
4. `ai.js` + `AIGeneratePanel.jsx`: propagar el id.
5. `useDeckEditor.js`: recordar ids + llamar publish al guardar (fire-and-forget).
6. Verificación en vivo + gate + PR (CI verde antes de mergear).
