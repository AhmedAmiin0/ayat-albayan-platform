import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rewritten } from './fixture.test-util.ts';

test('the pair import becomes call, beside the other names of that import', () => {
  const head = "import { ApiError, apiFetch, apiSend } from '@ab/mobile-kit';\n";
  const out = rewritten("apiFetch('/a');\napiSend('POST', '/b');\n", head);
  assert.equal(
    out,
    "import { ApiError, call } from '@ab/mobile-kit';\ncall({ path: '/a' });\n" +
      "call({ method: 'POST', path: '/b' });\n",
  );
});

test('a name still used stays imported; call joins it', () => {
  const head = "import { apiFetch } from '@ab/web-kit/lib/http/api';\n";
  const out = rewritten('apiFetch(a, init);\napiFetch(b);\n', head);
  assert.equal(
    out,
    "import { apiFetch, call } from '@ab/web-kit/lib/http/api';\n" +
      'apiFetch(a, init);\ncall({ path: b });\n',
  );
});

test('the public pair becomes publicCall', () => {
  const head = "import { publicApiFetch, publicApiSend } from '@ab/web-kit';\n";
  const out = rewritten("publicApiFetch<V>(p);\npublicApiSend('PUT', p, { a });\n", head);
  assert.equal(
    out,
    "import { publicCall } from '@ab/web-kit';\npublicCall<V>({ path: p });\n" +
      "publicCall({ method: 'PUT', path: p, body: { a } });\n",
  );
});

test('call already imported is not imported twice', () => {
  const head = "import { apiFetch, call } from '@ab/web-kit';\n";
  assert.equal(
    rewritten('apiFetch(p);\n', head),
    "import { call } from '@ab/web-kit';\ncall({ path: p });\n",
  );
});

test('a member call on an injected client becomes request, and imports stay', () => {
  const head = "import type { ApiClient } from '@ab/client-core';\n";
  const body =
    "const f = (api: ApiClient) => api.apiFetch<Row>(`/r/${id}`);\nclient.apiSend('DELETE', p);\n";
  assert.equal(
    rewritten(body, head),
    `${head}const f = (api: ApiClient) => api.request<Row>({ path: \`/r/\${id}\` });\n` +
      "client.request({ method: 'DELETE', path: p });\n",
  );
});

test('a second run changes nothing', () => {
  const once = rewritten("apiFetch('/a');\napiSend('POST', '/b', body);\n");
  assert.equal(rewritten(once, ''), once);
});
