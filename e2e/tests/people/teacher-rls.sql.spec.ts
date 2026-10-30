import { expect, test } from '@playwright/test';
import type { TransactionSql } from 'postgres';
import { as, family, lesson, rolledBack, userId } from '../../support/rls';
import { USERS } from '../../support/users';

// Migration 164 against the real database (rule 9: RLS on every table, defence in depth behind the
// API), in a transaction that is rolled back. With a teacher's JWT, messages shows only the
// families she teaches (assigned, or on her lessons from the last 90 days) and her own chat with
// the academy; teacher_thread_reads shows her rows only; the scope function itself is the API's.

type Tx = TransactionSql;

const PHONE = {
  assigned: '+966500164001',
  recent: '+966500164002',
  old: '+966500164003',
  other: '+966500164004',
  own: '+966500164005',
};

/** «أبرار» (abrar@e2e.local) and a second teacher; one family per case; one inbound row per phone. */
async function seed(tx: Tx) {
  const [abrar] = await tx<{ id: string }[]>`update public.teachers set phone_e164 = ${PHONE.own}
    where profile_id = ${await userId(tx, USERS.teacher.email)} returning id`;
  const [other] = await tx<{ id: string }[]>`insert into public.teachers (display_name_ar, gender, programs, tz)
    values ('معلمة RLS', 'female', '{quran}', 'Asia/Riyadh') returning id`;
  if (!abrar || !other) throw new Error('teachers missing');
  // Active students: a trial family is never in a teacher's chats (trial-no-teacher-chat.sql.spec).
  const active = 'active' as const;
  await family(tx, { phone: PHONE.assigned, teacherId: abrar.id, status: active });
  await lesson(tx, { teacherId: abrar.id, studentId: await family(tx, { phone: PHONE.recent, teacherId: other.id, status: active }), daysAgo: 10 });
  await lesson(tx, { teacherId: abrar.id, studentId: await family(tx, { phone: PHONE.old, teacherId: other.id, status: active }), daysAgo: 91 });
  await family(tx, { phone: PHONE.other, teacherId: other.id, status: active });
  for (const phone of Object.values(PHONE)) {
    await tx`insert into public.messages (direction, phone_e164, body) values ('inbound', ${phone}, 'السلام عليكم')`;
  }
  await tx`insert into public.teacher_thread_reads (teacher_id, phone_e164, read_at)
    values (${abrar.id}, ${PHONE.assigned}, now()), (${other.id}, ${PHONE.other}, now())`;
  return { abrar: abrar.id, other: other.id };
}

/** Only this spec's rows: other journeys leave messages and read marks in the shared DB. */
const ours = <T extends { phone_e164: string }>(rows: readonly T[]) => rows.filter((r) => r.phone_e164.startsWith('+966500164'));
const phonesIn = (rows: readonly { phone_e164: string }[]) => [...new Set(ours(rows).map((r) => r.phone_e164))].sort();
type ReadRow = { teacher_id: string; phone_e164: string };

test.describe('teacher mode RLS (migration 164, rule 9)', () => {
  test('a teacher reads her families, the 90-day window and her own chat; an admin reads all', async () => {
    await rolledBack(async (tx) => {
      const t = await seed(tx);
      const teacher = await userId(tx, USERS.teacher.email);
      const messages = await as(tx, teacher, () => tx<{ phone_e164: string }[]>`select phone_e164 from public.messages`);
      expect(phonesIn(messages)).toEqual([PHONE.assigned, PHONE.recent, PHONE.own].sort());
      const reads = await as(tx, teacher, () => tx<ReadRow[]>`select teacher_id, phone_e164 from public.teacher_thread_reads`);
      expect(reads.every((r) => r.teacher_id === t.abrar)).toBe(true);
      expect(ours(reads)).toEqual([{ teacher_id: t.abrar, phone_e164: PHONE.assigned }]);

      const admin = await userId(tx, USERS.admin.email);
      const all = await as(tx, admin, () => tx<{ phone_e164: string }[]>`select phone_e164 from public.messages`);
      expect(phonesIn(all)).toEqual(Object.values(PHONE).sort());
      const allReads = await as(tx, admin, () => tx<ReadRow[]>`select teacher_id, phone_e164 from public.teacher_thread_reads`);
      expect(ours(allReads)).toHaveLength(2);
    });
  });

  test('one «my student» definition (migration 165) and a draft payout stays hidden from the teacher', async () => {
    await rolledBack(async (tx) => {
      const t = await seed(tx);
      const teacher = await userId(tx, USERS.teacher.email);
      const kid = async (phone: string) => {
        const [s] = await tx<{ id: string }[]>`select s.id from public.students s join public.guardians g on g.id = s.guardian_id
          where g.phone_e164 = ${phone}`;
        return s?.id ?? '';
      };
      const has = async (phone: string) => {
        const [r] = await tx<{ ok: boolean }[]>`select public.teacher_has_student(${t.abrar}, ${await kid(phone)}) as ok`;
        return r?.ok;
      };
      // assigned, or a lesson ≤ 90 days ago: yes. A lesson 91 days ago, or someone else's: no.
      expect([await has(PHONE.assigned), await has(PHONE.recent), await has(PHONE.old), await has(PHONE.other)]).toEqual([true, true, false, false]);

      await tx`insert into public.teacher_payouts (teacher_id, month, lessons_count, amount, status, approved_at)
        values (${t.abrar}, '2031-01-01', 3, 300, 'draft', null), (${t.abrar}, '2031-02-01', 3, 300, 'approved', now())`;
      const rows = await as(tx, teacher, () => tx<{ status: string }[]>`select status from public.teacher_payouts
        where month >= '2031-01-01'`);
      expect(rows.map((r) => r.status)).toEqual(['approved']);
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

  test('the signed feedback link in a request message is the admin’s: a teacher never reads it (migration 168)', async () => {
    await rolledBack(async (tx) => {
      await seed(tx);
      await tx`insert into public.messages (direction, status, phone_e164, template_key, template_params)
        values ('outbound', 'sent', ${PHONE.assigned}, 'lesson_feedback_request', '{"button": "secret-token"}')`;
      const teacher = await userId(tx, USERS.teacher.email);
      const rows = await as(tx, teacher, () => tx<{ template_key: string | null }[]>`select template_key from public.messages
        where phone_e164 = ${PHONE.assigned}`);
      expect(rows.map((r) => r.template_key)).toEqual([null]);
      const admin = await userId(tx, USERS.admin.email);
      const all = await as(tx, admin, () => tx<{ template_key: string | null }[]>`select template_key from public.messages
        where template_key = 'lesson_feedback_request' and phone_e164 = ${PHONE.assigned}`);
      expect(all).toHaveLength(1);
    });
  });
});
