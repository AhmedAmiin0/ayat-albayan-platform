import type { Permission } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { PERMISSION_TTL_MS, PermissionCache } from '../auth/permission.cache';
import type { ConfigStore } from '../config-store/store/config-store.service';
import type { Db } from '../db/db.module';
import { SettingsService } from '../settings/settings.service';
import { CacheGuard } from './cache-guard';
import { cacheStoreFromEnv } from './cache.module';
import { SharedCache } from './shared-cache';

/** REDIS_URL unset (every environment until the owner sets it): the cache as the boot builds it. */
function inert() {
  const store = cacheStoreFromEnv(new CacheGuard(), {});
  const spies = [vi.spyOn(store, 'get'), vi.spyOn(store, 'set'), vi.spyOn(store, 'publish'), vi.spyOn(store, 'delByPrefix')];
  return { cache: new SharedCache(store), store, spies };
}

describe('REDIS_URL unset: caching, TTLs and invalidation are exactly as before', () => {
  it('memory mode: every read is the loader, a change touches nothing, the store is never called', async () => {
    const { cache, store, spies } = inert();
    expect(store.mode).toBe('memory');
    const load = vi.fn(async () => 1);
    await expect(cache.readEntry({ key: 'k', ttlMs: 30_000, load })).resolves.toEqual({ value: 1, age: 0 });
    await cache.invalidate({ topic: 'permissions', prefix: 'perm:' });
    await cache.read({ key: 'k', ttlMs: 30_000, load });
    expect(load).toHaveBeenCalledTimes(2);
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });

  it('a permission set lives PERMISSION_TTL_MS in this process, and clear() drops it at once', async () => {
    let now = 0;
    const perms = new PermissionCache(() => now, inert().cache);
    const load = vi.fn(async (): Promise<readonly Permission[]> => ['payments.read']);
    await perms.get('u1', load);
    now = PERMISSION_TTL_MS - 1;
    await perms.get('u1', load);
    expect(load).toHaveBeenCalledTimes(1);
    now = PERMISSION_TTL_MS;
    await perms.get('u1', load);
    perms.clear();
    await perms.get('u1', load);
    expect(load).toHaveBeenCalledTimes(3);
  });

  it('settings rows live SETTINGS_CACHE_MS in this process', async () => {
    const select = vi.fn(async () => ({ data: [{ key: 'late_cancel_hours', value: 12 }], error: null }));
    const db = { from: vi.fn(() => ({ select })) } as unknown as Db;
    const store = { onChange: vi.fn() } as unknown as ConfigStore;
    const svc = new SettingsService(db, 30_000, store);
    (svc as unknown as { shared: SharedCache }).shared = inert().cache;
    await svc.all(0);
    await svc.all(29_999);
    expect(select).toHaveBeenCalledTimes(1);
    await svc.all(30_000);
    expect(select).toHaveBeenCalledTimes(2);
  });
});
