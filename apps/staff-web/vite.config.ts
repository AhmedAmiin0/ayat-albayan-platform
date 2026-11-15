import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const STYLESHEET = /\.css($|\?)/;
// fsModuleCache keys a module by its own content; Tailwind builds a stylesheet from every source
// file, so stylesheets are always transformed afresh, never read from the cache.
const noStylesheetCache: Plugin = {
  name: 'ab:no-stylesheet-fs-cache',
  configureVitest: ({ defineCacheKeyGenerator }) => {
    defineCacheKeyGenerator(({ id }) => (STYLESHEET.test(id) ? false : undefined));
  },
};

export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    // React Compiler (owner 2026-10-30): automatic memoization, so no useMemo / useCallback / memo by hand.
    // Default target 19: React 19 ships the compiler runtime (react/compiler-runtime).
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    noStylesheetCache,
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 5173 },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    // Transforms persist across runs in <repo>/node_modules/.vitest-cache (ci.yml restores it).
    fsModuleCache: true,
    setupFiles: ['src/test-setup.ts'],
    // Multi-step wizard/drawer flows take ~1.5s alone and >5s under parallel `turbo test` load.
    testTimeout: 20_000,
    // tokens.test.ts / avatar-tones.test.ts read their raw sheets; every other stylesheet stays stubbed.
    css: { include: [/styles\/(tokens|motion|avatar-tones)\.css/, /src\/index\.css/] },
    env: { VITE_SUPABASE_URL: 'http://sb.test', VITE_SUPABASE_ANON_KEY: 'anon', VITE_API_URL: 'http://api.test' },
  },
});
