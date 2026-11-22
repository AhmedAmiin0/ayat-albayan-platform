import { webConfig } from '@ab/config/vite';
import { fileURLToPath } from 'node:url';

// The staff app (app.ayatalbayan.com): the shared web config (docs/51 §2), on the usual dev port.
export default webConfig({
  dir: import.meta.dirname,
  port: 5173,
  icons: 'staff',
  kitDir: fileURLToPath(new URL('../../packages/web-kit', import.meta.url)),
  brandDir: fileURLToPath(new URL('../../packages/catalog/brand', import.meta.url)),
});
