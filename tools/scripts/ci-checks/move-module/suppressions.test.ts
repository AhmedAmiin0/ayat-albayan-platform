import assert from 'node:assert/strict';
import { test } from 'node:test';
import { textPairs } from './files.ts';
import { makeRepo, map, snapshot } from './fixture.test-util.ts';
import { runMap } from './run.ts';

const entry = (count: number): object => ({ 'ab/module-boundaries': { count } });

test('a package eslint-suppressions.json follows its moved files by package-relative key, counts kept', () => {
  const suppressions = { 'src/lib/api.ts': entry(2), 'src/lib/api.test.ts': entry(1), 'src/lib/z.ts': entry(3) };
  const root = makeRepo({
    'apps/web/eslint-suppressions.json': `${JSON.stringify(suppressions, null, 2)}\n`,
    'apps/web/src/lib/api.ts': 'export const api = 1;\n',
    'apps/web/src/lib/api.test.ts': "import { api } from './api';\n",
    'apps/web/src/lib/z.ts': 'export const z = 1;\n',
    'refactor/moves/p.json': map({ moves: [{ from: 'apps/web/src/lib/api.ts', to: 'apps/web/src/core/api.ts' }] }),
  });
  runMap(root, 'refactor/moves/p.json');
  const after = JSON.parse(snapshot(root)['apps/web/eslint-suppressions.json'] ?? '{}') as object;
  assert.deepEqual(after, { 'src/core/api.ts': entry(2), 'src/core/api.test.ts': entry(1), 'src/lib/z.ts': entry(3) });
});

test('package-relative pairs only for moves inside the package of a suppressions file', () => {
  const pairs: [string, string][] = [
    ['apps/web/src/a.ts', 'apps/web/src/b/a.ts'],
    ['apps/web/src/c.ts', 'packages/client-core/src/c.ts'],
  ];
  assert.deepEqual(textPairs('apps/web/eslint-suppressions.json', pairs), [...pairs, ['src/a.ts', 'src/b/a.ts']]);
  assert.deepEqual(textPairs('eslint-suppressions.json', pairs), pairs);
  assert.deepEqual(textPairs('apps/web/knip.json', pairs), pairs);
});
