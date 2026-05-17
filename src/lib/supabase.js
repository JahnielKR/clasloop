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
  // (que confunde por días — Jota perdió 30 min con eso), mostramos
  // un overlay en pantalla con el error. Sólo afecta la app si las
  // env vars NO están al hacer build (caso degenerado).
  if (typeof document !== "undefined") {
    document.body.innerHTML = `
      <div style="font-family:'DM Sans',sans-serif;padding:32px;background:#fff;color:#1a1a1a;min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;max-width:520px;margin:0 auto">
        <div style="font-size:14px;color:#999;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px">Build error</div>
        <h1 style="font-size:24px;font-weight:600;margin:0 0 16px 0;line-height:1.3">No se cargaron las credenciales de Supabase al hacer build</h1>
        <p style="font-size:15px;color:#555;line-height:1.6;margin:0 0 24px 0">El archivo <code style="background:#f4f4f0;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:14px">.env</code> no se leyó. La app no puede arrancar sin esto.</p>
        <div style="background:#f9f9f5;border:1px solid #eaeae0;border-radius:8px;padding:16px;font-family:monospace;font-size:13px;width:100%;box-sizing:border-box;margin-bottom:24px">
          <div style="color:#666;margin-bottom:4px">VITE_SUPABASE_URL</div>
          <div style="color:${supabaseUrl ? "#1a1a1a" : "#c00"}">${supabaseUrl || "(vacío)"}</div>
          <div style="color:#666;margin-top:12px;margin-bottom:4px">VITE_SUPABASE_ANON_KEY</div>
          <div style="color:${supabaseAnonKey ? "#1a1a1a" : "#c00"}">${supabaseAnonKey ? "(presente)" : "(vacío)"}</div>
        </div>
        <div style="font-size:14px;color:#555;line-height:1.6">
          <strong style="color:#1a1a1a">Solución:</strong><br/>
          1. Verificar que <code style="background:#f4f4f0;padding:2px 6px;border-radius:4px;font-family:monospace">.env</code> existe en la raíz del proyecto<br/>
          2. Re-build:
          <pre style="background:#1a1a1a;color:#fff;padding:12px 16px;border-radius:6px;margin-top:8px;font-size:13px;overflow-x:auto">npm run build
npx cap sync android</pre>
        </div>
      </div>
    `;
  }
  throw new Error("Missing Supabase credentials — see overlay or console");
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
