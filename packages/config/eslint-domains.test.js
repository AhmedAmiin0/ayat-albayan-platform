import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ESLint } from 'eslint';
import { moduleOf } from './eslint-boundaries.js';
import { domainModuleRegex, routeImportGroup } from './eslint-domains.js';

const opts = { base: 'src', exempt: ['core', 'test'] };

test('with no converted domain the regex and the route group are today’s mobile config', () => {
  assert.equal(domainModuleRegex(opts), 'src/(?!core/|test/)[^/]+');
  assert.deepEqual(routeImportGroup({ prefix: '@/', exempt: ['core'] }), ['@/*/**', '!@/core/**']);
});

test('a converted domain’s modules are two levels deep; the rest stay one level', () => {
  const re = domainModuleRegex({ ...opts, domains: ['sales', 'finance'] });
  assert.equal(moduleOf('src/sales/app/screens/A.tsx', re), 'src/sales/app');
  assert.equal(moduleOf('src/finance/payments/x.ts', re), 'src/finance/payments');
  assert.equal(moduleOf('src/inbox/a/b.tsx', re), 'src/inbox');
  assert.equal(moduleOf('src/sales-money/a.ts', re), 'src/sales-money', 'a prefix is not the domain');
  assert.equal(moduleOf('src/core/ui/x.tsx', re), null);
  assert.equal(moduleOf('src/test/x.ts', re), null);
  assert.equal(moduleOf('src/sales/index.ts', re), 'src/sales/index.ts', 'a file in the domain folder is its own module');
});

test('folder names are kebab-case only (they go into a regex)', () => {
  assert.throws(() => domainModuleRegex({ ...opts, domains: ['a.b'] }), /kebab-case/);
  assert.throws(() => routeImportGroup({ prefix: '@/', exempt: ['core'], domains: ['x|y'] }), /kebab-case/);
});

/** Lints one route import with the generated group, as apps/mobile does. */
async function routeErrors(spec, domains) {
  const group = routeImportGroup({ prefix: '@/', exempt: ['core'], domains });
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: { rules: { 'no-restricted-imports': ['error', { patterns: [{ group, message: 'index only' }] }] } },
  });
  const [result] = await eslint.lintText(`import x from '${spec}';\nexport default x;\n`, { filePath: 'app/a.js' });
  return result?.messages.length ?? -1;
}

test('route files: a domain module through its index only; flat features and core as before', async () => {
  const domains = ['sales'];
  assert.equal(await routeErrors('@/sales/app', domains), 0);
  assert.equal(await routeErrors('@/sales/app/screens/A', domains), 1);
  assert.equal(await routeErrors('@/inbox', domains), 0);
  assert.equal(await routeErrors('@/inbox/thread/T', domains), 1);
  assert.equal(await routeErrors('@/core/ui/AppText', domains), 0);
  assert.equal(await routeErrors('@/sales/app', []), 1, 'not converted yet: @/sales/app is internals of @/sales');
});
