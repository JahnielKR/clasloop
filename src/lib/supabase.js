import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '⚠️ Missing Supabase credentials!\n' +
    'Create a .env file in the project root with:\n' +
    'VITE_SUPABASE_URL=https://your-project.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=your-anon-key'
  );
  // PR 55: en lugar de fallback silencioso a placeholder.supabase.co
  // (que confunde por días), mostramos un overlay en pantalla con el
  // error. Sólo afecta la app si las env vars NO están al hacer build.
  if (typeof document !== "undefined") {
    document.body.innerHTML = `
      <div style="font-family:sans-serif;padding:32px;background:#fff;color:#222;min-height:100vh">
        <h1 style="color:#c00">⚠️ Build sin credenciales Supabase</h1>
        <p>El archivo .env no se leyó al hacer build.</p>
        <p>VITE_SUPABASE_URL: ${supabaseUrl || "(vacío)"}</p>
        <p>VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? "(presente)" : "(vacío)"}</p>
        <p>Solución: verificar .env en raíz del proyecto, después:</p>
        <pre>npm run build &amp;&amp; npx cap sync android</pre>
      </div>
    `;
  }
  throw new Error("Missing Supabase credentials");
}

// PR 51 (FASE 2 Capacitor): flowType condicional.
//
//   - Web: 'implicit'. Es lo que veníamos usando, funciona, no se toca.
//   - Native (Capacitor): 'pkce'. Required para deep-link OAuth flow.
//     PKCE manda al endpoint del provider un "code_verifier" que después
//     se usa para canjear el code por una sesión. Más seguro y es lo
//     que Supabase recomienda para mobile.
//
// detectSessionInUrl también difiere:
//   - Web: true. Cuando Google redirige a window.location, el cliente
//     parsea los tokens del URL automáticamente.
//   - Native: false. En native el redirect va a un deep link, no a
//     window.location, así que el cliente NO debe intentar parsear el
//     URL inicial. native-oauth.js maneja el flow manualmente.
const isNative = Capacitor.isNativePlatform();

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: !isNative,
      flowType: isNative ? 'pkce' : 'implicit',
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);
