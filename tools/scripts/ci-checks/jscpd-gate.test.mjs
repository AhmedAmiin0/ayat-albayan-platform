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

test('check fails only on a measure above its baseline', () => {
  assert.deepEqual(check({ clones: 4, duplicatedLines: 40, crossApp: 1 }, { clones: 4, duplicatedLines: 41, crossApp: 1 }), []);
  assert.deepEqual(check({ clones: 5, duplicatedLines: 40, crossApp: 2 }, { clones: 4, duplicatedLines: 40, crossApp: 1 }), [
    'clones: 5 > baseline 4',
    'crossApp: 2 > baseline 1',
  ]);
  assert.deepEqual(check({ clones: 1 }, {}), ['clones: 1 > baseline 0']);
});
