import assert from 'node:assert/strict';
import { test } from 'node:test';
import { newProject } from '../../ci-checks/move-module/rewrite.ts';
import { planFile } from './plan.ts';

const OWNERS = new Map([
  ['toE164', '@ab/core'],
  ['t', '@ab/i18n'],
]);
const plan = (text: string): ReturnType<typeof planFile> =>
  planFile(newProject(), { path: 'apps/api/src/a.ts', text, owners: OWNERS });

const filler = (n: number): string => 'f();\n'.repeat(n);

test('a file with an owner-held facade name is a change with its owners', () => {
  const p = plan("import { toE164, t } from '@ab/shared';\n");
  assert.deepEqual(p, {
    kind: 'change',
    text: "import { toE164 } from '@ab/core';\nimport { t } from '@ab/i18n';\n",
    owners: ['@ab/core', '@ab/i18n'],
  });
});

test('a result past 150 lines is over cap; exactly 150 still changes', () => {
  const text = "import { toE164, t } from '@ab/shared';\n";
  assert.equal(plan(text + filler(149)).kind, 'overCap');
  assert.equal(plan(text + filler(148)).kind, 'change');
});

test('a result with a new line over 100 characters is over cap; an old long line is not', () => {
  const long = `const s = '${'x'.repeat(100)}';\n`;
  assert.equal(plan(`import { toE164 } from '@ab/shared';\n${long}`).kind, 'change');
  const alias = `toE164 as ${'y'.repeat(70)}`;
  assert.equal(plan(`import {\n  ${alias},\n} from '@ab/shared';\n`).kind, 'change');
  const wide = `export { toE164 as ${'z'.repeat(80)} } from '@ab/shared';\n`;
  assert.equal(plan(wide).kind, 'change');
  const huge = `import { toE164 as ${'w'.repeat(100)} } from '@ab/shared';\n`;
  assert.equal(plan(huge).kind, 'overCap');
});

test('a namespace import, vi.mock or dynamic import of the facade is manual', () => {
  assert.equal(plan("import * as shared from '@ab/shared';\n").kind, 'manual');
  const mock = "import { toE164 } from '@ab/shared';\nvi.mock('@ab/shared', () => ({}));\n";
  assert.equal(plan(mock).kind, 'manual');
  assert.equal(plan("const m = await import('@ab/shared');\n").kind, 'manual');
});

test("'@ab/shared/testing' and shared-own names leave the file as it is", () => {
  const text = "import { toE164 } from '@ab/shared/testing';\nimport { own } from '@ab/shared';\n";
  assert.deepEqual(plan(text), { kind: 'same' });
});
