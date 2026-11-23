import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeRepo } from './fixture.test-util.ts';
import { formatSpec, loadAliases, resolveSpec, type Resolver } from './resolve.ts';

const root = makeRepo({
  'apps/staff-web/tsconfig.json': '{ // comment\n "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }',
  'apps/staff-web/src/lib/api.ts': '',
  'apps/staff-web/src/ui/index.tsx': '',
  'apps/api/src/env.ts': '',
  'apps/api/src/x.js': '',
  'apps/family-web/package.json': '{ "imports": { "#/*": "./src/*" } }',
  'apps/family-web/src/lib/api.ts': '',
  'apps/family-web/src/ui/index.tsx': '',
});
const r = (renamed: [string, string][] = []): Resolver => ({ root, aliases: loadAliases(root), renamed: new Map(renamed) });

test('loads the #/ alias of an app package.json and the @/ alias of an app tsconfig with comments', () => {
  assert.deepEqual(loadAliases(root), [
    { prefix: '#/', dir: 'apps/family-web/src', scope: 'apps/family-web', exact: true },
    { prefix: '@/', dir: 'apps/staff-web/src', scope: 'apps/staff-web' },
  ]);
});

test('#/ names the file with its extension, also when a move turns `../` into it', () => {
  const from = 'apps/family-web/src/features/a.ts';
  const t = resolveSpec(r(), from, '#/ui/index.tsx');
  assert.deepEqual(t?.file, 'apps/family-web/src/ui/index.tsx');
  assert.ok(t);
  const moved = { from: 'apps/family-web/src/x/y/z.ts', file: 'apps/family-web/src/ui/Button/index.tsx' };
  assert.equal(formatSpec(t, moved), '#/ui/Button/index.tsx');
  const bare = resolveSpec(r(), from, '../lib/api');
  assert.ok(bare);
  const up = { from: 'apps/family-web/src/a/b/c.ts', file: 'apps/family-web/src/lib/api.ts', aliases: loadAliases(root) };
  assert.equal(formatSpec(bare, up), '#/lib/api.ts', 'a climbing path takes the exact #/ form');
});

test('resolves bare, .js-for-.ts, exact, directory index and alias specifiers', () => {
  const from = 'apps/staff-web/src/features/a.ts';
  assert.equal(resolveSpec(r(), from, '../lib/api')?.style, 'bare');
  assert.equal(resolveSpec(r(), from, '../lib/api.js')?.style, 'js');
  assert.equal(resolveSpec(r(), from, '../lib/api.ts')?.style, 'exact');
  assert.deepEqual(resolveSpec(r(), from, '../ui'), { file: 'apps/staff-web/src/ui/index.tsx', style: 'index' });
  assert.equal(resolveSpec(r(), from, '@/lib/api')?.alias?.prefix, '@/');
  assert.equal(resolveSpec(r(), 'apps/api/src/a.ts', '@/lib/api'), undefined, 'alias is scoped to its app');
  assert.equal(resolveSpec(r(), from, 'react'), undefined);
  assert.equal(resolveSpec(r(), 'apps/api/src/a.ts', './x.js')?.style, 'exact');
});

test('an old path that a map renames still resolves after the file is gone', () => {
  const gone = r([['apps/api/src/old.ts', 'apps/api/src/config/old.ts']]);
  assert.equal(resolveSpec(gone, 'apps/api/src/main.ts', './old')?.file, 'apps/api/src/old.ts');
});

test('formats the new specifier in the same style', () => {
  const t = resolveSpec(r(), 'apps/api/src/main.ts', './env');
  assert.ok(t);
  assert.equal(formatSpec(t, { from: 'apps/api/src/main.ts', file: 'apps/api/src/config/env/env.ts' }), './config/env/env');
  assert.equal(formatSpec(t, { from: 'apps/api/src/a/b/c.ts', file: 'apps/api/src/env.ts' }), '../../env');
  const aliases = loadAliases(root);
  const up = { from: 'apps/staff-web/src/a/b/c.ts', file: 'apps/staff-web/src/env.ts', aliases };
  const web = resolveSpec(r(), 'apps/staff-web/src/a.ts', './lib/api');
  assert.ok(web);
  assert.equal(formatSpec(web, up), '@/env', 'a climbing path takes the app alias');
  assert.equal(formatSpec(web, { ...up, from: 'apps/staff-web/src/c.ts' }), './env', 'a sibling stays');
  assert.equal(formatSpec(t, { ...up, from: 'apps/api/src/a/b/c.ts', file: 'apps/api/src/env.ts' }), '../../env', 'no alias');
  const js = resolveSpec(r(), 'apps/staff-web/src/a.ts', './lib/api.js');
  assert.ok(js);
  assert.equal(formatSpec(js, { from: 'apps/staff-web/src/a.ts', file: 'apps/staff-web/src/core/api.ts' }), './core/api.js');
  const alias = resolveSpec(r(), 'apps/staff-web/src/a.ts', '@/lib/api');
  assert.ok(alias);
  assert.equal(formatSpec(alias, { from: 'apps/staff-web/src/z/a.ts', file: 'apps/staff-web/src/core/http/api.ts' }), '@/core/http/api');
  const index = resolveSpec(r(), 'apps/staff-web/src/a.ts', './ui');
  assert.ok(index);
  assert.equal(formatSpec(index, { from: 'apps/staff-web/src/a.ts', file: 'apps/staff-web/src/core/ui/index.tsx' }), './core/ui');
  assert.equal(formatSpec(index, { from: 'apps/staff-web/src/a.ts', file: 'apps/staff-web/src/core/ui.tsx' }), './core/ui');
});
