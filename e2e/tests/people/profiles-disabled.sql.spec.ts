import { expect, test } from '@playwright/test';
import { as, rolledBack, userId, type Tx } from '../../support/core/rls';
import { USERS } from '../../support/core/users';

// Migrations 286 + 287 (review of the users-control PR): a client session cannot write
// profiles.disabled_*, a disabled admin is an admin no more for RLS, the service role (the API) can
// disable / enable, and the academy always keeps an active system admin.

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

const disabledAt = async (tx: Tx, id: string) =>
  (await tx<{ d: string | null }[]>`select disabled_at::text d from public.profiles where id = ${id}`)[0]?.d ?? null;

test.describe('disabled logins (migrations 286, 287)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('an admin-base client cannot set or clear disabled_* on anyone, itself included', async () => {
    await rolledBack(async (tx) => {
      const admin = await userId(tx, USERS.admin.email);
      const teacher = await userId(tx, USERS.teacher.email);
      const run = (q: () => Promise<unknown>) => code(tx, () => as(tx, admin, q));
      expect(await run(() => tx`update public.profiles set disabled_at = now() where id = ${teacher}`)).toBe('42501');
      expect(await run(() => tx`update public.profiles set disabled_reason = 'x' where id = ${teacher}`)).toBe('42501');
      expect(await run(() => tx`update public.profiles set disabled_by = ${admin} where id = ${teacher}`)).toBe('42501');
      expect(await run(() => tx`update public.profiles set disabled_at = now() where id = ${admin}`)).toBe('42501');
      await clearClaims(tx);
      await tx`update public.profiles set disabled_at = now(), disabled_reason = 'اختبار' where id = ${teacher}`;
      expect(await run(() => tx`update public.profiles set disabled_at = null, disabled_reason = null where id = ${teacher}`)).toBe('42501');
      await clearClaims(tx);
      expect(await disabledAt(tx, teacher)).not.toBeNull();
      expect(await disabledAt(tx, admin)).toBeNull();
    });
  });

  test('a disabled admin is refused by RLS at once: no other profile is readable or writable', async () => {
    await rolledBack(async (tx) => {
      const admin = await userId(tx, USERS.admin.email);
      const teacher = await userId(tx, USERS.teacher.email);
      const active = await as(tx, admin, () => tx<{ n: number }[]>`select count(*)::int n from public.profiles`);
      await clearClaims(tx);
      expect(active[0]?.n).toBeGreaterThan(1);
      await tx`update public.profiles set disabled_at = now() where id = ${admin}`;
      const rows = await as(tx, admin, () => tx<{ id: string; admin: boolean }[]>`select id, public.is_admin() as admin from public.profiles`);
      expect(rows.map((r) => ({ id: r.id, admin: r.admin }))).toEqual([{ id: admin, admin: false }]);
      const edited = await as(tx, admin, () => tx`update public.profiles set full_name = 'محاولة' where id = ${teacher} returning id`);
      expect(edited).toHaveLength(0);
      await clearClaims(tx);
    });
  });

  test('the service role disables and enables a login (all three columns)', async () => {
    await rolledBack(async (tx) => {
      const admin = await userId(tx, USERS.admin.email);
      const teacher = await userId(tx, USERS.teacher.email);
      await asService(tx, () => tx`update public.profiles set disabled_at = now(), disabled_by = ${admin}, disabled_reason = 'سبب' where id = ${teacher}`);
      const [on] = await tx<{ who: string; why: string }[]>`select disabled_by as who, disabled_reason as why from public.profiles where id = ${teacher}`;
      expect({ who: on?.who, why: on?.why }).toEqual({ who: admin, why: 'سبب' });
      await asService(tx, () => tx`update public.profiles set disabled_at = null, disabled_by = null, disabled_reason = null where id = ${teacher}`);
      expect(await disabledAt(tx, teacher)).toBeNull();
    });
  });

  test('the last active system admin cannot be disabled or re-roled; another admin makes it fine', async () => {
    await rolledBack(async (tx) => {
      // The guard is a deferred constraint trigger: fire it at the end of each statement here.
      await tx`set constraints all immediate`;
      const admin = await userId(tx, USERS.admin.email);
      const teacher = await userId(tx, USERS.teacher.email);
      await tx`update public.profiles set disabled_at = now() where role = 'admin' and role_id is null and id <> ${admin}`;
      const disable = () => asService(tx, () => tx`update public.profiles set disabled_at = now() where id = ${admin}`);
      expect(await code(tx, disable)).toBe('P0001');
      expect(await code(tx, () => asService(tx, () => tx`update public.profiles set role = 'sales' where id = ${admin}`))).toBe('P0001');
      expect(await disabledAt(tx, admin)).toBeNull();
      await tx`update public.profiles set role = 'admin' where id = ${teacher}`;
      expect(await code(tx, disable)).toBe('ok');
      expect(await disabledAt(tx, admin)).not.toBeNull();
      expect(await code(tx, () => asService(tx, () => tx`update public.profiles set disabled_at = now() where id = ${teacher}`))).toBe('P0001');
    });
  });
});
