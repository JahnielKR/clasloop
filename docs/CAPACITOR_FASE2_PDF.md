# FASE 2 (Parte 3) — PDF export en mobile

**Estado:** código listo. Falta correr 1 comando local + rebuild.

---

## Lo que cambia

**Web:** sin cambios. Sigue descargando el PDF directo al folder de Downloads.

**Native:** ahora `doc.save()` no se llama directo. En su lugar:
1. El PDF se escribe al **Documents** del device
2. Aparece el **share sheet nativo** de Android con opciones:
   - Abrir en PDF reader (preview)
   - Mandar por WhatsApp / Gmail / Drive / Telegram
   - Guardar a Downloads (si la app de Files está)
   - Imprimir (si tenés impresora configurada)

UX mucho mejor que "se descargó a algún lado" — el sistema le da al
profe el menú de qué hacer con el archivo.

---

## Pasos a correr

```powershell
cd C:\path\a\clasloop-phase1
git pull origin feature/capacitor-android
npm install
npm run build
npx cap sync android
```

(No hace falta regenerar android/ esta vez — `cap sync` con los plugins
nuevos es suficiente.)

En Android Studio:
- Build → Clean Project → Rebuild → Run

(No hace falta desinstalar la app esta vez, no cambian assets visuales.)

---

## Cómo probar

1. Login en la app
2. Ir a un deck con preguntas
3. Apretar "Export PDF" / "Imprimir" / lo que dispare la modal de PDF
4. Click "Download"
5. **Debería aparecer el share sheet de Android** con apps disponibles
6. Elegí "Drive", o "WhatsApp", o un PDF reader si tenés instalado
7. El PDF debería abrirse / compartirse

---

## Si algo falla

### Sigue sin hacer nada al apretar Download
- Abrí DevTools (chrome://inspect/#devices) y mirá Console
- Buscá errores tipo "Plugin not implemented" o "Filesystem error"
- Pasame los errores

### Aparece error "Permission denied"
- Filesystem.Directory.Documents no necesita permisos especiales
  en Android 11+, pero por las dudas verificar que el manifest no
  tenga conflictos. Si pasa, decímelo y revisamos.

### Share sheet aparece pero al elegir app no funciona
- Algunas apps (especialmente Drive) requieren que el URI tenga
  permisos de "FileProvider". Capacitor maneja esto pero si ves
  errores, puede que falte config. Decime qué app intentaste.

---

## Lo que sigue

- Safe areas (notch / nav bar)
- Keyboard avoiding (inputs no se tapan)
- Smoke test general

Decime cómo va con el PDF.
