// PR 149 (M19): initial UI-language detection for the authenticated App shell.
//
// Pure and framework-free so it can be unit-tested directly (the App shell's
// `lang` stays a `useState` — Settings' setLang + localStorage persistence are
// unchanged). The order mirrors PublicHome's chain minus the `?lang=` URL step
// (that's a landing-page concern): an explicit saved choice wins, otherwise the
// browser language, otherwise English. profile.language overrides this later,
// once the user is logged in.

export const SUPPORTED_LANGS = ["en", "es", "ko"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

function isSupported(value: string | null | undefined): value is SupportedLang {
  return value === "en" || value === "es" || value === "ko";
}

export function resolveInitialLang({
  saved,
  navigatorLang,
}: {
  saved?: string | null;
  navigatorLang?: string | null;
} = {}): SupportedLang {
  if (isSupported(saved)) return saved;
  const browser = navigatorLang?.slice(0, 2).toLowerCase();
  if (isSupported(browser)) return browser;
  return "en";
}
