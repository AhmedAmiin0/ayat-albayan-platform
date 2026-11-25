// The api build: one CommonJS file per entry (bundle/entries.mjs) that inlines the workspace
// packages from their TypeScript source, so `node dist/main.js` needs no package dist.
import { join } from 'node:path';
import { defineConfig } from 'rolldown';
import swc from 'unplugin-swc';
import { ENTRIES } from './bundle/entries.mjs';
import { isExternal } from './bundle/externals.mjs';
import { readManifest } from './bundle/manifest.mjs';

const root = import.meta.dirname;
const { dependencies } = readManifest(root);

const bundle = ([name, input]) => ({
  input: { [name]: input },
  platform: 'node',
  external: isExternal(dependencies),
  resolve: { alias: { '@': join(root, 'src') } },
  // swc keeps Nest's decorator metadata (emitDecoratorMetadata) that oxc would not emit.
  plugins: [swc.rolldown({ module: { type: 'es6' } })],
  output: { dir: 'dist', format: 'cjs', sourcemap: true, codeSplitting: false },
});

export default defineConfig(Object.entries(ENTRIES).map(bundle));
