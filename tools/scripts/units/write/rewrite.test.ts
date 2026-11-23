import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeRepo } from '../../ci-checks/move-module/fixture.test-util.ts';
import { rewriteRepo } from './rewrite.ts';

const W = 'apps/web/src/pane';
const FILES: Record<string, string> = {
  'apps/web/tsconfig.json': '{ "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }',
  [`${W}/Pane.tsx`]: "import { b } from './Banner';\nexport const Pane = 1;\nexport type P = 2;\n",
  [`${W}/Pane.types.ts`]: 'export interface PaneProps { a: 1 }\n',
  [`${W}/Pane.chat.test.tsx`]: "import { Pane } from './Pane';\nvi.mock('./Banner');\n",
  [`${W}/Banner.tsx`]: "import type { PaneProps } from './Pane.types';\nexport const b = 1;\n",
  'apps/web/src/other.ts': "import { Pane, type P } from '@/pane/Pane';\nvi.mock('@/pane/Pane');\n",
  'packages/p/src/use.ts': "import * as all from './x/use';\n",
};

const MOVES: [string, string][] = [
  [`${W}/Pane.tsx`, `${W}/Pane/Pane.tsx`],
  [`${W}/Pane.types.ts`, `${W}/Pane/Pane.types.ts`],
  [`${W}/Pane.chat.test.tsx`, `${W}/Pane/tests/chat.test.tsx`],
];

const run = (): ReturnType<typeof rewriteRepo> => {
  const root = makeRepo(FILES);
  const homes = new Map(MOVES.map(([from]) => [from, `${W}/Pane`]));
  return rewriteRepo({ root, renamed: new Map(MOVES), homes });
};

test('outside importers name the unit folder; mocks and the unit itself keep exact files', () => {
  const { texts } = run();
  assert.deepEqual(Object.fromEntries(texts), {
    [`${W}/Pane.chat.test.tsx`]:
      "import { Pane } from '@/pane/Pane/Pane';\nvi.mock('@/pane/Banner');\n",
    [`${W}/Banner.tsx`]: "import type { PaneProps } from './Pane';\nexport const b = 1;\n",
    [`${W}/Pane.tsx`]:
      "import { b } from '@/pane/Banner';\nexport const Pane = 1;\nexport type P = 2;\n",
    'apps/web/src/other.ts':
      "import { Pane, type P } from '@/pane/Pane';\nvi.mock('@/pane/Pane/Pane');\n",
  });
});

test('the barrel records the names each unit file must re-export', () => {
  const { barrels } = run();
  const use = barrels.get(`${W}/Pane`);
  assert.equal(use?.style, 'bare');
  assert.deepEqual([...use.files].map(([f, names]) => [f, Object.fromEntries(names)]).sort(), [
    [`${W}/Pane/Pane.tsx`, { Pane: false, P: true }],
    [`${W}/Pane/Pane.types.ts`, { PaneProps: true }],
  ]);
});
