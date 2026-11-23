import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalize, onlyPathsChanged } from '../pure-move-check.mjs';
import { headModules } from './exports.mjs';

const TREE = {
  'packages/shared/src/index.ts': [
    "export * from '@ab/core';",
    "export * from '@ab/i18n';",
    "export * from '@ab/time';",
    "export * from './sales/views.js';",
  ].join('\n'),
  'packages/shared/src/sales/views.ts': 'export const viewName = 1;\n',
  'packages/time/src/index.ts': "export * from './format/index.js';\n",
  'packages/time/src/format/index.ts': "export { formatDay } from './day.js';\nexport type { Zone } from './zone.js';\n",
  'packages/time/src/format/day.ts': 'export function formatDay() {}\n',
  'packages/time/src/format/zone.ts': 'export type Zone = string;\n',
  'packages/i18n/src/index.ts': "export * from './strings.js';\n",
  'packages/i18n/src/strings.ts': "export const t = () => '';\nexport type Key = string;\n",
  'packages/core/src/index.ts': 'export const id = 1;\n',
  'apps/staff-web/src/lib/time.ts': "export { formatDay } from '@ab/time';\n",
};
const FILE = 'apps/staff-web/src/x/a.ts';
const modules = (extra = {}) => {
  const files = { ...TREE, ...extra };
  const grep = (re) => Object.keys(files).filter((f) => new RegExp(re).test(files[f] ?? ''));
  return headModules({ read: (f) => files[f] ?? '', grep }, normalize);
};
const moved = (before, after, opts = {}) => {
  const file = opts.file ?? FILE;
  return onlyPathsChanged(before, after, { from: file, to: file, modules: modules(opts.extra) });
};

const SRC = "import { formatDay, type Zone, t as tr } from '@ab/shared';\nexport const z: Zone = formatDay(tr);\n";
const BODY = 'export const z: Zone = formatDay(tr);\n';

test("accepts '@ab/shared' -> '@ab/time' for a name shared re-exports from time", () => {
  const before = "import { formatDay } from '@ab/shared';\nf();\n";
  assert.equal(moved(before, before.replace('@ab/shared', '@ab/time')), true);
  const twice = "import { formatDay } from '@ab/time';\nimport { formatDay as f } from '@ab/time';\nf();\n";
  assert.equal(moved(before, twice), false, 'an added binding');
});

test('rejects the move when shared also exports the name from its own files', () => {
  const extra = { 'packages/shared/src/sales/views.ts': 'export const viewName = 1;\nexport const formatDay = 2;\n' };
  const before = "import { formatDay } from '@ab/shared';\nf();\n";
  assert.equal(moved(before, before.replace('@ab/shared', '@ab/time'), { extra }), false);
  assert.equal(moved(before, before.replace('@ab/shared', '@ab/i18n')), false, 'i18n does not export it');
  assert.equal(moved("import { viewName } from '@ab/shared';\n", "import { viewName } from '@ab/time';\n"), false);
});

test('follows an app re-export file to the owner package', () => {
  const before = "import { formatDay } from '@/lib/time';\nf();\n";
  assert.equal(moved(before, before.replace('@/lib/time', '@ab/time')), true);
  assert.equal(moved(before, before.replace('@/lib/time', '@ab/i18n')), false);
});

test('accepts a split that keeps the names, aliases and type flags', () => {
  const split = `import { formatDay, type Zone } from '@ab/time';\nimport { t as tr } from '@ab/i18n';\n${BODY}`;
  assert.equal(moved(SRC, split), true);
  const typed = "import type { Zone, Key } from '@ab/shared';\nlet z: Zone;\n";
  assert.equal(moved(typed, "import type { Zone } from '@ab/time';\nimport type { Key } from '@ab/i18n';\nlet z: Zone;\n"), true);
  assert.equal(moved(typed, "import type { Zone } from '@ab/time';\nimport { type Key } from '@ab/i18n';\nlet z: Zone;\n"), false);
});

test('rejects a split that drops a name, renames a binding or changes an alias or type flag', () => {
  const head = (time, i18n) => `import { ${time} } from '@ab/time';\nimport { ${i18n} } from '@ab/i18n';\n${BODY}`;
  assert.equal(moved(SRC, head('formatDay', 't as tr')), false, 'dropped Zone');
  assert.equal(moved(SRC, head('formatDay, type Zone', 't as tx')), false, 'renamed binding');
  assert.equal(moved(SRC, head('formatDay, type Zone', 't')), false, 'alias dropped');
  assert.equal(moved(SRC, head('formatDay, Zone', 't as tr')), false, 'type flag dropped');
  assert.equal(moved(SRC, `${head('formatDay, type Zone', 't as tr')}import { id } from '@ab/core';\n`), false);
});

test('an export-from line may follow the facade too, and still rejects a logic hunk', () => {
  const reexport = "export { formatDay, type Zone } from '@ab/shared';\n";
  assert.equal(moved(reexport, reexport.replace('@ab/shared', '@ab/time')), true);
  const split = `import { formatDay, type Zone } from '@ab/time';\nimport { t as tr } from '@ab/i18n';\n`;
  assert.equal(moved(SRC, `${split}export const z: Zone = formatDay(tr) + 1;\n`), false);
});

test('in a test file a specifier may change, a vi.mock specifier or a namespace import may not', () => {
  const file = 'apps/staff-web/src/x/a.test.ts';
  const src = "import { formatDay } from '@ab/shared';\nvi.mock('@ab/shared');\nit('x', () => formatDay());\n";
  const ok = src.replace("from '@ab/shared'", "from '@ab/time'");
  assert.equal(moved(src, ok, { file }), true);
  assert.equal(moved(src, ok.replace("vi.mock('@ab/shared')", "vi.mock('@ab/time')"), { file }), false);
  const ns = "import * as s from '@ab/shared';\nit('x', () => s.formatDay());\n";
  assert.equal(moved(ns, ns.replace('@ab/shared', '@ab/time'), { file }), false);
});

const SHARED = 'packages/shared/src/index.ts';
const USER = 'apps/staff-web/src/y/b.ts';

test("accepts deleting `export * from '@ab/i18n'` when no head file imports an i18n name from shared", () => {
  const base = TREE[SHARED];
  const head = base.replace("export * from '@ab/i18n';\n", '');
  const opts = (user) => ({ file: SHARED, extra: { [SHARED]: head, [USER]: user } });
  assert.equal(moved(base, head, opts("import { id, type Key as K } from '@ab/i18n';\n")), true);
  assert.equal(moved(base, head, opts("import { id, type Key } from '@ab/shared';\n")), false);
  assert.equal(moved(base, head, opts("import * as all from '@ab/shared';\n")), false);
  assert.equal(moved(base, head.replace('@ab/core', '@ab/money'), opts('')), false, 'other lines kept');
});

test('accepts deleting a named workspace re-export nobody imports from that file', () => {
  const file = 'apps/staff-web/src/lib/time.ts';
  const base = "export { formatDay } from '@ab/time';\nexport { id } from '@ab/core';\n";
  const head = "export { id } from '@ab/core';\n";
  const opts = (user) => ({ file, extra: { [file]: head, [USER]: user } });
  assert.equal(moved(base, head, opts("import { formatDay } from '@ab/time';\n")), true);
  assert.equal(moved(base, head, opts("import { formatDay } from '@/lib/time';\n")), false);
  const core = opts("import { id } from '@/lib/time';\n");
  assert.equal(moved(base, "export { formatDay } from '@ab/time';\n", core), false, 'id is still imported');
  assert.equal(moved("export { formatDay } from './day';\n", '', opts('')), false, 'not a workspace');
});
