import { describe, expect, it, vi } from 'vitest';
import { fakeRedis, settle } from './cache.fakes';
import { MemoryCacheStore } from './memory-cache.store';
import { SharedCache } from './shared-cache';

const loader = <T>(value: T) => vi.fn(async () => value);

describe('SharedCache without Redis (REDIS_URL unset)', () => {
  it('is the loader itself: every read loads, nothing is stored or announced', async () => {
    const store = new MemoryCacheStore();
    const set = vi.spyOn(store, 'set');
    const publish = vi.spyOn(store, 'publish');
    const cache = new SharedCache(store);
    const load = loader({ a: 1 });
    await cache.read({ key: 'k', ttlMs: 30_000, load });
    await cache.read({ key: 'k', ttlMs: 30_000, load });
    await cache.invalidate({ topic: 'settings', keys: ['k'] });
    expect(load).toHaveBeenCalledTimes(2);
    expect(set).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
    expect(cache.stats()).toMatchObject({ mode: 'memory', connected: true, hits: 0, misses: 0, hitRate: null });
  });
});

describe('SharedCache with Redis (two API copies)', () => {
  it('a value loaded by one copy is read by the other without the database', async () => {
    const { copy } = fakeRedis();
    const a = copy();
    const b = copy();
    const load = loader([{ key: 'x', value: 1 }]);
    await a.cache.read({ key: 'settings:rows', ttlMs: 30_000, load });
    await settle();
    expect(await b.cache.read({ key: 'settings:rows', ttlMs: 30_000, load })).toEqual([{ key: 'x', value: 1 }]);
    expect(load).toHaveBeenCalledTimes(1);
    expect(b.cache.stats()).toMatchObject({ mode: 'redis', hits: 1, misses: 0, hitRate: 1 });
  });

  it('the shared copy expires after its TTL', async () => {
    const { copy, server } = fakeRedis();
    const a = copy();
    const load = loader(1);
    await a.cache.read({ key: 'k', ttlMs: 30_000, load });
    await settle();
    server.now = 29_999;
    await a.cache.read({ key: 'k', ttlMs: 30_000, load });
    server.now = 30_000;
    await a.cache.read({ key: 'k', ttlMs: 30_000, load });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('ttlMs 0 (e2e) and fresh reads never use the shared copy', async () => {
    const { copy } = fakeRedis();
    const a = copy();
    const load = loader(1);
    await a.cache.read({ key: 'k', ttlMs: 0, load });
    await a.cache.read({ key: 'k', ttlMs: 30_000, load });
    await settle();
    await a.cache.read({ key: 'k', ttlMs: 30_000, load, fresh: true });
    expect(load).toHaveBeenCalledTimes(3);
  });

  it('a write deletes the key and the OTHER copies drop theirs; the writer gets no echo', async () => {
    const { copy, server } = fakeRedis();
    const a = copy();
    const b = copy();
    const onA = vi.fn();
    const onB = vi.fn();
    a.cache.on('settings', onA);
    b.cache.on('settings', onB);
    await a.cache.read({ key: 'settings:rows', ttlMs: 30_000, load: loader(1) });
    await settle();
    await a.cache.invalidate({ topic: 'settings', keys: ['settings:rows'] });
    expect(server.data.size).toBe(0);
    expect(onB).toHaveBeenCalledTimes(1);
    expect(onA).not.toHaveBeenCalled();
  });

  it('a prefix write drops every matching key only', async () => {
    const { copy, server } = fakeRedis();
    const a = copy();
    await a.cache.read({ key: 'perm:u1', ttlMs: 30_000, load: loader(['a']) });
    await a.cache.read({ key: 'perm:u2', ttlMs: 30_000, load: loader(['b']) });
    await a.cache.read({ key: 'settings:rows', ttlMs: 30_000, load: loader([]) });
    await settle();
    await a.cache.invalidate({ topic: 'permissions', prefix: 'perm:' });
    expect([...server.data.keys()]).toEqual(['ab:cache:settings:rows']);
  });

  it('a value loaded while a write was announced is not shared (it may predate the write)', async () => {
    const { copy, server } = fakeRedis();
    const a = copy();
    const b = copy();
    let release = (): void => undefined;
    const slow = vi.fn(() => new Promise<number>((r) => (release = () => r(1))));
    const reading = b.cache.read({ key: 'k', ttlMs: 30_000, load: slow });
    await settle();
    await a.cache.invalidate({ topic: 'settings', keys: ['k'] });
    release();
    expect(await reading).toBe(1);
    await settle();
    expect(server.data.size).toBe(0);
  });

  it('a stored value that is not JSON reads as a miss', async () => {
    const { copy, server } = fakeRedis();
    server.data.set('ab:cache:k', { value: '{broken', expires: 60_000 });
    const load = loader(2);
    expect(await copy().cache.read({ key: 'k', ttlMs: 30_000, load })).toBe(2);
    expect(load).toHaveBeenCalledTimes(1);
  });
});
