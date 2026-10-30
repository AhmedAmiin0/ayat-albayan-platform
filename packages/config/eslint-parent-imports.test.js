import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Linter, RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import { noParentImports } from './eslint-boundaries.js';
import { aliasable, isParent, noParentImportsRule } from './eslint-parent-imports.js';

const tester = new RuleTester({ languageOptions: { parser: tseslint.parser, sourceType: 'module' } });
const parent = (spec) => ({ messageId: 'parent', data: { spec } });
const at = { filename: '/pkg/src/x/y/file.ts', options: [{ root: '/pkg', dir: 'src' }] };
const ok = (code) => ({ ...at, code });
const bad = (code, ...specs) => ({ ...at, code, errors: specs.map(parent) });

tester.run('no-parent-imports', noParentImportsRule, {
  valid: [
    ok("import { a } from './a';"),
    ok("import { a } from '@/common/a';"),
    ok("import { a } from '@ab/shared';"),
    ok("export * from './b';"),
    ok("vi.mock('./c');"),
    ok("const d = import('@/d');"),
    ok("const url = new URL('../x', import.meta.url);"),
    ok("const p = join(__dirname, '../../db');"),
    ok("const s = `../${name}`; require(s);"),
    ok('mock(`../x`);'),
    // The alias cannot name a path outside src/ (mobile app/ routes, app.json): it stays.
    ok("import Layout from '../../../app/(tabs)/_layout';"),
    ok("import config from '../../../app.json';"),
  ],
  invalid: [
    bad("import { a } from '../a';", '../a'),
    bad("import type { A } from '../../a.js';", '../../a.js'),
    bad("import '../side-effect';", '../side-effect'),
    bad("export { b } from '../b';", '../b'),
    bad("export * from '..';", '..'),
    bad("const c = import('../c');", '../c'),
    bad("type T = typeof import('../t');", '../t'),
    bad("import x = require('../x');", '../x'),
    bad("const r = require('../r');", '../r'),
    bad('vi.mock(`../m`);', '../m'),
    bad("vi.mock('../m', async () => ({ ...(await vi.importActual('../m')) }));", '../m', '../m'),
    bad("jest.mock('../j'); jest.requireActual('../j');", '../j', '../j'),
  ],
});

test('isParent: only a path that leaves its folder', () => {
  assert.deepEqual(['../a', '..', './a', '.', '@/a', '..a', 'a/../b'].map(isParent), [true, true, false, false, false, false, false]);
});

test('aliasable: `../` into the alias folder only', () => {
  const opts = { file: '/pkg/src/a/b.ts', aliasDir: '/pkg/src' };
  assert.deepEqual(['../c', '../../x', '..', './c'].map((s) => aliasable(s, opts)), [true, false, false, false]);
});

test('noParentImports: the rule applies to `files`, tests included, never to `ignores`', () => {
  const block = noParentImports({ root: '/pkg', files: ['src/**/*.ts'], ignores: ['src/gen/**'] });
  const linter = new Linter({ cwd: '/pkg' });
  const lint = (file) => linter.verify("import { a } from '../a';", [block], `/pkg/${file}`).filter((m) => m.ruleId).length;
  assert.deepEqual(['src/x/a.ts', 'src/x/a.test.ts', 'src/gen/a.ts', 'lib/a.ts'].map(lint), [1, 1, 0, 0]);
});
