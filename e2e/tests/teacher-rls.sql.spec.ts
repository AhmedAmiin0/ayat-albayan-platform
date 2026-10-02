import { expect, test } from '@playwright/test';
import type { TransactionSql } from 'postgres';
import { withSql } from '../support/schedule';
import { USERS } from '../support/users';

// Migration 164 against the real database (rule 9: RLS on every table, defence in depth behind the
// API), in a transaction that is rolled back. With a teacher's JWT, messages shows only the
// families she teaches (assigned, or on her lessons from the last 90 days) and her own chat with
// the academy; teacher_thread_reads shows her rows only; the scope function itself is the API's.

type Tx = TransactionSql;
const ROLLBACK = new Error('rollback');

async function rolledBack(run: (tx: Tx) => Promise<void>): Promise<void> {
  await withSql(async (sql) => {
    await sql
      .begin(async (tx) => {
        await run(tx);
        throw ROLLBACK;
      })
      .catch((e: unknown) => {
        if (e !== ROLLBACK) throw e;
      });
  });
}

/**
 * Runs `query` as `authenticated` with this user's JWT, then back to the owner role. On an error
 * the caller's savepoint rollback undoes both SET LOCALs.
 */
async function as<T>(tx: Tx, userId: string, query: () => Promise<T>): Promise<T> {
  await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: 'authenticated' })}, true)`;
  await tx`set local role authenticated`;
  const result = await query();
  await tx`reset role`;
  return result;
}

const PHONE = {
  assigned: '+966500164001',
  recent: '+966500164002',
  old: '+966500164003',
  other: '+966500164004',
  own: '+966500164005',
};

async function userId(tx: Tx, email: string): Promise<string> {
  const [u] = await tx<{ id: string }[]>`select id from auth.users where email = ${email}`;
  if (!u) throw new Error(`${email} missing (global setup)`);
  return u.id;
}

/** A guardian with one child, taught by `teacherId` (students.teacher_id). */
async function family(tx: Tx, input: { phone: string; teacherId: string }): Promise<string> {
  const [g] = await tx<{ id: string }[]>`insert into public.guardians (name, phone_e164, country, tz)
    values ('ولي أمر RLS', ${input.phone}, 'SA', 'Asia/Riyadh') returning id`;
  if (!g) throw new Error('guardian not written');
  const [s] = await tx<{ id: string }[]>`insert into public.students (guardian_id, name, name_normalized, tz, teacher_id)
    values (${g.id}, 'طالب RLS', 'طالب rls', 'Asia/Riyadh', ${input.teacherId}) returning id`;
  if (!s) throw new Error('student not written');
  return s.id;
}

async function lesson(tx: Tx, input: { teacherId: string; studentId: string; daysAgo: number }): Promise<void> {
  const [l] = await tx<{ id: string }[]>`insert into public.lessons (teacher_id, starts_at, ends_at)
    values (${input.teacherId}, now() - make_interval(days => ${input.daysAgo}),
      now() - make_interval(days => ${input.daysAgo}) + interval '30 minutes') returning id`;
  if (!l) throw new Error('lesson not written');
  await tx`insert into public.lesson_students (lesson_id, student_id) values (${l.id}, ${input.studentId})`;
}

/** «أبرار» (abrar@e2e.local) and a second teacher; one family per case; one inbound row per phone. */
async function seed(tx: Tx) {
  const [abrar] = await tx<{ id: string }[]>`update public.teachers set phone_e164 = ${PHONE.own}
    where profile_id = ${await userId(tx, USERS.teacher.email)} returning id`;
  const [other] = await tx<{ id: string }[]>`insert into public.teachers (display_name_ar, gender, programs, tz)
    values ('معلمة RLS', 'female', '{quran}', 'Asia/Riyadh') returning id`;
  if (!abrar || !other) throw new Error('teachers missing');
  await family(tx, { phone: PHONE.assigned, teacherId: abrar.id });
  await lesson(tx, { teacherId: abrar.id, studentId: await family(tx, { phone: PHONE.recent, teacherId: other.id }), daysAgo: 10 });
  await lesson(tx, { teacherId: abrar.id, studentId: await family(tx, { phone: PHONE.old, teacherId: other.id }), daysAgo: 91 });
  await family(tx, { phone: PHONE.other, teacherId: other.id });
  for (const phone of Object.values(PHONE)) {
    await tx`insert into public.messages (direction, phone_e164, body) values ('inbound', ${phone}, 'السلام عليكم')`;
  }
  await tx`insert into public.teacher_thread_reads (teacher_id, phone_e164, read_at)
    values (${abrar.id}, ${PHONE.assigned}, now()), (${other.id}, ${PHONE.other}, now())`;
  return { abrar: abrar.id, other: other.id };
}

const phonesIn = (rows: readonly { phone_e164: string }[]) =>
  [...new Set(rows.map((r) => r.phone_e164))].filter((p) => p.startsWith('+966500164')).sort();

test.describe('teacher mode RLS (migration 164, rule 9)', () => {
  test('a teacher reads her families, the 90-day window and her own chat; an admin reads all', async () => {
    await rolledBack(async (tx) => {
      const t = await seed(tx);
      const teacher = await userId(tx, USERS.teacher.email);
      const messages = await as(tx, teacher, () => tx<{ phone_e164: string }[]>`select phone_e164 from public.messages`);
      expect(phonesIn(messages)).toEqual([PHONE.assigned, PHONE.recent, PHONE.own].sort());
      const reads = await as(tx, teacher, () => tx<{ teacher_id: string }[]>`select teacher_id from public.teacher_thread_reads`);
      expect(reads).toEqual([{ teacher_id: t.abrar }]);

      const admin = await userId(tx, USERS.admin.email);
      const all = await as(tx, admin, () => tx<{ phone_e164: string }[]>`select phone_e164 from public.messages`);
      expect(phonesIn(all)).toEqual(Object.values(PHONE).sort());
      const allReads = await as(tx, admin, () => tx<{ teacher_id: string }[]>`select teacher_id from public.teacher_thread_reads`);
      expect(allReads).toHaveLength(2);
    });
  });

  test('the scope function and the read marks are the API’s: a signed-in client can’t call or write them', async () => {
    await rolledBack(async (tx) => {
      const t = await seed(tx);
      const teacher = await userId(tx, USERS.teacher.email);
      const refused = async (query: () => Promise<unknown>) =>
        tx
          .savepoint(() => as(tx, teacher, query))
          .then(() => 'allowed')
          .catch((e: { code?: string }) => e.code);
      expect(await refused(() => tx`select * from public.teacher_thread_phones(${t.other})`)).toBe('42501');
      expect(await refused(() => tx`select * from public.teacher_unread(${t.abrar}, ${[PHONE.assigned]})`)).toBe('42501');
      expect(
        await refused(() => tx`insert into public.teacher_thread_reads (teacher_id, phone_e164, read_at)
          values (${t.abrar}, ${PHONE.recent}, now())`),
      ).toBe('42501');
      // Her own scope through RLS-safe my_thread_phones() is fine.
      const mine = await as(tx, teacher, () => tx<{ phone_e164: string }[]>`select phone_e164 from public.my_thread_phones()`);
      expect(phonesIn(mine)).toEqual([PHONE.assigned, PHONE.recent, PHONE.own].sort());
    });
  });
});
