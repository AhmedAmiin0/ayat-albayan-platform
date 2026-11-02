import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { HttpShapeError, HttpStatusError, httpJson, whereOf } from './http-json.mjs';

const URL_ = 'https://secret-host.example/repos/o/r/runs?token=abc&per_page=1';

/** A fake fetch answering `status` with `text`; records each call. */
function fakeFetch(status, text) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(text, { status });
  };
  return { calls, fetch };
}

const profile = (fetch) => ({ name: 'Svc', headers: { authorization: 'Bearer k' }, fetch });
const anything = z.unknown();

test('whereOf names the service, method and path only: no host, no query', () => {
  assert.equal(whereOf('Svc', { url: URL_ }), 'Svc GET /repos/o/r/runs');
  assert.equal(whereOf('Svc', { url: 'no url', method: 'PUT' }), 'Svc PUT <invalid url>');
});

test('a 2xx body comes back parsed by the schema', async () => {
  const f = fakeFetch(200, '{"id":"u1","extra":true}');
  const schema = z.looseObject({ id: z.string() });
  const out = await httpJson(profile(f.fetch), { url: URL_, schema });
  assert.deepEqual(out, { id: 'u1', extra: true });
  assert.equal(f.calls[0].url, URL_);
  assert.deepEqual(f.calls[0].init, {
    method: 'GET',
    headers: { authorization: 'Bearer k' },
    body: undefined,
  });
});

test('a JSON body is sent as JSON with its content-type and the method', async () => {
  const f = fakeFetch(200, '{}');
  await httpJson(profile(f.fetch), { url: URL_, method: 'POST', json: { a: 1 }, schema: anything });
  assert.deepEqual(f.calls[0].init, {
    method: 'POST',
    headers: { authorization: 'Bearer k', 'content-type': 'application/json' },
    body: '{"a":1}',
  });
});

test('an empty or non-JSON 2xx body is null: the schema decides', async () => {
  const f = fakeFetch(200, '');
  assert.equal(await httpJson(profile(f.fetch), { url: URL_, schema: anything }), null);
});

test('a 2xx the schema rejects is HttpShapeError, without the body or the URL', async () => {
  const f = fakeFetch(200, '{"secret":"family-phone"}');
  const call = { url: URL_, schema: z.object({ id: z.string() }) };
  const err = await httpJson(profile(f.fetch), call).catch((e) => e);
  assert.ok(err instanceof HttpShapeError);
  assert.equal(err.message, 'Svc GET /repos/o/r/runs: unexpected response (HTTP 200)');
});

const codes = [
  ['{"error_code":"email_exists","code":"x"}', 'email_exists'],
  ['{"code":"bad_jwt"}', 'bad_jwt'],
  ['{"message":"nope"}', 'unknown'],
  ['<html>gateway</html>', 'unknown'],
  ['{"code":42}', 'unknown'],
];

for (const [text, code] of codes) {
  test(`a non-2xx is HttpStatusError with code «${code}» (${text})`, async () => {
    const f = fakeFetch(422, text);
    const err = await httpJson(profile(f.fetch), { url: URL_, schema: anything }).catch((e) => e);
    assert.ok(err instanceof HttpStatusError);
    assert.equal(err.status, 422);
    assert.equal(err.code, code);
    assert.equal(err.message, `Svc GET /repos/o/r/runs: HTTP 422 (${code})`);
  });
}

test('no message carries the host, the query, a header value or the body', async () => {
  const f = fakeFetch(500, '{"code":"x","detail":"family-phone"}');
  const err = await httpJson(profile(f.fetch), { url: URL_, schema: anything }).catch((e) => e);
  for (const leak of ['secret-host', 'token=abc', 'Bearer', 'family-phone']) {
    assert.ok(!err.message.includes(leak), leak);
  }
});
