import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OVERRIDES_TIMEOUT_MS, readOverrides } from '..';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const reply = (body: unknown, status = 200): typeof fetch =>
  vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status })));
const req = { apiUrl: 'http://api.test', locale: 'ar' as const };

describe('readOverrides (GET /i18n/:locale/overrides)', () => {
  it('keeps only the string values of the map', async () => {
    const send = reply({ 'nav.leads': 'قائمة', 'nav.inbox': 5, 'nav.x': null });
    expect(await readOverrides(req, { fetch: send })).toEqual({ 'nav.leads': 'قائمة' });
  });

  it('asks the locale route with no custom header (no preflight) and the given cache', async () => {
    const send = reply({});
    await readOverrides({ ...req, locale: 'en' }, { fetch: send, cache: 'no-cache' });
    const [url, init] = vi.mocked(send).mock.calls[0] ?? [];
    expect(url).toBe('http://api.test/i18n/en/overrides');
    expect(init).toMatchObject({ method: 'GET', cache: 'no-cache' });
    expect(init).not.toHaveProperty('headers');
  });

  it('leaves the cache mode to the platform by default', async () => {
    const send = reply({});
    await readOverrides(req, { fetch: send });
    expect(vi.mocked(send).mock.calls[0]?.[1]).toMatchObject({ cache: 'default' });
  });

  it('null on a non-2xx, an array, a bare value, text or an empty body', async () => {
    const bodies = [new Response('{}', { status: 503 }), new Response('["x"]'), new Response('5')];
    bodies.push(new Response('oops'), new Response(null, { status: 200 }));
    for (const res of bodies) {
      expect(await readOverrides(req, { fetch: () => Promise.resolve(res) })).toBeNull();
    }
  });

  it('null on a network error', async () => {
    const send = vi.fn(() => Promise.reject(new TypeError('offline')));
    expect(await readOverrides(req, { fetch: send })).toBeNull();
  });

  it('gives up at the timeout and aborts the request', async () => {
    let signal: AbortSignal | null | undefined;
    const send = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      signal = init?.signal;
      return new Promise<Response>((_resolve, reject) =>
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
      );
    });
    const pending = readOverrides(req, { fetch: send });
    await vi.advanceTimersByTimeAsync(OVERRIDES_TIMEOUT_MS);
    expect(await pending).toBeNull();
    expect(signal?.aborted).toBe(true);
  });
});
