import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Single Vite workspace for both frontend apps (landing at "/", auth at
// "/auth/"), built as a multi-page app so both share one dependency tree,
// one node_modules, and one output pass. Builds into ../BackEnd/public —
// the existing Express catch-all (res.sendFile(public/index.html) for
// non-/api GETs) and static middleware serve it as-is, zero server.js
// changes needed. Both pages share one `base: '/'` and one `assets/`
// output folder — asset URLs are root-absolute, so it doesn't matter which
// page requested them, and shared chunks (React, framer-motion) get
// deduped by Rollup instead of shipped twice.
export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@landing': fileURLToPath(new URL('./src/landing', import.meta.url)),
      '@auth': fileURLToPath(new URL('./src/auth', import.meta.url))
    }
  },
  build: {
    outDir: '../BackEnd/public',
    emptyOutDir: true,
    // The backend's CSP is font-src/img-src 'self' (no data:) — never let
    // small assets (self-hosted font subsets in particular) get inlined as
    // data: URIs, or the browser silently blocks them.
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        auth: fileURLToPath(new URL('./auth/index.html', import.meta.url))
      }
    }
  },
  server: {
    port: 5175,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
});
