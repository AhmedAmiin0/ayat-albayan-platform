import { describe, expect, it } from 'vitest';
import { errorCode } from '@/common/http/errors';
import { systemRoles } from './roles.fakes';
import { RoleGrants } from './roles.grants';
import type { RoleState } from './roles.logic';
import type { RoleRecord } from './roles.store';

const custom: RoleRecord = {
  id: 'c-mgr',
  key: 'custom_mgr',
  name_ar: 'مدير',
  name_en: null,
  base_role: 'sales',
  is_system: false,
  permissions: ['users.write'],
};

const state = (): RoleState => ({
  roles: [...systemRoles(), custom],
  profiles: [
    { id: 'admin1', full_name: 'المدير', role: 'admin', role_id: null },
    { id: 'sales1', full_name: 'المبيعات', role: 'sales', role_id: null },
  ],
});

const codeOf = (run: () => unknown): string | undefined => {
  try {
    run();
    return undefined;
  } catch (e: unknown) {
    return errorCode(e);
  }
};

const role = (id: string): RoleRecord => RoleGrants.find(state(), id);

describe('RoleGrants', () => {
  it('find returns the role or 404 role_not_found', () => {
    expect(role('c-mgr').key).toBe('custom_mgr');
    expect(codeOf(() => role('nope'))).toBe('role_not_found');
  });

  it('assertEditable refuses the admin and portal roles only', () => {
    expect(codeOf(() => RoleGrants.assertEditable(role('sys-admin')))).toBe('admin_role_fixed');
    expect(codeOf(() => RoleGrants.assertEditable(role('sys-guardian')))).toBe('portal_role_fixed');
    expect(codeOf(() => RoleGrants.assertEditable(role('sys-student')))).toBe('portal_role_fixed');
    expect(codeOf(() => RoleGrants.assertEditable(role('sys-sales')))).toBeUndefined();
  });

  it('assertRemovable refuses a system role and a role still held', () => {
    expect(codeOf(() => RoleGrants.assertRemovable(state(), role('sys-sales')))).toBe(
      'system_role',
    );
    expect(codeOf(() => RoleGrants.assertRemovable(state(), custom))).toBeUndefined();
    const held = {
      ...state(),
      profiles: [
        ...state().profiles,
        { id: 'x', full_name: 'س', role: 'sales' as const, role_id: 'c-mgr' },
      ],
    };
    expect(codeOf(() => RoleGrants.assertRemovable(held, custom))).toBe('role_in_use');
  });

  it('assertHolds names the first grant the actor lacks', () => {
    expect(codeOf(() => RoleGrants.assertHolds(state(), 'sales1', ['roles.manage']))).toBe(
      'permission_not_held',
    );
    expect(
      codeOf(() => RoleGrants.assertHolds(state(), 'admin1', ['roles.manage'])),
    ).toBeUndefined();
  });

  it('regranted returns the next state, or 403 when the actor holds less than the role', () => {
    const base = { state: state(), actorId: 'admin1', action: 'permissions_update' as const };
    const next = RoleGrants.regranted({ ...base, role: custom, permissions: [] });
    expect(next.roles.find((r) => r.id === 'c-mgr')?.permissions).toEqual([]);
    const limited = () =>
      RoleGrants.regranted({ ...base, actorId: 'sales1', role: custom, permissions: [] });
    expect(codeOf(limited)).toBe('permission_not_held');
  });

  it('assigned moves a staff profile; family roles and unknown profiles are not_staff', () => {
    const input = { state: state(), role: custom, profileId: 'sales1', actorId: 'admin1' };
    const { change, moved, next } = RoleGrants.assigned(input);
    expect(change).toEqual({ role: 'sales', role_id: 'c-mgr' });
    expect(moved.role_id).toBe('c-mgr');
    expect(next.profiles.find((p) => p.id === 'sales1')?.role_id).toBe('c-mgr');
    const family = () => RoleGrants.assigned({ ...input, role: role('sys-guardian') });
    expect(codeOf(family)).toBe('not_staff');
    expect(codeOf(() => RoleGrants.assigned({ ...input, profileId: 'ghost' }))).toBe('not_staff');
  });

  it('assigned refuses an actor that does not outrank the target', () => {
    const input = {
      state: state(),
      role: role('sys-sales'),
      profileId: 'admin1',
      actorId: 'sales1',
    };
    expect(codeOf(() => RoleGrants.assigned(input))).toBe('permission_not_held');
  });

  it('not_staff wins over permission_not_held in assigned', () => {
    const input = {
      state: state(),
      role: role('sys-guardian'),
      profileId: 'admin1',
      actorId: 'sales1',
    };
    expect(codeOf(() => RoleGrants.assigned(input))).toBe('not_staff');
  });
});
