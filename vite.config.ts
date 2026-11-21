/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import en from './src/i18n/en.json'

// Static texts (manifest, index.html) come from the i18n fallback language: the browser reads them
// before the app runs. At runtime, src/i18n switches <html lang> and the meta description to the chosen language.
const FALLBACK_LANGUAGE = 'en'

export default defineConfig({
  // Relative paths: works the same on GitHub Pages (/pepita/) as at the root of any server.
  base: './',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [
    react(),
    tailwindcss(),
    { name: 'html-i18n', transformIndexHtml: (html) => html.replace('%APP_DESCRIPTION%', en.app.description) },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: en.app.name,
        short_name: en.app.name,
        description: en.app.description,
        lang: FALLBACK_LANGUAGE,
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#fbf8f3',
        theme_color: '#2f6b4f',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] },
    }),
  ],
  test: { include: ['src/**/*.test.ts'] },
})
