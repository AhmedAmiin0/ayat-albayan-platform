import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decide, newUnchecked } from './ownership-gate.mjs';

const T = 'apps/api/src/a.test.ts';

test('newUnchecked: a route that is unchecked on the head but not on the base', () => {
  const base = { 'GET /a/:id': 'unchecked', 'GET /b/:id': T };
  const head = { 'GET /a/:id': 'unchecked', 'GET /b/:id': 'unchecked', 'GET /c/:id': 'unchecked' };
  assert.deepEqual(newUnchecked(head, base), ['GET /b/:id', 'GET /c/:id']);
});

test('newUnchecked: checking a route or dropping one passes', () => {
  const base = { 'GET /a/:id': 'unchecked', 'GET /b/:id': 'unchecked' };
  assert.deepEqual(newUnchecked({ 'GET /a/:id': T }, base), []);
});

test('decide: no base file (first run) passes; a new unchecked route fails', () => {
  assert.equal(decide({ 'GET /a/:id': 'unchecked' }, undefined).failed, false);
  const out = decide({ 'GET /a/:id': 'unchecked' }, {});
  assert.equal(out.failed, true);
  assert.match(out.lines.join('\n'), /GET \/a\/:id/);
});

test('decide: reports the unchecked count of both sides', () => {
  const out = decide({ 'GET /a/:id': T }, { 'GET /a/:id': 'unchecked' });
  assert.equal(out.failed, false);
  assert.match(out.lines[0] ?? '', /unchecked 0 \(base 1\)/);
});
