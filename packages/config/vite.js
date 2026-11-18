// The Vite + Vitest config of every web workspace (apps/staff-web, apps/family-web and
// packages/web-kit, docs/51 §2): one factory, so the configs are not clones. The kit ships SOURCE
// (the React Compiler and import.meta.env need Vite), so every app aliases `@ab/web-kit` to it.
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const KIT = fileURLToPath(new URL('../web-kit/src', import.meta.url));
const SW = fileURLToPath(new URL('../web-kit/public/sw.js', import.meta.url));
const STYLESHEET = /\.css($|\?)/;
// The web-push service worker (packages/web-kit/public/sw.js) at /sw.js of every app: served as is
// by the dev server, emitted beside index.html by the build (a worker's scope is its own path).
const serviceWorker = {
  name: 'ab:service-worker',
  configureServer(server) {
    server.middlewares.use('/sw.js', (_req, res) => {
      res.setHeader('Content-Type', 'text/javascript');
      res.end(readFileSync(SW));
    });
  },
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'sw.js', source: readFileSync(SW, 'utf8') });
  },
};
// fsModuleCache keys a module by its own content; Tailwind builds a stylesheet from every source
// file, so stylesheets are always transformed afresh, never read from the cache.
const noStylesheetCache = {
  name: 'ab:no-stylesheet-fs-cache',
  configureVitest: ({ defineCacheKeyGenerator }) => {
    defineCacheKeyGenerator(({ id }) => (STYLESHEET.test(id) ? false : undefined));
  },
};

const TEST_ENV = {
  VITE_SUPABASE_URL: 'http://sb.test',
  VITE_SUPABASE_ANON_KEY: 'anon',
  VITE_API_URL: 'http://api.test',
};

/**
 * `dir`: the workspace folder (import.meta.dirname). `port`: the dev server's. `routes`: the app
 * has TanStack file routes (src/routes). `cacheDir`: a second dev server's own Vite cache.
 */
export function webConfig({ dir, port, routes = true, cacheDir }) {
  return defineConfig({
    plugins: [
      ...(routes ? [tanstackRouter({ target: 'react', autoCodeSplitting: true })] : []),
      react(),
      // React Compiler (owner 2026-10-30): automatic memoization, so no useMemo / useCallback /
      // memo by hand. Default target 19: React 19 ships the compiler runtime.
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
      noStylesheetCache,
      serviceWorker,
    ],
    ...(cacheDir ? { cacheDir } : {}),
    resolve: {
      alias: { '@/': `${dir}/src/`, '@ab/web-kit/': `${KIT}/` },
      // One React, one query client and one router for the app and the kit's sources.
      dedupe: ['react', 'react-dom', '@tanstack/react-query', '@tanstack/react-router'],
    },
    server: { port },
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
      // Transforms persist across runs in <repo>/node_modules/.vitest-cache (ci.yml restores it).
      fsModuleCache: true,
      setupFiles: [`${KIT}/testing/test-setup.ts`],
      // Multi-step wizard/drawer flows take ~1.5s alone and >5s under parallel `turbo test` load.
      testTimeout: 20_000,
      // tokens / motion / avatar-tones tests read their raw sheets; every other stylesheet stays
      // stubbed.
      css: { include: [/styles\/(tokens|motion|avatar-tones)\.css/, /src\/index\.css/] },
      env: TEST_ENV,
    },
  });
}
