import { defineConfig } from 'vite';

// base: './' is REQUIRED for Capacitor — the native WebView loads from file://,
// so all asset paths in the built index.html must be relative.
export default defineConfig({
  base: './',
  build: {
    target: 'es2019',
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
  server: {
    host: true,
    port: 5173,
  },
});
