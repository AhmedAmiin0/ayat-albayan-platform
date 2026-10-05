import { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { PermissionCache } from '../../common/auth/permission.cache';
import { errorCode } from '../scheduling/errors';
import { FakeRoleStore, profile } from './roles.fakes';
import { RolesService } from './roles.service';

// A manager with a limited role must not be able to reach permissions it does not hold, through a
// new role, an edited role, or by assigning a bigger role (to itself or anyone).

const codeOf = (p: Promise<unknown>) =>
  p.then(
    () => undefined,
    (e: unknown) => (e instanceof HttpException ? { status: e.getStatus(), code: errorCode(e) } : 'not-http'),
  );

describe('RolesService — no escalation past the actor’s own permissions', () => {
  let store: FakeRoleStore;
  let svc: RolesService;
  let limited: string;
  beforeEach(async () => {
    store = new FakeRoleStore(undefined, [profile('owner', 'admin'), profile('lim', 'teacher'), profile('t2', 'teacher')]);
    svc = new RolesService(store, new PermissionCache());
    const role = await svc.create({ name_ar: 'مشرف', base_role: 'admin', permissions: ['roles.manage', 'payments.read'] }, 'owner');
    limited = role.id;
    await svc.assign({ userId: 'lim', roleId: limited, actorId: 'owner' });
  });

  it('refuses a new role with a permission the actor lacks (403 permission_not_held)', async () => {
    const out = await codeOf(svc.create({ name_ar: 'ص', base_role: 'admin', permissions: ['payments.read', 'payments.write'] }, 'lim'));
    expect(out).toEqual({ status: 403, code: 'permission_not_held' });
  });

  it('allows a new role within the actor’s permissions', async () => {
    const out = await svc.create({ name_ar: 'ص', base_role: 'admin', permissions: ['payments.read'] }, 'lim');
    expect(out.permissions).toEqual(['payments.read']);
  });

  it('refuses adding a permission to a role, but not keeping or removing one', async () => {
    const acc = await svc.create({ name_ar: 'ص', base_role: 'admin', permissions: ['payments.read'] }, 'owner');
    expect(await codeOf(svc.update(acc.id, { permissions: ['payments.read', 'payouts.write'], actorId: 'lim' }))).toEqual({
      status: 403,
      code: 'permission_not_held',
    });
    expect((await svc.update(acc.id, { permissions: [], actorId: 'lim' })).permissions).toEqual([]);
  });

  it('refuses the actor widening its own role', async () => {
    const out = await codeOf(svc.update(limited, { permissions: ['roles.manage', 'payments.read', 'settings.write'], actorId: 'lim' }));
    expect(out).toEqual({ status: 403, code: 'permission_not_held' });
  });

  it('refuses assigning the system admin role (to self or another user)', async () => {
    expect(await codeOf(svc.assign({ userId: 'lim', roleId: 'sys-admin', actorId: 'lim' }))).toMatchObject({ code: 'permission_not_held' });
    expect(await codeOf(svc.assign({ userId: 't2', roleId: 'sys-admin', actorId: 'lim' }))).toMatchObject({ code: 'permission_not_held' });
    expect(store.profilesData.find((p) => p.id === 'lim')?.role_id).toBe(limited);
  });

  it('lets the actor assign a role inside its own permissions to a user inside them', async () => {
    const small = await svc.create({ name_ar: 'ص', base_role: 'teacher', permissions: ['payments.read'] }, 'owner');
    await svc.assign({ userId: 't2', roleId: small.id, actorId: 'owner' });
    const out = await svc.assign({ userId: 't2', roleId: limited, actorId: 'lim' });
    expect(out.role_id).toBe(limited);
  });

  it('refuses re-roling a user who holds more than the actor, even to a powerless role', async () => {
    const none = await svc.create({ name_ar: 'ص', base_role: 'admin', permissions: [] }, 'lim');
    expect(await codeOf(svc.assign({ userId: 'owner', roleId: none.id, actorId: 'lim' }))).toEqual({ status: 403, code: 'permission_not_held' });
    expect(await codeOf(svc.assign({ userId: 't2', roleId: none.id, actorId: 'lim' }))).toMatchObject({ code: 'permission_not_held' });
    expect(store.profilesData.find((p) => p.id === 'owner')?.role_id).toBeNull();
  });

  it('passes the outrank check for the actor itself (only the lockout guard stops it)', async () => {
    const none = await svc.create({ name_ar: 'ص', base_role: 'admin', permissions: [] }, 'lim');
    expect(await codeOf(svc.assign({ userId: 'lim', roleId: none.id, actorId: 'lim' }))).toMatchObject({ code: 'self_lockout' });
  });

  it('refuses stripping a role that holds more than the actor, but lets the owner do it', async () => {
    const rich = await svc.create({ name_ar: 'ص', base_role: 'admin', permissions: ['payments.read', 'payouts.write'] }, 'owner');
    expect(await codeOf(svc.update(rich.id, { permissions: ['payments.read'], actorId: 'lim' }))).toEqual({ status: 403, code: 'permission_not_held' });
    expect(await codeOf(svc.update(rich.id, { permissions: [], actorId: 'lim' }))).toMatchObject({ code: 'permission_not_held' });
    expect((await svc.update(rich.id, { permissions: ['payments.read'], actorId: 'owner' })).permissions).toEqual(['payments.read']);
  });

  it('treats an actor without a staff profile as holding nothing', async () => {
    expect(await codeOf(svc.create({ name_ar: 'ص', base_role: 'admin', permissions: ['payments.read'] }, 'ghost'))).toMatchObject({
      code: 'permission_not_held',
    });
  });
});
