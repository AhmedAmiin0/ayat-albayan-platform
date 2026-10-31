import { describe, expect, it, vi } from 'vitest';
import { fakeRedis, settle } from '@/common/infra/cache/cache.fakes';
import { fakeSettings } from '../../../../common/settings/settings.fakes';
import { RulesSourceSettings } from '../rules-source.settings';
import { DbRulesReader } from './rules.store';
import type { RulesTable } from './rules.table';

function copy(redis: ReturnType<typeof fakeRedis>) {
  const rows = vi.fn(async () => []);
  const settings = new RulesSourceSettings(fakeSettings({}), 30_000);
  return { r: new DbRulesReader({ rows } as unknown as RulesTable, settings, redis.copy().cache), rows };
}

describe('DbRulesReader with Redis (two API copies)', () => {
  it('a rule write on one copy drops the other copy\'s snapshot at once', async () => {
    const redis = fakeRedis();
    const a = copy(redis);
    const b = copy(redis);
    await b.r.snapshot(0);
    a.r.changed();
    await settle();
    await b.r.snapshot(1);
    expect(b.rows).toHaveBeenCalledTimes(2);
  });

  it('a settings write anywhere (the legacy keys, comms_source) drops it too', async () => {
    const redis = fakeRedis();
    const b = copy(redis);
    await b.r.snapshot(0);
    await redis.copy().cache.invalidate({ topic: 'settings' });
    await b.r.snapshot(1);
    expect(b.rows).toHaveBeenCalledTimes(2);
  });

  it('a read-only invalidate() (fresh snapshot) announces nothing', async () => {
    const redis = fakeRedis();
    const a = copy(redis);
    const b = copy(redis);
    await b.r.snapshot(0);
    await a.r.fresh();
    await settle();
    await b.r.snapshot(1);
    expect(b.rows).toHaveBeenCalledTimes(1);
  });
});
