import { cloneBundle } from '@ab/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BUNDLES, t } from './i18n';
import { fetchOverrides, loadOverrides, OVERRIDES_TIMEOUT_MS } from './i18n-overrides';

const req = { apiUrl: 'http://api.test', locale: 'ar' as const };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('boot-time translation overrides', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('`t` is a copy of the bundle, not the bundle itself', () => {
    expect(t).toEqual(BUNDLES.ar);
    expect(t).not.toBe(BUNDLES.ar);
  });

  it('fetches the locale\'s map revalidating the cache, and merges it in place', async () => {
    const fetchMock = vi.fn(async () => json({ 'nav.leads': 'قائمة', 'nav.nope': 'x', 'nav.inbox': 5 }));
    vi.stubGlobal('fetch', fetchMock);
    const target = cloneBundle(BUNDLES.ar);
    const { nav } = target;
    expect(await loadOverrides(target, req)).toBe(1);
    expect(nav.leads).toBe('قائمة');
    expect(nav.inbox).toBe(BUNDLES.ar.nav.inbox);
    expect(fetchMock).toHaveBeenCalledWith('http://api.test/i18n/ar/overrides', expect.objectContaining({ cache: 'no-cache' }));
  });

  it('a request slower than the timeout is aborted and the bundle stays', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', (_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))));
    const pending = fetchOverrides(req);
    await vi.advanceTimersByTimeAsync(OVERRIDES_TIMEOUT_MS);
    expect(await pending).toEqual({});
  });

  it('network errors, non-2xx and malformed bodies change nothing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(json({}, 500)).mockResolvedValueOnce(json(['x'])));
    for (let i = 0; i < 3; i += 1) expect(await fetchOverrides(req)).toEqual({});
  });
});
