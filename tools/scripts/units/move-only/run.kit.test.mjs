import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { test } from 'node:test';
import { gitRepo } from './git-repo.testing.mjs';
import { gate } from './run.mjs';

const KIT = 'packages/web-kit';
const manifest = (exports) => `${JSON.stringify({ name: '@ab/web-kit', exports }, null, 2)}\n`;
const BASE = {
  [`${KIT}/src/ui/card.tsx`]: 'export const Card = () => null;\n',
  [`${KIT}/package.json`]: manifest({ '.': './src/index.ts' }),
};

function run(entry) {
  const branch = 'move/components-family-kits';
  const cwd = gitRepo({
    base: BASE,
    branch,
    edit: ({ write, move }) => {
      move(`${KIT}/src/ui/card.tsx`, `${KIT}/src/ui/Card/Card.tsx`);
      write({
        [`${KIT}/src/ui/Card/index.ts`]: "export { Card } from './Card';\n",
        [`${KIT}/package.json`]: manifest({ '.': './src/index.ts', ...entry }),
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
