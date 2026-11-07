import { config } from '@ab/config/eslint';
import lint from './lint.blocks.mjs';

// The package's own blocks live in lint.blocks.mjs (shared with Oxlint, docs/31b).
export default config(import.meta.dirname, ...lint.blocks);
