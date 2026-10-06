import { GRANTABLE_PERMISSIONS } from '@ab/shared';
import { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionCache } from '../../common/auth/permission.cache';
import { errorCode } from '../scheduling/errors';
import { FakeRoleStore, profile } from './roles.fakes';
import { RolesService } from './roles.service';

async function codeOf(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p;
    return undefined;
  } catch (e) {
    expect(e).toBeInstanceOf(HttpException);
    return errorCode(e);
  }
}

describe('RolesService — CRUD', () => {
  let store: FakeRoleStore;
  let cache: PermissionCache;
  let svc: RolesService;
  beforeEach(() => {
    store = new FakeRoleStore(undefined, [profile('owner', 'admin'), profile('t1', 'teacher'), profile('g1', 'guardian')]);
    cache = new PermissionCache();
    svc = new RolesService(store, cache);
  });

  it('lists the system roles with user counts; the admin shows every grantable key', async () => {
    const roles = await svc.list();
    expect(roles.map((r) => r.key)).toEqual(['admin', 'teacher', 'guardian', 'assistant', 'sales', 'student']);
    expect(roles[0]?.permissions).toEqual([...GRANTABLE_PERMISSIONS]);
    expect(roles.find((r) => r.key === 'teacher')?.users).toBe(1);
  });

  it('creates a custom role with clean grants (unknown and self.* dropped)', async () => {
    const created = await svc.create({ name_ar: 'محاسب', base_role: 'admin', permissions: ['payments.read', 'payments.read'] }, 'owner');
    expect(created).toMatchObject({ name_ar: 'محاسب', base_role: 'admin', is_system: false, permissions: ['payments.read'], users: 0 });
    expect(created.key).toMatch(/^custom-[0-9a-f]{8}$/);
  });

  it('renames and re-grants a role, clearing the permission cache', async () => {
    const created = await svc.create({ name_ar: 'محاسب', base_role: 'admin', permissions: ['payments.read'] }, 'owner');
    const clear = vi.spyOn(cache, 'clear');
    const out = await svc.update(created.id, { name_en: 'Accountant', permissions: ['payments.read', 'expenses.read'], actorId: 'owner' });
    expect(out).toMatchObject({ name_ar: 'محاسب', name_en: 'Accountant', permissions: ['payments.read', 'expenses.read'] });
    expect(clear).toHaveBeenCalled();
  });

  it('edits a system role’s grants but never the system admin’s', async () => {
    const out = await svc.update('sys-teacher', { permissions: ['reports.read'], actorId: 'owner' });
    expect(out.permissions).toEqual(['reports.read']);
    expect(await codeOf(svc.update('sys-admin', { permissions: [], actorId: 'owner' }))).toBe('admin_role_fixed');
  });

  it('deletes an unused custom role only', async () => {
    const created = await svc.create({ name_ar: 'x', base_role: 'teacher', permissions: [] }, 'owner');
    await svc.assign({ userId: 't1', roleId: created.id, actorId: 'owner' });
    expect(await codeOf(svc.remove(created.id))).toBe('role_in_use');
    expect(await codeOf(svc.remove('sys-sales'))).toBe('system_role');
    await svc.assign({ userId: 't1', roleId: 'sys-teacher', actorId: 'owner' });
    await svc.remove(created.id);
    expect((await svc.list()).some((r) => r.id === created.id)).toBe(false);
  });

  it('404s an unknown role', async () => {
    expect(await codeOf(svc.remove('nope'))).toBe('role_not_found');
  });
});

describe('RolesService — assignment', () => {
  let store: FakeRoleStore;
  let svc: RolesService;
  beforeEach(() => {
    store = new FakeRoleStore(undefined, [profile('owner', 'admin'), profile('t1', 'teacher')]);
    svc = new RolesService(store, new PermissionCache());
  });

  it('assigning a custom role sets profiles.role to its base role and role_id to it', async () => {
    const acc = await svc.create({ name_ar: 'محاسب', base_role: 'admin', permissions: ['payments.read'] }, 'owner');
    const out = await svc.assign({ userId: 't1', roleId: acc.id, actorId: 'owner' });
    expect(out).toEqual({ id: 't1', full_name: 't1', role: 'admin', role_id: acc.id });
    expect(store.profilesData.find((p) => p.id === 't1')).toMatchObject({ role: 'admin', role_id: acc.id });
  });

  it('assigning a system role stores role_id null', async () => {
    await svc.assign({ userId: 't1', roleId: 'sys-sales', actorId: 'owner' });
    expect(store.profilesData.find((p) => p.id === 't1')).toMatchObject({ role: 'sales', role_id: null });
    expect((await svc.users()).find((u) => u.id === 't1')?.role_id).toBe('sys-sales');
  });

  it('refuses guardians and the guardian role', async () => {
    expect(await codeOf(svc.assign({ userId: 'ghost', roleId: 'sys-sales', actorId: 'owner' }))).toBe('not_staff');
    expect(await codeOf(svc.assign({ userId: 't1', roleId: 'sys-guardian', actorId: 'owner' }))).toBe('not_staff');
    expect(await codeOf(svc.assign({ userId: 't1', roleId: 'sys-student', actorId: 'owner' }))).toBe('not_staff');
  });
});
