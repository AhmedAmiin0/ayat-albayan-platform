import type { Permission } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { PERMISSION_TTL_MS, PermissionCache } from './permission.cache';

const perms = (...p: Permission[]) => async () => p;

describe('PermissionCache', () => {
  it('reuses a user’s set within the TTL and reloads after it', async () => {
    let now = 1_000;
    const cache = new PermissionCache(() => now);
    const load = vi.fn(perms('payments.read'));
    await cache.get('u1', load);
    now += PERMISSION_TTL_MS - 1;
    await cache.get('u1', load);
    expect(load).toHaveBeenCalledTimes(1);
    now += 2;
    await cache.get('u1', load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('keeps users apart', async () => {
    const cache = new PermissionCache();
    await expect(cache.get('a', perms('students.read'))).resolves.toEqual(['students.read']);
    await expect(cache.get('b', perms('payments.read'))).resolves.toEqual(['payments.read']);
  });

  it('clear() makes the next request read the DB again (role changed)', async () => {
    const cache = new PermissionCache();
    const load = vi.fn(perms('payments.read'));
    await cache.get('u1', load);
    cache.clear();
    await cache.get('u1', load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('shares one load between concurrent requests', async () => {
    const cache = new PermissionCache();
    const load = vi.fn(perms('inbox.read'));
    await Promise.all([cache.get('u1', load), cache.get('u1', load)]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('does not cache a failed load', async () => {
    const cache = new PermissionCache();
    await expect(cache.get('u1', () => Promise.reject(new Error('db down')))).rejects.toThrow('db down');
    await expect(cache.get('u1', perms('students.read'))).resolves.toEqual(['students.read']);
  });
});
