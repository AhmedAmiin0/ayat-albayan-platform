import { defaultGrantsOf } from '@ab/shared';
import { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorCode } from '../../common/http/errors';
import { profile, rolesHarness } from './roles.fakes';
import { resetGrants } from './roles.reset';

// «استعادة الافتراضي» (owner 2026-10-12): POST /roles/:id/reset for the built-in teacher / sales /
// assistant roles only.

const codeOf = (p: Promise<unknown>) =>
  p.then(
    () => undefined,
    (e: unknown) => (e instanceof HttpException ? { status: e.getStatus(), code: errorCode(e) } : 'not-http'),
  );

describe('resetGrants', () => {
  it('gives the seeded grants of an editable system role', () => {
    const sales = { id: 's', key: 'sales', name_ar: 's', name_en: null, base_role: 'sales' as const, is_system: true, permissions: [] };
    expect(resetGrants(sales)).toEqual({ ok: true, permissions: defaultGrantsOf('sales') });
  });

  it('refuses a custom role that borrows a system key', () => {
    const fake = { id: 'c', key: 'sales', name_ar: 'c', name_en: null, base_role: 'sales' as const, is_system: false, permissions: [] };
    expect(resetGrants(fake)).toEqual({ ok: false, code: 'not_system_role' });
  });
});

describe('RolesService.reset', () => {
  let h: ReturnType<typeof rolesHarness>;
  beforeEach(() => {
    h = rolesHarness([profile('owner', 'admin'), profile('s1', 'sales')]);
  });

  it.each(['sales', 'teacher', 'assistant'] as const)('restores the %s role to its default grants', async (key) => {
    await h.svc.update(`sys-${key}`, { permissions: [], actorId: 'owner' });
    expect(h.store.rolesData.find((r) => r.id === `sys-${key}`)?.permissions).toEqual([]);
    const out = await h.svc.reset(`sys-${key}`, 'owner');
    expect(out.permissions).toEqual(defaultGrantsOf(key));
    expect(h.store.rolesData.find((r) => r.id === `sys-${key}`)?.permissions).toEqual(defaultGrantsOf(key));
  });

  it('brings back both new sales keys', async () => {
    await h.svc.update('sys-sales', { permissions: ['notifications.push'], actorId: 'owner' });
    const out = await h.svc.reset('sys-sales', 'owner');
    expect(out.permissions).toEqual(expect.arrayContaining(['students.check_registration', 'subscriptions.set_start_date']));
  });

  it('refuses the system admin (400 admin_role_fixed)', async () => {
    expect(await codeOf(h.svc.reset('sys-admin', 'owner'))).toEqual({ status: 400, code: 'admin_role_fixed' });
  });

  it('refuses a custom role (400 not_system_role) and a guardian system role', async () => {
    const acc = await h.svc.create({ name_ar: 'محاسب', base_role: 'sales', permissions: ['payments.read'] }, 'owner');
    expect(await codeOf(h.svc.reset(acc.id, 'owner'))).toEqual({ status: 400, code: 'not_system_role' });
    expect(await codeOf(h.svc.reset('sys-guardian', 'owner'))).toEqual({ status: 400, code: 'not_system_role' });
  });

  it('404s an unknown role', async () => {
    expect(await codeOf(h.svc.reset('nope', 'owner'))).toMatchObject({ status: 404, code: 'role_not_found' });
  });

  it('refuses an actor that does not hold the defaults (403 permission_not_held)', async () => {
    const lim = await h.svc.create({ name_ar: 'مشرف', base_role: 'admin', permissions: ['roles.manage'] }, 'owner');
    await h.svc.assign({ userId: 's1', roleId: lim.id, actorId: 'owner' });
    expect(await codeOf(h.svc.reset('sys-teacher', 's1'))).toMatchObject({ status: 403, code: 'permission_not_held' });
    expect(h.audit.rows.filter((r) => r.action === 'permissions_reset')).toEqual([]);
  });

  it('writes a permissions_reset audit row and clears the cache', async () => {
    await h.svc.update('sys-sales', { permissions: ['notifications.push'], actorId: 'owner' });
    const clear = vi.spyOn(h.cache, 'clear');
    await h.svc.reset('sys-sales', 'owner');
    expect(clear).toHaveBeenCalled();
    expect(h.audit.rows.at(-1)).toEqual({
      actorId: 'owner',
      entity: 'roles',
      entityId: 'sys-sales',
      action: 'permissions_reset',
      before: { permissions: ['notifications.push'] },
      after: { permissions: defaultGrantsOf('sales') },
    });
  });
});
