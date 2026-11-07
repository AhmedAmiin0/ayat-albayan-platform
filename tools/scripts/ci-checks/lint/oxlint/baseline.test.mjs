import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compare, countsOf, packageOf, pruned, ruleOf } from './baseline.mjs';

test('ruleOf: Oxlint diagnostic codes → config rule keys; no code is a parse error', () => {
  const codes = [
    'eslint(max-depth)',
    'typescript-eslint(no-unsafe-call)',
    'typescript(consistent-type-definitions)',
    'jsx_a11y(alt-text)',
    'jsx-a11y(alt-text)',
    'react(purity)',
    'ab(module-boundaries)',
    'stylistic(max-len)',
    undefined,
  ];
  assert.deepEqual(codes.map(ruleOf), [
    'max-depth',
    'typescript/no-unsafe-call',
    'typescript/consistent-type-definitions',
    'jsx-a11y/alt-text',
    'jsx-a11y/alt-text',
    'react/purity',
    'ab/module-boundaries',
    'stylistic/max-len',
    'parse-error',
  ]);
});

test('packageOf: the deepest package folder holding the file, else none', () => {
  const dirs = ['apps/web', 'docs/design/brand/tools', 'tools/scripts'];
  assert.equal(packageOf('apps/web/src/a.ts', dirs), 'apps/web');
  assert.equal(packageOf('apps/webx/a.ts', dirs), '');
  assert.equal(packageOf('docs/design/brand/tools/x.mjs', dirs), 'docs/design/brand/tools');
});

test('countsOf: per package, package-relative file, per rule', () => {
  const d = (filename, code) => ({ filename, code });
  const report = [
    d('apps/web/src/a.ts', 'eslint(max-depth)'),
    d('apps/web/src/a.ts', 'eslint(max-depth)'),
    d('apps/web/src/a.ts', 'ab(no-if-chains)'),
    d('root.js', 'eslint(no-console)'),
  ];
  assert.deepEqual(countsOf(report, ['apps/web']), {
    'apps/web': { 'src/a.ts': { 'max-depth': { count: 2 }, 'ab/no-if-chains': { count: 1 } } },
    '': { 'root.js': { 'no-console': { count: 1 } } },
  });
});

const base = { 'a.ts': { complexity: { count: 2 } }, 'b.ts': { 'max-depth': { count: 1 } } };

test('compare: a count above the baseline and one below it (fixed, or the file gone)', () => {
  const now = { 'a.ts': { complexity: { count: 3 } }, 'c.ts': { 'no-console': { count: 1 } } };
  assert.deepEqual(compare('e2e', now, base), {
    above: ['e2e/a.ts complexity 2 -> 3', 'e2e/c.ts no-console 0 -> 1'],
    below: ['e2e/b.ts max-depth 1 -> 0'],
  });
  assert.deepEqual(compare('e2e', base, base), { above: [], below: [] });
});

test('pruned: counts only go down, entries only go away, files sorted', () => {
  const now = { 'b.ts': { 'max-depth': { count: 4 } }, 'a.ts': { complexity: { count: 1 } } };
  assert.deepEqual(pruned(now, base), {
    'a.ts': { complexity: { count: 1 } },
    'b.ts': { 'max-depth': { count: 1 } },
  });
  assert.deepEqual(pruned({}, base), {});
});
