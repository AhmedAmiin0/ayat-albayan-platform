import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nsName, statementOf } from './statements.mjs';

const of = (text) => statementOf(text, '@ab/x');

test('named imports and export-from lines are bound, with aliases and type flags', () => {
  const s = of('import type { a, b as c } from "<path>";');
  assert.equal(s.bound, true);
  assert.equal(s.type, true);
  assert.deepEqual(s.entries, [
    { name: 'a', alias: '', inline: false },
    { name: 'b', alias: 'c', inline: false },
  ]);
  assert.deepEqual(of('export { type Z } from "<path>";').entries, [{ name: 'Z', alias: '', inline: true }]);
  assert.deepEqual(of('import X, { y } from "<path>";').entries.map((e) => e.name), ['default', 'y']);
});

test('stars, namespaces, side effects, require and empty lists stay fixed', () => {
  assert.equal(of('export * from "<path>";').shape, 'star');
  assert.equal(of('import * as all from "<path>";').shape, 'ns');
  assert.equal(nsName('export * as all from "<path>";'), 'all');
  for (const text of ['export * from "<path>";', 'import * as a from "<path>";', 'import "<path>";', 'import x = require("<path>");', 'import {} from "<path>";']) {
    assert.equal(of(text).bound, false, text);
  }
  assert.equal(of('import { a-b } from "<path>";').bound, false, 'an item that does not parse');
});
