import { GRANTABLE_PERMISSIONS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { systemRoles } from '../roles/roles.fakes';
import type { RoleRecord } from '../roles/roles.store';
import { adminProblem, assertOutranks, assertRoleAssignable, chooseRole, isAssignable, lockedOutOfUsers, profilePatch, roleChangeBlocked, type UserState } from './users.logic';
import type { StaffProfile } from './store/users.store';

const prof = (id: string, role: StaffProfile['role'], extra: Partial<StaffProfile> = {}): StaffProfile => ({ id, full_name: id, role, role_id: null, disabled_at: null, ...extra });
const custom: RoleRecord = { id: 'c1', key: 'custom-1', name_ar: 'محاسب', name_en: null, base_role: 'admin', is_system: false, permissions: ['payments.read'] };
const readOnly: RoleRecord = { ...custom, id: 'c2', permissions: ['users.read'] };
const state = (profiles: StaffProfile[]): UserState => ({ roles: [...systemRoles(), custom, readOnly], profiles });
const HOLDS_PAYMENTS = ['payments.read'] as const;

describe('escalation (reuses the roles rules)', () => {
  it('refuses editing a user whose permissions exceed the actor, unless the actor holds everything', () => {
    const s = state([prof('boss', 'admin'), prof('acct', 'admin', { role_id: 'c1' })]);
    expect(() => assertOutranks(HOLDS_PAYMENTS, s, prof('boss', 'admin'))).toThrow();
    expect(() => assertOutranks(HOLDS_PAYMENTS, s, prof('acct', 'admin', { role_id: 'c1' }))).not.toThrow();
    expect(() => assertOutranks(GRANTABLE_PERMISSIONS, s, prof('boss', 'admin'))).not.toThrow();
  });
  it('names the missing permission and refuses roles beyond the actor', () => {
    const s = state([]);
    expect(() => assertRoleAssignable(HOLDS_PAYMENTS, s, systemRoles()[1] as RoleRecord)).toThrow(expect.objectContaining({ status: 403 }));
    expect(isAssignable(HOLDS_PAYMENTS, s, custom)).toBe(true);
    expect(isAssignable(HOLDS_PAYMENTS, s, readOnly)).toBe(false);
  });
  it('lets anybody hold the student and guardian roles (no permissions)', () => {
    const s = state([]);
    expect(isAssignable([], s, systemRoles().find((r) => r.key === 'student') as RoleRecord)).toBe(true);
  });
});

describe('adminProblem', () => {
  const admin = prof('a1', 'admin');
  it('is fine while another active system admin remains', () => {
    expect(adminProblem(state([admin, prof('a2', 'admin')]))).toBeNull();
  });
  it('is last_admin when the only active system admin is disabled or gone', () => {
    expect(adminProblem(state([{ ...admin, disabled_at: 'now' }, prof('t1', 'teacher')]))).toBe('last_admin');
    expect(adminProblem(state([prof('t1', 'teacher')]))).toBe('last_admin');
  });
  it('does not count a custom admin-base role as the system admin', () => {
    expect(adminProblem(state([prof('c', 'admin', { role_id: 'c1' })]))).toBe('last_admin');
  });
  it('flags losing the last active roles.manage holder', () => {
    const s = state([admin]);
    expect(adminProblem({ ...s, profiles: [{ ...admin, role_id: 'c2' }, prof('a2', 'admin', { disabled_at: 'now' })] })).toBe('last_admin');
  });
});

describe('lockedOutOfUsers / roleChangeBlocked / profilePatch', () => {
  it('detects an actor who would lose users.write', () => {
    expect(lockedOutOfUsers(state([prof('me', 'admin', { role_id: 'c1' })]), 'me')).toBe(true);
    expect(lockedOutOfUsers(state([prof('me', 'admin')]), 'me')).toBe(false);
  });
  it('blocks a base role change that involves a teacher / student / guardian record', () => {
    expect(roleChangeBlocked({ from: 'admin', to: 'sales', linked: false })).toBe(false);
    expect(roleChangeBlocked({ from: 'sales', to: 'admin', linked: true })).toBe(true);
    expect(roleChangeBlocked({ from: 'admin', to: 'teacher', linked: false })).toBe(true);
    expect(roleChangeBlocked({ from: 'teacher', to: 'teacher', linked: true })).toBe(false);
  });
  it('keeps only what was sent', () => {
    expect(profilePatch({ full_name: 'علي', phone_e164: null })).toEqual({ full_name: 'علي', phone_e164: null });
    expect(profilePatch({})).toEqual({});
  });
});

describe('chooseRole', () => {
  const roles = [...systemRoles(), custom];
  it('maps a bare base role to its system role (role_id null)', () => {
    expect(chooseRole(roles, { role: 'teacher' })).toMatchObject({ choice: { role: 'teacher', role_id: null } });
  });
  it('maps a custom role to its base role and id', () => {
    expect(chooseRole(roles, { role_id: 'c1' })).toMatchObject({ choice: { role: 'admin', role_id: 'c1' } });
    expect(chooseRole(roles, { role_id: 'sys-sales' })).toMatchObject({ choice: { role: 'sales', role_id: null } });
  });
  it('refuses unknown roles and a mismatched base role', () => {
    expect(chooseRole(roles, { role_id: 'nope' })).toBe('unknown_role');
    expect(chooseRole(roles, { role: 'teacher', role_id: 'c1' })).toBe('role_mismatch');
    expect(chooseRole(roles, {})).toBeNull();
  });
});
