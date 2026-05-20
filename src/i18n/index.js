// ─── i18n/index.js ─────────────────────────────────────────────────────
//
// PR 73: punto único de acceso a las traducciones de la app.
//
// USO BÁSICO desde un componente:
//
//   import { useT } from "../i18n";
//
//   function MyComponent({ lang }) {
//     const t = useT("myComponent", lang);
//     return <h1>{t.title}</h1>;
//   }
//
// El primer argumento es el "namespace" — el nombre que identifica al
// archivo dentro de los locales (en.js, es.js, ko.js). Cada componente
// tiene su namespace propio, así no se mezclan keys entre archivos.
//
// El segundo argumento es el `lang` actual. Lo pasamos manualmente porque
// el resto de la app ya pasa `lang` como prop a los componentes — no
// queremos romper ese contrato. En el futuro, si agregamos un context
// de lang, useT() lo puede leer de ahí cuando lang sea undefined.
//
// USO STANDALONE (fuera de React):
//
//   import { getStrings } from "../i18n";
//   const t = getStrings("myComponent", "es");
//
// Útil en helpers de lib/ que necesitan strings sin React (errores, etc).

import en from "./en";
import es from "./es";
import ko from "./ko";

// ─── Locales registry ──────────────────────────────────────────────────
// Cada locale exporta UN solo objeto con TODOS los namespaces dentro.
// Para agregar un idioma nuevo:
//   1. Crear src/i18n/<code>.js con la misma estructura
//   2. Importar acá
//   3. Agregar al objeto LOCALES
// Si en el futuro agregamos pt, fr, etc, esta es la única lista que tocar.
const LOCALES = { en, es, ko };

// Idioma por defecto si el solicitado no existe o falta un namespace.
const FALLBACK_LANG = "en";

// ─── Public API ────────────────────────────────────────────────────────

/**
 * Devuelve el objeto de strings para un namespace y lang dados.
 * Si el namespace no existe en ese lang, hace fallback a EN.
 * Si tampoco existe en EN, devuelve un objeto vacío (que no rompe en
 * componentes que hacen `t.something` — devuelve undefined en vez de
 * crashear).
 *
 * @param {string} namespace - El nombre del archivo (ej. "scanner", "decks")
 * @param {string} lang       - "en" | "es" | "ko" (default: "en")
 * @returns {object}          - Objeto con todas las strings de ese namespace
 */
export function getStrings(namespace, lang = FALLBACK_LANG) {
  const locale = LOCALES[lang] || LOCALES[FALLBACK_LANG];
  const strings = locale?.[namespace];

  // Si el namespace no existe en ese lang, intentamos EN como fallback
  if (!strings) {
    const fallbackStrings = LOCALES[FALLBACK_LANG]?.[namespace];
    if (fallbackStrings) return fallbackStrings;

    // Si tampoco en EN, devolvemos {} y avisamos en console (dev only)
    if (import.meta.env?.DEV) {
      console.warn(`[i18n] missing namespace: "${namespace}" (lang=${lang})`);
    }
    return {};
  }

  return strings;
}

/**
 * Hook React para obtener strings dentro de un componente.
 * Es un wrapper thin sobre getStrings — la diferencia es semántica:
 * los componentes usan useT(), los helpers usan getStrings().
 *
 * NOTA: hoy NO usa React context. Simplemente lee el lang del argumento.
 * En el futuro, si agregamos un LanguageContext, este es el lugar para
 * leerlo (con fallback al argumento explícito).
 *
 * @param {string} namespace - El nombre del archivo
 * @param {string} lang       - "en" | "es" | "ko"
 * @returns {object}          - Strings del namespace
 */
export function useT(namespace, lang = FALLBACK_LANG) {
  return getStrings(namespace, lang);
}

/**
 * Lista de idiomas soportados. Útil para selectores en Settings, etc.
 * Mantener sincronizado con LOCALES arriba.
 */
export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "ko", label: "한국어" },
];
