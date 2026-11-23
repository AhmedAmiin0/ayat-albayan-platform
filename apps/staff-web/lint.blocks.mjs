// The web app's own lint blocks (flat-config shape), read by eslint.config.js and by Oxlint
// (oxlint.full.config.ts): docs/31b-oxlint-mapping.md. Every React DOM workspace shares them
// (webBlocks, docs/51 §2); here another feature only through its index.ts (docs/27 §1 rule 6;
// existing deep imports: the suppressions baseline) and `@/…` (tsconfig `paths` until it moves
// to `#/`, docs/32 R12), never `../`.
import { webBlocks } from '@ab/config/lint';

const module = 'src/features/[^/]+/[^/]+';

export default { react: true, blocks: webBlocks({ root: import.meta.dirname, module, alias: '@/' }) };
