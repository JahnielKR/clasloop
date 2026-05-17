// ─── lib/capacitor-boot.js ──────────────────────────────────────────────
//
// PR 50 (FASE 1 Capacitor): inicialización de plugins nativos.
//
// Se ejecuta al arrancar la app dentro de Capacitor. En web es no-op
// gracias al guard `isNativePlatform()`. Acciones:
//
//   1. Esconder el splash screen una vez que React montó (evita flash)
//   2. Setear color de status bar (oscuro coherente con el splash)
//   3. Hookear hardware back button de Android: hace history.back() en
//      lugar de cerrar la app. Si no hay nada atrás, sí cierra.
//   4. Configurar el comportamiento del teclado (resize body sin saltos)
//
// Se llama desde main.jsx después de createRoot().render().

import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Keyboard } from "@capacitor/keyboard";

let booted = false;

export async function bootCapacitor() {
  if (!Capacitor.isNativePlatform()) return; // web: no-op
  if (booted) return; // idempotente, por si React StrictMode lo monta 2 veces
  booted = true;

  // ── 1. Status bar oscura coherente con el splash ──
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#1a1a1a" });
  } catch (err) {
    // StatusBar plugin no está disponible en algunas versiones de
    // Android antiguas. No crítico.
    console.warn("[capacitor] StatusBar setup failed:", err);
  }

  // ── 2. Hardware back button (Android) ──
  // Por default Capacitor cierra la app cuando se aprieta back. Lo
  // hookeamos: si el history tiene más de 1 entrada, hace back. Si está
  // en la raíz, sí cierra la app (comportamiento esperado).
  try {
    CapApp.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        CapApp.exitApp();
      }
    });
  } catch (err) {
    console.warn("[capacitor] backButton listener failed:", err);
  }

  // ── 3. Splash screen: hide manual ──
  // El config tiene launchAutoHide: false, así que lo cerramos cuando
  // React ya pintó. Esperamos un beat extra para que termine la primera
  // pintada del shell.
  try {
    await new Promise(r => setTimeout(r, 300));
    await SplashScreen.hide();
  } catch (err) {
    console.warn("[capacitor] splash hide failed:", err);
  }

  // ── 4. Keyboard listeners (placeholder, será relevante en FASE 2) ──
  // Por ahora solo logueamos para diagnóstico. Cuando llegue el momento
  // de pulir mobile keyboard avoiding, expandimos acá.
  if (Keyboard?.addListener) {
    try {
      Keyboard.addListener("keyboardWillShow", info => {
        document.documentElement.style.setProperty(
          "--cl-kb-height", `${info.keyboardHeight}px`
        );
      });
      Keyboard.addListener("keyboardWillHide", () => {
        document.documentElement.style.setProperty("--cl-kb-height", "0px");
      });
    } catch (err) {
      console.warn("[capacitor] keyboard listeners failed:", err);
    }
  }
}
