import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeRepo } from './fixture.test-util.ts';
import { formatSpec, loadAliases, resolveSpec, type Resolver } from './resolve.ts';

const root = makeRepo({
  'apps/web/tsconfig.json': '{ // comment\n "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }',
  'apps/web/src/lib/api.ts': '',
  'apps/web/src/ui/index.tsx': '',
  'apps/api/src/env.ts': '',
  'apps/api/src/x.js': '',
});
const r = (renamed: [string, string][] = []): Resolver => ({ root, aliases: loadAliases(root), renamed: new Map(renamed) });

test('loads the @/ alias of an app tsconfig with comments', () => {
  assert.deepEqual(loadAliases(root), [{ prefix: '@/', dir: 'apps/web/src', scope: 'apps/web' }]);
});

test('resolves bare, .js-for-.ts, exact, directory index and alias specifiers', () => {
  const from = 'apps/web/src/features/a.ts';
  assert.equal(resolveSpec(r(), from, '../lib/api')?.style, 'bare');
  assert.equal(resolveSpec(r(), from, '../lib/api.js')?.style, 'js');
  assert.equal(resolveSpec(r(), from, '../lib/api.ts')?.style, 'exact');
  assert.deepEqual(resolveSpec(r(), from, '../ui'), { file: 'apps/web/src/ui/index.tsx', style: 'index' });
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
  const up = { from: 'apps/web/src/a/b/c.ts', file: 'apps/web/src/env.ts', aliases };
  const web = resolveSpec(r(), 'apps/web/src/a.ts', './lib/api');
  assert.ok(web);
  assert.equal(formatSpec(web, up), '@/env', 'a climbing path takes the app alias');
  assert.equal(formatSpec(web, { ...up, from: 'apps/web/src/c.ts' }), './env', 'a sibling stays');
  assert.equal(formatSpec(t, { ...up, from: 'apps/api/src/a/b/c.ts', file: 'apps/api/src/env.ts' }), '../../env', 'no alias');
  const js = resolveSpec(r(), 'apps/web/src/a.ts', './lib/api.js');
  assert.ok(js);
  assert.equal(formatSpec(js, { from: 'apps/web/src/a.ts', file: 'apps/web/src/core/api.ts' }), './core/api.js');
  const alias = resolveSpec(r(), 'apps/web/src/a.ts', '@/lib/api');
  assert.ok(alias);
  assert.equal(formatSpec(alias, { from: 'apps/web/src/z/a.ts', file: 'apps/web/src/core/http/api.ts' }), '@/core/http/api');
  const index = resolveSpec(r(), 'apps/web/src/a.ts', './ui');
  assert.ok(index);
  assert.equal(formatSpec(index, { from: 'apps/web/src/a.ts', file: 'apps/web/src/core/ui/index.tsx' }), './core/ui');
  assert.equal(formatSpec(index, { from: 'apps/web/src/a.ts', file: 'apps/web/src/core/ui.tsx' }), './core/ui');
});
