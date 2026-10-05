import { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { PermissionCache } from '../../common/auth/permission.cache';
import { errorCode } from '../scheduling/errors';
import { managerProblem } from './roles.logic';
import { FakeRoleStore, profile, systemRoles } from './roles.fakes';
import { RolesService } from './roles.service';

async function codeOf(p: Promise<unknown>): Promise<string | undefined> {
  return p.then(
    () => undefined,
    (e: unknown) => (e instanceof HttpException ? errorCode(e) : 'not-http'),
  );
}

describe('managerProblem', () => {
  const roles = systemRoles();
  it('is fine while the actor holds roles.manage', () => {
    expect(managerProblem({ roles, profiles: [profile('a', 'admin')] }, 'a')).toBeNull();
  });
  it('flags nobody left and the actor locked out', () => {
    expect(managerProblem({ roles, profiles: [profile('a', 'teacher')] }, 'a')).toBe('last_admin');
    expect(managerProblem({ roles, profiles: [profile('a', 'teacher'), profile('b', 'admin')] }, 'a')).toBe('self_lockout');
  });
});

describe('RolesService — last admin and self lock-out', () => {
  let store: FakeRoleStore;
  let svc: RolesService;
  beforeEach(() => {
    store = new FakeRoleStore(undefined, [profile('owner', 'admin'), profile('t1', 'teacher')]);
    svc = new RolesService(store, new PermissionCache());
  });

  it('the only admin cannot move themself to another role', async () => {
    expect(await codeOf(svc.assign({ userId: 'owner', roleId: 'sys-teacher', actorId: 'owner' }))).toBe('last_admin');
    expect(store.profilesData.find((p) => p.id === 'owner')?.role).toBe('admin');
  });

  it('an admin cannot take roles.manage from themself while another admin exists', async () => {
    store.profilesData.push(profile('second', 'admin'));
    expect(await codeOf(svc.assign({ userId: 'owner', roleId: 'sys-teacher', actorId: 'owner' }))).toBe('self_lockout');
    await svc.assign({ userId: 'second', roleId: 'sys-teacher', actorId: 'owner' });
    expect(store.profilesData.find((p) => p.id === 'second')?.role).toBe('teacher');
  });

  it('a custom manager role cannot drop roles.manage when its holders are the only managers', async () => {
    const boss = await svc.create({ name_ar: 'مشرف', base_role: 'admin', permissions: ['roles.manage', 'students.read'] }, 'owner');
    await svc.assign({ userId: 't1', roleId: boss.id, actorId: 'owner' });
    await svc.assign({ userId: 'owner', roleId: boss.id, actorId: 't1' });
    expect(await codeOf(svc.update(boss.id, { permissions: ['students.read'], actorId: 'owner' }))).toBe('last_admin');
    expect(store.rolesData.find((r) => r.id === boss.id)?.permissions).toContain('roles.manage');
  });

  it('the system admin role always keeps every permission, so its holders stay managers', async () => {
    const acc = await svc.create({ name_ar: 'محاسب', base_role: 'admin', permissions: ['payments.read'] }, 'owner');
    expect(await codeOf(svc.assign({ userId: 'owner', roleId: acc.id, actorId: 'owner' }))).toBe('last_admin');
  });
});
