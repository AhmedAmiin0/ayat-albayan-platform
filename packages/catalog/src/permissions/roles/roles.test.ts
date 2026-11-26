import { describe, expect, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';
import { isPermission, PERMISSIONS, permissionSchema, type Permission } from '../catalog';
import { HOME_BY_ROLE, isUserRole, USER_ROLES, userRoleSchema, type UserRole } from './roles';

describe('roles', () => {
  it('accepts every known role', () => {
    for (const role of USER_ROLES) expect(isUserRole(role)).toBe(true);
  });

  it.each(['superuser', '', null, undefined, 1])('rejects %s', (value) => {
    expect(isUserRole(value)).toBe(false);
  });

  it('has a home route for every role', () => {
    expect(Object.keys(HOME_BY_ROLE).sort()).toEqual([...USER_ROLES].sort());
  });
});

describe('userRoleSchema and permissionSchema', () => {
  it('accept every member and refuse an unknown string and null', () => {
    expect(userRoleSchema.options).toEqual([...USER_ROLES]);
    expect(permissionSchema.options).toEqual([...PERMISSIONS]);
    expect(PERMISSIONS.every(isPermission)).toBe(true);
    expect([isPermission('users.fly'), isPermission(null), isUserRole(null)]).toEqual([
      false,
      false,
      false,
    ]);
  });

  it('infer the catalog types', () => {
    expectTypeOf<z.infer<typeof permissionSchema>>().toEqualTypeOf<Permission>();
    expectTypeOf<z.infer<typeof userRoleSchema>>().toEqualTypeOf<UserRole>();
  });
});
