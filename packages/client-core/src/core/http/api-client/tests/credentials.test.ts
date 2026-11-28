import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createApiClient } from '../../../..';

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

const client = (credentials?: RequestCredentials) =>
  createApiClient({
    baseUrl: () => 'http://api.test',
    accessToken: async () => null,
    clientTag: () => 'web/dev',
    ...(credentials ? { credentials } : {}),
  });
const sent = (): RequestInit => fetchMock.mock.calls.at(-1)?.[1] ?? {};

it('a client made with credentials sends them on every read and send', async () => {
  fetchMock.mockImplementation(() => Promise.resolve(new Response('{}')));
  await client('include').request({ path: '/a' });
  expect(sent().credentials).toBe('include');
  await client('include').request({ method: 'POST', path: '/a', body: {} });
  expect(sent().credentials).toBe('include');
});

it('a client made without them leaves fetch its default', async () => {
  fetchMock.mockImplementation(() => Promise.resolve(new Response('{}')));
  await client().request({ path: '/a' });
  expect('credentials' in sent()).toBe(false);
});
