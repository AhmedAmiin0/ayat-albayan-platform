import { expect, test } from '@playwright/test';
import { as, rolledBack, userId, type Tx } from '../support/rls';
import { USERS } from '../support/users';

// Migrations 280-285 (users control): the student base role, one login per student, the disabled
// columns, and the service-role-only admin_list_users / user_references / revoke_user_sessions.

const code = (tx: Tx, q: () => Promise<unknown>) => tx.savepoint(q).then(() => 'ok', (e: { code?: string }) => e.code);

async function asService<T>(tx: Tx, q: () => Promise<T>): Promise<T> {
  await tx`select set_config('request.jwt.claims', ${JSON.stringify({ role: 'service_role' })}, true)`;
  await tx`set local role service_role`;
  const out = await q();
  await tx`reset role`;
  await tx`select set_config('request.jwt.claims', '', true)`;
  return out;
}

/** A guardian with one student (no login yet). */
async function student(tx: Tx, phone: string): Promise<{ id: string; code: string }> {
  const [g] = await tx<{ id: string }[]>`insert into public.guardians (name, phone_e164, country, tz)
    values ('ولي أمر', ${phone}, 'SA', 'Asia/Riyadh') returning id`;
  const [s] = await tx<{ id: string; code: string }[]>`insert into public.students (guardian_id, name, name_normalized, tz)
    values (${g?.id}, 'طالب الحساب', 'طالب الحساب', 'Asia/Riyadh') returning id, code`;
  if (!s) throw new Error('student not written');
  return s;
}

test.describe('users control (migrations 280-285)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('the student system role exists, holds no permission, and the enum accepts it', async () => {
    await rolledBack(async (tx) => {
      const [r] = await tx<{ id: string; name_ar: string; base_role: string }[]>`select id, name_ar, base_role::text from public.roles where is_system and key = 'student'`;
      expect(r).toMatchObject({ name_ar: 'طالب', base_role: 'student' });
      const [n] = await tx<{ n: number }[]>`select count(*)::int n from public.role_permissions where role_id = ${r?.id ?? null}`;
      expect(n?.n).toBe(0);
    });
  });

  test('one login per student: a second student cannot take the same profile', async () => {
    await rolledBack(async (tx) => {
      const teacher = await userId(tx, USERS.teacher.email);
      const a = await student(tx, '+966500000401');
      const b = await student(tx, '+966500000402');
      await tx`update public.students set profile_id = ${teacher} where id = ${a.id}`;
      expect(await code(tx, () => tx`update public.students set profile_id = ${teacher} where id = ${b.id}`)).toBe('23505');
    });
  });

  test('admin_list_users is service-role only and finds a student login by its code, with a total', async () => {
    await rolledBack(async (tx) => {
      const admin = await userId(tx, USERS.admin.email);
      const teacher = await userId(tx, USERS.teacher.email);
      const s = await student(tx, '+966500000403');
      await tx`update public.students set profile_id = ${teacher} where id = ${s.id}`;
      expect(await code(tx, () => as(tx, admin, () => tx`select * from public.admin_list_users()`))).toBe('42501');
      const rows = await asService(tx, () => tx<{ linked_kind: string; linked_code: string; total: string }[]>`
        select linked_kind, linked_code, total from public.admin_list_users(${s.code}, null, null, 10, 0)`);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ linked_kind: 'student', linked_code: s.code, total: '1' });
    });
  });

  test('status filter separates disabled from active logins', async () => {
    await rolledBack(async (tx) => {
      const teacher = await userId(tx, USERS.teacher.email);
      await tx`update public.profiles set disabled_at = now(), disabled_reason = 'اختبار' where id = ${teacher}`;
      const ids = (rows: { id: string }[]) => rows.map((r) => r.id);
      const off = await asService(tx, () => tx<{ id: string }[]>`select id from public.admin_list_users(null, null, 'disabled', 100, 0)`);
      const on = await asService(tx, () => tx<{ id: string }[]>`select id from public.admin_list_users(null, null, 'active', 100, 0)`);
      expect(ids(off)).toContain(teacher);
      expect(ids(on)).not.toContain(teacher);
    });
  });

  test('user_references separates link rows from history and is service-role only', async () => {
    await rolledBack(async (tx) => {
      const admin = await userId(tx, USERS.admin.email);
      const teacher = await userId(tx, USERS.teacher.email);
      const s = await student(tx, '+966500000404');
      await tx`update public.students set profile_id = ${teacher}, created_by = ${teacher} where id = ${s.id}`;
      expect(await code(tx, () => as(tx, admin, () => tx`select * from public.user_references(${teacher})`))).toBe('42501');
      const refs = await asService(tx, () => tx<{ ref_table: string; ref_column: string; kind: string }[]>`select ref_table, ref_column, kind from public.user_references(${teacher})`);
      expect(refs).toContainEqual({ ref_table: 'students', ref_column: 'profile_id', kind: 'link' });
      expect(refs).toContainEqual({ ref_table: 'students', ref_column: 'created_by', kind: 'history' });
    });
  });

  test('revoke_user_sessions and auth_user_id_by_email are service-role only', async () => {
    await rolledBack(async (tx) => {
      const admin = await userId(tx, USERS.admin.email);
      expect(await code(tx, () => as(tx, admin, () => tx`select public.revoke_user_sessions(${admin})`))).toBe('42501');
      expect(await code(tx, () => as(tx, admin, () => tx`select public.auth_user_id_by_email('x@y.z')`))).toBe('42501');
      const n = await asService(tx, () => tx<{ n: number }[]>`select public.revoke_user_sessions(gen_random_uuid()) as n`);
      expect(n[0]?.n).toBe(0);
    });
  });
});
