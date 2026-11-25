import assert from 'node:assert/strict';
import { test } from 'node:test';
import { jsonFailure, PATH_JSON } from './json.mjs';

const RENAMES = [['apps/w/src/A.tsx', 'apps/w/src/A/A.tsx']];
const sup = (key, count) => JSON.stringify({ [key]: { 'max-len': { count } } });

test('suppression keys may follow their files; counts may stay or shrink', () => {
  const file = 'apps/w/oxlint-suppressions.json';
  assert.equal(
    jsonFailure({ file, base: sup('src/A.tsx', 2), head: sup('src/A/A.tsx', 2), renames: RENAMES }),
    null,
  );
  assert.equal(
    jsonFailure({ file, base: sup('src/A.tsx', 2), head: sup('src/A/A.tsx', 1), renames: RENAMES }),
    null,
  );
  const grew = jsonFailure({
    file,
    base: sup('src/A.tsx', 2),
    head: sup('src/A/A.tsx', 3),
    renames: RENAMES,
  });
  assert.match(grew ?? '', /src\/A\/A\.tsx/);
  const other = jsonFailure({
    file,
    base: sup('src/A.tsx', 2),
    head: sup('src/B.tsx', 2),
    renames: RENAMES,
  });
  assert.match(other ?? '', /"src\/B\.tsx" is new or grew/);
});

test('guard lists may rename their paths and lose entries, never gain one', () => {
  const file = 'refactor/guards/knip.json';
  const base = JSON.stringify(['apps/w/src/A.tsx exports X', 'b.ts']);
  const ok = JSON.stringify(['apps/w/src/A/A.tsx exports X']);
  assert.equal(jsonFailure({ file, base, head: ok, renames: RENAMES }), null);
  const added = JSON.stringify(['apps/w/src/A/A.tsx exports X', 'c.ts']);
  assert.match(jsonFailure({ file, base, head: added, renames: RENAMES }) ?? '', /"c\.ts" is new/);
});

test('folder-cap entries may shrink, and gain sub-folders up to the cap', () => {
  const file = 'refactor/folder-cap/web.json';
  const base = JSON.stringify({ d: { files: 20, dirs: 3 } });
  const ok = JSON.stringify({ d: { files: 14, dirs: 9 } });
  assert.equal(jsonFailure({ file, base, head: ok, renames: [] }), null);
  const over = JSON.stringify({ d: { files: 14, dirs: 13 } });
  assert.match(jsonFailure({ file, base, head: over, renames: [] }) ?? '', /"d" is new or grew/);
});

test('the package layer table is not a baseline a move may edit', () => {
  assert.equal(PATH_JSON.test('refactor/guards/packages.json'), false);
  assert.equal(PATH_JSON.test('refactor/guards/knip.json'), true);
});
