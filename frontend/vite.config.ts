import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(process.env.SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: process.env.SENTRY_AUTH_TOKEN,
            sourcemaps: {
              filesToDeleteAfterUpload: '**/*.js.map',
            },
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
    allowedHosts: (() => {
      const raw =
        process.env.VITE_ALLOWED_HOSTS ??
        process.env.ALLOWED_HOSTS ??
        process.env.NGROK_HOST ??
        "";
      if (!raw) return [];
      return raw
        .split(",")
        .map((h) => h.trim())
        .filter(Boolean);
    })(),
  },
  build: {
    sourcemap: true,
  },
})
