import { describe, expect, it, vi } from 'vitest';
import { fakeRedis, settle } from './cache.fakes';
import { SKIP_AFTER_FAILURE_MS } from './cache-guard';

describe('SharedCache when Redis is down or slow', () => {
  it('reads fall back to the database and never throw', async () => {
    const { copy, server } = fakeRedis();
    const a = copy();
    server.down = true;
    const load = vi.fn(async () => 'from-db');
    await expect(a.cache.read({ key: 'k', ttlMs: 30_000, load })).resolves.toBe('from-db');
    await expect(a.cache.read({ key: 'k', ttlMs: 30_000, load })).resolves.toBe('from-db');
    await settle();
    expect(load).toHaveBeenCalledTimes(2);
    expect(a.cache.stats()).toMatchObject({ connected: false, hits: 0 });
    expect(a.cache.stats().errors).toBeGreaterThan(0);
  });

  it('a write never throws while Redis is down', async () => {
    const { copy, server } = fakeRedis();
    const a = copy();
    server.down = true;
    await expect(a.cache.invalidate({ topic: 'permissions', keys: ['k'], prefix: 'perm:' })).resolves.toBeUndefined();
  });

  it('logs at most once a minute, the error text only', async () => {
    const { copy, server } = fakeRedis();
    const a = copy();
    server.down = true;
    for (let i = 0; i < 5; i += 1) {
      server.now += SKIP_AFTER_FAILURE_MS;
      await a.cache.read({ key: 'k', ttlMs: 30_000, load: async () => 1 });
    }
    expect(a.log.warn).toHaveBeenCalledTimes(1);
    expect(a.log.warn.mock.calls[0]?.[0]).toContain('ECONNREFUSED');
    server.now += 60_000;
    await a.cache.read({ key: 'k', ttlMs: 30_000, load: async () => 1 });
    expect(a.log.warn).toHaveBeenCalledTimes(2);
  });

  it('after a failure Redis is skipped for a while, then used again', async () => {
    const { copy, server } = fakeRedis();
    const a = copy();
    server.down = true;
    await a.cache.read({ key: 'k', ttlMs: 30_000, load: async () => 1 });
    server.down = false;
    const errors = a.guard.errors;
    await a.cache.read({ key: 'k', ttlMs: 30_000, load: async () => 1 });
    await settle();
    expect(server.data.size).toBe(0);
    server.now += SKIP_AFTER_FAILURE_MS;
    await a.cache.read({ key: 'k', ttlMs: 30_000, load: async () => 1 });
    await settle();
    expect(server.data.size).toBe(1);
    expect(a.guard.errors).toBe(errors);
  });

  it('a slow Redis answer is abandoned and the database read instead', async () => {
    vi.useFakeTimers();
    try {
      const { copy } = fakeRedis();
      const a = copy();
      const store = (a.cache as unknown as { store: { get: (k: string) => Promise<string | null> } }).store;
      vi.spyOn(store, 'get').mockImplementation(() => new Promise(() => undefined));
      const reading = a.cache.read({ key: 'k', ttlMs: 30_000, load: async () => 'db' });
      await vi.advanceTimersByTimeAsync(600);
      await expect(reading).resolves.toBe('db');
    } finally {
      vi.useRealTimers();
    }
  });
});
