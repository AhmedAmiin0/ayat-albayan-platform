import { expect, test } from '@playwright/test';
import { as, rolledBack, userId, type Tx } from '../../support/core/rls';
import { USERS } from '../../support/core/users';

// Migrations 220 + 225 (dynamic roles): a client session (an admin-base user, whatever role it
// holds) cannot write roles, role_permissions or profiles.role / role_id; the API (service role)
// can, and sets a role's permissions in one transaction.

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
    values (${`rls225-${base}`}, 'دور', 'Role', ${base}) returning id`;
  if (!r) throw new Error('role not written');
  return r.id;
}

const profile = async (tx: Tx, id: string) =>
  (await tx<{ role: string; role_id: string | null }[]>`select role::text, role_id from public.profiles where id = ${id}`)[0];

test.describe('dynamic roles (migrations 220, 225)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('the six system roles are seeded and every profile resolves to a role of its base role', async () => {
    await rolledBack(async (tx) => {
      const keys = await tx<{ key: string }[]>`select key from public.roles where is_system order by key`;
      expect(keys.map((k) => k.key)).toEqual(['admin', 'assistant', 'guardian', 'sales', 'student', 'teacher']);
      const [bad] = await tx<{ n: number }[]>`select count(*)::int n from public.profiles p
        left join public.roles r on r.id = coalesce(p.role_id, (select id from public.roles s where s.is_system and s.base_role = p.role))
        where r.id is null or r.base_role <> p.role`;
      expect(bad?.n).toBe(0);
    });
  });

  test('a role_id whose base role disagrees with profiles.role is refused (composite FK)', async () => {
    await rolledBack(async (tx) => {
      const teacher = await userId(tx, USERS.teacher.email);
      const custom = await customRole(tx, 'admin');
      expect(await code(tx, () => tx`update public.profiles set role_id = ${custom} where id = ${teacher}`)).toBe('23503');
    });
  });

  test('a permission key must look like resource.action: the wildcard cannot be stored', async () => {
    await rolledBack(async (tx) => {
      const custom = await customRole(tx, 'admin');
      expect(await code(tx, () => tx`insert into public.role_permissions (role_id, permission) values (${custom}, '*')`)).toBe('23514');
    });
  });

  test('an admin-base user (any role) cannot write roles, role_permissions or profiles.role / role_id', async () => {
    await rolledBack(async (tx) => {
      const admin = await userId(tx, USERS.admin.email);
      const teacher = await userId(tx, USERS.teacher.email);
      const custom = await customRole(tx, 'admin');
      const adminRole = await role(tx, 'admin');
      const run = (q: () => Promise<unknown>) => code(tx, () => as(tx, admin, q));
      expect(await run(() => tx`insert into public.roles (key, name_ar, name_en, base_role) values ('rls225-x', 'د', 'D', 'admin')`)).toBe('42501');
      expect(await run(() => tx`update public.roles set name_en = 'Hacked' where id = ${custom}`)).toBe('42501');
      expect(await run(() => tx`insert into public.role_permissions (role_id, permission) values (${custom}, 'leads.read')`)).toBe('42501');
      expect(await run(() => tx`insert into public.role_permissions (role_id, permission) values (${custom}, '*')`)).toBe('42501');
      expect(await run(() => tx`delete from public.role_permissions where role_id = ${adminRole}`)).toBe('42501');
      expect(await run(() => tx`update public.profiles set role_id = ${adminRole} where id = ${admin}`)).toBe('42501');
      expect(await run(() => tx`update public.profiles set role = 'admin' where id = ${teacher}`)).toBe('42501');
      expect(await code(tx, () => as(tx, admin, () => tx`select public.set_role_permissions(${custom}, '{leads.read}')`))).toBe('42501');
      await clearClaims(tx);
      expect((await profile(tx, teacher))?.role).toBe('teacher');
    });
  });

  test('a client cannot delete a profile or insert one back with the admin role (no PostgREST route round the guard)', async () => {
    await rolledBack(async (tx) => {
      const admin = await userId(tx, USERS.admin.email);
      const teacher = await userId(tx, USERS.teacher.email);
      const adminRole = await role(tx, 'admin');
      const run = (q: () => Promise<unknown>) => code(tx, () => as(tx, admin, q));
      expect(await run(() => tx`delete from public.profiles where id = ${teacher}`)).toBe('42501');
      expect(await run(() => tx`insert into public.profiles (id, role, role_id, full_name) values (${teacher}, 'admin', ${adminRole}, 'x')`)).toBe('42501');
      expect(await run(() => tx`insert into public.profiles (id, role, full_name) values (gen_random_uuid(), 'teacher', 'x')`)).toBe('42501');
      await clearClaims(tx);
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
      await tx`reset role`;
    });
  });

  test('the service role (the API) can re-role a user and set permissions atomically', async () => {
    await rolledBack(async (tx) => {
      const teacher = await userId(tx, USERS.teacher.email);
      const custom = await customRole(tx, 'teacher');
      await asService(tx, () => tx`update public.profiles set role_id = ${custom} where id = ${teacher}`);
      expect(await profile(tx, teacher)).toMatchObject({ role: 'teacher', role_id: custom });
      await asService(tx, () => tx`select public.set_role_permissions(${custom}, '{leads.read,payments.read}')`);
      const perms = () => tx<{ permission: string }[]>`select permission from public.role_permissions where role_id = ${custom} order by 1`;
      expect((await perms()).map((p) => p.permission)).toEqual(['leads.read', 'payments.read']);
      await asService(tx, () => tx`select public.set_role_permissions(${custom}, '{payments.read,expenses.read}')`);
      expect((await perms()).map((p) => p.permission)).toEqual(['expenses.read', 'payments.read']);
      const failed = await code(tx, () => asService(tx, () => tx`select public.set_role_permissions(${custom}, '{leads.read,nonsense}')`));
      expect(failed).toBe('23514');
      await clearClaims(tx);
      expect((await perms()).map((p) => p.permission)).toEqual(['expenses.read', 'payments.read']);
    });
  });
});
