import { reactConfig } from '@ab/config/eslint';
import lint from './lint.blocks.mjs';

// The package's own blocks live in lint.blocks.mjs (shared with Oxlint, docs/31b).
export default reactConfig(import.meta.dirname, ...lint.blocks);
