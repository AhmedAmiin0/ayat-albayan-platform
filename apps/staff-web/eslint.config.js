import { webReactConfig } from '@ab/config/eslint-web';
import lint from './lint.blocks.mjs';

// The web workspaces' shared config (docs/51 §2) and this one's lint.blocks.mjs (Oxlint's too).
export default webReactConfig(import.meta.dirname, lint.blocks);
