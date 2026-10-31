import { describe, expect, it, vi } from 'vitest';
import { fakeRedis, settle } from '@/common/infra/cache/cache.fakes';
import type { Db } from '../../../common/db/db.module';
import { GoogleSettings } from './google-settings';

/** settings rows: select('key, value').in(...) answers `rows()`; upsert succeeds. */
function db(rows: () => { key: string; value: unknown }[]) {
  const select = vi.fn(() => ({ in: async () => ({ data: rows(), error: null }) }));
  const upsert = vi.fn(async () => ({ error: null }));
  return { db: { from: () => ({ select, upsert }) } as unknown as Db, select };
}

describe('GoogleSettings with Redis (an API copy and the worker)', () => {
  it('turning the sync OFF on an API copy reaches the worker\'s cached read at once', async () => {
    const redis = fakeRedis();
    let enabled = true;
    const rows = () => [{ key: 'google_sync_enabled', value: enabled }];
    const api = new GoogleSettings(db(rows).db, 30_000, redis.copy().cache);
    const worker = db(rows);
    const onWorker = new GoogleSettings(worker.db, 30_000, redis.copy().cache);
    expect((await onWorker.read()).enabled).toBe(true);
    enabled = false;
    await api.write({ values: { enabled: false }, actorId: 'admin-1' });
    await settle();
    expect((await onWorker.read()).enabled).toBe(false);
    expect(worker.select).toHaveBeenCalledTimes(2);
  });
});
