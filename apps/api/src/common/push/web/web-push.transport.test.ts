import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchTransport } from './web-push.sender';

// h1 (docs/36): the push POST through the core: redirects never followed, any status returned.
const FCM = 'https://fcm.googleapis.com/fcm/send/abc';

afterEach(() => vi.unstubAllGlobals());

describe('fetchTransport', () => {
  it('POSTs the bytes with the given headers, redirect manual, and answers the status', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal('fetch', fetch);
    const body = Buffer.from([1, 2, 3]);
    expect(await fetchTransport({ url: FCM, headers: { ttl: '60' }, body })).toEqual({ status: 201 });
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(FCM);
    expect(init).toMatchObject({ method: 'POST', redirect: 'manual', headers: { ttl: '60' } });
    expect(Array.from(init.body as Uint8Array)).toEqual([1, 2, 3]);
  });

  it.each([404, 410, 429, 503])('%i is answered, not thrown (GONE reads it)', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('x', { status })));
    const body = Buffer.from([]);
    expect(await fetchTransport({ url: FCM, headers: {}, body })).toEqual({ status });
  });

  it('a network failure rejects without the endpoint (its path is the browser token)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError(`fetch failed ${FCM}`)));
    const e: unknown = await fetchTransport({ url: FCM, headers: {}, body: Buffer.from([]) }).catch(
      (x: unknown) => x,
    );
    expect(e instanceof Error && e.message).toBe('web-push POST /: network');
  });
});
