import { describe, expect, it } from 'vitest';
import { CacheGuard } from '@/common/infra/cache/cache-guard';
import { fakeRedis, settle } from '@/common/infra/cache/cache.fakes';
import { MemoryCacheStore } from '@/common/infra/cache/memory-cache.store';
import { RedisCacheStore } from '@/common/infra/cache/redis-cache.store';
import { BeatBook } from '@/common/jobs/beats/beat-book';
import { BEATS_KEY, BeatMirror, BeatReader } from './beat-share';

function redisCopy(redis: ReturnType<typeof fakeRedis>) {
  const store = new RedisCacheStore({ commands: redis.commands(), subscriber: redis.subscriber() });
  return { store, guard: new CacheGuard({ warn: () => undefined }, () => redis.server.now) };
}

const plan = { name: 'RemindersJob', everyMs: 300_000, firstMs: 0 };

describe('heartbeats across processes (worker → Redis → API copies)', () => {
  it('the worker reads its own book', async () => {
    const book = new BeatBook(() => 5);
    book.register(plan);
    const reader = new BeatReader({ ...redisCopy(fakeRedis()), book, role: 'worker' });
    expect(await reader.read()).toEqual(book.list());
  });

  it('an API copy reads what the worker mirrored to Redis', async () => {
    const redis = fakeRedis();
    const book = new BeatBook(() => 5);
    const mirror = new BeatMirror({ ...redisCopy(redis), book, role: 'worker' });
    mirror.onModuleInit();
    book.register(plan);
    book.ok(plan.name);
    await settle();
    const api = new BeatReader({ ...redisCopy(redis), book: new BeatBook(), role: 'api' });
    expect(await api.read()).toEqual(book.list());
    mirror.onModuleDestroy();
    book.fail(plan.name, new Error('x'));
    await settle();
    expect((await api.read())?.[0]?.lastError).toBeNull();
  });

  it('nothing mirrored yet, or not a beat list → null (jobs off, never a crash)', async () => {
    const redis = fakeRedis();
    const api = new BeatReader({ ...redisCopy(redis), book: new BeatBook(), role: 'api' });
    expect(await api.read()).toBeNull();
    redis.server.data.set(`ab:cache:${BEATS_KEY}`, { value: '[{"name":1}]', expires: 1e12 });
    expect(await api.read()).toBeNull();
    redis.server.data.set(`ab:cache:${BEATS_KEY}`, { value: 'not json', expires: 1e12 });
    expect(await api.read()).toBeNull();
  });

  it('Redis down: the read is null and the worker’s mirror never throws', async () => {
    const redis = fakeRedis();
    redis.server.down = true;
    const book = new BeatBook();
    new BeatMirror({ ...redisCopy(redis), book, role: 'worker' }).onModuleInit();
    expect(() => book.register(plan)).not.toThrow();
    await settle();
    expect(await new BeatReader({ ...redisCopy(redis), book, role: 'api' }).read()).toBeNull();
  });

  it('without Redis an API copy cannot see the worker (null) and nothing is mirrored', async () => {
    const store = new MemoryCacheStore();
    const book = new BeatBook();
    const guard = new CacheGuard({ warn: () => undefined });
    const mirror = new BeatMirror({ store, guard, book, role: 'all' });
    mirror.onModuleInit();
    book.register(plan);
    expect(() => mirror.onModuleDestroy()).not.toThrow();
    expect(await store.get(BEATS_KEY)).toBeNull();
    expect(await new BeatReader({ store, guard, book, role: 'api' }).read()).toBeNull();
  });
});
