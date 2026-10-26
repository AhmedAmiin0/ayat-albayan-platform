import { GRANTABLE_PERMISSIONS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { fakeDb, type FakeResult } from '../../modules/people/guardians/fake-db';
import { dbPermissionResolver } from './db-permission.resolver';
import { PermissionCache } from './permission.cache';
import { AccountDisabledError, can } from './permissions';
import type { AuthUser } from './verify-token';

const user = (role: AuthUser['role'], id = 'u1'): AuthUser => ({ id, email: null, role });
const roleRow = (key: string, isSystem: boolean, perms: string[]) => ({
  data: { id: 'r1', key, is_system: isSystem, role_permissions: perms.map((permission) => ({ permission })) },
});

function setup(tables: Record<string, FakeResult[]>) {
  const fake = fakeDb(tables);
  return { ...fake, resolve: dbPermissionResolver({ db: fake.db, cache: new PermissionCache() }) };
}

describe('dbPermissionResolver', () => {
  it('reads the system role of profiles.role when role_id is null', async () => {
    const { resolve, calls } = setup({
      profiles: [{ data: { role: 'teacher', role_id: null } }],
      roles: [roleRow('teacher', true, ['reports.write', 'self.teacher', 'bogus'])],
    });
    await expect(resolve(user('teacher'))).resolves.toEqual(['reports.write', 'self.teacher']);
    expect(calls.filter((c) => c.table === 'roles' && c.method === 'eq').map((c) => c.args)).toEqual([
      ['is_system', true],
      ['base_role', 'teacher'],
    ]);
  });

  it('reads the custom role by role_id and adds no admin extras', async () => {
    const { resolve, calls } = setup({
      profiles: [{ data: { role: 'admin', role_id: 'c1' } }],
      roles: [roleRow('custom-1', false, ['payments.read'])],
    });
    await expect(resolve(user('admin'))).resolves.toEqual(['payments.read']);
    expect(calls.find((c) => c.table === 'roles' && c.method === 'eq')?.args).toEqual(['id', 'c1']);
  });

  it('gives the system admin every grantable permission whatever its rows', async () => {
    const { resolve } = setup({ profiles: [{ data: { role: 'admin', role_id: null } }], roles: [roleRow('admin', true, [])] });
    await expect(resolve(user('admin'))).resolves.toEqual([...GRANTABLE_PERMISSIONS]);
  });

  it('has nothing for a user without a role or a profile, and throws on DB errors', async () => {
    const { resolve } = setup({ profiles: [{ data: null }, { error: { message: 'down' } }] });
    await expect(resolve(user(null))).resolves.toEqual([]);
    await expect(resolve(user('teacher', 'u2'))).resolves.toEqual([]);
    await expect(resolve(user('teacher', 'u3'))).rejects.toThrow('down');
  });

  it('throws AccountDisabledError for a disabled profile, whatever its role', async () => {
    const { resolve } = setup({ profiles: [{ data: { role: 'admin', role_id: null, disabled_at: '2026-10-06T00:00:00Z' } }] });
    await expect(resolve(user('admin'))).rejects.toBeInstanceOf(AccountDisabledError);
  });

  it('caches per user until cleared', async () => {
    const { resolve, calls } = setup({
      profiles: [{ data: { role: 'sales', role_id: null } }],
      roles: [roleRow('sales', true, ['inbox.read'])],
    });
    await resolve(user('sales'));
    await resolve(user('sales'));
    expect(calls.filter((c) => c.table === 'profiles' && c.method === 'select')).toHaveLength(1);
  });
});

describe('can()', () => {
  it('reads the permissions the guard put on the user', () => {
    expect(can({ ...user('admin'), permissions: ['payments.read'] }, 'payments.read')).toBe(true);
    expect(can({ ...user('admin'), permissions: ['payments.read'] }, 'students.read')).toBe(false);
    expect(can(user('admin'), 'payments.read')).toBe(false);
  });
});
