import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { gate } from './run.mjs';
import { maskSources } from './specifiers.mjs';

const BASE = {
  'apps/w/src/a.ts': "import { b } from '../x/b';\nvi.mock('@/x/b');\nexport const a = b;\n",
  'apps/w/src/x/b.ts': "export const b = new URL('./f.json', import.meta.url);\n",
  'apps/w/eslint-suppressions.json': '{ "src/a.ts": { "ab/no-parent-imports": { "count": 1 } } }\n',
};
const REWRITE = {
  'apps/w/src/a.ts': "import { b } from '#/x/b.ts';\nvi.mock('#/x/b.ts');\nexport const a = b;\n",
};

function run(edit, branch = 'move/imports-w') {
  const cwd = mkdtempSync(join(tmpdir(), 'move-imports-'));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' });
  const write = (files) =>
    Object.entries(files).forEach(([path, text]) => {
      mkdirSync(dirname(join(cwd, path)), { recursive: true });
      writeFileSync(join(cwd, path), text);
    });
  git('init', '-q', '-b', 'develop');
  git('config', 'user.email', 'ci@example.test');
  git('config', 'user.name', 'ci');
  write(BASE);
  git('add', '-A');
  git('commit', '-qm', 'base');
  git('update-ref', 'refs/remotes/origin/develop', 'HEAD');
  git('checkout', '-qb', branch);
  edit({ write, move: (from, to) => git('mv', from, to) });
  git('add', '-A');
  git('commit', '-qm', 'head', '--allow-empty');
  const lines = [];
  const code = gate({ argv: ['--branch', branch], env: {}, cwd, log: (l) => lines.push(l) });
  rmSync(cwd, { recursive: true, force: true });
  return { code, out: lines.join('\n') };
}

test('maskSources blanks import, export, import(), mock and require paths only', () => {
  const text = "import a from './a';\nexport * from '@/b';\nvi.mock('../c');\nnew URL('./f', import.meta.url);\n";
  const masked = "import a from '';\nexport * from '';\nvi.mock('');\nnew URL('./f', import.meta.url);\n";
  assert.equal(maskSources(text, 'x.ts'), masked);
});

test('move/imports-*: rewritten sources and a shrunk suppression pass', () => {
  const pruned = { 'apps/w/eslint-suppressions.json': '{}\n' };
  const { code, out } = run(({ write }) => write({ ...REWRITE, ...pruned }));
  assert.equal(code, 0, out);
  assert.match(out, /only import sources/);
});

const BAD = [
  ['a changed statement', { 'apps/w/src/a.ts': REWRITE['apps/w/src/a.ts'].replace('= b', '= 2') }, /a\.ts/],
  ['a fixture path', { 'apps/w/src/x/b.ts': "export const b = new URL('./g.json', import.meta.url);\n" }, /b\.ts/],
  ['an added file', { 'apps/w/src/c.ts': 'export {};\n' }, /c\.ts: added, not an import rewrite/],
  ['a grown suppression', { 'apps/w/eslint-suppressions.json': '{ "src/a.ts": { "ab/no-parent-imports": { "count": 2 } } }\n' }, /suppressions/],
];

for (const [name, files, reason] of BAD) {
  test(`move/imports-*: ${name} fails`, () => {
    const { code, out } = run(({ write }) => write(files));
    assert.equal(code, 1, out);
    assert.match(out, reason);
  });
}

test('move/imports-*: a rename fails (moves go on move/units-* branches)', () => {
  const { code, out } = run(({ move }) => move('apps/w/src/x/b.ts', 'apps/w/src/x/c.ts'));
  assert.equal(code, 1, out);
  assert.match(out, /not an import rewrite/);
});
