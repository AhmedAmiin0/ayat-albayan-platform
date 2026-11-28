import { describe, expect, it } from 'vitest';
import { permissionGroups } from '../../catalog';
import { roleRoutes } from '../roles.routes';

const ID = '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11';
const role = {
  id: ID,
  key: 'custom-0a1b2c3d',
  name_ar: 'مشرف',
  name_en: null,
  base_role: 'assistant',
  is_system: false,
  permissions: ['students.read'],
  users: 2,
};
const staffUser = { id: ID, full_name: 'سارة', role: 'teacher', role_id: ID };

describe('roleRoutes', () => {
  it('keeps the paths the api serves today', () => {
    const lines = Object.values(roleRoutes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'GET /permissions',
      'GET /roles',
      'GET /roles/staff-users',
      'POST /roles',
      'PATCH /roles/:id',
      'POST /roles/:id/reset',
      'DELETE /roles/:id',
      'PATCH /users/:id/role',
    ]);
  });

  it('answers the matrix sections, the roles and the staff users', () => {
    const groups = permissionGroups();
    expect(roleRoutes.permissions.response.parse(groups)).toEqual(groups);
    expect(roleRoutes.list.response.parse([role])).toEqual([role]);
    expect(roleRoutes.staffUsers.response.parse([staffUser])).toEqual([staffUser]);
  });

  it('answers a staff user whom no role holds with an empty role id', () => {
    const loose = { ...staffUser, role_id: '' };
    expect(roleRoutes.assign.response.parse(loose)).toEqual(loose);
  });

  it('refuses a role with an unknown permission or a negative user count', () => {
    const answer = roleRoutes.update.response;
    expect(answer.safeParse({ ...role, permissions: ['nope'] }).success).toBe(false);
    expect(answer.safeParse({ ...role, users: -1 }).success).toBe(false);
  });

  it('refuses a self.* grant, a blank name and a bad role id in the body', () => {
    const body = { name_ar: 'مشرف', base_role: 'sales', permissions: ['self.teacher'] };
    expect(roleRoutes.create.body.safeParse(body).success).toBe(false);
    expect(roleRoutes.update.body.safeParse({ name_ar: ' ' }).success).toBe(false);
    expect(roleRoutes.assign.body.safeParse({ role_id: 'abc' }).success).toBe(false);
  });

  it('refuses a bad id in the path', () => {
    for (const route of [roleRoutes.update, roleRoutes.reset, roleRoutes.remove]) {
      expect(route.params.safeParse({ id: 'abc' }).success).toBe(false);
    }
    expect(roleRoutes.assign.params.safeParse({ id: ID }).success).toBe(true);
  });
});
