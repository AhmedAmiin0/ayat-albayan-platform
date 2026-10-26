import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient, type ApiClientOptions } from '../index.js';

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

const opts = (over: Partial<ApiClientOptions> = {}): ApiClientOptions => ({
  baseUrl: () => 'http://api.test',
  accessToken: async () => 'tok',
  clientTag: () => 'web/dev',
  ...over,
});

function lastCall(): [string, RequestInit] {
  const call = fetchMock.mock.calls.at(-1);
  if (!call) throw new Error('fetch not called');
  return [String(call[0]), call[1] ?? {}];
}

describe('createApiClient', () => {
  it('POSTs JSON with the bearer token and the client tag, and parses the reply', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 's1' }), { status: 201 }));
    const { apiSend } = createApiClient(opts());
    await expect(apiSend('POST', '/students', { name: 'سهيلة' })).resolves.toEqual({ id: 's1' });
    const [url, init] = lastCall();
    const headers = new Headers(init.headers);
    expect(url).toBe('http://api.test/students');
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"name":"سهيلة"}');
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Authorization')).toBe('Bearer tok');
    expect(headers.get('X-AB-Client')).toBe('web/dev');
  });

  it('keeps caller headers and sends no Authorization when signed out', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    const { apiFetch } = createApiClient(opts({ accessToken: async () => null, clientTag: () => 'mobile/1' }));
    await apiFetch('/settings', { headers: { Accept: 'application/json' } });
    const headers = new Headers(lastCall()[1].headers);
    expect(headers.get('Accept')).toBe('application/json');
    expect(headers.get('Authorization')).toBeNull();
    expect(headers.get('X-AB-Client')).toBe('mobile/1');
  });

  it('reads the base URL on every call', async () => {
    fetchMock.mockImplementation(async () => new Response('{}', { status: 200 }));
    let base = 'http://a';
    const { apiFetch } = createApiClient(opts({ baseUrl: () => base }));
    await apiFetch('/x');
    base = 'http://b';
    await apiFetch('/x');
    expect(fetchMock.mock.calls.map((c) => String(c[0]))).toEqual(['http://a/x', 'http://b/x']);
  });

  it('resolves undefined on 204 and sends no body without one', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(createApiClient(opts()).apiSend('DELETE', '/students/s1')).resolves.toBeUndefined();
    expect(lastCall()[1].body).toBeUndefined();
  });

  it('throws ApiError with the JSON body, the raw text, or null', async () => {
    const { apiFetch } = createApiClient(opts());
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ code: 'dup' }), { status: 409 }));
    const json = await apiFetch('/s').catch((e: unknown) => e);
    expect(json).toBeInstanceOf(ApiError);
    expect(json).toMatchObject({ status: 409, body: { code: 'dup' }, message: 'API 409' });
    fetchMock.mockResolvedValueOnce(new Response('Bad Gateway', { status: 502 }));
    await expect(apiFetch('/s')).rejects.toMatchObject({ status: 502, body: 'Bad Gateway' });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await expect(apiFetch('/s')).rejects.toMatchObject({ status: 500, body: null });
  });
});

describe('createApiClient transport', () => {
  it('sends through the injected fetch when one is given (mobile reachability)', async () => {
    const send = vi.fn<NonNullable<ApiClientOptions['fetch']>>();
    send.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const { apiFetch } = createApiClient(opts({ fetch: send }));
    await expect(apiFetch('/auth/me')).resolves.toEqual({ ok: true });
    expect(send).toHaveBeenCalledWith('http://api.test/auth/me', expect.anything());
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
