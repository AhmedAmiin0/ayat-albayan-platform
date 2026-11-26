import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { test } from 'node:test';
import { gitRepo } from './git-repo.testing.mjs';
import { kitExportsFailure } from './kit-exports.mjs';
import { gate } from './run.mjs';

const FILE = 'packages/web-kit/package.json';
const pkg = (exports, extra = {}) => JSON.stringify({ name: '@ab/web-kit', ...extra, exports });
const BASE = pkg({ '.': './src/index.ts', './x': './src/x.tsx' });
const ADDED = new Set(['packages/web-kit/src/ui/Card/index.ts']);
const RENAMES = [['packages/web-kit/src/x.tsx', 'packages/web-kit/src/X/X.tsx']];
const check = (head, added = ADDED) =>
  kitExportsFailure({ file: FILE, base: BASE, head, added, renames: RENAMES });

test('an entry that points at an added export-only index.ts passes', () => {
  const head = pkg({
    '.': './src/index.ts',
    './x': './src/X/X.tsx',
    './ui/Card': './src/ui/Card/index.ts',
  });
  assert.equal(check(head), null);
});

test('an entry that points at a file the move did not add fails', () => {
  const head = pkg({ '.': './src/index.ts', './x': './src/X/X.tsx', './y': './src/y/index.ts' });
  assert.match(check(head) ?? '', /"\.\/y"/);
});

test('a changed existing entry fails', () => {
  const head = pkg({ '.': './src/main.ts', './x': './src/X/X.tsx' });
  assert.match(check(head) ?? '', /"\."/);
});

test('a removed entry fails', () => {
  assert.match(check(pkg({ './x': './src/X/X.tsx' })) ?? '', /"\."/);
});

test('a change outside exports fails', () => {
  const head = pkg({ '.': './src/index.ts', './x': './src/X/X.tsx' }, { version: '2.0.0' });
  assert.match(check(head) ?? '', /outside exports/);
});

const KIT = 'packages/web-kit';
const fold = (exports) => `${JSON.stringify({ name: '@ab/web-kit', exports }, null, 2)}\n`;
const REPO = {
  [`${KIT}/src/ui/card.tsx`]: 'export const Card = () => null;\n',
  [`${KIT}/package.json`]: fold({ '.': './src/index.ts' }),
};

function run(entry) {
  const branch = 'move/components-family-kits';
  const cwd = gitRepo({
    base: REPO,
    branch,
    edit: ({ write, move }) => {
      move(`${KIT}/src/ui/card.tsx`, `${KIT}/src/ui/Card/Card.tsx`);
      write({
        [`${KIT}/src/ui/Card/index.ts`]: "export { Card } from './Card';\n",
        [`${KIT}/package.json`]: fold({ '.': './src/index.ts', ...entry }),
      });
    },
  });
  const lines = [];
  const code = gate({ argv: ['--branch', branch], env: {}, cwd, log: (l) => lines.push(l) });
  rmSync(cwd, { recursive: true, force: true });
  return { code, out: lines.join('\n') };
}

test('a kit exports entry for an added export-only index.ts is a move', () => {
  const { code, out } = run({ './ui/Card': './src/ui/Card/index.ts' });
  assert.equal(code, 0, out);
});

test('a kit exports entry for any other file fails', () => {
  const { code, out } = run({ './ui/Card': './src/ui/Card/Card.tsx' });
  assert.equal(code, 1);
  assert.match(out, /package\.json: exports "\.\/ui\/Card"/);
});
