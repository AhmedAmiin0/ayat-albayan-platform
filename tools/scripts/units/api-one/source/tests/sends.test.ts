import { test } from 'node:test';
import { expectRewrite } from './fixture.test-util.ts';

test('apiSend(method, path) and apiSend(method, path, body) carry method, path and body', () => {
  expectRewrite(
    "apiSend('DELETE', `/s/${id}`);\n",
    "call({ method: 'DELETE', path: `/s/${id}` });\n",
  );
  expectRewrite(
    "apiSend('POST', '/s', { name: 'x' });\n",
    "call({ method: 'POST', path: '/s', body: { name: 'x' } });\n",
  );
  expectRewrite(
    "const f = (body: Input) => apiSend<Out>('PUT', '/s', body);\n",
    "const f = (body: Input) => call<Out>({ method: 'PUT', path: '/s', body });\n",
  );
});

test('{ body, schema } options spread into the request', () => {
  expectRewrite(
    "apiSend('POST', '/s', { body: input, schema: rowSchema });\n",
    "call({ method: 'POST', path: '/s', body: input, schema: rowSchema });\n",
  );
  expectRewrite(
    "apiSend('POST', '/s/revoke', { schema: rowSchema });\n",
    "call({ method: 'POST', path: '/s/revoke', schema: rowSchema });\n",
  );
});

test('a literal that only looks like options is a body, as sendParts reads it', () => {
  expectRewrite(
    "apiSend('POST', '/s', { schema: 'json' });\n",
    "call({ method: 'POST', path: '/s', body: { schema: 'json' } });\n",
  );
  expectRewrite(
    "apiSend('POST', '/s', { reason, schema: s });\n",
    "call({ method: 'POST', path: '/s', body: { reason, schema: s } });\n",
  );
});

test('a variable is decided from its declaration in the file', () => {
  expectRewrite(
    "const b = { a: 1 };\napiSend('POST', '/s', b);\n",
    "const b = { a: 1 };\ncall({ method: 'POST', path: '/s', body: b });\n",
  );
  expectRewrite(
    "const o = { body: 1, schema: s };\napiSend('POST', '/s', o);\n",
    "const o = { body: 1, schema: s };\ncall({ method: 'POST', path: '/s', ...o });\n",
  );
  expectRewrite(
    "const f = (input: { body: B }) => apiSend('PUT', '/s', input.body);\n",
    "const f = (input: { body: B }) => call({ method: 'PUT', path: '/s', body: input.body });\n",
  );
});

test('a variable named body that its declaration leaves open is the body', () => {
  expectRewrite(
    "const body = build(d);\napiSend('POST', '/booking', body);\n",
    "const body = build(d);\ncall({ method: 'POST', path: '/booking', body });\n",
  );
});
