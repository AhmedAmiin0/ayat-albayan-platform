import assert from 'node:assert/strict';
import { describe, it, test } from 'node:test';
import { RuleTester } from 'eslint';
import { boundariesPlugin, isDeep, moduleOf } from './eslint-boundaries.js';

const cwd = '/repo/apps/api';
const api = { cwd, module: 'src/modules/[^/]+/[^/]+' };
const at = (file) => ({ ...api, file: `${cwd}/${file}` });

test('moduleOf finds the module root, or null for shared folders', () => {
  assert.equal(moduleOf('src/modules/sales/leads/x/y.ts', api.module), 'src/modules/sales/leads');
  assert.equal(moduleOf('src/modules/sales/leads', api.module), 'src/modules/sales/leads');
  assert.equal(moduleOf('src/common/http/x.ts', api.module), null);
  const mobile = 'src/(?!core/|test/)[^/]+';
  assert.equal(moduleOf('src/core/ui/x.tsx', mobile), null);
  assert.equal(moduleOf('src/inbox/a/b.tsx', mobile), 'src/inbox');
  assert.equal(moduleOf('src/theme.ts', mobile), 'src/theme.ts');
});

test('isDeep: another module internals are deep; its index, the same module and shared code are not', () => {
  const from = at('src/modules/sales/leads/list/a.ts');
  assert.equal(isDeep('../../sales/sales.service.js', from), true);
  assert.equal(isDeep('../../sales/index.js', from), false);
  assert.equal(isDeep('../../sales', from), false);
  assert.equal(isDeep('../leads.service.js', from), false);
  assert.equal(isDeep('../../../../common/http/errors.js', from), false);
  assert.equal(isDeep('@nestjs/common', from), false);
});

test('isDeep resolves an alias against the package root', () => {
  const web = { cwd: '/w', module: 'src/features/[^/]+/[^/]+', alias: { '@/': 'src/' }, file: '/w/src/features/a/b/c.ts' };
  assert.equal(isDeep('@/features/x/y/hooks/use-y', web), true);
  assert.equal(isDeep('@/features/x/y', web), false);
  assert.equal(isDeep('@/lib/query', web), false);
  assert.equal(isDeep('@/features/a/b/other', web), false);
});

RuleTester.describe = describe;
RuleTester.it = it;
const tester = new RuleTester({ languageOptions: { ecmaVersion: 2024, sourceType: 'module' } });
// RuleTester lints from process.cwd(), so the file sits under it.
const filename = `${process.cwd()}/src/modules/sales/leads/a.ts`;
const options = [{ module: api.module }];
tester.run('module-boundaries', boundariesPlugin.rules['module-boundaries'], {
  valid: [
    { code: "import { x } from '../sales/index.js';", filename, options },
    { code: "export { y } from './y.js';", filename, options },
    { code: "const m = import('../sales');", filename, options },
  ],
  invalid: [
    { code: "import { x } from '../sales/sales.service.js';", filename, options, errors: [{ messageId: 'deep' }] },
    { code: "export * from '../sales/lib/x.js';", filename, options, errors: [{ messageId: 'deep' }] },
    { code: "const m = import('../sales/lib/x.js');", filename, options, errors: [{ messageId: 'deep' }] },
  ],
});
