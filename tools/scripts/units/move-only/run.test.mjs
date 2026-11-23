import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { gate } from './run.mjs';

const P = 'apps/w/src/p';
const BASE_FILES = {
  [`${P}/A.tsx`]: "import { b } from './b';\nexport const A = b;\n",
  [`${P}/A.x.test.tsx`]: "import { A } from './A';\nvi.mock('./b');\ntest('x', () => A);\n",
  [`${P}/b.ts`]: 'export const b = 1;\n',
  'apps/w/src/use.ts': "import { A } from './p/A';\n",
  'apps/w/eslint-suppressions.json': '{ "src/p/A.tsx": { "max-len": { "count": 1 } } }\n',
};

const FOLD = {
  moves: [
    [`${P}/A.tsx`, `${P}/A/A.tsx`],
    [`${P}/A.x.test.tsx`, `${P}/A/tests/x.test.tsx`],
  ],
  files: {
    [`${P}/A/A.tsx`]: "import { b } from '@/p/b';\nexport const A = b;\n",
    [`${P}/A/tests/x.test.tsx`]:
      "import { A } from '@/p/A/A';\nvi.mock('@/p/b');\ntest('x', () => A);\n",
    [`${P}/A/index.ts`]: "export { A } from './A';\n",
    'apps/w/eslint-suppressions.json': '{ "src/p/A/A.tsx": { "max-len": { "count": 1 } } }\n',
  },
};

function repo(branch, edit) {
  const cwd = mkdtempSync(join(tmpdir(), 'move-only-'));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' });
  const write = (files) =>
    Object.entries(files).forEach(([path, text]) => {
      mkdirSync(dirname(join(cwd, path)), { recursive: true });
      writeFileSync(join(cwd, path), text);
    });
  const move = (from, to) => {
    mkdirSync(dirname(join(cwd, to)), { recursive: true });
    git('mv', from, to);
  };
  git('init', '-q', '-b', 'develop');
  git('config', 'user.email', 'ci@example.test');
  git('config', 'user.name', 'ci');
  write(BASE_FILES);
  git('add', '-A');
  git('commit', '-qm', 'base');
  git('update-ref', 'refs/remotes/origin/develop', 'HEAD');
  git('checkout', '-qb', branch);
  edit({ write, move, remove: (path) => git('rm', '-q', path) });
  git('add', '-A');
  git('commit', '-qm', 'head', '--allow-empty');
  return cwd;
}

const fold = ({ write, move }) => {
  FOLD.moves.forEach(([from, to]) => move(from, to));
  write(FOLD.files);
};

function run(edit, branch = 'move/units-p') {
  const cwd = repo(branch, edit);
  const lines = [];
  const code = gate({ argv: ['--branch', branch], env: {}, cwd, log: (l) => lines.push(l) });
  rmSync(cwd, { recursive: true, force: true });
  return { code, out: lines.join('\n') };
}

test('a fold made of renames, path strings, an index.ts and renamed keys passes', () => {
  const { code, out } = run(fold);
  assert.equal(code, 0, out);
  assert.match(out, /only moves/);
});

const BAD = [
  [
    'a changed statement',
    `${P}/A/A.tsx`,
    "import { b } from '@/p/b';\nexport const A = b + 1;\n",
    /added/,
  ],
  [
    'a changed string',
    `${P}/A/tests/x.test.tsx`,
    "import { A } from '@/p/A/A';\nvi.mock('@/p/b');\ntest('y', () => A);\n",
    /added/,
  ],
  [
    'an edit to a file that stays',
    'apps/w/src/use.ts',
    "import { A } from './p/A';\nA;\n",
    /code differs/,
  ],
  ['an index.ts with logic', `${P}/A/index.ts`, 'export const A = 1;\n', /more than re-exports/],
  ['another added file', `${P}/A/extra.ts`, 'export {};\n', /added/],
  [
    'a new suppression',
    'apps/w/eslint-suppressions.json',
    '{ "src/p/A/A.tsx": { "max-len": { "count": 2 } } }\n',
    /new or grew/,
  ],
  ['any other file', 'README.md', '# x\n', /added/],
];

test('anything else fails, naming the file and the reason', () => {
  for (const [label, path, text, why] of BAD) {
    const { code, out } = run((sides) => {
      fold(sides);
      sides.write({ [path]: text });
    });
    assert.equal(code, 1, label);
    assert.match(out, new RegExp(`${path.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}: `), label);
    assert.match(out, why, label);
  }
});

test('a deleted file fails', () => {
  const { code, out } = run(({ remove }) => remove(`${P}/b.ts`));
  assert.equal(code, 1);
  assert.match(out, /b\.ts: deleted, not a move/);
});

test('other branches are skipped with a notice', () => {
  const { code, out } = run(({ write }) => write({ 'x.ts': 'export const x = 2;\n' }), 'feat/x');
  assert.equal(code, 0);
  assert.match(out, /not a move\/\* branch/);
});

test('a test renamed to a name no runner picks up fails', () => {
  for (const to of [`${P}/A.x.tsx`, `${P}/A.x.test.tsx.off`]) {
    const { code, out } = run(({ move }) => move(`${P}/A.x.test.tsx`, to));
    assert.equal(code, 1, to);
    assert.match(out, /no longer a test/, to);
  }
});
