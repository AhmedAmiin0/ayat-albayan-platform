import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { test } from 'node:test';
import { unfacade } from './run.ts';
import { app, repo } from './fixture.test-util.ts';

const API = app('api', { zod: '^4', '@ab/shared': 'workspace:*' });
const read = (root: string, path: string): string => readFileSync(posix.join(root, path), 'utf8');
const files = (n: number): Record<string, string> =>
  Object.fromEntries(
    Array.from({ length: n }, (_, i) => [
      `apps/api/src/f${String(i)}.ts`,
      "import { toE164 } from '@ab/shared';\n",
    ]),
  );

test('--write rewrites the files and adds the owners to dependencies, sorted', () => {
  const root = repo({ ...API, 'apps/api/src/a.ts': "import { t, toE164 } from '@ab/shared';\n" });
  const r = unfacade({ root, workspace: 'apps/api', write: true });
  assert.deepEqual(r.done, ['apps/api/src/a.ts']);
  assert.deepEqual(r.deps, ['@ab/core', '@ab/i18n']);
  const deps = JSON.parse(read(root, 'apps/api/package.json')).dependencies;
  assert.deepEqual(Object.keys(deps), ['@ab/core', '@ab/i18n', '@ab/shared', 'zod']);
  assert.equal(deps['@ab/core'], 'workspace:*');
  assert.match(read(root, 'apps/api/src/a.ts'), /import \{ toE164 \} from '@ab\/core';/);
});

test('--dry-run writes nothing and lists every file to change', () => {
  const root = repo({
    ...API,
    ...files(3),
    'apps/api/src/z.ts': "import { own } from '@ab/shared';\n",
  });
  const r = unfacade({ root, workspace: 'apps/api', write: false });
  assert.deepEqual(r.toChange, ['apps/api/src/f0.ts', 'apps/api/src/f1.ts', 'apps/api/src/f2.ts']);
  assert.match(read(root, 'apps/api/src/f0.ts'), /@ab\/shared/);
});

test('--next N takes the first N sorted files that still need a change', () => {
  const root = repo({ ...API, ...files(5) });
  const first = unfacade({ root, workspace: 'apps/api', write: true, next: 2 });
  assert.deepEqual(first.done, ['apps/api/src/f0.ts', 'apps/api/src/f1.ts']);
  const second = unfacade({ root, workspace: 'apps/api', write: true, next: 2 });
  assert.deepEqual(second.done, ['apps/api/src/f2.ts', 'apps/api/src/f3.ts']);
});

test('--owner moves only the names that package owns', () => {
  const root = repo({ ...API, 'apps/api/src/a.ts': "import { t, toE164 } from '@ab/shared';\n" });
  const r = unfacade({ root, workspace: 'apps/api', write: true, owner: '@ab/i18n' });
  assert.deepEqual(r.deps, ['@ab/i18n']);
  assert.equal(
    read(root, 'apps/api/src/a.ts'),
    "import { toE164 } from '@ab/shared';\nimport { t } from '@ab/i18n';\n",
  );
});

test('over-cap and manual files are listed and left alone', () => {
  const big = `import { t, toE164 } from '@ab/shared';\n${'f();\n'.repeat(149)}`;
  const mock = "import { t } from '@ab/shared';\nvi.mock('@ab/shared');\n";
  const root = repo({ ...API, 'apps/api/src/big.ts': big, 'apps/api/src/m.test.ts': mock });
  const r = unfacade({ root, workspace: 'apps/api', write: true });
  assert.deepEqual(
    [r.toChange, r.overCap, r.manual],
    [[], ['apps/api/src/big.ts'], ['apps/api/src/m.test.ts']],
  );
  assert.equal(read(root, 'apps/api/src/big.ts'), big);
});
