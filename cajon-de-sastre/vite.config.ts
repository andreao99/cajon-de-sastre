import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

// VITE_BASE lo fija el workflow de GitHub Pages (p. ej. "/mi-repo/")
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Cajón de sastre', short_name: 'Cajón', description: 'Tu lanzador personal de mini-apps',
        lang: 'es', start_url: base, scope: base, display: 'standalone', orientation: 'portrait',
        background_color: '#F5EEE3', theme_color: '#F5EEE3',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // Precarga de la app (incluye la fuente) para que arranque sin conexión; los datos van por IndexedDB/Firestore
      workbox: { globPatterns: ['**/*.{js,css,html,png,woff2,svg}'], navigateFallback: `${base}index.html`, cleanupOutdatedCaches: true },
    }),
  ],
  test: { environment: 'jsdom' },
});
