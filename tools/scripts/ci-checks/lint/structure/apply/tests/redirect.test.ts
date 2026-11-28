import assert from 'node:assert/strict';
import { test } from 'node:test';
import { newProject } from '../../../../move-module/rewrite.ts';
import { exportSources } from '../barrels/barrel-names.ts';
import { prunedText, prunePlan } from '../barrels/prune.ts';
import { redirectFile } from '../barrels/redirect.ts';
import { tree } from './fixture.ts';

const files = {
  'p/src/ops/index.ts':
    "export { A } from './a/A';\nexport * from './b';\nexport type { T as U } from './t';\n",
  'p/src/ops/a/A.ts': 'export const A = 1;\n',
  'p/src/ops/b/index.ts': "export { B } from './B';\n",
  'p/src/ops/b/B.ts': 'export const B = 2;\nexport const C = 3;\n',
  'p/src/ops/t.ts': 'export interface T { x: number }\n',
};
const BARREL = 'p/src/ops/index.ts';

function setup(extra: Record<string, string>, place: { to: (f: string) => string }) {
  const root = tree({ ...files, ...extra });
  const r = { root, aliases: [], renamed: new Map<string, string>() };
  const project = newProject();
  const home = (file: string) => file.split('/').slice(0, 3).join('/');
  const pruned = prunePlan({ project, r }, BARREL, { to: place.to, home });
  return { root, ctx: { project, r, barrels: new Map([[BARREL, pruned]]) }, pruned };
}

/** a/ and t.ts move to other features; b/ stays with the barrel. */
const to = (f: string) =>
  f.replace('p/src/ops/a/', 'p/src/x/a/').replace('p/src/ops/t.ts', 'p/src/y/t.ts');

test('a barrel exports names with the files that hold them', () => {
  const root = tree(files);
  const ctx = { project: newProject(), r: { root, aliases: [], renamed: new Map() } };
  assert.deepEqual(Object.fromEntries(exportSources(ctx, BARREL)), {
    A: { file: 'p/src/ops/a/A.ts', name: 'A', typeOnly: false },
    B: { file: 'p/src/ops/b/B.ts', name: 'B', typeOnly: false },
    U: { file: 'p/src/ops/t.ts', name: 'T', typeOnly: true },
  });
});

test("pruning keeps the barrel's own re-exports and points importers of the rest at their files", () => {
  const { ctx, pruned, root } = setup({}, { to });
  assert.equal(pruned.kept, true);
  const text = "import { A, B, type U } from './ops';\nexport * from './ops';\n";
  const out = redirectFile(ctx, 'p/src/app.ts', text);
  assert.equal(
    out.text,
    [
      "import { B } from './ops';",
      "import { A } from './ops/a/A';",
      "import type { T as U } from './ops/t';",
      "export * from './ops';",
      "export { A } from './ops/a/A';",
      "export type { T as U } from './ops/t';",
      '',
    ].join('\n'),
  );
  assert.deepEqual(out.problems, []);
  assert.equal(prunedText(files[BARREL], pruned), "export * from './b';\n");
  assert.ok(root.length > 0);
});

test('a barrel left with nothing of its own is deleted; its package names go to the package', () => {
  const extra = { [BARREL]: "export * from '@ab/schedule';\nexport { A } from './a/A';\n" };
  const { ctx, pruned } = setup(extra, { to });
  assert.equal(pruned.kept, false);
  assert.equal(pruned.external, '@ab/schedule');
  const out = redirectFile(
    ctx,
    'p/src/app.ts',
    "import { A, slotSchema } from './ops';\nimport * as all from './ops';\n",
  );
  assert.equal(
    out.text,
    "import { slotSchema } from '@ab/schedule';\nimport { A } from './ops/a/A';\nimport * as all from './ops';\n",
  );
  assert.deepEqual(out.problems, ['p/src/app.ts: default or namespace use of ./ops']);
});

test('export * of a gone barrel that re-exports another gone barrel opens both', () => {
  const root = tree({
    'p/src/a/index.ts': "export * from '../b';\n",
    'p/src/b/index.ts': "export * from './x';\n",
    'p/src/b/x.ts': 'export const X = 1;\n',
  });
  const r = { root, aliases: [], renamed: new Map<string, string>() };
  const project = newProject();
  const place = {
    to: (f: string) => f.replace('p/src/b/x.ts', 'p/src/c/x.ts'),
    home: (f: string) => f.split('/').slice(0, 3).join('/'),
  };
  const barrels = new Map([
    ['p/src/a/index.ts', prunePlan({ project, r }, 'p/src/a/index.ts', place)],
    ['p/src/b/index.ts', prunePlan({ project, r }, 'p/src/b/index.ts', place)],
  ]);
  const out = redirectFile(
    { project, r, barrels },
    'p/src/index.ts',
    "export * from './b/x';\nexport * from './a';\n",
  );
  assert.equal(out.text, "export * from './b/x';\n\n");
});
