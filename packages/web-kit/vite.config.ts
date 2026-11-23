import { webConfig } from '@ab/config/vite';
import { fileURLToPath } from 'node:url';

// The kit's own tests (docs/51 §2): the apps' config, without routes or a dev server.
export default webConfig({
  port: 5199,
  routes: false,
  kitDir: import.meta.dirname,
  brandDir: fileURLToPath(new URL('../catalog/brand', import.meta.url)),
});
