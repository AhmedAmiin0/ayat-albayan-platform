import assert from 'node:assert/strict';
import { test } from 'node:test';
import { newProject } from '../../ci-checks/move-module/rewrite.ts';
import { specUses } from './specs.ts';

const SOURCE = [
  "import { a, type B as C } from './x';",
  "import type { D } from './d';",
  "import E, { f } from './e';",
  "import * as G from './g';",
  "import './side';",
  "export { h } from './h';",
  "export * from './all';",
  "import { default as i } from './i';",
  "vi.mock('./m');",
  "const l = () => import('./lazy');",
].join('\n');

test('specUses: named imports and re-exports carry their names; the rest is exact', () => {
  const project = newProject();
  const sf = project.createSourceFile('/v/a.ts', SOURCE);
  const got = specUses(sf).map((s) => [s.value, s.names]);
  assert.deepEqual(got, [
    [
      './x',
      [
        { name: 'a', typeOnly: false },
        { name: 'B', typeOnly: true },
      ],
    ],
    ['./d', [{ name: 'D', typeOnly: true }]],
    ['./e', undefined],
    ['./g', undefined],
    ['./side', undefined],
    ['./h', [{ name: 'h', typeOnly: false }]],
    ['./all', undefined],
    ['./i', undefined],
    ['./m', undefined],
    ['./lazy', undefined],
  ]);
});
