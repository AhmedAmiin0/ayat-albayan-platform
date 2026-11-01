import { describe, expect, it } from 'vitest';
import { systemRoles } from '@/modules/people/roles/roles.fakes';
import { chooseRole, profilePatch, sentOnly } from './users.logic';

describe('chooseRole: what the request names', () => {
  const roles = systemRoles();
  it('reads an empty or null role_id as not given, so the base role decides', () => {
    expect(chooseRole(roles, { role: 'sales', role_id: '' })).toMatchObject({ choice: { role: 'sales', role_id: null } });
    expect(chooseRole(roles, { role: 'sales', role_id: null })).toMatchObject({ choice: { role: 'sales', role_id: null } });
  });
  it('names nothing with neither, or with both left undefined', () => {
    expect(chooseRole(roles, { role: undefined, role_id: undefined })).toBeNull();
    expect(chooseRole(roles, { role_id: null })).toBeNull();
  });
  it('accepts a system role id beside its own base role', () => {
    expect(chooseRole(roles, { role: 'sales', role_id: 'sys-sales' })).toMatchObject({ choice: { role: 'sales', role_id: null } });
  });
  it('is unknown_role for a base role without a system role', () => {
    expect(chooseRole([], { role: 'teacher' })).toBe('unknown_role');
  });
});

describe('sentOnly / profilePatch', () => {
  it('keeps the listed keys that were sent, null included, and drops the rest', () => {
    const input = { a: 1, b: undefined, c: null, d: 'x' };
    expect(sentOnly(input, ['a', 'b', 'c'])).toEqual({ a: 1, c: null });
  });
  it('never copies a field that is not a profile column', () => {
    const input = { full_name: 'علي', tz: undefined, locale: 'ar', role: 'admin', email: 'a@b.c' };
    expect(profilePatch(input)).toEqual({ full_name: 'علي', locale: 'ar' });
    expect(Object.keys(profilePatch({ tz: 'Asia/Riyadh', phone_e164: undefined }))).toEqual(['tz']);
  });
});
