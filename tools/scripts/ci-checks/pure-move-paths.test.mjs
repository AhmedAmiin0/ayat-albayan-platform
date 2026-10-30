import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reexportsOf, renameTable } from './pure-move-paths.mjs';
import { barrelPaths, onlyPathsChanged } from './pure-move-check.mjs';

const ROUTE = 'apps/mobile/app/(tabs)/inbox/index.tsx';
const SRC = "export { InboxScreen as default } from '@/inbox/screens/InboxScreen';\n";
const heads = (files) => reexportsOf((file) => files[file] ?? '', barrelPaths);
const ctx = (files) => ({ from: ROUTE, to: ROUTE, table: renameTable([]), reexports: heads(files) });

test('a path may switch to a feature index whose barrel re-exports the same file', () => {
  const files = { 'apps/mobile/src/inbox/index.ts': "export { InboxScreen } from './screens/InboxScreen';\n" };
  assert.equal(onlyPathsChanged(SRC, SRC.replace('@/inbox/screens/InboxScreen', '@/inbox'), ctx(files)), true);
});

test('a feature index that does not re-export the file, or is not a barrel, is not the same path', () => {
  const after = SRC.replace('@/inbox/screens/InboxScreen', '@/inbox');
  const other = { 'apps/mobile/src/inbox/index.ts': "export { LeadScreen } from './screens/LeadScreen';\n" };
  assert.equal(onlyPathsChanged(SRC, after, ctx(other)), false);
  const logic = { 'apps/mobile/src/inbox/index.ts': "export { InboxScreen } from './screens/InboxScreen';\nrun();\n" };
  assert.equal(onlyPathsChanged(SRC, after, ctx(logic)), false);
  assert.equal(onlyPathsChanged(SRC, after, ctx({})), false, 'no index at all');
  assert.equal(onlyPathsChanged(SRC, after), false, 'no reexports in the context');
});

test('the re-exported names still have to match (the barrel only changes the path)', () => {
  const files = { 'apps/mobile/src/inbox/index.ts': "export { InboxScreen } from './screens/InboxScreen';\n" };
  const renamed = "export { InboxScreen as default, X } from '@/inbox';\n";
  assert.equal(onlyPathsChanged(SRC, renamed, ctx(files)), false);
});

test('in a NodeNext package the barrel is named by its index file', () => {
  const file = 'packages/shared/src/money/schemas.ts';
  const src = "import { optionalText } from '../schemas/common.js';\n";
  const moved = renameTable([['packages/shared/src/schemas/common.ts', 'packages/shared/src/core/schemas/common.ts']]);
  const barrel = { 'packages/shared/src/core/schemas/index.ts': "export * from './common.js';\n" };
  const c = { from: file, to: file, table: moved, reexports: heads(barrel) };
  assert.equal(onlyPathsChanged(src, src.replace('../schemas/common.js', '../core/schemas/index.js'), c), true);
  assert.equal(onlyPathsChanged(src, src.replace('../schemas/common.js', '../core/index.js'), c), false, 'not that barrel');
  assert.equal(onlyPathsChanged(src, src.replace('../schemas/common.js', '../core/schemas/index.js'), { ...c, reexports: heads({}) }), false);
});
