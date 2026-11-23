import { webConfig } from '@ab/config/vite';
import { fileURLToPath } from 'node:url';

// The family app on the web (family.ayatalbayan.com, docs/51): the shared web config.
// FAMILY_WEB_CACHE gives the e2e dev server its own Vite cache beside the staff one.
export default webConfig({
  dir: import.meta.dirname,
  port: 5174,
  icons: 'family',
  client: 'family-web',
  cacheDir: process.env.FAMILY_WEB_CACHE,
  kitDir: fileURLToPath(new URL('../../packages/web-kit', import.meta.url)),
  brandDir: fileURLToPath(new URL('../../packages/catalog/brand', import.meta.url)),
});
