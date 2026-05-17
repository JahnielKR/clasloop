// ─── lib/native-oauth.js ───────────────────────────────────────────────
//
// PR 51 (FASE 2 Capacitor): Google OAuth flow para Capacitor con deep
// linking + PKCE.
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
//   2. Abrir ese URL con @capacitor/browser:
//        Browser.open({ url }).
//      Esto abre Chrome Custom Tabs en Android (browser nativo, no
//      WebView de la app). El usuario completa el flow de Google ahí.
//
//   3. Cuando Google termina, redirige a 'com.clasloop.app://auth-callback'
//      con tokens en el URL. El OS de Android, gracias al deep link
//      configurado en AndroidManifest.xml, abre nuestra app pasándole
//      ese URL via el evento 'appUrlOpen' de @capacitor/app.
//
//   4. Recibimos el evento, extraemos los tokens del URL, y los pasamos
//      a supabase.auth.exchangeCodeForSession para crear la sesión.
//
//   5. Cerramos Chrome Custom Tabs con Browser.close().
//
// Resultado: profile.id existe, App.jsx detecta SIGNED_IN, fetchProfile
// corre, y la UI navega a la home como en web.
//
// IMPORTANTE: la URL custom 'com.clasloop.app://auth-callback' tiene que
// estar registrada en TRES lugares:
//   1. Supabase Dashboard → Authentication → URL Configuration →
//      Redirect URLs (Jota lo agregó manualmente en FASE 2)
//   2. android/app/src/main/AndroidManifest.xml → intent-filter para
//      el scheme com.clasloop.app
//   3. Acá abajo, en REDIRECT_URI
//
// Si alguno de los 3 no coincide, el flow falla silenciosamente.

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
 *   - Error si el deep link callback no llega en 5 minutos
 *   - Error si el exchange falla
 */
export async function googleOAuthNative() {
  // 1. Limpiar cualquier listener previo (por si el usuario canceló
  // antes y se reintenta).
  if (inFlightListener) {
    inFlightListener.remove();
    inFlightListener = null;
  }

  // 2. Pedirle a Supabase el URL del flow, sin redirigir
  //
  // PR 58 fix bug 2: prompt='select_account' fuerza a Google a mostrar
  // siempre el selector de cuenta, en lugar de loguear automáticamente
  // la última cuenta usada en el browser/sistema. Sin esto, una vez que
  // un usuario se logueó, es imposible loguearse con otra cuenta en el
  // mismo dispositivo sin abrir modo incógnito.
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

  // 3. Registrar listener para el deep link callback ANTES de abrir el
  // browser, así no perdemos el evento si el flow es muy rápido.
  const callbackPromise = waitForDeepLinkCallback();

  // 4. Abrir el URL en Chrome Custom Tabs (Android) / SFSafariViewController
  // (iOS cuando se agregue). Browser plugin maneja la diferencia.
  await Browser.open({
    url: data.url,
    presentationStyle: "popover", // iOS: presentación modal
  });

  // 5. Esperar el deep link. Timeout 5 minutos por si el usuario se
  // queda colgado y nunca completa el flow.
  let callbackUrl;
  try {
    callbackUrl = await Promise.race([
      callbackPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("OAuth timeout (5 min)")), 5 * 60 * 1000)
      ),
    ]);
  } finally {
    // Cerrar el browser sí o sí — éxito o error.
    try { await Browser.close(); } catch {}
  }

  // 6. Parsear el URL del callback. Supabase puede devolverlo de dos
  // formas según el flow:
  //   - PKCE: ?code=...&state=...  → hay que llamar exchangeCodeForSession
  //   - Implicit (fallback raro): #access_token=...&refresh_token=...
  //
  // Para PKCE, el "code" del query string es lo que canjeamos.
  const url = new URL(callbackUrl);
  const code = url.searchParams.get("code");
  const errorParam = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (errorParam) {
    throw new Error(`Google OAuth declined: ${errorDescription || errorParam}`);
  }

  if (!code) {
    // Tal vez vino en el hash (implicit flow fallback)
    const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    if (accessToken && refreshToken) {
      const { error: setErr } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (setErr) throw new Error(`setSession failed: ${setErr.message}`);
      return;
    }
    throw new Error("No code or tokens in OAuth callback URL");
  }

  // 7. PKCE exchange: code → session
  const { error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
  if (exchErr) {
    throw new Error(`exchangeCodeForSession failed: ${exchErr.message}`);
  }
}

/**
 * Devuelve una promesa que resuelve con el URL completo cuando llega un
 * evento appUrlOpen que matchea nuestro REDIRECT_URI.
 *
 * El listener se auto-limpia al disparar.
 */
function waitForDeepLinkCallback() {
  return new Promise((resolve) => {
    inFlightListener = CapApp.addListener("appUrlOpen", (event) => {
      // event.url es algo como "com.clasloop.app://auth-callback?code=..."
      if (event.url && event.url.startsWith(REDIRECT_URI)) {
        if (inFlightListener) {
          inFlightListener.remove();
          inFlightListener = null;
        }
        resolve(event.url);
      }
    });
  });
}
