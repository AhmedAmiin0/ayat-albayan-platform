import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { Project } from 'ts-morph';
import { bareSpec, packageFiles, rewriteText, run } from './extensionless.mjs';

const project = new Project({ useInMemoryFileSystem: true, skipFileDependencyResolution: true });
const none = () => false;
const rewrite = (text, isFile = none) =>
  rewriteText(project, { file: 'packages/a/src/x.ts', text }, isFile);

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'extensionless-'));
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
  return root;
}

test('bareSpec: a relative code path loses its extension and its /index', () => {
  assert.equal(bareSpec('./a.js'), './a');
  assert.equal(bareSpec('../b/c.ts'), '../b/c');
  assert.equal(bareSpec('./d.tsx'), './d');
  assert.equal(bareSpec('./e/index.js'), './e');
  assert.equal(bareSpec('./f/index'), './f');
  assert.equal(bareSpec('./index.js'), '.');
  assert.equal(bareSpec('../index.ts'), '..');
  assert.equal(bareSpec('./g.test.js'), './g.test');
});

test('bareSpec: packages, data and asset paths stay', () => {
  assert.equal(bareSpec('./a'), null);
  assert.equal(bareSpec('zod'), null);
  assert.equal(bareSpec('@ab/core'), null);
  assert.equal(bareSpec('react-native/index.js'), null, 'not relative');
  assert.equal(bareSpec('../../i18n/ar.json'), null);
  assert.equal(bareSpec('./mark.png'), null);
  assert.equal(bareSpec('./index.css'), null);
  assert.equal(bareSpec('./reindex.js'), './reindex');
});

test('rewriteText: imports, re-exports, import(), import types and mocks; text kept', () => {
  const src = [
    "import { a } from './a.js';",
    'import type { B } from "../b/index.js";',
    "export * from './c.js';",
    "export { d } from './d';",
    "const e = await import('./e.js');",
    "type F = import('./f.js').F;",
    "vi.mock('./g.js', () => ({}));",
    "import ar from '../i18n/ar.json' with { type: 'json' };",
    "import { z } from 'zod';",
  ].join('\n');
  const out = rewrite(src);
  assert.equal(out.rewritten, 6);
  assert.equal(
    out.text,
    [
      "import { a } from './a';",
      'import type { B } from "../b";',
      "export * from './c';",
      "export { d } from './d';",
      "const e = await import('./e');",
      "type F = import('./f').F;",
      "vi.mock('./g', () => ({}));",
      "import ar from '../i18n/ar.json' with { type: 'json' };",
      "import { z } from 'zod';",
    ].join('\n'),
  );
});

test('rewriteText: a folder import next to a same-named file is a clash, not rewritten', () => {
  const clash = (path) => path === 'packages/a/src/b.ts';
  assert.throws(
    () => rewrite("import { b } from './b/index.js';", clash),
    /packages\/a\/src\/x\.ts: '\.\/b\/index\.js' would resolve to b\.ts/,
  );
});

test('packageFiles: the TypeScript under packages/*, without node_modules or dist', () => {
  const root = fixture({
    'packages/a/src/x.ts': '',
    'packages/a/src/y.tsx': '',
    'packages/a/src/z.d.ts': '',
    'packages/a/metro.test.ts': '',
    'packages/a/config.js': '',
    'packages/a/dist/x.js': '',
    'packages/a/node_modules/m/i.ts': '',
    'apps/b/src/w.ts': '',
  });
  assert.deepEqual(packageFiles(root), [
    'packages/a/metro.test.ts',
    'packages/a/src/x.ts',
    'packages/a/src/y.tsx',
    'packages/a/src/z.d.ts',
  ]);
});

test('run: counts without --write, writes with it, and a second run finds nothing', () => {
  const root = fixture({
    'packages/a/src/index.ts': "export * from './x.js';\nexport * from './y/index.js';\n",
    'packages/a/src/x.ts': 'export const x = 1;\n',
    'packages/a/src/y/index.ts': "export { x as y } from '../x.js';\n",
    'packages/b/src/index.ts': "export const b = 'b';\n",
  });
  const dry = run(root, { write: false });
  assert.deepEqual(dry, [
    { workspace: 'packages/a', files: 3, changed: 2, rewritten: 3 },
    {
      workspace: 'packages/b',
      files: 1,
      changed: 0,
      rewritten: 0,
    },
  ]);
  assert.equal(readFileSync(join(root, 'packages/a/src/index.ts'), 'utf8').includes('.js'), true);
  run(root, { write: true });
  assert.equal(
    readFileSync(join(root, 'packages/a/src/index.ts'), 'utf8'),
    "export * from './x';\nexport * from './y';\n",
  );
  assert.equal(
    readFileSync(join(root, 'packages/a/src/y/index.ts'), 'utf8'),
    "export { x as y } from '../x';\n",
  );
  assert.equal(
    run(root, { write: true }).every((row) => row.rewritten === 0),
    true,
  );
});
