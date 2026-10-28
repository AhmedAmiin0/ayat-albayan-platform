import type { Permission } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { fakeRedis, settle } from '../cache/cache.fakes';
import { AccountDisabledError } from './permissions';
import { PERMISSION_TTL_MS, PermissionCache } from './permission.cache';

const perms = (...p: Permission[]) => vi.fn(async (): Promise<readonly Permission[]> => p);

/** Two API copies with their own PermissionCache on one Redis. */
function copies() {
  const redis = fakeRedis();
  const a = redis.copy();
  const b = redis.copy();
  const clock = () => redis.server.now;
  return { redis, a: new PermissionCache(clock, a.cache), b: new PermissionCache(clock, b.cache) };
}

describe('PermissionCache with Redis (two API copies)', () => {
  it('a set resolved by one copy is reused by the other (no second DB read)', async () => {
    const { a, b } = copies();
    const load = perms('payments.read');
    await a.get('u1', load);
    await settle();
    await expect(b.get('u1', load)).resolves.toEqual(['payments.read']);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('a role change on one copy drops the set everywhere at once', async () => {
    const { redis, a, b } = copies();
    await a.get('u1', perms('payments.read'));
    await settle();
    await b.get('u1', perms('payments.read'));
    a.clear();
    await settle();
    expect(redis.server.data.size).toBe(0);
    const reload = perms('students.read');
    await expect(b.get('u1', reload)).resolves.toEqual(['students.read']);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('a disabled account is never cached, locally or shared', async () => {
    const { redis, a } = copies();
    const disabled = vi.fn(async (): Promise<readonly Permission[]> => {
      throw new AccountDisabledError();
    });
    await expect(a.get('u1', disabled)).rejects.toBeInstanceOf(AccountDisabledError);
    await settle();
    await expect(a.get('u1', disabled)).rejects.toBeInstanceOf(AccountDisabledError);
    expect(disabled).toHaveBeenCalledTimes(2);
    expect(redis.server.sets).toEqual([]);
  });

  it('stores permission names only, with a 15 s TTL', async () => {
    const { redis, a } = copies();
    await a.get('u1', perms('payments.read'));
    await settle();
    expect(redis.server.sets).toEqual(['ab:cache:perm:u1={"at":0,"v":["payments.read"]}']);
    expect(redis.server.data.get('ab:cache:perm:u1')?.expires).toBe(15_000);
  });

  it('a set taken from the shared copy expires one TTL after its database read (never 45 s)', async () => {
    const { redis, a, b } = copies();
    const load = perms('payments.read');
    await a.get('u1', load);
    await settle();
    redis.server.now = 10_000;
    await b.get('u1', load);
    redis.server.now = 29_999;
    await b.get('u1', load);
    expect(load).toHaveBeenCalledTimes(1);
    redis.server.now = PERMISSION_TTL_MS;
    await b.get('u1', load);
    expect(load).toHaveBeenCalledTimes(2);
  });
});
