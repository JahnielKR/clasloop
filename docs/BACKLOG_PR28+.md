# BACKLOG — Ideas para PRs futuros

Lista de cosas que se discutieron pero quedaron postergadas. Ordenadas
aproximadamente por prioridad/dolor del usuario.

Última actualización: PR 27 (View students) recién entregado.

---

## ⏳ Pendientes principales

### PR 23 — Mobile portrait fallback

**Problema**: cuando un alumno entra a una sesión en celular vertical
(portrait), el render themed asume landscape o tablet — algunos
layouts se cortan o quedan apretados.

**Idea**: detectar `window.matchMedia("(orientation: portrait) and (max-width: 600px)")`
y mostrar un overlay "Girá tu dispositivo a horizontal para una mejor
experiencia" con icono de rotación. O alternativamente, un layout
adaptado para portrait que reorganice rail timer arriba en vez de a
la derecha.

**Quién pidió**: Jota, varios turnos atrás.

**Tamaño**: mediano. Cambios CSS en `themes.css` + un overlay en
`StudentJoin.jsx`.

---

### History page

**Problema**: el profe no tiene una vista cronológica de todas las
sesiones que lanzó. Hoy puede ver decks individuales pero no "qué
hice esta semana".

**Estado**: mockups visuales aprobados en sesiones anteriores. Falta
codear.

**Tamaño**: grande — nueva ruta `/history`, query agregada con
filtros (clase, fecha, deck), nueva página con timeline + filtros.

**Quién pidió**: Jota, hace varios meses.

---

## 🔄 Mejoras post-PR-27 (View students)

### Toast cuando el profe remueve al student

**Problema**: si un alumno está mirando una clase (`/classes/:id`) y
el profe lo remueve desde StudentsModal, el alumno no se entera
hasta refresh. La fetch que tenía cargada queda servida desde
memoria.

**Idea**: realtime subscription en `class_members` (Supabase Realtime
con filter `student_id=eq.<uid>`). Al detectar DELETE, mostrar toast
"Has sido removido de [clase X]" y navegar a `/classes` o disparar el
gating modal si era su única clase.

**Tamaño**: pequeño-mediano. Un único `useEffect` con suscripción
realtime en App.jsx o en MyClasses.jsx.

---

### Bulk remove en StudentsModal

**Problema**: a fin de semestre, el profe quiere limpiar la lista de
golpe. Hoy son N clicks (uno por alumno).

**Idea**: checkbox al lado de cada alumno + barra de acción "Remover
N seleccionados" cuando hay alguno marcado. "Seleccionar todos" en
el header.

**Tamaño**: chico — modificar `StudentsModal.jsx` con estado de
selección. La policy DELETE ya soporta bulk (el `eq("class_id",
class_id)` filtra).

---

## 💡 Ideas opcionales / nice-to-haves

### Themed slideshow mode para profes

**Problema**: cuando el profe quiere revisar respuestas con la clase
después de una sesión, no hay un modo "presentación" que avance
pregunta-por-pregunta mostrando respuestas correctas en grande.

**Idea**: nuevo modo "Discusión" en Session Results que muestra
preguntas a pantalla completa con la pregunta + respuesta correcta
+ % de aciertos, con flechas para avanzar.

**Estado**: discutido en passing, no hay diseño concreto todavía.

---

### Themed Session Results / See Correct Answers

**Estado**: ABANDONADO explícitamente por Jota ("puedo vivir sin
eso") — no reintentar a menos que él lo pida.

---

## 📐 Convenciones del proyecto

Para que cualquier PR futuro siga las reglas del proyecto:

- Migraciones: `supabase/phaseN_descripcion.sql`, idempotentes
  (`drop policy if exists` antes de `create policy`). Si crea tabla
  nueva, agregar GRANTS para `authenticated`. Si solo es ALTER,
  no hace falta.
- Comunicación: español casual, sin sycophancy.
- Antes de cambios grandes: `ask_user_input_v0` con opciones, no
  decidir solo.
- Confirmaciones del usuario: "dale" / "decidí tú" / "confio".
- Quality > speed. No batch AI generation. No data loss.
- Skills protegidos (no tocar sin permiso explícito):
  achievements, community moderation, gamification.
- Mockups antes de PRs grandes de UI (ej. PR 25 Today rebuild).

---
