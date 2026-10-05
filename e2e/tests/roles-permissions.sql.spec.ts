import { expect, test } from '@playwright/test';
import { as, rolledBack, userId, type Tx } from '../support/rls';
import { USERS } from '../support/users';

// Migrations 220-225 (dynamic roles): backfill, role/role_id consistency, the guard triggers, and
// that a client session (an admin-base user with any role) cannot write roles, role_permissions or
// profiles.role / role_id. The API writes them with the service role.

const code = (tx: Tx, q: () => Promise<unknown>) => tx.savepoint(q).then(() => 'ok', (e: { code?: string }) => e.code);
const clearClaims = (tx: Tx) => tx`select set_config('request.jwt.claims', '', true)`;

/** Runs `q` as the service role (JWT role service_role), then back to the owner with no claims. */
async function asService<T>(tx: Tx, q: () => Promise<T>): Promise<T> {
  await tx`select set_config('request.jwt.claims', ${JSON.stringify({ role: 'service_role' })}, true)`;
  await tx`set local role service_role`;
  const out = await q();
  await tx`reset role`;
  await clearClaims(tx);
  return out;
}

async function role(tx: Tx, key: string): Promise<string> {
  const [r] = await tx<{ id: string }[]>`select id from public.roles where key = ${key} and is_system`;
  if (!r) throw new Error(`system role ${key} missing`);
  return r.id;
}

async function customRole(tx: Tx, base: 'admin' | 'teacher'): Promise<string> {
  const [r] = await tx<{ id: string }[]>`insert into public.roles (key, name_ar, name_en, base_role)
    values (${`rls225_${base}`}, 'دور', 'Role', ${base}) returning id`;
  if (!r) throw new Error('role not written');
  return r.id;
}

const profile = async (tx: Tx, id: string) =>
  (await tx<{ role: string; role_id: string }[]>`select role::text, role_id from public.profiles where id = ${id}`)[0];

test.describe('dynamic roles (migrations 220-225)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('the five system roles are seeded, admin keeps *, and every profile was backfilled consistently', async () => {
    await rolledBack(async (tx) => {
      const keys = await tx<{ key: string }[]>`select key from public.roles where is_system order by key`;
      expect(keys.map((k) => k.key)).toEqual(['admin', 'assistant', 'guardian', 'sales', 'teacher']);
      const [wild] = await tx<{ n: number }[]>`select count(*)::int n from public.role_permissions rp
        join public.roles r on r.id = rp.role_id where r.key = 'admin' and rp.permission = '*'`;
      expect(wild?.n).toBe(1);
      const [bad] = await tx<{ n: number }[]>`select count(*)::int n from public.profiles p
        left join public.roles r on r.id = p.role_id where r.id is null or r.base_role <> p.role`;
      expect(bad?.n).toBe(0);
    });
  });

  test('role and role_id stay consistent in both directions', async () => {
    await rolledBack(async (tx) => {
      const teacher = await userId(tx, USERS.teacher.email);
      const custom = await customRole(tx, 'admin');
      await tx`update public.profiles set role_id = ${custom} where id = ${teacher}`;
      expect(await profile(tx, teacher)).toMatchObject({ role: 'admin', role_id: custom });
      await tx`update public.profiles set role = 'teacher' where id = ${teacher}`;
      expect(await profile(tx, teacher)).toMatchObject({ role: 'teacher', role_id: await role(tx, 'teacher') });
    });
  });

  test('a role_id whose base role disagrees with an explicit role is refused', async () => {
    await rolledBack(async (tx) => {
      const teacher = await userId(tx, USERS.teacher.email);
      const custom = await customRole(tx, 'admin');
      expect(await code(tx, () => tx`update public.profiles set role = 'guardian', role_id = ${custom} where id = ${teacher}`)).toBe('P0001');
    });
  });

  test('the guards: system roles are immutable, * belongs to admin only', async () => {
    await rolledBack(async (tx) => {
      const custom = await customRole(tx, 'admin');
      const admin = await role(tx, 'admin');
      expect(await code(tx, () => tx`delete from public.roles where id = ${admin}`)).toBe('P0001');
      expect(await code(tx, () => tx`update public.roles set is_system = true where id = ${custom}`)).toBe('P0001');
      expect(await code(tx, () => tx`update public.roles set is_system = false where id = ${admin}`)).toBe('P0001');
      expect(await code(tx, () => tx`insert into public.role_permissions (role_id, permission) values (${custom}, '*')`)).toBe('P0001');
      expect(await code(tx, () => tx`insert into public.role_permissions (role_id, permission) values (${custom}, 'leads.view')`)).toBe('ok');
      expect(await code(tx, () => tx`update public.role_permissions set permission = '*' where role_id = ${custom}`)).toBe('P0001');
      expect(await code(tx, () => tx`delete from public.role_permissions where role_id = ${admin} and permission = '*'`)).toBe('P0001');
      expect(await code(tx, () => tx`update public.role_permissions set permission = 'leads.view' where role_id = ${admin} and permission = '*'`)).toBe('P0001');
    });
  });

  test('an admin-base user (any role) cannot write roles, role_permissions or profiles.role / role_id', async () => {
    await rolledBack(async (tx) => {
      const admin = await userId(tx, USERS.admin.email);
      const teacher = await userId(tx, USERS.teacher.email);
      const custom = await customRole(tx, 'admin');
      const adminRole = await role(tx, 'admin');
      const run = (q: () => Promise<unknown>) => code(tx, () => as(tx, admin, q));
      expect(await run(() => tx`insert into public.roles (key, name_ar, name_en, base_role) values ('rls225_x', 'د', 'D', 'admin')`)).toBe('42501');
      expect(await run(() => tx`insert into public.roles (key, name_ar, name_en, base_role, is_system) values ('rls225_y', 'د', 'D', 'admin', true)`)).toBe('42501');
      expect(await run(() => tx`update public.roles set name_en = 'Hacked' where id = ${custom}`)).toBe('42501');
      expect(await run(() => tx`insert into public.role_permissions (role_id, permission) values (${custom}, 'leads.view')`)).toBe('42501');
      expect(await run(() => tx`delete from public.role_permissions where role_id = ${adminRole}`)).toBe('42501');
      expect(await run(() => tx`update public.profiles set role_id = ${adminRole} where id = ${admin}`)).toBe('42501');
      expect(await run(() => tx`update public.profiles set role = 'admin' where id = ${teacher}`)).toBe('42501');
      expect(await code(tx, () => as(tx, admin, () => tx`select public.set_role_permissions(${custom}, '{leads.view}')`))).toBe('42501');
      await clearClaims(tx);
      expect((await profile(tx, admin))?.role_id).toBe(adminRole);
      expect((await profile(tx, teacher))?.role).toBe('teacher');
    });
  });

  test('an admin still edits other profile fields and reads the roles; anon sees nothing', async () => {
    await rolledBack(async (tx) => {
      const admin = await userId(tx, USERS.admin.email);
      const teacher = await userId(tx, USERS.teacher.email);
      const rows = await as(tx, admin, () => tx`update public.profiles set full_name = 'اسم جديد' where id = ${teacher} returning id`);
      expect(rows).toHaveLength(1);
      expect((await as(tx, admin, () => tx`select key from public.roles`)).length).toBeGreaterThanOrEqual(5);
      await tx`reset role`;
      await tx`set local role anon`;
      expect(await code(tx, () => tx`select key from public.roles`)).toBe('42501');
      expect(await code(tx, () => tx`select role_id from public.v_role_user_counts`)).toBe('42501');
      await tx`reset role`;
    });
  });

  test('the service role (the API) can re-role a user, create a role, and set permissions atomically', async () => {
    await rolledBack(async (tx) => {
      const teacher = await userId(tx, USERS.teacher.email);
      const custom = await customRole(tx, 'admin');
      await asService(tx, () => tx`update public.profiles set role_id = ${custom} where id = ${teacher}`);
      expect(await profile(tx, teacher)).toMatchObject({ role: 'admin', role_id: custom });
      await asService(tx, () => tx`select public.set_role_permissions(${custom}, '{leads.view,payments.manage}')`);
      const perms = () => tx<{ permission: string }[]>`select permission from public.role_permissions where role_id = ${custom} order by 1`;
      expect((await perms()).map((p) => p.permission)).toEqual(['leads.view', 'payments.manage']);
      await asService(tx, () => tx`select public.set_role_permissions(${custom}, '{payments.manage,expenses.view}')`);
      expect((await perms()).map((p) => p.permission)).toEqual(['expenses.view', 'payments.manage']);
      const failed = await code(tx, () => asService(tx, () => tx`select public.set_role_permissions(${custom}, '{leads.view,nonsense}')`));
      expect(failed).toBe('23514');
      await clearClaims(tx);
      expect((await perms()).map((p) => p.permission)).toEqual(['expenses.view', 'payments.manage']);
    });
  });
});
