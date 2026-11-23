// The web kit's own lint blocks (flat-config shape), read by eslint.config.js and by Oxlint
// (oxlint.full.config.ts): docs/31b-oxlint-mapping.md. Its files import each other as `#/…`
// (its package.json `imports`; another area through that area's index.ts, the same file the
// apps reach through `exports`) or `./` siblings, never `../`.
import { webBlocks } from '@ab/config/lint';

export default { react: true, blocks: webBlocks({ root: import.meta.dirname }) };
