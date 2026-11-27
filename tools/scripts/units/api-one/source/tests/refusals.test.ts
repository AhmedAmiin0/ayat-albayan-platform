import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rewriteSource } from '../source-file.ts';
import { expectLeft } from './fixture.test-util.ts';

test('an undecided third argument leaves the call', () => {
  expectLeft(
    "apiSend('POST', '/s', make());\n",
    /apiSend: body or \{ body, schema \} is undecided/,
  );
  expectLeft("apiSend('POST', '/s', input);\n", /undecided/);
  expectLeft("const f = (o: SendOptions<S>) => apiSend('POST', '/s', o);\n", /undecided/);
});

test('an init that is not an object literal, or a raw body, leaves apiFetch', () => {
  expectLeft('apiFetch(p, init);\n', /init is not an object literal/);
  expectLeft("apiFetch(p, { method: 'POST', body: text });\n", /init key body/);
  expectLeft('apiFetch(p, { ...rest });\n', /init key/);
});

test('a pair call inside another leaves the outer one', () => {
  const out = rewriteSource(
    'a.ts',
    "import { apiFetch, apiSend } from '@ab/web-kit';\napiSend('POST', p, await apiFetch(q));\n",
  );
  assert.deepEqual(
    out.found.map((f) => f.result),
    ['left', 'rewritten'],
  );
  assert.match(out.text, /apiSend\('POST', p, await call\(\{ path: q \}\)\)/);
  assert.match(out.text, /import \{ apiSend, call \} from/);
});

test('a local binding named call leaves the plain calls', () => {
  expectLeft('const call = 1;\napiFetch(p);\n', /a local binding named call/);
  expectLeft('function f(call: number) { return apiFetch(p); }\n', /a local binding named call/);
});

test('the pair passed as a value is listed and keeps its import', () => {
  const out = rewriteSource(
    'a.ts',
    "import { apiSend } from '@ab/web-kit';\nconst put: Send = apiSend;\n",
  );
  assert.deepEqual(out.found, [{ line: 2, result: 'left', reason: 'apiSend: a reference' }]);
  assert.equal(out.text, "import { apiSend } from '@ab/web-kit';\nconst put: Send = apiSend;\n");
});

test('a file with no pair call is unchanged', () => {
  const text = "import { call } from '@ab/web-kit';\ncall({ path: '/a' });\n";
  assert.deepEqual(rewriteSource('a.ts', text), { text, found: [] });
});
