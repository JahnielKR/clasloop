// ─── lib/native-pdf.js ─────────────────────────────────────────────────
//
// PR 54 (FASE 2 Capacitor): guardar y compartir PDFs en la app nativa.
// PR 59.1 (HOTFIX): cambio de Directory.Documents → Directory.Cache.
//
// Problema histórico: en la web, jsPDF.save() funciona porque hace
//   URL.createObjectURL(blob) + <a download> click
// y el browser dispara la descarga. Pero en WebView de Capacitor,
// los blob: URLs no se mapean a ningún download manager → el usuario
// aprieta "exportar" y no pasa nada visible.
//
// Solución original (PR 54): doc.output → Filesystem.writeFile en
// Documents → Share.share. Funcionaba en testing pero...
//
// BUG REPORTADO (Jota, post PR 58.1): "EACCES Permission denied" al
// intentar escribir en /storage/emulated/0/Documents/ desde la tablet.
//
// CAUSA: desde Android 10+ (API 29, "Scoped Storage"), las apps NO
// pueden escribir directamente en /storage/emulated/0/Documents/ ni
// otras carpetas públicas sin permisos especiales (MANAGE_EXTERNAL_STORAGE
// que Google audita y rechaza para apps consumer).
//
// FIX (PR 59.1): usar Directory.Cache que es el cache privado de la app
// (~/Android/data/com.clasloop.app/cache/). NO requiere permisos. El
// archivo ahí no es visible para el user "casualmente" — pero como
// inmediatamente abrimos Share.share() con su URI, el sistema lo
// expone a través del share sheet (donde el user elige Drive, Gmail,
// imprimir, guardar a Downloads, etc).
//
// Cache es perfecto para PDFs efímeros:
//   - NO requiere permisos
//   - El share sheet lo abre como cualquier otro archivo
//   - Android limpia el cache automáticamente cuando hace falta espacio
//   - Si el user lo "guarda" desde el share sheet, queda en Downloads
//     o donde elija (no en cache)

import { Capacitor } from "@capacitor/core";

/**
 * Saves a jsPDF document to the device and opens the share sheet.
 * Use this instead of doc.save() in code paths that may run in
 * Capacitor.
 *
 * Throws on error so the caller can show a fallback message.
 *
 * @param {jsPDF} doc       jsPDF document instance
 * @param {string} filename e.g. "math-quiz_exam.pdf"
 */
export async function savePdfNative(doc, filename) {
  // Lazy-load plugins so the web bundle doesn't include them.
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const { Share } = await import("@capacitor/share");

  // 1. Get PDF bytes as base64.
  const dataUri = doc.output("datauristring");
  const base64 = dataUri.split(",")[1];

  // 2. Write to Cache directory (PR 59.1 hotfix).
  //    Directory.Cache es ~/Android/data/com.clasloop.app/cache/ — privado,
  //    NO requiere permisos. Ideal para archivos efímeros que se comparten
  //    inmediatamente vía share sheet.
  await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Cache,
    recursive: true,
  });

  // 3. Get a sharable URI (file:// path the OS understands).
  const uriResult = await Filesystem.getUri({
    path: filename,
    directory: Directory.Cache,
  });

  // 4. Open the share sheet. El share sheet expone el archivo a otras
  //    apps (Drive, Gmail, WhatsApp, impresora, "Guardar en Downloads",
  //    etc) usando FileProvider de Android — eso funciona aunque el
  //    archivo esté en cache privado.
  await Share.share({
    title: filename,
    text: filename,
    url: uriResult.uri,
    dialogTitle: "Save or share PDF",
  });
}

/**
 * Wrapper that picks the right strategy based on platform.
 * Web: doc.save() (standard browser download).
 * Native: savePdfNative() (file + share sheet).
 */
export async function savePdfCrossPlatform(doc, filename) {
  if (Capacitor.isNativePlatform()) {
    await savePdfNative(doc, filename);
  } else {
    doc.save(filename);
  }
}
