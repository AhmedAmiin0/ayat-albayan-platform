import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Outside the React Compiler for now: the inbox reads tab-memory stores during render (MessageLog's lastOwnSend),
// which the compiler caches, and 3 inbox unit tests broke (MessageLog.jump, ReplyComposer.send / .slash). Once those
// reads subscribe through useSyncExternalStore like staged-store, drop this; eslint.config.js lifts the no-memo rule
// for the same folder.
const NOT_COMPILED = /[\\/]src[\\/]features[\\/]messaging[\\/]inbox[\\/]/;

export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    // React Compiler (owner 2026-10-30): automatic memoization, so no useMemo / useCallback / memo by hand.
    // target 18: React 18 has no built-in compiler runtime, react-compiler-runtime provides it.
    babel({ presets: [reactCompilerPreset({ target: '18', sources: (file) => !NOT_COMPILED.test(file) })] }),
    tailwindcss(),
  ],
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
