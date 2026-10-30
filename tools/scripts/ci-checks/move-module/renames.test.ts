import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { posix } from 'node:path';
import { test } from 'node:test';
import { makeRepo, map, snapshot } from './fixture.test-util.ts';
import { mentions, renameGuardNames, renameTable } from './renames.ts';
import { replay, runMap } from './run.ts';

const DIR = 'apps/api/src/modules/finance/payouts';
const repo = (): string =>
  makeRepo({
    [`${DIR}/payouts.queries.ts`]: "@Injectable()\nexport class PayoutsQueries {\n  list(): string {\n    return 'PayoutsQueries';\n  }\n}\n",
    [`${DIR}/payouts.queries.test.ts`]: "import { PayoutsQueries } from './payouts.queries';\n// PayoutsQueries reads payouts\nconst q = new PayoutsQueries();\n",
    [`${DIR}/__snapshots__/payouts.queries.test.ts.snap`]: 'exports[`x`] = 1;\n',
    [`${DIR}/payouts.module.ts`]: "import { PayoutsQueries } from './payouts.queries';\n@Module({ providers: [PayoutsQueries], exports: [PayoutsQueries] })\nexport class PayoutsModule {}\n",
    [`${DIR}/index.ts`]: "export { PayoutsQueries } from './payouts.queries';\n",
    [`${DIR}/payouts.service.test.ts`]: "vi.mock('./payouts.queries', () => ({ PayoutsQueries: vi.fn() }));\nconst { PayoutsQueries } = await import('./payouts.queries');\nconst PayoutsQueriesX = 1;\n",
    'apps/api/src/other.ts': "import { PayoutsQueries as Q } from './modules/finance/payouts';\nexport const n = Q.name;\n",
    'refactor/guards/knip.json': `${JSON.stringify([`${DIR}/payouts.queries.ts exports PayoutsQueries`, 'b.ts types PayoutsQueriesRow'], null, 2)}\n`,
    'refactor/moves/r.json': map({
      moves: [{ from: `${DIR}/payouts.queries.ts`, to: `${DIR}/payouts.repo.ts` }],
      renames: { PayoutsQueries: 'PayoutsRepo' },
    }),
  });

test('renames the class, its importers, barrel, Nest providers/exports and mock keys; strings and comments stay', () => {
  const root = repo();
  runMap(root, 'refactor/moves/r.json');
  const s = snapshot(root);
  assert.equal(s[`${DIR}/payouts.repo.ts`], "@Injectable()\nexport class PayoutsRepo {\n  list(): string {\n    return 'PayoutsQueries';\n  }\n}\n");
  assert.equal(s[`${DIR}/payouts.repo.test.ts`], "import { PayoutsRepo } from './payouts.repo';\n// PayoutsQueries reads payouts\nconst q = new PayoutsRepo();\n");
  assert.ok(s[`${DIR}/__snapshots__/payouts.repo.test.ts.snap`], 'the snapshot follows the test stem');
  assert.equal(s[`${DIR}/payouts.module.ts`], "import { PayoutsRepo } from './payouts.repo';\n@Module({ providers: [PayoutsRepo], exports: [PayoutsRepo] })\nexport class PayoutsModule {}\n");
  assert.equal(s[`${DIR}/index.ts`], "export { PayoutsRepo } from './payouts.repo';\n");
  assert.equal(s[`${DIR}/payouts.service.test.ts`], "vi.mock('./payouts.repo', () => ({ PayoutsRepo: vi.fn() }));\nconst { PayoutsRepo } = await import('./payouts.repo');\nconst PayoutsQueriesX = 1;\n");
  assert.equal(s['apps/api/src/other.ts'], "import { PayoutsRepo as Q } from './modules/finance/payouts';\nexport const n = Q.name;\n");
  assert.deepEqual(JSON.parse(s['refactor/guards/knip.json'] ?? '[]'), [`${DIR}/payouts.repo.ts exports PayoutsRepo`, 'b.ts types PayoutsQueriesRow']);
});

test('run twice (and replay) = no diff; a branch file using the old name follows on replay', () => {
  const root = repo();
  runMap(root, 'refactor/moves/r.json');
  const once = snapshot(root);
  assert.deepEqual(runMap(root, 'refactor/moves/r.json'), { id: 't', moved: 0, rewritten: 0 });
  replay(root);
  assert.deepEqual(snapshot(root), once);
  writeFileSync(posix.join(root, 'apps/api/src/late.ts'), "import { PayoutsQueries } from './modules/finance/payouts';\n");
  replay(root);
  assert.equal(snapshot(root)['apps/api/src/late.ts'], "import { PayoutsRepo } from './modules/finance/payouts';\n");
});

test('the table refuses non-identifiers, chains and two olds to one new', () => {
  assert.deepEqual([...renameTable(undefined)], []);
  assert.throws(() => renameTable({ 'a-b': 'C' }), /bad rename/);
  assert.throws(() => renameTable({ A: 'A' }), /bad rename/);
  assert.throws(() => renameTable({ A: 'B', B: 'C' }), /chain/);
  assert.throws(() => renameTable({ A: 'C', B: 'C' }), /two renames/);
});

test('mentions matches whole words only', () => {
  const t = renameTable({ XQueries: 'XRepo', $q: '$r' });
  assert.equal(mentions(t, 'new XQueries()'), true);
  assert.equal(mentions(t, 'XQueriesRow'), false);
  assert.equal(mentions(t, 'a.$q'), true);
  assert.equal(mentions(renameTable({}), 'XQueries'), false);
});

test('the knip guard keeps its sort after a rename', () => {
  const text = `${JSON.stringify(['a.ts exports Zed', 'b.ts types Row'], null, 2)}\n`;
  assert.equal(renameGuardNames(renameTable({ Zed: 'Alpha' }), text), `${JSON.stringify(['a.ts exports Alpha', 'b.ts types Row'], null, 2)}\n`);
  assert.equal(renameGuardNames(renameTable({ Row: 'Line' }), text), `${JSON.stringify(['a.ts exports Zed', 'b.ts types Line'], null, 2)}\n`);
});
