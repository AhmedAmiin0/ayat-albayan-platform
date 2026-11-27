import { test } from 'node:test';
import { expectRewrite } from './fixture.test-util.ts';

test('apiFetch(path) becomes call({ path })', () => {
  expectRewrite('const a = apiFetch(`/s/${id}`);\n', 'const a = call({ path: `/s/${id}` });\n');
  expectRewrite('const a = apiFetch(path);\n', 'const a = call({ path });\n');
});

test('apiFetch(path, init) keeps the init keys beside the path', () => {
  expectRewrite(
    "f(apiFetch('/s', { schema: s, signal }));\n",
    "f(call({ path: '/s', schema: s, signal }));\n",
  );
  expectRewrite(
    "f(apiFetch('/a', { method: 'POST', signal: abort.signal, headers: h }));\n",
    "f(call({ path: '/a', method: 'POST', signal: abort.signal, headers: h }));\n",
  );
});

test('a type argument carries over', () => {
  expectRewrite(
    "const a = apiFetch<Row[]>('/rows');\n",
    "const a = call<Row[]>({ path: '/rows' });\n",
  );
});
