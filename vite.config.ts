import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// GitHub Pages serves a project site from https://<user>.github.io/<repo>/,
// so the built asset URLs need that sub-path baked in. Locally (dev, preview,
// tests) we stay at the root. GITHUB_ACTIONS is set to "true" by the runner.
const base = process.env.GITHUB_ACTIONS ? '/Shashtos_game/' : '/'

export default defineConfig({
  base,
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
