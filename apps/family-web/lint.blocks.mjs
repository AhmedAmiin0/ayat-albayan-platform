// The family web app's lint blocks (flat-config shape), read by oxlint.config.ts: the web apps'
// shared blocks (webBlocks, docs/51 §2), a feature only through its index.ts.
import { webBlocks } from '@ab/config/lint';

export default {
  react: true,
  blocks: webBlocks({ root: import.meta.dirname, module: 'src/features/[^/]+' }),
};
