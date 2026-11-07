import { config } from '@ab/config/eslint';
import lint from './lint.blocks.mjs';

export default config(
  import.meta.dirname,
  // Keeps consistent-type-imports from turning an injected class into `import type`: decorator
  // metadata would then name Object and Nest would fail at boot, not at typecheck (docs/31a §3.3).
  {
    languageOptions: {
      parserOptions: { emitDecoratorMetadata: true, experimentalDecorators: true },
    },
  },
  // The api's own blocks (lint.blocks.mjs), shared with Oxlint.
  ...lint.blocks,
);
