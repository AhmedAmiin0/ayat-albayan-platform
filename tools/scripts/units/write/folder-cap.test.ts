import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { test } from 'node:test';
import { makeRepo } from '../../ci-checks/move-module/fixture.test-util.ts';
import { updateFolderCap } from './folder-cap.ts';

const crowd = (dir: string, n: number): Record<string, string> =>
  Object.fromEntries(Array.from({ length: n }, (_, i) => [`${dir}/f${i}.ts`, '']));

test('an allow-listed folder takes its new counts, or leaves the list once within the cap', () => {
  const root = makeRepo({
    ...crowd('apps/w/src/a', 14),
    ...crowd('apps/w/src/b', 10),
    'apps/w/src/b/U/x.ts': '',
    'refactor/folder-cap/web.json': JSON.stringify({
      'apps/w/src/a': { files: 15, dirs: 0 },
      'apps/w/src/b': { files: 13, dirs: 0 },
      'apps/w/src/c': { files: 13, dirs: 0 },
    }),
  });
  updateFolderCap(root, ['apps/w/src/a', 'apps/w/src/b']);
  const text = readFileSync(posix.join(root, 'refactor/folder-cap/web.json'), 'utf8');
  assert.deepEqual(JSON.parse(text), {
    'apps/w/src/a': { files: 14, dirs: 0 },
    'apps/w/src/c': { files: 13, dirs: 0 },
  });
});
