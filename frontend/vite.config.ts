import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Lens — Look closer at your data',
        short_name: 'Lens',
        description: 'AI-powered data analysis in your pocket',
        theme_color: '#1e1b4b',
        background_color: '#0f0a2e',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'lens-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'lens-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'lens-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
      devOptions: { enabled: true },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
