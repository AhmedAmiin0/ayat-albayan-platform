import { webConfig } from '@ab/config/vite';
import { fileURLToPath } from 'node:url';

const kitDir = fileURLToPath(new URL('../../packages/web-kit', import.meta.url));

// The staff app (app.ayatalbayan.com): the shared web config (docs/51 §2), on the usual dev port.
export default webConfig({
  port: 5173,
  icons: 'staff',
  kitDir,
  brandDir: fileURLToPath(new URL('../../packages/catalog/brand', import.meta.url)),
  // tsconfig `paths` until this app moves to package.json `imports` (docs/32 R12).
  alias: { '@/': `${import.meta.dirname}/src/`, '@ab/web-kit/': `${kitDir}/src/` },
});
