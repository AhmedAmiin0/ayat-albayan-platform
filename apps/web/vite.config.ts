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
    // tokens.test.ts reads the raw token sheet; every other stylesheet stays stubbed.
    css: { include: [/styles\/tokens\.css/] },
    env: { VITE_SUPABASE_URL: 'http://sb.test', VITE_SUPABASE_ANON_KEY: 'anon', VITE_API_URL: 'http://api.test' },
  },
});
