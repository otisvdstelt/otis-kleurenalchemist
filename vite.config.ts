/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // three.js en alles wat erbij hoort landt in één luie chunk, zodat de papieren laag eerst staat
    chunkSizeWarningLimit: 1300,
  },
  worker: {
    format: 'es',
  },
  test: {
    // De kleurkern is pure TypeScript, dus geen DOM nodig
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
