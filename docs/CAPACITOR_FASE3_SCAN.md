# FASE 3 — Scan sheet con ML Kit nativo (PR 57)

**Estado:** PR 57.1 (DB schema) listo. PR 57.2-4 vienen después.

---

## Estructura del feature

**PR 57.1 — DB Schema** (este zip)
- Tabla `scans` con todos los campos + RLS
- Storage bucket `scan-images` privado
- Auto-expire 7 días via cron job hourly
- Migration: `supabase/pr57_scans_table.sql`

**PR 57.2 — Scanner ML Kit** (próximo)
- Instalar plugins `@capacitor-mlkit/document-scanner` + `barcode-scanning`
- `src/lib/scanner-mlkit.js`: wrapper de ML Kit + sampling de burbujas
- Borrar `src/lib/scanner-cv.js` (~600 líneas, deprecated)

**PR 57.3 — Scanner UI** (después)
- Reescribir `src/pages/Scanner.jsx` con stages simples
- Componente `BubbleOverlay` con verde/rojo encima de la foto
- Stage de revisión de burbujas dudosas

**PR 57.4 — /scans + web banner + sidebar** (último)
- Página `/scans` con histórico
- Banner "Descargá la app" en web (con QR Android, Coming soon iOS)
- Reactivar sidebar item Scanner

---

## PR 57.1 — Instrucciones de deploy

### 1. Aplicar migration en Supabase

```powershell
# Si tenés Supabase CLI:
supabase db push

# Si NO tenés CLI (más común), usar Dashboard:
# 1. Andá a https://supabase.com/dashboard/project/TU_PROYECTO
# 2. SQL Editor → New Query
# 3. Copiá el contenido de supabase/pr57_scans_table.sql
# 4. Click "Run"
# 5. Verificar en Database → Tables que aparezca 'scans'
# 6. Verificar en Database → Extensions que pg_cron esté habilitado
#    (Si no está, habilitalo: Settings → Database → Extensions → pg_cron)
```

### 2. Verificar el bucket

En Supabase Dashboard → Storage:
- Debería aparecer un bucket `scan-images`
- Marcado como "Private" (no público)

### 3. Verificar el cron job

En Dashboard → Database → Cron:
- Debería aparecer un job `cleanup_expired_scans`
- Schedule: `17 * * * *` (cada hora a los 17 minutos)
- Si NO aparece: pg_cron no está habilitado en tu proyecto.
  Andá a Settings → Database → Extensions y habilitá `pg_cron`.
  Después re-corré la migration.

### 4. Test manual del cleanup

Si querés probar que el cleanup funciona:

```sql
-- Crear un scan expirado para test
insert into public.scans (teacher_id, deck_id, score, total, expires_at)
values (auth.uid(), 'CUALQUIER_DECK_ID', 5, 10, now() - interval '1 day');

-- Llamar la función manualmente
select public.cleanup_expired_scans();

-- Verificar que se borró
select count(*) from public.scans where expires_at < now();
-- Debería ser 0
```

---

## Lo que NO se hace en este PR

- **Frontend code**: solo schema. La UI viene en PR 57.3.
- **Plugins de Capacitor**: vienen en PR 57.2.
- **Borrado del scanner-cv.js viejo**: se mantiene por ahora, lo borramos en PR 57.2.

---

## Decisiones documentadas

- **Expira 7 días**: ephemeral, evita costo de storage acumulado, privacidad.
- **Bucket privado**: imágenes accesibles vía signed URLs solamente.
- **answers_json estructura**: array de `{question_id, marked, correct, is_correct, confidence, is_uncertain}`. Esto permite reconstruir overlay verde/rojo + identificar burbujas dudosas que necesitan review.
- **expires_at en cada row**: permite borrado individual (e.g. profe decide extender o borrar un scan específico).
- **Cron en SQL**: pg_cron es la opción más simple. Si no está disponible, el cleanup hay que dispararlo manualmente o via Edge Function programada.

---

## Cuando me pases el OK

Continúo con PR 57.2 (plugins ML Kit + scanner-mlkit.js).
