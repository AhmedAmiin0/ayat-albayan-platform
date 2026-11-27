import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rewriteMocks } from '../mock-file.ts';

const BEFORE = `import { expect, it, vi } from 'vitest';
import { Page } from './Page';

const { apiFetch, apiSend } = vi.hoisted(() => ({ apiFetch: vi.fn(), apiSend: vi.fn() }));
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

it('saves', async () => {
  apiFetch.mockResolvedValue({ rows: [] });
  apiSend.mockRejectedValue(new Error('x'));
  expect(apiFetch).toHaveBeenCalledWith('/rows');
  expect(apiSend).toHaveBeenCalledWith('POST', '/rows', { a: 1 });
  expect(apiSend).not.toHaveBeenCalled();
  expect(apiFetch).toHaveBeenCalledTimes(2);
  apiSend.mockReset();
});
`;

const AFTER = `import { expect, it, vi } from 'vitest';
import { Page } from './Page';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));

it('saves', async () => {
  mockApi.onRead(() => ({ rows: [] }));
  mockApi.onWrite(() => Promise.reject(new Error('x')));
  expect(mockApi.reads()).toContainEqual({ method: 'GET', path: '/rows' });
  expect(mockApi.writes()).toContainEqual({ method: 'POST', path: '/rows', body: { a: 1 } });
  expect(mockApi.writes()).toHaveLength(0);
  expect(mockApi.reads()).toHaveLength(2);
  mockApi.reset('write');
});
`;

test('vi.hoisted mocks of the kit module move to mockCall', () => {
  const out = rewriteMocks('a.test.tsx', BEFORE);
  assert.deepEqual(out.found, [{ line: 5, result: 'rewritten', reason: 'mocks' }]);
  assert.equal(out.text, AFTER);
});

test('a second run changes nothing', () => {
  assert.deepEqual(rewriteMocks('a.test.tsx', AFTER), { text: AFTER, found: [] });
});

test('one hoisted mock with an implementation becomes a read handler', () => {
  const text = `import { vi } from 'vitest';
const apiFetch = vi.hoisted(() => vi.fn((path: string) => (path === '/a' ? 1 : 2)));
vi.mock('@ab/web-kit', async (o) => ({ ...(await o<object>()), apiFetch }));
it('x', () => expect(apiFetch).toHaveBeenLastCalledWith('/a', expect.anything()));
`;
  const out = rewriteMocks('a.test.ts', text).text;
  assert.match(
    out,
    /const mockApi = mockCall\(\);\nmockApi\.onRead\(\(\{ path \}\) => \(path === '\/a' \? 1 : 2\)\);/,
  );
  assert.match(
    out,
    /expect\(mockApi\.reads\(\)\.at\(-1\)\)\.toEqual\(\{ method: 'GET', path: '\/a' \}\)/,
  );
});
