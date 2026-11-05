import { systemPermissionsOf, USER_ROLES } from '@ab/shared';
import { beforeAll, describe, expect, it } from 'vitest';
import { walkRoutes, type RouteAccess } from './route-walk.test-util';

// Owner 2026-11-02 «assistant can update user data»: three narrow keys under /people/*, held by the
// system admin and the system sales role, never students.write / guardians.write for sales.
const KEYS = {
  'people.edit': [
    'PeopleEditController.editGuardian',
    'PeopleEditController.editStudent',
    'PeopleEditController.removePhone',
    'PeopleEditController.view',
  ],
  'students.attach_guardian': ['PeopleRoleController.move', 'PeopleRoleController.search'],
  'people.switch_role': [
    'PeopleRoleController.contactSelf',
    'PeopleRoleController.toGuardian',
    'PeopleRoleController.toStudent',
  ],
} as const;

describe('«تعديل البيانات» routes', () => {
  let routes: RouteAccess[];
  beforeAll(async () => {
    routes = await walkRoutes();
  }, 60_000);

  it.each(Object.entries(KEYS))(
    '%s gates exactly its /people routes, held by admin and sales only',
    (key, handlers) => {
      expect(
        routes
          .filter((r) => r.permission === key)
          .map((r) => r.key)
          .sort(),
      ).toEqual([...handlers].sort());
      expect(USER_ROLES.filter((who) => systemPermissionsOf(who).some((p) => p === key))).toEqual([
        'admin',
        'sales',
      ]);
    },
  );

  it('sales still holds neither students.write nor guardians.write (delete and merge stay the admin’s)', () => {
    expect(systemPermissionsOf('sales')).not.toContain('students.write');
    expect(systemPermissionsOf('sales')).not.toContain('guardians.write');
  });
});
