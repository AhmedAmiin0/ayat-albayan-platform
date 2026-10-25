import { ApiError, apiFetch, apiSend, toQueryString } from './api';

jest.mock('./supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } },
}));
jest.mock('./env', () => ({ env: { apiUrl: 'http://api' } }));
jest.mock('./client-tag', () => ({ CLIENT_HEADER: 'X-AB-Client', mobileClientTag: () => 'mobile/0.2.0' }));

const mockFetch = jest.fn();
beforeEach(() => {
  mockFetch.mockReset();
  globalThis.fetch = mockFetch;
});

const reply = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status });

test('GET sends the bearer token and parses JSON', async () => {
  mockFetch.mockResolvedValue(reply(200, { role: 'admin' }));
  expect(await apiFetch('/auth/me')).toEqual({ role: 'admin' });
  const [url, init] = mockFetch.mock.calls[0];
  expect(url).toBe('http://api/auth/me');
  expect(new Headers(init.headers).get('Authorization')).toBe('Bearer tok');
  expect(new Headers(init.headers).get('X-AB-Client')).toBe('mobile/0.2.0');
});

test('non-2xx throws ApiError with status and body', async () => {
  mockFetch.mockResolvedValue(reply(409, { code: 'duplicate_phone' }));
  const err = await apiFetch('/students').catch((e: unknown) => e);
  expect(err).toBeInstanceOf(ApiError);
  expect(err).toMatchObject({ status: 409, body: { code: 'duplicate_phone' } });
});

test('apiSend PATCHes JSON and resolves undefined on 204', async () => {
  mockFetch.mockResolvedValue(reply(204));
  expect(await apiSend('PATCH', '/leads/1/status', { status: 'contacted' })).toBeUndefined();
  const [, init] = mockFetch.mock.calls[0];
  expect(init.method).toBe('PATCH');
  expect(init.body).toBe('{"status":"contacted"}');
  expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
});

test('toQueryString drops empty values and encodes Arabic', () => {
  expect(toQueryString({})).toBe('');
  expect(toQueryString({ page: 2, q: 'سهيلة', status: undefined, x: '' })).toBe(
    `?page=2&q=${encodeURIComponent('سهيلة')}`,
  );
});
