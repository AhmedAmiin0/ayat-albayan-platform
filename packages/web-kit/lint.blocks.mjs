// The web kit's own lint blocks (flat-config shape), read by oxlint.config.ts:
// docs/31b-oxlint-mapping.md. Its modules import each other as
// `@ab/web-kit/…` (both apps alias it to src/, docs/51 §2) or `./` siblings, never `../`.
import { webBlocks } from '@ab/config/lint';

export default { react: true, blocks: webBlocks({ root: import.meta.dirname }) };
