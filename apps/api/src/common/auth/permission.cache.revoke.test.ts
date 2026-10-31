import type { Permission } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { fakeRedis, settle } from '@/common/infra/cache/cache.fakes';
import { FRESH_AFTER_CHANGE_MS } from '@/common/infra/cache/shared-cache';
import { PermissionCache } from './permission.cache';

const OLD: readonly Permission[] = ['payments.read'];

/** Three API copies (A revokes, B was loading, C reads next) with their own PermissionCache on one Redis. */
function copies() {
  const redis = fakeRedis();
  const clock = () => redis.server.now;
  const [a, b, c] = [redis.copy(), redis.copy(), redis.copy()].map((x) => new PermissionCache(clock, x.cache));
  if (!a || !b || !c) throw new Error('three copies');
  return { redis, a, b, c };
}

describe('PermissionCache: a revoke is never undone by a slower copy', () => {
  it("B's pre-revoke load stored between A's delete and the announcement is not served", async () => {
    const { redis, a, b, c } = copies();
    let release = (): void => undefined;
    const slow = vi.fn(() => new Promise<readonly Permission[]>((r) => (release = () => r(OLD))));
    const before = b.get('u1', slow);
    await settle();
    // A's role change: the keys are already deleted when B's old set lands in Redis, then A announces.
    let stored = (): void => undefined;
    const raced = new Promise<void>((r) => (stored = r));
    redis.server.beforePublish = async () => {
      release();
      await before;
      await settle();
      stored();
    };
    a.clear();
    await raced;
    await settle();
    expect(redis.server.sets).toContain('ab:cache:perm:u1={"at":0,"v":["payments.read"]}');
    const revoked = vi.fn(async (): Promise<readonly Permission[]> => []);
    await expect(c.get('u1', revoked)).resolves.toEqual([]);
    await expect(b.get('u1', revoked)).resolves.toEqual([]);
    await expect(a.get('u1', revoked)).resolves.toEqual([]);
    expect(revoked).toHaveBeenCalledTimes(3);
  });

  it('after the change window the shared copy is read again', async () => {
    const { redis, a, b } = copies();
    a.clear();
    await settle();
    const load = vi.fn(async () => OLD);
    await a.get('u1', load);
    await settle();
    redis.server.now = FRESH_AFTER_CHANGE_MS;
    await b.get('u1', load);
    expect(load).toHaveBeenCalledTimes(1);
  });
});
