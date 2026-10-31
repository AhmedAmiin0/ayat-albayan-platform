import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '@/common/audit/audit.service';
import { fakeRedis, settle } from '@/common/infra/cache/cache.fakes';
import type { SharedCache } from '@/common/infra/cache/shared-cache';
import type { NumbersConfig } from './config/numbers.config';
import { NumbersEffects } from './numbers.effects';
import type { OwnNumbers } from './own/own-numbers';

function copy(redis: ReturnType<typeof fakeRedis>) {
  const config = { reload: vi.fn(async () => true) };
  const own = { forget: vi.fn() };
  const audit = { record: vi.fn(async () => undefined) };
  const fx = new NumbersEffects(audit as unknown as AuditService, config as unknown as NumbersConfig, own as unknown as OwnNumbers);
  const { cache } = redis.copy();
  (fx as unknown as { shared: SharedCache }).shared = cache;
  fx.onModuleInit();
  return { fx, config, own, cache };
}

describe('NumbersEffects with Redis (two API copies)', () => {
  it('a numbers write on one copy reloads the line config and own numbers on the other', async () => {
    const redis = fakeRedis();
    const a = copy(redis);
    const b = copy(redis);
    await a.fx.after({ actorId: 'admin-1', entity: 'wa_numbers', entityId: 'n1', action: 'update', before: null, after: null });
    await settle();
    expect(a.config.reload).toHaveBeenCalledTimes(1);
    expect(b.config.reload).toHaveBeenCalledTimes(1);
    expect(b.own.forget).toHaveBeenCalledTimes(1);
  });

  it('a settings write elsewhere (comms_source) reloads the line config too', async () => {
    const redis = fakeRedis();
    const b = copy(redis);
    await redis.copy().cache.invalidate({ topic: 'settings' });
    expect(b.config.reload).toHaveBeenCalledTimes(1);
  });
});
