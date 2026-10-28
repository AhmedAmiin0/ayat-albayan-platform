import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 5173 },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test-setup.ts'],
    // Multi-step wizard/drawer flows take ~1.5s alone and >5s under parallel `turbo test` load.
    testTimeout: 20_000,
    // tokens.test.ts / avatar-tones.test.ts read their raw sheets; every other stylesheet stays stubbed.
    css: { include: [/styles\/(tokens|motion|avatar-tones)\.css/, /src\/index\.css/] },
    env: { VITE_SUPABASE_URL: 'http://sb.test', VITE_SUPABASE_ANON_KEY: 'anon', VITE_API_URL: 'http://api.test' },
  },
});
