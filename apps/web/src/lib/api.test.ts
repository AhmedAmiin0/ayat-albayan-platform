import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch, apiSend } from './api';

vi.mock('./supabase', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) },
  },
}));

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

function lastCall(): [string, RequestInit] {
  const call = fetchMock.mock.calls.at(-1);
  if (!call) throw new Error('fetch not called');
  return [String(call[0]), call[1] ?? {}];
}

describe('apiSend / apiFetch', () => {
  it('POSTs JSON with the bearer token and parses the reply', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 's1' }), { status: 201 }));
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

  it('tags every request, GETs and caller headers included (docs/26 §2f)', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    await apiFetch('/settings', { headers: { Accept: 'application/json' } });
    const headers = new Headers(lastCall()[1].headers);
    expect(headers.get('X-AB-Client')).toBe('web/dev');
    expect(headers.get('Accept')).toBe('application/json');
  });

  it('resolves undefined on 204 (DELETE)', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(apiSend('DELETE', '/students/s1')).resolves.toBeUndefined();
    expect(lastCall()[1].body).toBeUndefined();
  });

  it('throws ApiError carrying the JSON error body (duplicate warning, R-STU-03)', async () => {
    const body = { code: 'duplicate_student', candidates: [{ id: 's1' }] };
    fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status: 409 }));
    const err = await apiFetch('/students').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 409, body });
  });
});
