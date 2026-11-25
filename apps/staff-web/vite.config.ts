import { webConfig } from '@ab/config/vite';
import { testConfig } from '@ab/testing/vitest';
import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vite';

const kitDir = fileURLToPath(new URL('../../packages/web-kit', import.meta.url));

// The staff app (app.ayatalbayan.com): the shared web config (docs/51 §2), on the usual dev port.
export default mergeConfig(
  webConfig({
    dir: import.meta.dirname,
    port: 5173,
    icons: 'staff',
    kitDir,
    brandDir: fileURLToPath(new URL('../../packages/catalog/brand', import.meta.url)),
  }),
  testConfig({ kind: 'web', setupFiles: [`${kitDir}/src/testing/test-setup.ts`] }),
);
