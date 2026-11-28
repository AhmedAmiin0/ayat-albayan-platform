import assert from 'node:assert/strict';
import { test } from 'node:test';
import { newProject } from '../../../ci-checks/move-module/rewrite.ts';
import { barrelLines, exportSources } from '../barrel-names.ts';
import { redirectFile } from '../redirect.ts';
import { tree } from './fixture.ts';

const files = {
  'p/src/ops/index.ts':
    "export { A } from './a/A';\nexport * from './b';\nexport type { T as U } from './t';\n",
  'p/src/ops/a/A.ts': 'export const A = 1;\n',
  'p/src/ops/b/index.ts': "export { B } from './B';\n",
  'p/src/ops/b/B.ts': 'export const B = 2;\nexport const C = 3;\n',
  'p/src/ops/t.ts': 'export interface T { x: number }\n',
};

test('a barrel exports names with the files that hold them', () => {
  const root = tree(files);
  const ctx = { project: newProject(), r: { root, aliases: [], renamed: new Map() } };
  const names = exportSources(ctx, 'p/src/ops/index.ts');
  assert.deepEqual(Object.fromEntries(names), {
    A: { file: 'p/src/ops/a/A.ts', name: 'A' },
    B: { file: 'p/src/ops/b/B.ts', name: 'B' },
    U: { file: 'p/src/ops/t.ts', name: 'T' },
  });
});

test('imports of a dropped barrel split by the file that holds each name', () => {
  const root = tree(files);
  const r = { root, aliases: [], renamed: new Map() };
  const project = newProject();
  const barrels = new Map([
    ['p/src/ops/index.ts', exportSources({ project, r }, 'p/src/ops/index.ts')],
  ]);
  const text =
    "import { A, B, type U } from './ops';\nimport * as all from './ops';\nexport { B as Bee } from './ops';\n";
  const lines = new Map([
    ['p/src/ops/index.ts', barrelLines({ project, r }, 'p/src/ops/index.ts').lines],
  ]);
  const out = redirectFile({ project, r, barrels, lines }, 'p/src/app.ts', text);
  assert.equal(
    out.text,
    [
      "import { A } from './ops/a/A';",
      "import { B } from './ops/b/B';",
      "import type { T as U } from './ops/t';",
      "import * as all from './ops';",
      "export { B as Bee } from './ops/b/B';",
      '',
    ].join('\n'),
  );
  assert.deepEqual(out.problems, [
    'p/src/app.ts: default, namespace or * use of dropped barrel ./ops',
  ]);
  assert.deepEqual(
    out.written.map(([, t]) => t),
    ['p/src/ops/a/A.ts', 'p/src/ops/b/B.ts', 'p/src/ops/t.ts', 'p/src/ops/b/B.ts'],
  );
});

test("export * of a dropped barrel becomes the barrel's own re-exports", () => {
  const root = tree(files);
  const r = { root, aliases: [], renamed: new Map() };
  const project = newProject();
  const barrel = 'p/src/ops/index.ts';
  const barrels = new Map([[barrel, exportSources({ project, r }, barrel)]]);
  const lines = new Map([[barrel, barrelLines({ project, r }, barrel).lines]]);
  const out = redirectFile(
    { project, r, barrels, lines },
    'p/src/index.ts',
    "export * from './ops';\n",
  );
  assert.equal(
    out.text,
    "export { A } from './ops/a/A';\nexport * from './ops/b';\nexport type { T as U } from './ops/t';\n",
  );
});

test('a barrel with code of its own cannot be dropped', () => {
  const root = tree({
    'p/src/x/index.ts': "export const k = 1;\nexport * from './y';\n",
    'p/src/x/y.ts': '',
  });
  const r = { root, aliases: [], renamed: new Map() };
  const out = barrelLines({ project: newProject(), r }, 'p/src/x/index.ts');
  assert.deepEqual(out.problems, ['dropped barrel p/src/x/index.ts declares code of its own']);
});
