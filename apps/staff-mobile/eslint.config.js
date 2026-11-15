import { reactConfig } from '@ab/config/eslint';
import lint from './lint.blocks.mjs';

// The mobile app's own blocks live in lint.blocks.mjs (shared with Oxlint).
export default reactConfig(import.meta.dirname, ...lint.blocks);
