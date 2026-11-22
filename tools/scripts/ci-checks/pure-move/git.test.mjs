import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { headTree } from './git.mjs';

const SCRIPT = fileURLToPath(new URL('../pure-move-check.mjs', import.meta.url));
const TREE = {
  'packages/shared/src/index.ts': "export * from '@ab/time';\nexport * from '@ab/i18n';\n",
  'packages/time/src/index.ts': 'export const formatDay = () => 1;\n',
  'packages/i18n/src/index.ts': 'export const t = 1;\n',
  'apps/api/src/a.ts': "import { formatDay } from '@ab/shared';\nexport const a = formatDay();\n",
  'apps/api/package.json': '{\n  "dependencies": {\n    "@ab/shared": "workspace:*"\n  }\n}\n',
};

function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'pure-move-facade-'));
  const git = (...a) => execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { cwd: dir, encoding: 'utf8' });
  const write = (files) => {
    for (const [file, text] of Object.entries(files)) {
      mkdirSync(join(dir, dirname(file)), { recursive: true });
      writeFileSync(join(dir, file), text);
    }
    git('add', '-A');
    git('commit', '-qm', 'step');
  };
  const run = () => {
    try {
      return { code: 0, out: execFileSync('node', [SCRIPT, 'base'], { cwd: dir, encoding: 'utf8' }) };
    } catch (e) {
      return { code: e.status, out: String(e.stdout) };
    }
  };
  git('init', '-q', '-b', 'base');
  write(TREE);
  git('checkout', '-qb', 'head');
  return { dir, git, write, run };
}

test('headTree reads head files, misses as empty, and greps without the tree prefix', () => {
  const r = repo();
  const tree = headTree((...a) => r.git(...a), 'HEAD');
  assert.equal(tree.read('packages/i18n/src/index.ts'), TREE['packages/i18n/src/index.ts']);
  assert.equal(tree.read('packages/i18n/src'), '', 'a folder is not a file');
  assert.equal(tree.read('nope.ts'), '');
  assert.deepEqual(tree.grep("@ab/shared['\"]"), ['apps/api/src/a.ts']);
  assert.deepEqual(tree.grep('nothing-matches-this'), []);
  rmSync(r.dir, { recursive: true, force: true });
});

test('end to end: a facade import with its dependency line passes, a logic edit fails', () => {
  const r = repo();
  r.write({
    'apps/api/src/a.ts': "import { formatDay } from '@ab/time';\nexport const a = formatDay();\n",
    'apps/api/package.json': TREE['apps/api/package.json'].replace('"@ab/shared"', '"@ab/time": "workspace:*",\n    "@ab/shared"'),
  });
  const good = r.run();
  assert.equal(good.code, 0, good.out);
  r.write({ 'apps/api/src/a.ts': "import { formatDay } from '@ab/time';\nexport const a = formatDay() + 1;\n" });
  const bad = r.run();
  assert.equal(bad.code, 1);
  assert.match(bad.out, /apps\/api\/src\/a\.ts: changes more than/);
  rmSync(r.dir, { recursive: true, force: true });
});
