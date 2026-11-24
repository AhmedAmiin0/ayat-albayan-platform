import assert from 'node:assert/strict';
import { test } from 'node:test';
import { limits, loosened } from '../rules.mjs';

const both = (base, head) => loosened({ base, head });

test('limits: the numbers in each `rule: [ … ]` entry, quoted or not', () => {
  const text = "complexity: ['error', 8], 'max-len': ['error', { code: 100 }], 'ab/max-depth': [2, 1]";
  assert.deepEqual(limits(text, 'complexity'), [8]);
  assert.deepEqual(limits(text, 'max-len'), [100]);
  assert.deepEqual(limits(text, 'max-depth'), []);
});

test('a rule set to off, 0 or warn is loosened; one already off on the base is not', () => {
  const base = "'max-len': ['error', 100], 'no-console': 'off'";
  assert.deepEqual(both(base, `${base}, 'max-len': 'off'`), ['rule off: max-len']);
  assert.deepEqual(both(base, `${base}, "eqeqeq": ["warn"]`), ['rule warn: eqeqeq']);
  assert.deepEqual(both(base, `${base}, 'ab/zod-inputs': 0`), ['rule off: ab/zod-inputs']);
  assert.deepEqual(both(base, base), []);
  assert.deepEqual(both(base, "'max-len': ['error', 100]"), []);
});

test('an option set to 0 is no rule turned off', () => {
  assert.deepEqual(both('', "'max-lines': ['error', { max: 150, skipBlankLines: 0 }]"), []);
});

test('a new ignores or ignore glob is loosened', () => {
  const base = "{ ignores: ['dist/**'] }";
  assert.deepEqual(both(base, "{ ignores: ['dist/**', 'src/legacy/**'] }"), ['new ignore: src/legacy/**']);
  assert.deepEqual(both('"ignore": ["a"]', '"ignore": ["a", "b"]'), ['new ignore: b']);
  assert.deepEqual(both('', 'globalIgnores([\'gen/**\'])'), ['new ignore: gen/**']);
  assert.deepEqual(both('', '--ignore-pattern=packages/x.ts'), ['new ignore: packages/x.ts']);
  assert.deepEqual(both(base, "{ ignores: [] }"), []);
});

test('a new syntaxExempt or exempt scope is loosened', () => {
  const base = "syntaxExempt({ files: ['http/**'], http: true })";
  assert.deepEqual(both(base, `${base}; syntaxExempt({ files: ['x/**'], shapes: true })`), [
    "new exemption: syntaxExempt({ files: ['x/**'], shapes: true })",
  ]);
  assert.deepEqual(both("exempt: ['core']", "exempt: ['core', 'misc']"), ['new exempt scope: misc']);
  assert.deepEqual(both(base, base), []);
});

test('a raised numeric limit is loosened; a lowered or an added equal one is not', () => {
  const base = "complexity: ['error', 8], complexity: ['error', { max: 6 }]";
  assert.deepEqual(both(base, "complexity: ['error', 8], complexity: ['error', { max: 7 }]"), [
    'raised limit: complexity 7 (was 8, 6)',
  ]);
  assert.deepEqual(both(base, "complexity: ['error', 8], complexity: ['error', 5]"), []);
  assert.deepEqual(both(base, `${base}, complexity: ['error', 6]`), []);
  assert.deepEqual(both('"minLines": 8', '"minLines": 12'), ['raised limit: minLines 12 (was 8)']);
});
