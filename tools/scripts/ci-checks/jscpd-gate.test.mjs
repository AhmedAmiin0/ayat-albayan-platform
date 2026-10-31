import assert from 'node:assert/strict';
import { test } from 'node:test';
import { check, measure } from './jscpd-gate.mjs';

const dup = (a, b) => ({ firstFile: { name: a }, secondFile: { name: b } });
const report = {
  statistics: { total: { clones: 4, duplicatedLines: 40 } },
  duplicates: [
    dup('apps/web/src/a.ts', 'apps/mobile/src/a.ts'),
    dup('apps/web/src/a.ts', 'apps/web/src/b.ts'),
    dup('apps/web/src/x/fixtures.ts', 'apps/mobile/src/x/fixtures.ts'),
    dup('apps/api/src/m/m.fakes.ts', 'apps/mobile/src/m.ts'),
  ],
};

test('measure counts cross-app clones, not same-app ones or fixtures and fakes', () => {
  assert.deepEqual(measure(report), { clones: 4, duplicatedLines: 40, crossApp: 1 });
});

test('check: equal to or below the base branch passes; above it fails', () => {
  const base = { clones: 4, duplicatedLines: 40, crossApp: 1 };
  assert.deepEqual(check({ ...base }, base), []);
  // A dedup PR: fewer clones than the base, nothing to edit.
  assert.deepEqual(check({ clones: 3, duplicatedLines: 30, crossApp: 0 }, base), []);
  assert.deepEqual(check({ clones: 5, duplicatedLines: 40, crossApp: 2 }, base), [
    "clones: 5 > the base branch's 4",
    "crossApp: 2 > the base branch's 1",
  ]);
  assert.deepEqual(check({ clones: 1 }, {}), ["clones: 1 > the base branch's 0"]);
});

test('all packages are one unit: a clone between two packages is not cross-app, one with an app is', () => {
  const split = {
    statistics: { total: { clones: 2, duplicatedLines: 20 } },
    duplicates: [dup('packages/core/src/a.ts', 'packages/money/src/b.ts'), dup('packages/core/src/a.ts', 'apps/web/src/c.ts')],
  };
  assert.deepEqual(measure(split), { clones: 2, duplicatedLines: 20, crossApp: 1 });
});
