import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../../../..';

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

const client = () =>
  createApiClient({
    baseUrl: () => 'http://api.test',
    accessToken: async () => 'tok',
    clientTag: () => 'web/dev',
  });

const sent = (): RequestInit => fetchMock.mock.calls.at(-1)?.[1] ?? {};

describe('apiFetch as the pair has it', () => {
  it('sends a method given in init, with the caller signal and no body', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const abort = new AbortController();
    const report = client().apiFetch('/activity/session/start', {
      method: 'POST',
      signal: abort.signal,
    });
    await expect(report).resolves.toBeUndefined();
    expect(sent().method).toBe('POST');
    expect(sent().signal).toBe(abort.signal);
    expect(sent().body).toBeUndefined();
  });

  it('hands the caller signal and headers to fetch on a read', async () => {
    fetchMock.mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
    const abort = new AbortController();
    await client().apiFetch('/x', { signal: abort.signal, headers: { Accept: 'text/plain' } });
    expect(sent().signal).toBe(abort.signal);
    expect(new Headers(sent().headers).get('Accept')).toBe('text/plain');
    expect(new Headers(sent().headers).get('Authorization')).toBe('Bearer tok');
  });

  it('resolves undefined when a read answers 204', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(client().apiFetch('/x')).resolves.toBeUndefined();
  });
});
