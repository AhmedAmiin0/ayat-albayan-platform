import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { parseJson } from './json.ts';

test('parseJson returns the value the schema accepts', () => {
  assert.deepEqual(parseJson('{"a":1}', z.object({ a: z.number() })), { a: 1 });
});

test('parseJson refuses bad JSON and a value the schema rejects', () => {
  assert.throws(() => parseJson('{', z.unknown()), SyntaxError);
  assert.throws(() => parseJson('{"a":"1"}', z.object({ a: z.number() })), z.ZodError);
});
