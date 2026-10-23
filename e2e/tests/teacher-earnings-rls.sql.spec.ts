import { expect, test } from '@playwright/test';
import { earningId, pastLesson, pay, teacherWithRates } from '../support/earnings';
import { as, rolledBack, userId, type Tx } from '../support/rls';
import { USERS } from '../support/users';
import { resetAbrar } from '../support/schedule';

// RLS of migration 176 (rule 9): admins all; a teacher only their own rows; nobody else.

async function otherTeacher(tx: Tx): Promise<string> {
  const [o] = await tx<{ id: string }[]>`insert into public.teachers (display_name_ar, gender, programs, tz, rate_45)
    values ('معلمة أخرى', 'female', '{quran}', 'Asia/Riyadh', 80) returning id`;
  if (!o) throw new Error('teacher not written');
  return o.id;
}

/**
 * Two teachers, one completed lesson, one earning and one payment each. The e2e teacher may already
 * own earnings from specs that ran before on this database (they commit), so callers count only the
 * `lessons` returned here, never every row of a teacher.
 */
async function seed(tx: Tx) {
  const mine = await teacherWithRates(tx);
  const other = await otherTeacher(tx);
  const lessons: string[] = [];
  for (const teacher of [mine.id, other]) {
    const lesson = await pastLesson(tx, { teacher, minutes: 45, status: 'completed', daysAgo: 3 });
    lessons.push(lesson);
    await pay(tx, { teacher, amount: 10, items: [{ earning_id: await earningId(tx, lesson), amount: 10 }] });
  }
  return { mine, other, lessons };
}

test.describe('teacher earnings RLS (migration 176)', () => {
  test.beforeEach(async () => {
    test.skip(test.info().project.name !== 'desktop', 'database only: one run');
    // Start from a teacher with no lessons: the CI shard plan may run a spec that leaves one first.
    await resetAbrar();
  });

  test('a teacher reads only their own earnings, payments and items; an admin reads all', async () => {
    await rolledBack(async (tx) => {
      const { mine, other, lessons } = await seed(tx);
      const ids = (table: string) => as(tx, mine.userId, () => tx.unsafe<{ teacher_id: string }[]>(`select teacher_id from public.${table} where teacher_id in ('${mine.id}', '${other}')`));
      for (const table of ['teacher_session_earnings', 'teacher_payments']) {
        const rows = await ids(table);
        expect(rows.length).toBeGreaterThan(0);
        expect(rows.every((r) => r.teacher_id === mine.id)).toBe(true);
      }
      const items = await as(tx, mine.userId, () => tx<{ n: string }[]>`select count(*) as n from public.teacher_payment_items i
        join public.teacher_session_earnings e on e.id = i.earning_id where e.teacher_id = ${other}`);
      expect(items[0]?.n).toBe('0');
      const admin = await userId(tx, USERS.admin.email);
      const all = await as(tx, admin, () => tx<{ n: string }[]>`select count(*) as n from public.teacher_session_earnings
        where lesson_id in ${tx(lessons)}`);
      expect(all[0]?.n).toBe('2');
    });
  });

  test('nobody but the API writes: a teacher can’t insert, update or delete, nor call the ledger RPCs', async () => {
    await rolledBack(async (tx) => {
      const { mine } = await seed(tx);
      const refused = (query: () => Promise<unknown>) =>
        tx.savepoint(() => as(tx, mine.userId, query)).then(() => 'allowed', (e: { code?: string }) => e.code);
      expect(await refused(() => tx`update public.teacher_session_earnings set paid_amount = amount where teacher_id = ${mine.id}`)).toBe('42501');
      expect(await refused(() => tx`delete from public.teacher_payments where teacher_id = ${mine.id}`)).toBe('42501');
      expect(await refused(() => tx`insert into public.teacher_payments (teacher_id, amount, paid_at, method)
        values (${mine.id}, 5, now(), 'cash')`)).toBe('42501');
      expect(await refused(() => tx`select public.record_teacher_payment('{}'::jsonb)`)).toBe('42501');
      expect(await refused(() => tx`select public.resync_teacher_earnings(null)`)).toBe('42501');
    });
  });

  test('anon sees nothing', async () => {
    await rolledBack(async (tx) => {
      await seed(tx);
      await tx`set local role anon`;
      const rows = await tx`select 1 from public.teacher_session_earnings`.then(() => 'allowed', (e: { code?: string }) => e.code);
      expect(rows).toBe('42501');
    });
  });
});
