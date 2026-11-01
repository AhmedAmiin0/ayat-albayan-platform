import { afterEach, describe, expect, it, vi } from 'vitest';
import { headBytes, STORAGE_HEAD_TIMEOUT_MS } from './storage.head';

// h2 (docs/36): the ranged GET through the core; the timeout is new (L).
const SIGNED = 'https://storage.invalid/object/sign/b/p.pdf?token=SIGNED-TOKEN';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('headBytes', () => {
  it('asks for the first bytes and cuts what comes back', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2, 3, 4, 5, 6])));
    vi.stubGlobal('fetch', fetch);
    expect(Array.from((await headBytes(SIGNED, 4)) ?? [])).toEqual([1, 2, 3, 4]);
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(SIGNED);
    expect(init.headers).toEqual({ Range: 'bytes=0-3' });
  });

  it.each([400, 404, 416, 500])('%i → null, as before', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('x', { status })));
    expect(await headBytes(SIGNED, 4)).toBeNull();
  });

  it('a network failure throws, without the signed URL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError(`fetch failed ${SIGNED}`)));
    const e: unknown = await headBytes(SIGNED, 4).catch((x: unknown) => x);
    expect(e instanceof Error && e.message).toBe('storage head: network');
  });

  it('new: gives up after 10 s', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => undefined)));
    const call = headBytes(SIGNED, 4).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(STORAGE_HEAD_TIMEOUT_MS);
    expect(STORAGE_HEAD_TIMEOUT_MS).toBe(10_000);
    expect(await call).toMatchObject({ message: 'storage head: timeout' });
  });
});
