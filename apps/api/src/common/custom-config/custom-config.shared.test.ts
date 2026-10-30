import { describe, expect, it, vi } from 'vitest';
import { fakeRedis, settle } from '../cache/cache.fakes';
import type { Db } from '../db/db.module';
import { CustomConfigService } from './custom-config.service';

const PUBLIC = [{ key: 'promo', value: { text: 'hi' }, is_public: true }];

/** A db whose every chain answers `data` (custom_config reads and writes). */
function db(data: () => unknown) {
  const chain: Record<string, unknown> = { then: (resolve: (r: unknown) => unknown) => resolve({ data: data(), error: null }) };
  for (const m of ['select', 'eq', 'upsert', 'single', 'delete']) chain[m] = vi.fn(() => chain);
  const from = vi.fn(() => chain);
  return { db: { from } as unknown as Db, from };
}

describe('CustomConfigService public rows with Redis', () => {
  it('shared between copies; a write or delete on any copy drops them', async () => {
    const redis = fakeRedis();
    const one = db(() => PUBLIC);
    const other = db(() => PUBLIC);
    const a = new CustomConfigService(one.db, redis.copy().cache);
    const b = new CustomConfigService(other.db, redis.copy().cache);
    await a.publicRows();
    await settle();
    await expect(b.publicRows()).resolves.toEqual(PUBLIC);
    expect(other.from).not.toHaveBeenCalled();
    await a.remove('promo');
    await b.publicRows();
    expect(other.from).toHaveBeenCalledTimes(1);
  });

  it('without Redis every call reads the database, as before', async () => {
    const one = db(() => PUBLIC);
    const s = new CustomConfigService(one.db);
    await s.publicRows();
    await s.publicRows();
    expect(one.from).toHaveBeenCalledTimes(2);
  });
});
