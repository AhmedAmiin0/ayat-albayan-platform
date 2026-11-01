import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { EXPO_TIMEOUT_MS, expoHttp } from './expo-http';

// h2 (docs/36): the Expo profile; the receipts call had no timeout before (L).
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const input = { base: 'https://exp.host//', accessToken: 'tok', label: 'expo receipts' };

describe('expoHttp', () => {
  it('trims the base, sends accept, JSON and the token', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({}));
    vi.stubGlobal('fetch', fetch);
    await expoHttp(input).json({ path: 'x', method: 'POST', json: { a: 1 }, schema: z.unknown() });
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://exp.host/x');
    expect(init.headers).toEqual({
      accept: 'application/json',
      authorization: 'Bearer tok',
      'content-type': 'application/json',
    });
  });

  it('a non-2xx reads «<label> HTTP <status>»', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('x', { status: 503 })));
    const call = expoHttp({ ...input, accessToken: undefined }).json({ path: 'x', schema: z.unknown() });
    await expect(call).rejects.toThrow('expo receipts HTTP 503');
  });

  it('new: gives up after 10 s', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => undefined)));
    const call = expoHttp(input).json({ path: 'x', schema: z.unknown() }).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(EXPO_TIMEOUT_MS);
    expect(EXPO_TIMEOUT_MS).toBe(10_000);
    expect(await call).toMatchObject({ message: 'expo receipts timeout' });
  });
});
