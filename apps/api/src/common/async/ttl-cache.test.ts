import { describe, expect, it, vi } from 'vitest';
import { TtlCache } from './ttl-cache';

describe('TtlCache — one load per TTL, never a cached failure', () => {
  it('serves the same load until the TTL is over, then loads again', async () => {
    const load = vi.fn(async () => load.mock.calls.length);
    const cache = new TtlCache(30_000, load);
    expect(await cache.get(0)).toBe(1);
    expect(await cache.get(29_999)).toBe(1);
    expect(await cache.get(30_000)).toBe(2);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('concurrent callers share one load', async () => {
    const load = vi.fn(async () => 'v');
    const cache = new TtlCache(30_000, load);
    await Promise.all([cache.get(0), cache.get(1), cache.get(2)]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('clear() (an own write) loads at once on the next call', async () => {
    const load = vi.fn(async () => load.mock.calls.length);
    const cache = new TtlCache(30_000, load);
    await cache.get(0);
    cache.clear();
    expect(await cache.get(1)).toBe(2);
  });

  it('a failed load is not kept: the next call asks again', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValue('ok');
    const cache = new TtlCache(30_000, load);
    await expect(cache.get(0)).rejects.toThrow('down');
    await expect(cache.get(1)).resolves.toBe('ok');
  });

  it('ttl 0 never caches (e2e)', async () => {
    const load = vi.fn(async () => 'v');
    const cache = new TtlCache(0, load);
    await cache.get(0);
    await cache.get(0);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('a ttl function is read on every call (a property-injected period)', async () => {
    let ttl = 30_000;
    const load = vi.fn(async () => 'v');
    const cache = new TtlCache(() => ttl, load);
    await cache.get(0);
    ttl = 0;
    await cache.get(1);
    expect(load).toHaveBeenCalledTimes(2);
  });
});
