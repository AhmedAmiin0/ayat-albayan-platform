import assert from 'node:assert/strict';
import { test } from 'node:test';
import { countLines, countOf } from '../count.mjs';

const items = [{ name: 'a' }, { name: 'b' }];

test('count: one row with one count column gives its value', () => {
  assert.equal(countOf([{ count: '12' }]), '12');
  assert.equal(countOf([{ count: 0n }]), '0');
});

test('count: any other result shape gives nothing', () => {
  assert.equal(countOf([]), null);
  assert.equal(countOf([{ count: '1' }, { count: '2' }]), null);
  assert.equal(countOf([{ count: '1', name: 'x' }]), null);
  assert.equal(countOf([{ name: 'x' }]), null);
  assert.equal(countOf(undefined), null);
});

test('count: integers become «name: n» lines in order', () => {
  assert.deepEqual(countLines(items, ['0', '1234']), ['a: 0', 'b: 1234']);
});

test('count: one value that is not a whole number fails the whole run', () => {
  for (const bad of [null, 'Ahmed', '1.5', '-1', '', '01', '12 ']) {
    assert.equal(countLines(items, ['3', bad]), null, String(bad));
  }
});
