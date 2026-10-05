import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { RoleRow } from './roles.mapper';
import { assertDeletable, assertUpdatable } from './roles.rules';

const row = (over: Partial<RoleRow>): RoleRow => ({
  id: 'r1',
  key: 'clerk',
  name_ar: 'محاسب',
  name_en: 'Clerk',
  base_role: 'admin',
  is_system: false,
  created_at: '',
  updated_at: '',
  ...over,
});
const admin = row({ key: 'admin', is_system: true });
const body = (e: unknown) => (e as ConflictException).getResponse();
const catchIt = (fn: () => void): unknown => {
  try {
    fn();
  } catch (e) {
    return e;
  }
  return null;
};

describe('assertUpdatable', () => {
  it('lets a custom role change names, permissions and (while empty) its base role', () => {
    expect(() => assertUpdatable(row({}), { name_ar: 'x', permissions: ['leads.view'] }, 3)).not.toThrow();
    expect(() => assertUpdatable(row({}), { base_role: 'teacher' }, 0)).not.toThrow();
  });

  it('refuses to re-base a role that has users, with the count', () => {
    const e = catchIt(() => assertUpdatable(row({}), { base_role: 'teacher' }, 4));
    expect(e).toBeInstanceOf(ConflictException);
    expect(body(e)).toMatchObject({ message: 'role_has_users', count: 4 });
  });

  it('a custom role keeps its key', () => {
    expect(body(catchIt(() => assertUpdatable(row({}), { key: 'other' }, 0)))).toMatchObject({ message: 'key_immutable' });
    expect(() => assertUpdatable(row({}), { key: 'clerk' }, 0)).not.toThrow();
  });

  it('system roles keep key and base role', () => {
    const teacher = row({ key: 'teacher', base_role: 'teacher', is_system: true });
    expect(body(catchIt(() => assertUpdatable(teacher, { key: 'x' }, 0)))).toMatchObject({ message: 'system_immutable', field: 'key' });
    expect(body(catchIt(() => assertUpdatable(teacher, { base_role: 'admin' }, 0)))).toMatchObject({ field: 'base_role' });
    expect(() => assertUpdatable(teacher, { key: 'teacher', base_role: 'teacher', name_en: 'T' }, 5)).not.toThrow();
  });

  it('the admin system role always keeps the wildcard', () => {
    expect(body(catchIt(() => assertUpdatable(admin, { permissions: ['leads.view'] }, 1)))).toEqual({ message: 'admin_wildcard' });
    expect(() => assertUpdatable(admin, { permissions: ['*', 'leads.view'] }, 1)).not.toThrow();
    expect(() => assertUpdatable(admin, { name_en: 'Boss' }, 1)).not.toThrow();
  });
});

describe('assertDeletable', () => {
  it('allows an empty custom role', () => {
    expect(() => assertDeletable(row({}), 0)).not.toThrow();
  });

  it('blocks a role with users and reports how many', () => {
    expect(body(catchIt(() => assertDeletable(row({}), 7)))).toEqual({ message: 'role_has_users', count: 7 });
  });

  it('never deletes a system role', () => {
    expect(body(catchIt(() => assertDeletable(admin, 0)))).toEqual({ message: 'system_immutable' });
  });
});
