import { GRANTABLE_PERMISSIONS, type Permission } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import type { RoleRecord } from '../roles/roles.store';
import { errorCode } from '../../common/http/errors';
import { ADMIN_ACTOR, row, setupUsers, type Link } from './users.fakes';
import type { Actor } from './users.rules';

// Review of the users-control PR, M2-M4: users.write alone does not reach students / guardians /
// teachers, only a system admin touches a system admin, and an admin-base role needs an admin actor.

const codeOf = async (p: Promise<unknown>) => errorCode(await p.catch((e: unknown) => e));
const without = (...gone: Permission[]): Permission[] => GRANTABLE_PERMISSIONS.filter((p) => !gone.includes(p));
const manager: RoleRecord = { id: 'c-mgr', key: 'manager', name_ar: 'مدير مساعد', name_en: null, base_role: 'admin', is_system: false, permissions: [...GRANTABLE_PERMISSIONS] };
const people = () => [
  row('admin1', 'admin'), row('mgr1', 'admin', { role_id: 'c-mgr' }), row('sales1', 'sales'), row('sales2', 'sales'),
  row('t1', 'teacher'), row('s1', 'student'), row('g1', 'guardian'),
];
// Fresh per test: linking a record mutates it.
const studentLink = (): Link => ({ kind: 'student', id: 'st1', name: 'سارة', code: 'AB-0183', profile_id: null });
const guardianLink = (): Link => ({ kind: 'guardian', id: 'gu1', name: 'والد سارة', code: null, profile_id: null });
const MANAGER: Actor = { id: 'mgr1', permissions: ADMIN_ACTOR.permissions };
const SALES: Actor = { id: 'sales1', permissions: ADMIN_ACTOR.permissions };

function setup(rows = people(), links: Link[] = []) {
  const kit = setupUsers(rows, links);
  kit.roles.rolesData.push(manager);
  return kit;
}

describe('M2: the record behind a login needs its own write permission', () => {
  const base = { email: 'new@example.com', full_name: 'علي أحمد', credential: 'generate' } as const;

  it('creates a student / guardian login only with students.write / guardians.write', async () => {
    const { creator, auth } = setup(people(), [studentLink(), guardianLink()]);
    const noStudents: Actor = { id: 'admin1', permissions: without('students.write') };
    const noGuardians: Actor = { id: 'admin1', permissions: without('guardians.write') };
    expect(await codeOf(creator.create({ ...base, role: 'student', linked_id: 'st1' }, noStudents))).toBe('permission_not_held');
    expect(await codeOf(creator.create({ ...base, role: 'guardian', linked_id: 'gu1' }, noGuardians))).toBe('permission_not_held');
    expect(auth.users.size).toBe(0);
    expect((await creator.create({ ...base, role: 'student', linked_id: 'st1' }, noGuardians)).user.role).toBe('student');
  });

  it('refuses every action on a student / guardian / teacher login without that permission', async () => {
    const { users, lifecycle, auth } = setup();
    const refusals = (actor: Actor, id: string) => [
      users.update(id, { full_name: 'اسم جديد' }, actor),
      lifecycle.disable(id, {}, actor),
      lifecycle.enable(id, actor),
      lifecycle.resetPassword(id, { credential: 'generate' }, actor),
      lifecycle.signOut(id, actor),
      lifecycle.remove(id, actor),
    ];
    for (const [id, gone] of [['s1', 'students.write'], ['g1', 'guardians.write'], ['t1', 'teachers.write']] as const) {
      const codes = await Promise.all(refusals({ id: 'admin1', permissions: without(gone) }, id).map(codeOf));
      expect(codes).toEqual(Array(6).fill('permission_not_held'));
    }
    expect(auth.calls).toEqual([]);
    expect((await lifecycle.disable('s1', {}, { id: 'admin1', permissions: without('guardians.write') })).status).toBe('disabled');
  });

  it('lists link candidates of a kind only with that table\'s write permission', async () => {
    const { users } = setup(people(), [studentLink()]);
    const actor: Actor = { id: 'admin1', permissions: without('students.write') };
    expect(await codeOf(Promise.resolve().then(() => users.candidates({ kind: 'student' }, actor)))).toBe('permission_not_held');
    expect(await users.candidates({ kind: 'student' }, ADMIN_ACTOR)).toHaveLength(1);
  });
});

describe('M3: only a system admin touches a system admin', () => {
  it('refuses a custom admin role that holds every grant: reset, disable, sign-out, delete, update and role change', async () => {
    const { users, lifecycle, creator, auth } = setup();
    const results = [
      lifecycle.resetPassword('admin1', { credential: 'generate' }, MANAGER),
      lifecycle.disable('admin1', {}, MANAGER),
      lifecycle.signOut('admin1', MANAGER),
      lifecycle.remove('admin1', MANAGER),
      users.update('admin1', { email: 'taken-over@example.com' }, MANAGER),
      users.update('admin1', { role_id: 'c-mgr' }, MANAGER),
      creator.create({ email: 'new@example.com', full_name: 'علي أحمد', role: 'admin', credential: 'generate' }, MANAGER),
    ];
    expect(await Promise.all(results.map(codeOf))).toEqual(Array(7).fill('system_admin_only'));
    expect(auth.calls).toEqual([]);
  });

  it('lets the system admin touch the custom admin, and a system admin edit another', async () => {
    const { lifecycle } = setup([...people(), row('admin2', 'admin')]);
    expect((await lifecycle.disable('mgr1', {}, ADMIN_ACTOR)).status).toBe('disabled');
    expect((await lifecycle.disable('admin2', {}, ADMIN_ACTOR)).status).toBe('disabled');
  });
});

describe('M4: an admin-base role needs an actor whose own base role is admin', () => {
  it('refuses moving a user, the actor included, onto a custom admin role from another base role', async () => {
    const { users } = setup();
    expect(await codeOf(users.update('sales2', { role_id: 'c-mgr' }, SALES))).toBe('admin_role_only');
    expect(await codeOf(users.update('sales1', { role_id: 'c-mgr' }, SALES))).toBe('admin_role_only');
  });

  it('lets an admin-base actor do it, and marks the option unassignable for the others', async () => {
    const { users, store } = setup();
    const out = await users.update('sales2', { role_id: 'c-mgr' }, MANAGER);
    expect(out).toMatchObject({ role: 'admin', role_id: 'c-mgr' });
    expect(store.rows.find((r) => r.id === 'sales2')?.role).toBe('admin');
    const flag = async (actor: Actor) => (await users.roleOptions(actor)).find((o) => o.id === 'c-mgr')?.assignable;
    expect(await flag(MANAGER)).toBe(true);
    expect(await flag(SALES)).toBe(false);
    const systemAdmin = async (actor: Actor) => (await users.roleOptions(actor)).find((o) => o.id === 'sys-admin')?.assignable;
    expect(await systemAdmin(MANAGER)).toBe(false);
    expect(await systemAdmin(ADMIN_ACTOR)).toBe(true);
  });
});
