import { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { errorCode } from '@/common/http/errors';
import { profile, systemRoles } from './roles.fakes';
import * as grants from './roles.grants';
import type { RoleState } from './roles.logic';
import type { RoleRecord } from './roles.store';

const state = (): RoleState => ({
  roles: systemRoles(),
  profiles: [profile('owner', 'admin'), profile('t1', 'teacher')],
});

const role = (key: string): RoleRecord => {
  const found = systemRoles().find((r) => r.key === key);
  if (!found) throw new Error(`no system role ${key}`);
  return found;
};

function codeOf(run: () => unknown): { status: number; code: string | undefined } | undefined {
  try {
    run();
    return undefined;
  } catch (e) {
    expect(e).toBeInstanceOf(HttpException);
    return { status: (e as HttpException).getStatus(), code: errorCode(e) };
  }
}

describe('RoleGrants', () => {
  it('findRole returns the role, else 404 role_not_found', () => {
    expect(grants.findRole(state(), 'sys-teacher').key).toBe('teacher');
    expect(codeOf(() => grants.findRole(state(), 'nope'))).toEqual({
      status: 404,
      code: 'role_not_found',
    });
  });

  it('assertHolds: the admin holds everything; a teacher is refused 403 permission_not_held', () => {
    const wanted = role('admin').permissions;
    expect(codeOf(() => grants.assertHolds(state(), 'owner', wanted))).toBeUndefined();
    expect(codeOf(() => grants.assertHolds(state(), 't1', wanted))).toEqual({
      status: 403,
      code: 'permission_not_held',
    });
  });

  it('assertManagers: 409 when nobody would keep roles.manage', () => {
    const next = grants.withProfile(state(), profile('owner', 'teacher'));
    expect(codeOf(() => grants.assertManagers(state(), 'owner'))).toBeUndefined();
    expect(codeOf(() => grants.assertManagers(next, 'owner'))?.status).toBe(409);
  });

  it('assertEditable: the admin and the portal roles are fixed (400), the others are not', () => {
    expect(codeOf(() => grants.assertEditable(role('admin')))?.code).toBe('admin_role_fixed');
    expect(codeOf(() => grants.assertEditable(role('guardian')))?.code).toBe('portal_role_fixed');
    expect(codeOf(() => grants.assertEditable(role('student')))?.code).toBe('portal_role_fixed');
    expect(codeOf(() => grants.assertEditable(role('teacher')))).toBeUndefined();
  });

  it('staffTarget: 400 not_staff for an unknown login or a guardian / student role', () => {
    const s = state();
    expect(grants.staffTarget(s, { userId: 't1', role: role('sales') }).id).toBe('t1');
    const unknown = () => grants.staffTarget(s, { userId: 'x', role: role('sales') });
    const portal = () => grants.staffTarget(s, { userId: 't1', role: role('guardian') });
    expect(codeOf(unknown)?.code).toBe('not_staff');
    expect(codeOf(portal)?.code).toBe('not_staff');
    expect(codeOf(() => grants.staffTarget(s, { userId: 't1', role: role('student') }))?.code).toBe(
      'not_staff',
    );
  });

  it('withGrants / withProfile replace one entry and leave the input untouched', () => {
    const s = state();
    const next = grants.withGrants(s, 'sys-teacher', []);
    expect(next.roles.find((r) => r.id === 'sys-teacher')?.permissions).toEqual([]);
    expect(s.roles.find((r) => r.id === 'sys-teacher')?.permissions).toEqual(
      role('teacher').permissions,
    );
    const moved = grants.withProfile(s, profile('t1', 'sales'));
    expect(moved.profiles.map((p) => p.role)).toEqual(['admin', 'sales']);
    expect(s.profiles.map((p) => p.role)).toEqual(['admin', 'teacher']);
  });
});
