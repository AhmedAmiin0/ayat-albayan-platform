// The Vite config of every web workspace (apps/staff-web, apps/family-web and
// packages/web-kit, docs/51 §2): one factory, so the configs are not clones. The kit ships SOURCE
// (the React Compiler and import.meta.env need Vite), resolved through its package.json `exports`.
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { kitPublic } from './vite-public.js';

/**
 * `dir`: the workspace folder (import.meta.dirname). `port`: the dev server's. `routes`: the app
 * has TanStack file routes (src/routes). `cacheDir`: a second dev server's own Vite cache.
 * `kitDir`, `brandDir`: absolute folders of @ab/web-kit and of @ab/catalog's brand marks, named by
 * the caller so this package reaches into neither. `icons`: the app's icon set in <kitDir>/icons,
 * served at its root (vite-public.js). `client`: the app's name in its X-AB-Client tag.
 */
export function webConfig(options) {
  const { dir, port, routes = true, cacheDir, kitDir, brandDir, icons, client = 'web' } = options;
  return defineConfig({
    define: { 'import.meta.env.VITE_CLIENT_APP': JSON.stringify(client) },
    plugins: [
      ...(routes ? [tanstackRouter({ target: 'react', autoCodeSplitting: true })] : []),
      react(),
      // React Compiler: automatic memoization, so no useMemo / useCallback /
      // memo by hand. Default target 19: React 19 ships the compiler runtime.
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
      kitPublic({ kitDir, brandDir, icons }),
    ],
    ...(cacheDir ? { cacheDir } : {}),
    resolve: {
      alias: { '@/': `${dir}/src/` },
      // One React, one query client and one router for the app and the kit's sources.
      dedupe: ['react', 'react-dom', '@tanstack/react-query', '@tanstack/react-router'],
    },
    server: { port },
  });
}
