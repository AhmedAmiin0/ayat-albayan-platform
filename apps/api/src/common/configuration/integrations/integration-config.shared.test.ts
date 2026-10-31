import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeRedis, settle } from '@/common/cache/cache.fakes';
import { setIntegrationOverlay } from './integration-overlay';
import { loadEnv } from '@/config/env/env';
import { asQueries, fakeQueries } from './integration-config.fakes';
import { IntegrationConfigService } from './integration-config.service';

const SECRET = 'fake-vault-token-must-never-reach-redis';

beforeEach(() => {
  vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  setIntegrationOverlay({});
  vi.restoreAllMocks();
});

describe('IntegrationConfigService with Redis', () => {
  it('an admin write announces it and the other copy reloads from the database at once', async () => {
    const redis = fakeRedis();
    const qa = fakeQueries({ raw: { WA_WABA_ID: 'waba-1' } });
    const qb = fakeQueries({ raw: { WA_WABA_ID: 'waba-1' } });
    const a = new IntegrationConfigService(asQueries(qa), 60_000, redis.copy().cache);
    const b = new IntegrationConfigService(asQueries(qb), 60_000, redis.copy().cache);
    await a.onModuleInit();
    await b.onModuleInit();
    qb.rawValues.mockResolvedValue({ WA_WABA_ID: 'waba-2' });
    await a.writeValues({ WA_WABA_ID: 'waba-2' }, 'admin-1');
    await settle();
    expect(qb.rawValues).toHaveBeenCalledTimes(2);
    expect(loadEnv().WA_WABA_ID).toBe('waba-2');
    a.onModuleDestroy();
    b.onModuleDestroy();
  });

  it('no secret is ever written to the shared cache (values stay in each process)', async () => {
    const redis = fakeRedis();
    const q = fakeQueries({ raw: { WA_ACCESS_TOKEN: SECRET } });
    const s = new IntegrationConfigService(asQueries(q), 60_000, redis.copy().cache);
    await s.onModuleInit();
    await s.setSecret({ key: 'WA_ACCESS_TOKEN', value: SECRET });
    await s.clearSecret('WA_ACCESS_TOKEN');
    await s.refresh();
    await settle();
    expect(loadEnv().WA_ACCESS_TOKEN).toBe(SECRET);
    expect(redis.server.sets).toEqual([]);
    expect(JSON.stringify([...redis.server.data])).not.toContain(SECRET);
    s.onModuleDestroy();
  });

  it('INTEGRATION_CONFIG_FROM_DB=false (null period): never announces or listens', async () => {
    const redis = fakeRedis();
    const q = fakeQueries();
    const peer = redis.copy().cache;
    const heard = vi.fn();
    peer.on('integrations', heard);
    const s = new IntegrationConfigService(asQueries(q), null, redis.copy().cache);
    await s.onModuleInit();
    await s.writeValues({ WA_WABA_ID: 'x' }, 'admin-1');
    await settle();
    expect(heard).not.toHaveBeenCalled();
    expect(q.rawValues).not.toHaveBeenCalled();
  });
});
