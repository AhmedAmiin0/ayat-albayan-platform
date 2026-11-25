import { webConfig } from '@ab/config/vite';
import { testConfig } from '@ab/testing/vitest';
import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vite';

// The kit's own tests (docs/51 §2): the apps' config, without routes or a dev server.
export default mergeConfig(
  webConfig({
    dir: import.meta.dirname,
    port: 5199,
    routes: false,
    kitDir: import.meta.dirname,
    brandDir: fileURLToPath(new URL('../catalog/brand', import.meta.url)),
  }),
  testConfig({ kind: 'web', setupFiles: ['src/testing/test-setup.ts'] }),
);
