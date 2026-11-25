import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { run } from './run.mjs';

const TABLE = { moves: { '@k/a': '@k' }, namespaces: {} };
const FILES = {
  'apps/web/src/a.ts': "import { a } from '@k/a';\n",
  'apps/web/src/b.tsx': "import { b } from '@k';\n",
  'apps/web/src/c.ts': "import X from '@k/a';\n",
  'apps/web/node_modules/d.ts': "import { a } from '@k/a';\n",
  'packages/p/src/e.ts': "import { a } from '@k/a';\n",
};

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'kit-entries-'));
  for (const [rel, text] of Object.entries(FILES)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
  return root;
}

test('a dry run counts the app files to change and lists the manual ones, writing nothing', () => {
  const root = fixture();
  const report = run(root, { write: false, table: TABLE });
  assert.deepEqual(report, {
    changed: ['apps/web/src/a.ts'],
    rewritten: 1,
    manual: ["apps/web/src/c.ts: import X from '@k/a';"],
  });
  assert.equal(readFileSync(join(root, 'apps/web/src/a.ts'), 'utf8'), FILES['apps/web/src/a.ts']);
});

test('--write rewrites app sources only, skipping node_modules and the packages', () => {
  const root = fixture();
  run(root, { write: true, table: TABLE });
  const read = (rel) => readFileSync(join(root, rel), 'utf8');
  assert.equal(read('apps/web/src/a.ts'), "import { a } from '@k';\n");
  assert.equal(read('apps/web/node_modules/d.ts'), FILES['apps/web/node_modules/d.ts']);
  assert.equal(read('packages/p/src/e.ts'), FILES['packages/p/src/e.ts']);
});
