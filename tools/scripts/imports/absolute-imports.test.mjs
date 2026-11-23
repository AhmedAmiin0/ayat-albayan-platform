import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { Project } from 'ts-morph';
import { codeFiles, rewriteText, run, targetPath } from './absolute-imports.mjs';
import { aliasOf } from './absolute-resolve.mjs';

const PKG = '{ "imports": { "#/*": "./src/*" } }';
const project = new Project({ useInMemoryFileSystem: true, skipFileDependencyResolution: true });

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'abs-imports-'));
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
  return root;
}

const FILE = 'apps/staff-web/src/features/a/b/c.ts';
const TREE = ['a', 'c', 'e', 'f', 'g', 'h', 'i'].map((n) => `features/a/${n}.ts`);
const ROOT = fixture({
  'apps/staff-web/package.json': PKG,
  ...Object.fromEntries([...TREE, 'features/b.ts', 'x.ts', 'A.tsx'].map((f) => [`apps/staff-web/src/${f}`, ''])),
});
const ALIAS = aliasOf(ROOT, 'apps/staff-web');
const rewrite = (text, file = FILE) => rewriteText(project, ALIAS, { file, text });

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
      "import { a } from '#/features/a/a.ts';",
      'import type { B } from "#/features/b.ts";',
      "export * from '#/features/a/c.ts';",
      "export { d } from './d';",
      "const e = await import('#/features/a/e.ts');",
      "type F = typeof import('#/features/a/f.ts');",
      "vi.mock('#/features/a/g.ts', async () => ({ ...(await vi.importActual<object>('#/features/a/g.ts')) }));",
      "jest.mock('#/features/a/h.ts'); jest.requireActual('#/features/a/h.ts');",
      "const i = require('#/features/a/i.ts');",
      "const s = '../not-a-path'; const url = new URL('../asset.png', import.meta.url);",
      "// import { z } from '../comment';",
    ].join('\n'),
  );
  assert.deepEqual([out.rewritten, out.kept], [10, 0]);
});

test('rewriteText: `@/` and a bare `#/` become exact; an exact `#/` is left alone', () => {
  const out = rewrite("import { x } from '@/x';\nimport { A } from '#/A';\nimport { y } from '#/x.ts';\n");
  assert.equal(out.text, "import { x } from '#/x.ts';\nimport { A } from '#/A.tsx';\nimport { y } from '#/x.ts';\n");
  assert.deepEqual([out.rewritten, out.kept], [2, 0]);
  assert.equal(rewrite(out.text).rewritten, 0);
});

test('rewriteText: a path outside the alias folder is kept and counted; a second run changes nothing', () => {
  const first = rewrite("import cfg from '../../../../app.json';\nimport { x } from '../../../x';\n");
  assert.deepEqual([first.rewritten, first.kept], [1, 1]);
  const second = rewrite(first.text);
  assert.deepEqual([second.text, second.rewritten, second.kept], [first.text, 0, 1]);
});

test('rewriteText: tsx parses, and a file with no app path comes back identical', () => {
  const tsx = "import { A } from '../A';\nexport const B = () => <A x={'../y'} />;\n";
  assert.equal(rewrite(tsx, 'apps/staff-web/src/x/B.tsx').text, tsx.replace("'../A'", "'#/A.tsx'"));
  const none = "import { a } from './a';\n";
  assert.equal(rewrite(none).text, none);
});

test('targetPath / codeFiles: workspace names, sorted code files', () => {
  const root = fixture({
    'apps/staff-web/src/b.ts': '',
    'apps/staff-web/src/a/c.tsx': '',
    'apps/staff-web/src/a/d.d.ts': '',
    'apps/staff-web/src/e.json': '',
    'apps/staff-web/node_modules/x/y.js': '',
  });
  assert.equal(targetPath(root, 'staff-web'), 'apps/staff-web');
  assert.equal(targetPath(root, 'apps/staff-web/src/'), 'apps/staff-web/src');
  assert.deepEqual(codeFiles(root, 'apps/staff-web'), ['apps/staff-web/src/a/c.tsx', 'apps/staff-web/src/b.ts']);
});

test('run: dry run counts and writes nothing; --write rewrites; an app without `imports` fails', () => {
  const text = "import { a } from '../a';\nimport { b } from './b';\n";
  const root = fixture({
    'apps/staff-web/package.json': PKG,
    'apps/staff-web/src/x/y.ts': text,
    'apps/staff-web/src/x/b.ts': '',
    'apps/staff-web/src/a.ts': '',
    'apps/api/tsconfig.json': '{ "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }',
    'apps/api/src/a.ts': '',
  });
  const row = { workspace: 'apps/staff-web', files: 3, changed: 1, rewritten: 1, kept: 0 };
  assert.deepEqual(run(root, { targets: ['staff-web'], write: false }), [row]);
  assert.equal(readFileSync(join(root, 'apps/staff-web/src/x/y.ts'), 'utf8'), text);
  assert.deepEqual(run(root, { targets: ['apps/staff-web/src/x/y.ts'], write: true }), [{ ...row, files: 1 }]);
  assert.equal(readFileSync(join(root, 'apps/staff-web/src/x/y.ts'), 'utf8'), text.replace('../a', '#/a.ts'));
  assert.throws(() => run(root, { targets: ['api'], write: false }), /package\.json "imports"/);
});
