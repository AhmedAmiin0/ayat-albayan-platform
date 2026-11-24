import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { Project } from 'ts-morph';
import { absoluteSpec, aliasOf, codeFiles, rewriteText, run, targetPath } from './absolute-imports.mjs';

const ALIAS = { scope: 'apps/staff-web', dir: 'apps/staff-web/src' };
const FILE = 'apps/staff-web/src/features/a/b/c.ts';
const project = new Project({ useInMemoryFileSystem: true, skipFileDependencyResolution: true });
const rewrite = (text, file = FILE) => rewriteText(project, ALIAS, { file, text });

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'abs-imports-'));
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
  return root;
}

test('absoluteSpec: `../` into the alias folder becomes `@/`, everything else stays', () => {
  assert.equal(absoluteSpec(ALIAS, FILE, '../x'), '@/features/a/x');
  assert.equal(absoluteSpec(ALIAS, FILE, '../../../lib/api.js'), '@/lib/api.js');
  assert.equal(absoluteSpec(ALIAS, FILE, '..'), '@/features/a');
  assert.equal(absoluteSpec(ALIAS, FILE, '../x/'), '@/features/a/x');
  assert.equal(absoluteSpec(ALIAS, FILE, './x'), null);
  assert.equal(absoluteSpec(ALIAS, FILE, '@/x'), null);
  assert.equal(absoluteSpec(ALIAS, FILE, 'react'), null);
  assert.equal(absoluteSpec(ALIAS, FILE, '../../../../public/sw.js?raw'), null, 'outside src/');
});

test('rewriteText: every kind of module path, quotes and everything else kept', () => {
  const src = [
    "import { a } from '../a';",
    'import type { B } from "../../b.js";',
    "export * from '../c';",
    "export { d } from './d';",
    "const e = await import('../e');",
    "type F = typeof import('../f');",
    "vi.mock('../g', async () => ({ ...(await vi.importActual<object>('../g')) }));",
    "jest.mock('../h'); jest.requireActual('../h');",
    "const i = require('../i');",
    "const s = '../not-a-path'; const url = new URL('../asset.png', import.meta.url);",
    "// import { z } from '../comment';",
  ].join('\n');
  const out = rewrite(src);
  assert.equal(
    out.text,
    [
      "import { a } from '@/features/a/a';",
      'import type { B } from "@/features/b.js";',
      "export * from '@/features/a/c';",
      "export { d } from './d';",
      "const e = await import('@/features/a/e');",
      "type F = typeof import('@/features/a/f');",
      "vi.mock('@/features/a/g', async () => ({ ...(await vi.importActual<object>('@/features/a/g')) }));",
      "jest.mock('@/features/a/h'); jest.requireActual('@/features/a/h');",
      "const i = require('@/features/a/i');",
      "const s = '../not-a-path'; const url = new URL('../asset.png', import.meta.url);",
      "// import { z } from '../comment';",
    ].join('\n'),
  );
  assert.deepEqual([out.rewritten, out.kept], [10, 0]);
});

test('rewriteText: a path outside the alias folder is kept and counted; a second run changes nothing', () => {
  const first = rewrite("import cfg from '../../../../app.json';\nimport { x } from '../x';\n");
  assert.deepEqual([first.rewritten, first.kept], [1, 1]);
  const second = rewrite(first.text);
  assert.deepEqual([second.text, second.rewritten, second.kept], [first.text, 0, 1]);
});

test('rewriteText: tsx parses, and a file with no parent path comes back identical', () => {
  const tsx = "import { A } from '../A';\nexport const B = () => <A x={'../y'} />;\n";
  assert.equal(rewrite(tsx, 'apps/staff-web/src/x/B.tsx').text, tsx.replace("'../A'", "'@/A'"));
  const none = "import { a } from './a';\n";
  assert.equal(rewrite(none).text, none);
});

test('aliasOf / targetPath / codeFiles: tsconfig `@/*`, workspace names, sorted code files', () => {
  const root = fixture({
    'apps/staff-web/tsconfig.json': '{ // comment\n "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }',
    'apps/api/tsconfig.json': '{ "compilerOptions": {} }',
    'apps/staff-web/src/b.ts': '',
    'apps/staff-web/src/a/c.tsx': '',
    'apps/staff-web/src/a/d.d.ts': '',
    'apps/staff-web/src/e.json': '',
    'apps/staff-web/node_modules/x/y.js': '',
  });
  assert.deepEqual(aliasOf(root, 'apps/staff-web'), ALIAS);
  assert.equal(aliasOf(root, 'apps/api'), undefined);
  assert.equal(targetPath(root, 'staff-web'), 'apps/staff-web');
  assert.equal(targetPath(root, 'apps/staff-web/src/'), 'apps/staff-web/src');
  assert.deepEqual(codeFiles(root, 'apps/staff-web'), ['apps/staff-web/src/a/c.tsx', 'apps/staff-web/src/b.ts']);
});

test('run: dry run counts and writes nothing; --write rewrites; an app without the alias fails', () => {
  const text = "import { a } from '../a';\nimport { b } from './b';\n";
  const root = fixture({
    'apps/staff-web/tsconfig.json': '{ "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }',
    'apps/staff-web/src/x/y.ts': text,
    'apps/staff-web/src/x/b.ts': '',
    'apps/api/tsconfig.json': '{}',
    'apps/api/src/a.ts': '',
  });
  const row = { workspace: 'apps/staff-web', files: 2, changed: 1, rewritten: 1, kept: 0 };
  assert.deepEqual(run(root, { targets: ['staff-web'], write: false }), [row]);
  assert.equal(readFileSync(join(root, 'apps/staff-web/src/x/y.ts'), 'utf8'), text);
  assert.deepEqual(run(root, { targets: ['apps/staff-web/src/x/y.ts'], write: true }), [{ ...row, files: 1 }]);
  assert.equal(readFileSync(join(root, 'apps/staff-web/src/x/y.ts'), 'utf8'), text.replace('../a', '@/a'));
  assert.throws(() => run(root, { targets: ['api'], write: false }), /tsconfig "@\/\*" path/);
});

test('aliasOf / run: an app takes `@/*` from the root tsconfig.base.json it extends', () => {
  const root = fixture({
    'tsconfig.base.json': '{ "compilerOptions": { "paths": { "@/*": ["${configDir}/src/*"] } } }',
    'apps/staff-web/tsconfig.json': '{ "extends": "../../tsconfig.base.json" }',
    'apps/staff-web/src/x/y.ts': "import { a } from '../a';\n",
  });
  assert.deepEqual(aliasOf(root, 'apps/staff-web'), ALIAS);
  run(root, { targets: ['staff-web'], write: true });
  assert.equal(readFileSync(join(root, 'apps/staff-web/src/x/y.ts'), 'utf8'), "import { a } from '@/a';\n");
});
