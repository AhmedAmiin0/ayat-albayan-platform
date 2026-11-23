import assert from 'node:assert/strict';
import { test } from 'node:test';
import { floatingUnits, guardedUnits } from './scan.ts';

const THREE = (dir: string): string[] =>
  ['A.tsx', 'A.x.test.tsx', 'A.y.test.tsx'].map((n) => `${dir}/${n}`);

test('floatingUnits keeps the excluded trees; guardedUnits leaves them out', () => {
  const paths = [...THREE('apps/web/src/f'), ...THREE('apps/api/src/modules/m/n')];
  assert.deepEqual(
    floatingUnits(paths).map((u) => u.dir),
    ['apps/web/src/f', 'apps/api/src/modules/m/n'],
  );
  assert.deepEqual(
    guardedUnits(paths).map((u) => u.dir),
    ['apps/web/src/f'],
  );
});
