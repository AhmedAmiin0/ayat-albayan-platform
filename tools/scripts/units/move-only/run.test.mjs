import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { test } from 'node:test';
import { gitRepo } from './git-repo.testing.mjs';
import { gate } from './run.mjs';

const P = 'apps/w/src/p';
const BASE_FILES = {
  [`${P}/A.tsx`]: "import { b } from './b';\nexport const A = b;\n",
  [`${P}/A.x.test.tsx`]: "import { A } from './A';\nvi.mock('./b');\ntest('x', () => A);\n",
  [`${P}/b.ts`]: 'export const b = 1;\n',
  'apps/w/src/use.ts': "import { A } from './p/A';\n",
  'apps/w/oxlint-suppressions.json': '{ "src/p/A.tsx": { "max-len": { "count": 1 } } }\n',
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
    'apps/w/oxlint-suppressions.json': '{ "src/p/A/A.tsx": { "max-len": { "count": 1 } } }\n',
  },
};

const repo = (branch, edit) => gitRepo({ base: BASE_FILES, branch, edit });

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
    'apps/w/oxlint-suppressions.json',
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

test('move/facade-* (import rewrites) skips the rename proof; other move/* fail closed', () => {
  const edit = ({ write }) => write({ 'apps/w/src/use.ts': "import { A } from './p/A';\nA;\n" });
  const facade = run(edit, 'move/facade-api-1');
  assert.equal(facade.code, 0, facade.out);
  assert.match(facade.out, /facade lane/);
  for (const branch of ['move/units-p', 'move/facadeless', 'move/x-facade-1']) {
    assert.equal(run(edit, branch).code, 1, branch);
  }
});
