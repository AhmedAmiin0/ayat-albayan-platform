import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { after, test } from 'node:test';
import { makeRepo } from './fixture.mjs';
import { buildGraph, reverseClosure } from './graph.mjs';
import { ownExports, parseImports } from './parse.mjs';

const root = makeRepo();
after(() => rmSync(root, { recursive: true, force: true }));

test('parseImports: named, aliased, type-only, default, namespace, side-effect, re-exports, dynamic', () => {
  const src = [
    "import { a, type b as c } from './x';",
    "import D, { e } from './d';",
    "import * as ns from './ns';",
    "import './side.css';",
    "export { f as g } from './f';",
    "export * from './star.js';",
    "const lazy = import('./lazy');",
  ].join('\n');
  assert.deepEqual(parseImports(src), [
    {
      spec: './x',
      names: [
        { from: 'a', as: 'a' },
        { from: 'b', as: 'c' },
      ],
      reexport: false,
      bare: false,
    },
    { spec: './d', names: null, reexport: false, bare: false },
    { spec: './ns', names: null, reexport: false, bare: false },
    { spec: './side.css', names: null, reexport: false, bare: true },
    { spec: './f', names: [{ from: 'f', as: 'g' }], reexport: true, bare: false },
    { spec: './star.js', names: null, reexport: true, bare: false },
    { spec: './lazy', names: null, reexport: false, bare: false },
  ]);
});

test('ownExports: declarations and local export lists, not re-exports', () => {
  const own = ownExports(
    "export const a = 1; export function b() {} export type C = 1; const d = 1; export { d as e }; export { z } from './z';",
  );
  assert.deepEqual([...own].sort(), ['C', 'a', 'b', 'e']);
});

test('edges point at the file that declares a name, through barrels and export *', () => {
  const g = buildGraph(root);
  const inbox = 'apps/web/src/features/messaging/inbox/';
  assert.deepEqual(
    [...g.edges.get('apps/web/src/routes/admin/(people)/inbox.tsx')],
    [`${inbox}InboxPage.tsx`, `${inbox}register.ts`],
  );
  assert.ok(g.edges.get(`${inbox}Bubble.tsx`).has('packages/shared/src/phone.ts'));
  assert.ok(!g.edges.get(`${inbox}Bubble.tsx`).has('packages/shared/src/money.ts'));
  assert.ok(!g.files.has(`${inbox}Bubble.test.tsx`), 'unit tests are not part of the graph');
});

test('reverseClosure follows importers and stops where told', () => {
  const g = buildGraph(root);
  const all = reverseClosure(g, ['apps/web/src/features/messaging/inbox/Badge.tsx']);
  assert.ok(all.has('apps/web/src/routes/admin.tsx') && all.has('apps/web/src/routeTree.gen.ts'));
  const stopped = reverseClosure(g, ['apps/web/src/features/messaging/inbox/Badge.tsx'], (f) =>
    f.endsWith('routeTree.gen.ts'),
  );
  assert.ok(!stopped.has('apps/web/src/routeTree.gen.ts'));
});
