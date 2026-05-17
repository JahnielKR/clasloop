// ─── lib/native-pdf.js ─────────────────────────────────────────────────
//
// PR 54 (FASE 2 Capacitor): guardar y compartir PDFs en la app nativa.
//
// Problema: en la web, jsPDF.save() funciona porque hace
//   URL.createObjectURL(blob) + <a download> click
// y el browser dispara la descarga. Pero en WebView de Capacitor,
// los blob: URLs no se mapean a ningún download manager → el usuario
// aprieta "exportar" y no pasa nada visible.
//
// Solución: en native, hacemos:
//   1. doc.output('arraybuffer') → bytes del PDF
//   2. Filesystem.writeFile() → guardar como archivo en el storage
//      del device (carpeta Documents, accessible al sharing system)
//   3. Filesystem.getUri() → resolver el URI del archivo guardado
//   4. Share.share() → abrir el "share sheet" nativo de Android
//      donde el usuario elige qué hacer:
//        - Abrir en un PDF reader (preview)
//        - Mandarlo por WhatsApp / Gmail / Drive
//        - Guardarlo a Downloads
//        - Imprimir (si tiene impresora configurada)
//
// El share sheet es la UX estándar en mobile: deja al usuario decidir.

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

  // 1. Get PDF bytes as base64. jsPDF supports output('datauristring')
  //    which gives us "data:application/pdf;base64,JVBE...".
  //    Strip the prefix to get raw base64.
  const dataUri = doc.output("datauristring");
  const base64 = dataUri.split(",")[1];

  // 2. Write to Documents directory.
  //    `recursive: true` ensures the parent dir exists.
  const writeResult = await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Documents,
    recursive: true,
  });

  // 3. Get a sharable URI (file:// path the OS understands).
  const uriResult = await Filesystem.getUri({
    path: filename,
    directory: Directory.Documents,
  });

  // 4. Open the share sheet.
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
 *
 * Use this everywhere instead of calling doc.save() directly.
 */
export async function savePdfCrossPlatform(doc, filename) {
  if (Capacitor.isNativePlatform()) {
    await savePdfNative(doc, filename);
  } else {
    doc.save(filename);
  }
}
