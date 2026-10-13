import { defaultGrantsOf, effectivePermissions } from '@ab/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { profile, rolesHarness } from './roles.fakes';

// Owner 2026-10-12: the admin switches grants off (or on) for the built-in teacher / sales /
// assistant roles through PATCH /roles/:id; every grant change is audited.

describe('RolesService — editing a system role’s grants', () => {
  let h: ReturnType<typeof rolesHarness>;
  beforeEach(() => {
    h = rolesHarness([profile('owner', 'admin'), profile('s1', 'sales')]);
  });

  it('switches subscriptions.set_start_date off for the system sales role', async () => {
    const without = defaultGrantsOf('sales').filter((p) => p !== 'subscriptions.set_start_date');
    const out = await h.svc.update('sys-sales', { permissions: without, actorId: 'owner' });
    expect(out.permissions).not.toContain('subscriptions.set_start_date');
    expect(out.permissions).toContain('students.check_registration');
    const stored = h.store.rolesData.find((r) => r.id === 'sys-sales')?.permissions ?? [];
    expect(effectivePermissions({ baseRole: 'sales', granted: stored, allGrantable: false })).not.toContain('subscriptions.set_start_date');
  });

  it('never stores a self.* key sent in a PATCH', async () => {
    const out = await h.svc.update('sys-sales', { permissions: ['self.sales', 'notifications.push'], actorId: 'owner' });
    expect(out.permissions).toEqual(['notifications.push']);
    expect(h.store.rolesData.find((r) => r.id === 'sys-sales')?.permissions).toEqual(['notifications.push']);
  });

  it('writes a permissions_update audit row with before/after and clears the cache', async () => {
    const clear = vi.spyOn(h.cache, 'clear');
    await h.svc.update('sys-teacher', { permissions: ['reports.read'], actorId: 'owner' });
    expect(clear).toHaveBeenCalled();
    expect(h.audit.rows).toEqual([
      {
        actorId: 'owner',
        entity: 'roles',
        entityId: 'sys-teacher',
        action: 'permissions_update',
        before: { permissions: defaultGrantsOf('teacher') },
        after: { permissions: ['reports.read'] },
      },
    ]);
  });

  it('does not audit a rename without permissions', async () => {
    await h.svc.update('sys-teacher', { name_ar: 'معلم', actorId: 'owner' });
    expect(h.audit.rows).toEqual([]);
  });

  it('does not audit a refused change (admin role fixed)', async () => {
    await expect(h.svc.update('sys-admin', { permissions: [], actorId: 'owner' })).rejects.toThrow();
    expect(h.audit.rows).toEqual([]);
  });

  it.each(['sys-guardian', 'sys-student'])('%s: permissions are fixed (400 portal_role_fixed), a rename still works', async (id) => {
    const before = h.store.rolesData.find((r) => r.id === id)?.permissions;
    await expect(h.svc.update(id, { permissions: [], actorId: 'owner' })).rejects.toMatchObject({ response: { code: 'portal_role_fixed' } });
    expect(h.store.rolesData.find((r) => r.id === id)?.permissions).toEqual(before);
    const out = await h.svc.update(id, { name_ar: 'الأسرة', actorId: 'owner' });
    expect(out.name_ar).toBe('الأسرة');
    expect(h.audit.rows).toEqual([]);
  });
});
