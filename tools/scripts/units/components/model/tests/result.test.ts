import assert from 'node:assert/strict';
import { test } from 'node:test';
import { all, no, ok } from '../result.ts';

test('all keeps every value in order', () => {
  assert.deepEqual(
    all([1, 2], (n) => ok(n * 2)),
    ok([2, 4]),
  );
});

test('all stops at the first reason and calls nothing after it', () => {
  const seen: number[] = [];
  const out = all([1, 2, 3], (n) => {
    seen.push(n);
    return n === 2 ? no(`bad ${n}`) : ok(n);
  });
  assert.deepEqual(out, no('bad 2'));
  assert.deepEqual(seen, [1, 2]);
});
