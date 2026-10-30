import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { posix } from 'node:path';
import { test } from 'node:test';
import { makeRepo, map, snapshot } from './fixture.test-util.ts';
import { replay, runMap } from './run.ts';

const repo = (): string =>
  makeRepo({
    'apps/web/tsconfig.json': '{ "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }',
    'apps/web/src/lib/api.ts': "import { z } from './z';\nexport const api = z;\n",
    'apps/web/src/lib/api.test.ts': "import { api } from './api';\nvi.mock('./z');\n",
    'apps/web/src/lib/__snapshots__/api.test.ts.snap': 'exports[`x`] = 1;\n',
    'apps/web/src/lib/z.ts': 'export const z = 1;\n',
    'apps/web/src/features/a.tsx': "import { api } from '@/lib/api';\nimport { z } from '../lib/z';\nvi.mock('@/lib/api');\n",
    'apps/api/src/env.ts': "export const env = 1;\nexport type Env = number;\n",
    'apps/api/src/m/x.ts': "import { env, type Env } from '../env';\nconst l = () => import('../env');\n",
    'tools/t.mjs': "import { env } from '../apps/api/src/env.ts';\n",
    'docs/a.md': 'See `apps/api/src/env.ts` and apps/api/src/env.tsx.\n',
    'refactor/moves/p.json': map({
      moves: [
        { from: 'apps/web/src/lib/api.ts', to: 'apps/web/src/core/http/api.ts' },
        { from: 'apps/api/src/env.ts', to: 'apps/api/src/config/env/' },
      ],
      barrels: [{ dir: 'apps/api/src/config/env', files: ['env.ts'] }],
    }),
  });

test('moves files with their tests and snapshots and rewrites every importer', () => {
  const root = repo();
  assert.deepEqual(runMap(root, 'refactor/moves/p.json'), { id: 't', moved: 4, rewritten: 6 });
  const s = snapshot(root);
  // web has the `@/*` alias: a rewritten path never climbs (docs/32 R12); api here has none.
  assert.equal(s['apps/web/src/core/http/api.ts'], "import { z } from '@/lib/z';\nexport const api = z;\n");
  assert.equal(s['apps/web/src/core/http/api.test.ts'], "import { api } from './api';\nvi.mock('@/lib/z');\n");
  assert.ok(s['apps/web/src/core/http/__snapshots__/api.test.ts.snap']);
  assert.equal(s['apps/web/src/features/a.tsx'], "import { api } from '@/core/http/api';\nimport { z } from '../lib/z';\nvi.mock('@/core/http/api');\n");
  assert.equal(s['apps/api/src/m/x.ts'], "import { env, type Env } from '../config/env/env';\nconst l = () => import('../config/env/env');\n");
  assert.equal(s['tools/t.mjs'], "import { env } from '../apps/api/src/config/env/env.ts';\n");
  assert.equal(s['docs/a.md'], 'See `apps/api/src/config/env/env.ts` and apps/api/src/env.tsx.\n');
  assert.equal(s['apps/api/src/config/env/index.ts'], "export { env, type Env } from './env';\n");
  assert.equal(existsSync(posix.join(root, 'apps/web/src/lib/api.ts')), false);
  assert.equal(existsSync(posix.join(root, 'apps/web/src/lib/__snapshots__')), false, 'empty folders go');
});

test('records the expanded file list in the map', () => {
  const root = repo();
  runMap(root, 'refactor/moves/p.json');
  const recorded = JSON.parse(readFileSync(posix.join(root, 'refactor/moves/p.json'), 'utf8')) as { files: string[][] };
  assert.equal(recorded.files.length, 4);
  assert.deepEqual(recorded.files[0], ['apps/api/src/env.ts', 'apps/api/src/config/env/env.ts']);
});

test('is idempotent: a second run (and a replay) changes nothing', () => {
  const root = repo();
  runMap(root, 'refactor/moves/p.json');
  const once = snapshot(root);
  assert.deepEqual(runMap(root, 'refactor/moves/p.json'), { id: 't', moved: 0, rewritten: 0 });
  replay(root);
  assert.deepEqual(snapshot(root), once);
});

test('replay fixes a branch file that still imports the old path after the move', () => {
  const root = repo();
  runMap(root, 'refactor/moves/p.json');
  const file = posix.join(root, 'apps/api/src/m/new-feature.ts');
  writeFileSync(file, "import { env } from '../env';\n");
  replay(root);
  assert.equal(readFileSync(file, 'utf8'), "import { env } from '../config/env/env';\n");
});
