import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decide, mapSchema } from './ownership-gate.mjs';

const A = 'apps/api/src/a.test.ts';
const files = { [A]: "expect(res.statusCode).toBe(403);", 'apps/api/src/b.test.ts': 'ok' };
const read = (f) => files[f];

test('decide: every route on an existing test that asserts a denial passes', () => {
  const out = decide({ 'GET /a/:id': A }, read);
  assert.equal(out.failed, false);
  assert.match(out.lines[0] ?? '', /1 id routes mapped, 0 broken/);
});

test('decide: a missing test file fails and names the route', () => {
  const out = decide({ 'GET /c/:id': 'apps/api/src/c.test.ts' }, read);
  assert.equal(out.failed, true);
  assert.match(out.lines.join('\n'), /GET \/c\/:id.*missing/);
});

test('decide: a test that asserts no 403 or 404 fails', () => {
  const out = decide({ 'GET /b/:id': 'apps/api/src/b.test.ts' }, read);
  assert.match(out.lines.join('\n'), /asserts no 403\/404/);
});

test('mapSchema: «unchecked» or a non-test path is refused', () => {
  assert.throws(() => mapSchema.parse({ 'GET /a/:id': 'unchecked' }));
  assert.throws(() => mapSchema.parse({ 'GET /a/:id': 'apps/api/src/a.ts' }));
  assert.throws(() => mapSchema.parse({ 'GET /a': A }));
});
