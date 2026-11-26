import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient, type ApiClientOptions } from '../../../..';

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

const csv = (status = 200) =>
  new Response('"a","b"\r\n', {
    status,
    headers: { 'Content-Disposition': 'attachment; filename="x.csv"' },
  });

describe('createApiClient apiBlob', () => {
  it('GETs a file with the token and the client tag and hands back its bytes and headers', async () => {
    fetchMock.mockResolvedValue(csv());
    const { blob, headers } = await createApiClient(opts()).apiBlob('/exports/students.csv');
    expect(await blob.text()).toBe('"a","b"\r\n');
    expect(headers.get('Content-Disposition')).toBe('attachment; filename="x.csv"');
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    const sent = new Headers(init?.headers);
    expect(url).toBe('http://api.test/exports/students.csv');
    expect(sent.get('Authorization')).toBe('Bearer tok');
    expect(sent.get('X-AB-Client')).toBe('web/dev');
  });

  it('sends no Authorization when signed out', async () => {
    fetchMock.mockResolvedValue(csv());
    await createApiClient(opts({ accessToken: async () => null })).apiBlob('/exports/x.csv');
    const init = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(init?.headers).get('Authorization')).toBeNull();
  });

  it('throws ApiError with the JSON body, the raw text, or null', async () => {
    const { apiBlob } = createApiClient(opts());
    const refusal = new Response(JSON.stringify({ code: 'range_too_large' }), { status: 400 });
    fetchMock.mockResolvedValueOnce(refusal);
    const error = await apiBlob('/exports/lessons.csv').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, body: { code: 'range_too_large' } });
    fetchMock.mockResolvedValueOnce(new Response('Bad Gateway', { status: 502 }));
    await expect(apiBlob('/exports/x.csv')).rejects.toMatchObject({ body: 'Bad Gateway' });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await expect(apiBlob('/exports/x.csv')).rejects.toMatchObject({ status: 500, body: null });
  });

  it('passes the caller signal through and goes through the injected fetch', async () => {
    const send = vi.fn<NonNullable<ApiClientOptions['fetch']>>();
    send.mockResolvedValue(csv());
    const ctrl = new AbortController();
    await createApiClient(opts({ fetch: send })).apiBlob('/exports/x.csv', { signal: ctrl.signal });
    expect(send.mock.calls[0]?.[1].signal).toBe(ctrl.signal);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
