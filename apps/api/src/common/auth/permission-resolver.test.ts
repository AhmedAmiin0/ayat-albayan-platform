import { beforeAll, describe, expect, it } from 'vitest';
import { realResolve } from '../../test/permissions.setup';
import { fakeDb, type FakeResult } from '../../modules/guardians/fake-db';
import { PERMISSION_TTL_MS, PermissionResolver } from './permission-resolver';

const profile = { role: 'admin', role_id: 'r1', full_name: 'منى', locale: 'ar', tz: 'Asia/Riyadh' };
const clerk: FakeResult[] = [
  { data: profile },
  { data: { id: 'r1', key: 'clerk' } },
  { data: [{ permission: 'payments.view' }] },
];

function setup(results: Record<string, FakeResult[]>) {
  const { db, calls } = fakeDb(results);
  const resolver = new PermissionResolver(db);
  const clock = { t: 1_000 };
  resolver.now = () => clock.t;
  return { resolver, calls, clock };
}

describe('PermissionResolver', () => {
  beforeAll(() => {
    PermissionResolver.prototype.resolve = realResolve;
  });

  it('resolves role key, permissions and the profile fields', async () => {
    const { resolver } = setup({ profiles: [...clerk.slice(0, 1)], roles: [clerk[1] ?? {}], role_permissions: [clerk[2] ?? {}] });
    const a = await resolver.resolve('u1');
    expect(a.roleKey).toBe('clerk');
    expect([...a.permissions]).toEqual(['payments.view']);
    expect(a).toMatchObject({ fullName: 'منى', locale: 'ar', tz: 'Asia/Riyadh' });
  });

  it('caches per user until the TTL passes', async () => {
    const { resolver, calls, clock } = setup({
      profiles: [{ data: profile }, { data: profile }],
      roles: [{ data: { id: 'r1', key: 'clerk' } }, { data: { id: 'r1', key: 'clerk' } }],
      role_permissions: [{ data: [{ permission: 'a.view' }] }, { data: [{ permission: 'b.view' }] }],
    });
    const first = await resolver.resolve('u1');
    clock.t += PERMISSION_TTL_MS - 1;
    expect(await resolver.resolve('u1')).toBe(first);
    expect(calls.filter((c) => c.table === 'profiles' && c.method === 'select')).toHaveLength(1);
    clock.t += 2;
    expect([...(await resolver.resolve('u1')).permissions]).toEqual(['b.view']);
  });

  it('invalidate(userId) drops one user, invalidate() drops everyone', async () => {
    const two = { data: [{ permission: 'x.view' }] };
    const { resolver, calls } = setup({
      profiles: Array.from({ length: 6 }, () => ({ data: profile })),
      roles: Array.from({ length: 6 }, () => ({ data: { id: 'r1', key: 'clerk' } })),
      role_permissions: Array.from({ length: 6 }, () => two),
    });
    const loads = () => calls.filter((c) => c.table === 'profiles' && c.method === 'select').length;
    await resolver.resolve('u1');
    await resolver.resolve('u2');
    expect(loads()).toBe(2);
    resolver.invalidate('u1');
    await resolver.resolve('u1');
    await resolver.resolve('u2');
    expect(loads()).toBe(3);
    resolver.invalidate();
    await resolver.resolve('u1');
    await resolver.resolve('u2');
    expect(loads()).toBe(5);
  });

  it('falls back to the system role of profiles.role when role_id is null', async () => {
    const { resolver, calls } = setup({
      profiles: [{ data: { ...profile, role_id: null } }],
      roles: [{ data: { id: 'sys', key: 'admin' } }],
      role_permissions: [{ data: [{ permission: '*' }] }],
    });
    const a = await resolver.resolve('u1');
    expect(a.roleKey).toBe('admin');
    expect(calls.some((c) => c.table === 'roles' && c.method === 'eq' && c.args[0] === 'is_system')).toBe(true);
  });

  it('a user without a profile has no permissions', async () => {
    const { resolver } = setup({ profiles: [{ data: null }] });
    const a = await resolver.resolve('ghost');
    expect(a.roleKey).toBeNull();
    expect(a.permissions.size).toBe(0);
  });

  it('throws when the database errors (the guard then answers 500, never open)', async () => {
    const { resolver } = setup({ profiles: [{ error: { message: 'boom' } }] });
    await expect(resolver.resolve('u1')).rejects.toThrow('profile lookup failed');
  });
});
