// The web app's own lint blocks (flat-config shape), read by oxlint.config.ts:
// docs/31b-oxlint-mapping.md. Every React DOM workspace shares them
// (webBlocks, docs/51 §2); here another feature only through its index.ts (docs/27 §1 rule 6;
// existing deep imports: the suppressions baseline) and `@/…`, never `../`
// (`pnpm imports:absolute -- staff-web --write`).
import { webBlocks } from '@ab/config/lint';

export default {
  react: true,
  blocks: webBlocks({ root: import.meta.dirname, module: 'src/features/[^/]+/[^/]+' }),
};
