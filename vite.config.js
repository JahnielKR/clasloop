import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ─── Vite configuration ─────────────────────────────────────────────────
// PR 50 (FASE 1 Capacitor): agregado `base: './'` para que el build
// genere rutas relativas. Capacitor sirve los archivos desde el
// filesystem nativo (file:// o capacitor:// schemes), donde rutas
// absolutas (/assets/...) no resuelven. Con './' funciona tanto en
// el dev server como en el WebView nativo.
// ─────────────────────────────────────────────────────────────────────────

export default defineConfig({
  plugins: [react()],
  // Relative paths: required for Capacitor, harmless for web hosting
  // (Vercel, Netlify, etc. también resuelven bien con ./).
  base: './',
  server: {
    port: 3000,
    open: true
  },
  build: {
    // Asegurar que el output sigue siendo dist/ (default de Vite, y lo
    // que apunta capacitor.config.ts → webDir: "dist").
    outDir: 'dist',
  },
})
