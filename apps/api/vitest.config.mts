import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// swc keeps Nest decorator metadata that esbuild/oxc would drop.
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: { include: ['src/**/*.test.ts'] },
});
