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
    [`${DIR}/widget.queries.ts`]: "@Injectable()\nexport class WidgetQueries {\n  list(): string {\n    return 'WidgetQueries';\n  }\n}\n",
    [`${DIR}/widget.queries.test.ts`]: "import { WidgetQueries } from './widget.queries';\n// WidgetQueries reads payouts\nconst q = new WidgetQueries();\n",
    [`${DIR}/__snapshots__/widget.queries.test.ts.snap`]: 'exports[`x`] = 1;\n',
    [`${DIR}/payouts.module.ts`]: "import { WidgetQueries } from './widget.queries';\n@Module({ providers: [WidgetQueries], exports: [WidgetQueries] })\nexport class PayoutsModule {}\n",
    [`${DIR}/index.ts`]: "export { WidgetQueries } from './widget.queries';\n",
    [`${DIR}/payouts.service.test.ts`]: "vi.mock('./widget.queries', () => ({ WidgetQueries: vi.fn() }));\nconst { WidgetQueries } = await import('./widget.queries');\nconst WidgetQueriesX = 1;\n",
    'apps/api/src/other.ts': "import { WidgetQueries as Q } from './modules/finance/payouts';\nexport const n = Q.name;\n",
    'refactor/guards/knip.json': `${JSON.stringify([`${DIR}/widget.queries.ts exports WidgetQueries`, 'b.ts types WidgetQueriesRow'], null, 2)}\n`,
    'refactor/moves/r.json': map({
      moves: [{ from: `${DIR}/widget.queries.ts`, to: `${DIR}/widget.repo.ts` }],
      renames: { WidgetQueries: 'WidgetRepo' },
    }),
  });

test('renames the class, its importers, barrel, Nest providers/exports and mock keys; strings and comments stay', () => {
  const root = repo();
  runMap(root, 'refactor/moves/r.json');
  const s = snapshot(root);
  assert.equal(s[`${DIR}/widget.repo.ts`], "@Injectable()\nexport class WidgetRepo {\n  list(): string {\n    return 'WidgetQueries';\n  }\n}\n");
  assert.equal(s[`${DIR}/widget.repo.test.ts`], "import { WidgetRepo } from './widget.repo';\n// WidgetQueries reads payouts\nconst q = new WidgetRepo();\n");
  assert.ok(s[`${DIR}/__snapshots__/widget.repo.test.ts.snap`], 'the snapshot follows the test stem');
  assert.equal(s[`${DIR}/payouts.module.ts`], "import { WidgetRepo } from './widget.repo';\n@Module({ providers: [WidgetRepo], exports: [WidgetRepo] })\nexport class PayoutsModule {}\n");
  assert.equal(s[`${DIR}/index.ts`], "export { WidgetRepo } from './widget.repo';\n");
  assert.equal(s[`${DIR}/payouts.service.test.ts`], "vi.mock('./widget.repo', () => ({ WidgetRepo: vi.fn() }));\nconst { WidgetRepo } = await import('./widget.repo');\nconst WidgetQueriesX = 1;\n");
  assert.equal(s['apps/api/src/other.ts'], "import { WidgetRepo as Q } from './modules/finance/payouts';\nexport const n = Q.name;\n");
  assert.deepEqual(JSON.parse(s['refactor/guards/knip.json'] ?? '[]'), [`${DIR}/widget.repo.ts exports WidgetRepo`, 'b.ts types WidgetQueriesRow']);
});

test('run twice (and replay) = no diff; a branch file using the old name follows on replay', () => {
  const root = repo();
  runMap(root, 'refactor/moves/r.json');
  const once = snapshot(root);
  assert.deepEqual(runMap(root, 'refactor/moves/r.json'), { id: 't', moved: 0, rewritten: 0 });
  replay(root);
  assert.deepEqual(snapshot(root), once);
  writeFileSync(posix.join(root, 'apps/api/src/late.ts'), "import { WidgetQueries } from './modules/finance/payouts';\n");
  replay(root);
  assert.equal(snapshot(root)['apps/api/src/late.ts'], "import { WidgetRepo } from './modules/finance/payouts';\n");
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

test('refuses a collision with the new name and an old name imported from an outside package', () => {
  const run = (text: string): void => {
    const root = makeRepo({ 'apps/api/src/a.ts': text, 'refactor/moves/r.json': map({ moves: [], renames: { Foo: 'Bar' } }) });
    runMap(root, 'refactor/moves/r.json');
  };
  assert.throws(() => run('class Foo {}\nconst Bar = 1;\n'), /Bar already exists/);
  assert.throws(() => run("import { Foo } from 'ext-lib';\n"), /Foo comes from ext-lib/);
  assert.doesNotThrow(() => run("import { Foo } from '@ab/shared';\nimport { Foo as F } from './f';\n"));
});

test('the knip guard drops a line a rename makes duplicate', () => {
  const text = `${JSON.stringify(['a.ts exports X', 'a.ts exports Y'], null, 2)}\n`;
  assert.equal(renameGuardNames(renameTable({ X: 'Y' }), text), `${JSON.stringify(['a.ts exports Y'], null, 2)}\n`);
});
