import { describe, expect, it, vi } from 'vitest';
import { fakeRedis, settle } from '../cache/cache.fakes';
import type { SharedCache } from '../cache/shared-cache';
import { ConfigCacheBridge } from '../config-store/store/config-cache.bridge';
import type { ConfigStoreQueries } from '../config-store/store/config-store.queries';
import { ConfigStore } from '../config-store/store/config-store.service';
import type { Db } from '../db/db.module';
import { SettingsService } from './settings.service';

type Rows = { key: string; value: unknown }[];

/** One API copy: ConfigStore + bridge + SettingsService over a db answering `rows()`, on one Redis. */
function copy(redis: ReturnType<typeof fakeRedis>, rows: () => Rows) {
  const select = vi.fn(async () => ({ data: rows(), error: null }));
  const db = { from: vi.fn(() => ({ select })) } as unknown as Db;
  const q = { snapshot: vi.fn(async () => ({ rev: 1, rows: [] })), revision: vi.fn(async () => 1), set: vi.fn(async () => undefined) };
  const store = new ConfigStore(q as unknown as ConfigStoreQueries, 30_000);
  const { cache } = redis.copy();
  new ConfigCacheBridge(store, cache).onModuleInit();
  const svc = new SettingsService(db, 30_000, store);
  (svc as unknown as { shared: SharedCache }).shared = cache;
  return { svc, store, select, cache };
}

describe('SettingsService with Redis (two API copies)', () => {
  it('the rows read by one copy are shared with the other (one database read)', async () => {
    const redis = fakeRedis();
    const rows = (): Rows => [{ key: 'late_cancel_hours', value: 12 }];
    const a = copy(redis, rows);
    const b = copy(redis, rows);
    await a.svc.all();
    await settle();
    expect((await b.svc.all()).late_cancel_hours).toBe(12);
    expect(a.select).toHaveBeenCalledTimes(1);
    expect(b.select).not.toHaveBeenCalled();
  });

  it('a write on one copy: the other drops its rows at once and reads the new value', async () => {
    const redis = fakeRedis();
    let stored = 12;
    const rows = (): Rows => [{ key: 'late_cancel_hours', value: stored }];
    const a = copy(redis, rows);
    const b = copy(redis, rows);
    await b.svc.all();
    await settle();
    stored = 6;
    await a.svc.write({ late_cancel_hours: 6 }, 'admin-1');
    await settle();
    expect((await b.svc.all()).late_cancel_hours).toBe(6);
    expect((await a.svc.all()).late_cancel_hours).toBe(6);
  });

  it('an announcement from another copy is not announced again (no ping-pong)', async () => {
    const redis = fakeRedis();
    const a = copy(redis, () => []);
    const b = copy(redis, () => []);
    const deletes = vi.spyOn(redis.server.data, 'delete');
    a.store.invalidate();
    await settle();
    expect(deletes).toHaveBeenCalledTimes(1);
    expect(b.cache.stats().errors).toBe(0);
  });

  it('after its own invalidation a copy reads the database, not the shared rows', async () => {
    const redis = fakeRedis();
    let stored = 1;
    const a = copy(redis, () => [{ key: 'late_cancel_hours', value: stored }]);
    await a.svc.all();
    await settle();
    stored = 2;
    a.svc.invalidate();
    expect((await a.svc.all()).late_cancel_hours).toBe(2);
  });
});
