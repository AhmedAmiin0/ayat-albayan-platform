import { webConfig } from '@ab/config/vite';

// The family app on the web (family.ayatalbayan.com, docs/51): the shared web config.
// FAMILY_WEB_CACHE gives the e2e dev server its own Vite cache beside the staff one.
export default webConfig({
  dir: import.meta.dirname,
  port: 5174,
  icons: 'family',
  cacheDir: process.env.FAMILY_WEB_CACHE,
});
