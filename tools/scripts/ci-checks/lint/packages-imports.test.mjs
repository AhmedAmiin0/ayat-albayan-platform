import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeRepo, table } from './testing/packages-fixture.test-util.mjs';
import { judge } from './packages-rules.mjs';
import { scan } from './packages-scan.mjs';

const judged = (files, deps) => judge(table(), scan(makeRepo(files, deps)));
const keys = (v) => [...v.extras.keys()];

test('an app dependency on another app fails', () => {
  const v = judged({}, { 'staff-web': { dependencies: { api: 'workspace:*' } } });
  assert.match(v.fatal.join('\n'), /staff-web → api \(dep\)/);
});

test("e2e's devDependency on api passes; a dependency on it fails", () => {
  const dev = judged({}, { e2e: { devDependencies: { api: 'workspace:*' } } });
  assert.deepEqual([dev.fatal, keys(dev)], [[], []]);
  const dep = judged({}, { e2e: { dependencies: { api: 'workspace:*' } } });
  assert.match(dep.fatal.join('\n'), /e2e → api \(dep\)/);
});

test('an import outside allowed is an extra; an allowed one and @ab/config are not', () => {
  const v = judged({
    'packages/time/src/a.ts': "import { x } from '@ab/schedule';\nimport c from '@ab/config/x';",
    'packages/schedule/src/a.ts': "export const t = () => import('@ab/time/zones');",
  });
  assert.deepEqual(keys(v), ['@ab/time → @ab/schedule (import)']);
  assert.deepEqual(v.extras.get(keys(v)[0]).files, ['packages/time/src/a.ts']);
});

test('an edge into the tooling layer is exempt; one out of @ab/testing is an extra', () => {
  const v = judged(
    {
      'packages/core/vitest.config.mts': "import { testConfig } from '@ab/testing/vitest';",
      'packages/testing/src/vitest.ts': "import { x } from '@ab/core';",
    },
    { '@ab/core': { devDependencies: { '@ab/testing': 'workspace:*' } } },
  );
  assert.deepEqual(keys(v), ['@ab/testing → @ab/core (import)']);
});

test('a relative import from family-web into staff-web fails', () => {
  const v = judged({ 'apps/family-web/src/a.ts': "import { x } from '../../staff-web/src/x';" });
  assert.match(v.fatal.join('\n'), /family-web → staff-web \(import\)/);
});

test('an import written inside a string literal is not an edge', () => {
  const v = judged({
    'packages/time/src/a.ts': 'export const s = "import { x } from \'@ab/db\'";',
  });
  assert.deepEqual(keys(v), []);
});

test("vi.mock('@ab/db') in a package test is a test-import extra", () => {
  const v = judged({ 'packages/time/src/a.test.ts': "vi.mock('@ab/db', () => ({}));" });
  assert.deepEqual(keys(v), ['@ab/time → @ab/db (test-import)']);
});

test("'@/x' fails in a package's code, not in its test or in an app", () => {
  const v = judged({
    'packages/time/src/a.ts': "import { x } from '@/x';",
    'packages/time/src/b.test.ts': "import { x } from '@/x';",
    'apps/api/src/a.ts': "import { x } from '@/x';",
  });
  assert.deepEqual(v.fatal, ["packages/time/src/a.ts: '@/' alias in a package"]);
});

test("'@ab/i18n' and a bare app name resolve to their workspaces", () => {
  const v = judged({
    'packages/time/src/a.ts': "export * as m from '@ab/i18n';",
    'apps/staff-web/src/a.ts': "import type { T } from 'api/src/t';",
  });
  assert.deepEqual(keys(v), ['@ab/time → @ab/i18n (import)']);
  assert.match(v.fatal.join('\n'), /staff-web → api \(import\)/);
});
