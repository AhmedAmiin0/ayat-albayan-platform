import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '@/common/audit/audit.service';
import { fakeRedis, settle } from '@/common/infra/cache/cache.fakes';
import { CACHE_KEYS } from '@/common/infra/cache/cache-keys';
import type { SharedCache } from '@/common/infra/cache/shared-cache';
import { ConfigCacheBridge } from '@/common/configuration/config-store/store/config-cache.bridge';
import type { ConfigStoreQueries } from '@/common/configuration/config-store/store/config-store.queries';
import { ConfigStore } from '@/common/configuration/config-store/store/config-store.service';
import type { Db } from '@/common/db/db.module';
import { SettingsService } from '@/common/settings/settings.service';
import { NumbersConfig } from './config/numbers.config';
import type { NumbersSecrets } from './config/numbers.secrets';
import { NumbersEffects } from './numbers.effects';
import type { NumbersQueries } from './numbers.queries';
import { NumbersSettings } from './numbers.settings';
import type { OwnNumbers } from './own/own-numbers';

/** One API copy wired as Nest does it: every constructor first, then NumbersEffects.onModuleInit. */
function copy(redis: ReturnType<typeof fakeRedis>, source: () => string) {
  const select = vi.fn(async () => ({ data: [{ key: 'comms_source', value: source() }], error: null }));
  const db = { from: vi.fn(() => ({ select })) } as unknown as Db;
  const q = { snapshot: vi.fn(async () => ({ rev: 1, rows: [] })), revision: vi.fn(async () => 1) };
  const store = new ConfigStore(q as unknown as ConfigStoreQueries, 30_000);
  const { cache } = redis.copy();
  const svc = new SettingsService(db, 30_000, store);
  (svc as unknown as { shared: SharedCache }).shared = cache;
  const bridge = new ConfigCacheBridge(store, cache);
  const config = new NumbersConfig(new NumbersSettings(svc), {} as NumbersQueries, {} as NumbersSecrets);
  const seen: string[] = [];
  vi.spyOn(config, 'reload').mockImplementation(async () => (seen.push(await config.source()), true));
  const audit = {} as AuditService;
  const fx = new NumbersEffects(audit, config, { forget: vi.fn() } as unknown as OwnNumbers);
  (fx as unknown as { shared: SharedCache }).shared = cache;
  fx.onModuleInit();
  return { svc, seen, bridge };
}

describe('NumbersEffects after a comms_source flip on another copy', () => {
  it('reloads the line config from the NEW settings (SettingsService is dropped first)', async () => {
    const redis = fakeRedis();
    let stored = 'legacy';
    const b = copy(redis, () => stored);
    expect((await b.svc.all()).comms_source).toBe('legacy');
    await settle();
    stored = 'module';
    await redis.copy().cache.invalidate({ topic: 'settings', keys: [CACHE_KEYS.settingsRows] });
    await settle();
    expect(b.seen).toEqual(['module']);
  });
});
