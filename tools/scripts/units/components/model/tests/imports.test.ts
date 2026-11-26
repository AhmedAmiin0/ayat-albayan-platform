import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emitImports, importsOf } from '../imports.ts';
import { parseFile } from '../source.ts';

const decls = importsOf(
  parseFile(
    'a.tsx',
    "import './side.css';\nimport D, { a, type B, c as d } from 'x';\nimport { type E } from 'y';\nimport * as ns from 'z';\n",
  ),
);

test('emits only the used names, keeping aliases, defaults and namespaces', () => {
  assert.deepEqual(emitImports(decls, new Set(['D', 'd', 'ns']), { keepSideEffects: false }), [
    "import D, { c as d } from 'x';",
    "import * as ns from 'z';",
  ]);
});

test('side effects stay only when asked; all-inline type names become import type', () => {
  assert.deepEqual(emitImports(decls, new Set(['B', 'E']), { keepSideEffects: true }), [
    "import './side.css';",
    "import type { B } from 'x';",
    "import type { E } from 'y';",
  ]);
  assert.deepEqual(
    emitImports(decls, new Set(['a', 'B']), { keepSideEffects: false, typesOnly: true }),
    ["import type { a, B } from 'x';"],
  );
});
