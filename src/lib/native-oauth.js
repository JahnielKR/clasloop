// ─── lib/native-oauth.js ───────────────────────────────────────────────
//
// PR 51 (FASE 2 Capacitor): Google OAuth flow para Capacitor con deep
// linking + PKCE.
//
// PR 96 (auditoría 2026-05-21): cerramos dos huecos:
//   - El `state` que Supabase ponía en el outbound URL nunca se
//     extraía ni validaba en el callback. PKCE protege contra code
//     substitution, pero `state` es lo que defiende contra que el OS
//     entregue un code viejo/replayed/cross-flow. Sin validarlo, un
//     attacker que registre el mismo scheme podría racear el callback.
//   - El fallback "implicit-flow" (hash tokens en el URL) era código
//     muerto bajo PKCE pero un attacker con un appUrlOpen craftado
//     (`com.clasloop.app://auth-callback#access_token=...&refresh_token=...`)
//     podía plantar una sesión de su account en el device de la víctima
//     (session fixation). Borrado por completo — PKCE NUNCA devuelve
//     tokens en el hash.
//
// Flujo:
//
//   1. Llamar supabase.auth.signInWithOAuth con:
//        - provider: 'google'
//        - redirectTo: 'com.clasloop.app://auth-callback'
//        - skipBrowserRedirect: true  (Supabase NO redirige
//          window.location; nos devuelve un URL para que lo abramos
//          manualmente)
//      → Supabase devuelve { data: { url: '...' } } donde url es el
//        endpoint de Google con el code_verifier de PKCE ya armado.
//
//   2. ANTES de abrir el browser: extraemos el `state` param del
//      `data.url` y lo guardamos en una variable de scope. Cuando
//      vuelva el callback, comparamos.
//
//   3. Abrir ese URL con @capacitor/browser. Chrome Custom Tabs en
//      Android (browser nativo, no WebView). El user completa Google.
//
//   4. Cuando Google termina, redirige a 'com.clasloop.app://auth-callback'
//      con `?code=...&state=...`. El OS abre nuestra app via deep link.
//
//   5. Recibimos el evento, validamos `state`, canjeamos el `code` por
//      sesión con supabase.auth.exchangeCodeForSession.
//
//   6. Cerramos Chrome Custom Tabs.
//
// La URL custom 'com.clasloop.app://auth-callback' tiene que estar
// registrada en TRES lugares:
//   1. Supabase Dashboard → Authentication → URL Configuration →
//      Redirect URLs
//   2. android/app/src/main/AndroidManifest.xml → intent-filter para
//      el scheme com.clasloop.app
//   3. Acá abajo, en REDIRECT_URI

import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { supabase } from "./supabase";

const REDIRECT_URI = "com.clasloop.app://auth-callback";

let inFlightListener = null; // limpieza del listener entre intentos

/**
 * Inicia el flow de Google OAuth en Capacitor.
 *
 * Devuelve una promesa que resuelve cuando la sesión se estableció,
 * o rechaza con un Error si algo falla en el camino.
 *
 * Throws:
 *   - Error si Supabase no devuelve el URL para iniciar
 *   - Error si no hay `state` en el URL outbound (Supabase config rota)
 *   - Error si el deep link callback no llega en 5 minutos
 *   - Error si el `state` del callback no coincide con el outbound
 *   - Error si el exchange falla
 */
export async function googleOAuthNative() {
  // 1. Limpiar cualquier listener previo (por si el user canceló antes
  // y se reintenta).
  if (inFlightListener) {
    inFlightListener.remove();
    inFlightListener = null;
  }

  // 2. Pedirle a Supabase el URL del flow, sin redirigir.
  //
  // PR 58 fix bug 2: prompt='select_account' fuerza a Google a mostrar
  // siempre el selector de cuenta, en lugar de loguear automáticamente
  // la última cuenta usada. Sin esto, una vez logueado, es imposible
  // cambiar de cuenta sin modo incógnito.
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: REDIRECT_URI,
      skipBrowserRedirect: true,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error || !data?.url) {
    throw new Error(
      `Supabase signInWithOAuth failed: ${error?.message || "no URL returned"}`
    );
  }

  // 3. PR 96: extraer el `state` del outbound URL. Supabase lo pone en
  // el query string del URL que nos devuelve para que Google nos lo
  // refleje en el callback.
  let expectedState = null;
  try {
    expectedState = new URL(data.url).searchParams.get("state");
  } catch {
    // URL parsing failed — Supabase devolvió algo raro, abortar.
    throw new Error("OAuth URL malformed (could not parse state)");
  }
  if (!expectedState) {
    // Sin `state` no hay defensa contra replay del callback. Abortar
    // ahora en lugar de continuar con un flow vulnerable.
    throw new Error("OAuth URL missing state parameter");
  }

  // 4. Registrar listener para el deep link callback ANTES de abrir el
  // browser, así no perdemos el evento si el flow es muy rápido.
  const callbackPromise = waitForDeepLinkCallback();

  // 5. Abrir el URL en Chrome Custom Tabs (Android) / SFSafariViewController
  // (iOS cuando se agregue).
  await Browser.open({
    url: data.url,
    presentationStyle: "popover", // iOS: presentación modal
  });

  // 6. Esperar el deep link. Timeout 5 minutos.
  let callbackUrl;
  try {
    callbackUrl = await Promise.race([
      callbackPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("OAuth timeout (5 min)")), 5 * 60 * 1000)
      ),
    ]);
  } finally {
    try { await Browser.close(); } catch {}
  }

  // 7. Parsear el URL del callback. Bajo PKCE Supabase devuelve
  // `?code=...&state=...`. Cualquier otra forma (hash tokens) es
  // considerada inválida y rechazada — defensa contra session fixation.
  const url = new URL(callbackUrl);
  const code = url.searchParams.get("code");
  const callbackState = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (errorParam) {
    throw new Error(`Google OAuth declined: ${errorDescription || errorParam}`);
  }

  // 8. PR 96: validar state. Defensa contra replay y contra cross-flow
  // delivery (otro app que registre el scheme y devuelva un code de
  // OTRO flow OAuth). Comparación estricta de strings.
  if (!callbackState || callbackState !== expectedState) {
    throw new Error("OAuth state mismatch — possible replay or wrong flow");
  }

  if (!code) {
    // Bajo PKCE el code es obligatorio. Si falta, NO caemos en el
    // fallback implicit (era código muerto y vector de session
    // fixation — ver PR 96).
    throw new Error("OAuth callback missing code parameter");
  }

  // 9. PKCE exchange: code → session.
  const { error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
  if (exchErr) {
    throw new Error(`exchangeCodeForSession failed: ${exchErr.message}`);
  }
}

/**
 * Devuelve una promesa que resuelve con el URL completo cuando llega un
 * evento appUrlOpen que matchea nuestro REDIRECT_URI.
 *
 * PR 96: tightened el matching — exigimos que después del REDIRECT_URI
 * venga "?" (query string), no cualquier cosa. Esto evita que un URL
 * tipo "com.clasloop.app://auth-callbackBOGUS" matchee y dispare el
 * handler con un payload arbitrario.
 *
 * El listener se auto-limpia al disparar.
 */
function waitForDeepLinkCallback() {
  return new Promise((resolve) => {
    inFlightListener = CapApp.addListener("appUrlOpen", (event) => {
      // event.url es algo como "com.clasloop.app://auth-callback?code=..."
      if (event.url && event.url.startsWith(REDIRECT_URI + "?")) {
        if (inFlightListener) {
          inFlightListener.remove();
          inFlightListener = null;
        }
        resolve(event.url);
      }
    });
  });
}
