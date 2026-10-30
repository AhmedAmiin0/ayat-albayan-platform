import { expect, test } from '@playwright/test';
import { earningId, earningOf, pastLesson, pay, teacherWithRates } from '../../support/finance/earnings';
import { rolledBack } from '../../support/core/rls';
import { resetAbrar } from '../../support/core/schedule';

// The per-session ledger (migrations 176-179) against the real database, each case in a
// transaction that is rolled back. Mirrors the unit specs of planEarningSync (@ab/shared).

test.describe('teacher_session_earnings follows the lessons (migration 177)', () => {
  test.beforeEach(async () => {
    test.skip(test.info().project.name !== 'desktop', 'database only: one run');
    // Start from a teacher with no lessons: the CI shard plan may run a spec that leaves one first.
    await resetAbrar();
  });

  test('a lesson becoming completed gets an earning at the teacher rate; late / no_show only by setting', async () => {
    await rolledBack(async (tx) => {
      const t = await teacherWithRates(tx);
      const done = await pastLesson(tx, { teacher: t.id, minutes: 45, status: 'scheduled', daysAgo: 3 });
      const late = await pastLesson(tx, { teacher: t.id, minutes: 60, status: 'scheduled', daysAgo: 2 });
      expect(await earningOf(tx, done)).toBeUndefined();
      await tx`update public.lessons set status = 'completed' where id = ${done}`;
      expect(await earningOf(tx, done)).toMatchObject({ minutes: 45, rate: '70.00', amount: '70.00', status: 'earned' });
      await tx`update public.lessons set status = 'late' where id = ${late}`;
      expect(await earningOf(tx, late)).toBeUndefined(); // payout_count_late is off
      await tx`update public.settings set value = 'true'::jsonb where key = 'payout_count_late'`;
      await tx`select public.resync_teacher_earnings(${t.id})`;
      expect(await earningOf(tx, late)).toMatchObject({ minutes: 60, amount: '90.00' });
    });
  });

  test('a report correction that stops counting the lesson removes an unpaid earning, caps a part-paid one', async () => {
    await rolledBack(async (tx) => {
      const t = await teacherWithRates(tx);
      const a = await pastLesson(tx, { teacher: t.id, minutes: 45, status: 'completed', daysAgo: 4 });
      const b = await pastLesson(tx, { teacher: t.id, minutes: 45, status: 'completed', daysAgo: 3 });
      await pay(tx, { teacher: t.id, amount: 30, items: [{ earning_id: await earningId(tx, b), amount: 30 }] });
      await tx`update public.lessons set status = 'excused' where id in (${a}, ${b})`;
      expect(await earningOf(tx, a)).toBeUndefined();
      expect(await earningOf(tx, b)).toMatchObject({ amount: '30.00', paid_amount: '30.00', status: 'paid' });
    });
  });

  test('a corrected length re-prices an unpaid or part-paid earning, and a fully paid one is frozen', async () => {
    await rolledBack(async (tx) => {
      const t = await teacherWithRates(tx);
      const open = await pastLesson(tx, { teacher: t.id, minutes: 45, status: 'completed', daysAgo: 5 });
      const part = await pastLesson(tx, { teacher: t.id, minutes: 45, status: 'completed', daysAgo: 4 });
      const full = await pastLesson(tx, { teacher: t.id, minutes: 45, status: 'completed', daysAgo: 3 });
      await pay(tx, { teacher: t.id, amount: 40, items: [{ earning_id: await earningId(tx, part), amount: 40 }] });
      await pay(tx, { teacher: t.id, amount: 70, items: [{ earning_id: await earningId(tx, full), amount: 70 }] });
      await tx`update public.lessons set ends_at = starts_at + interval '60 minutes' where id in (${open}, ${part}, ${full})`;
      expect(await earningOf(tx, open)).toMatchObject({ minutes: 60, amount: '90.00', status: 'earned' });
      expect(await earningOf(tx, part)).toMatchObject({ minutes: 60, amount: '90.00', paid_amount: '40.00', status: 'partially_paid' });
      expect(await earningOf(tx, full)).toMatchObject({ minutes: 45, amount: '70.00', status: 'paid' });
    });
  });

  test('a rate set later fills the gap; an existing earning keeps its frozen rate', async () => {
    await rolledBack(async (tx) => {
      const t = await teacherWithRates(tx);
      const priced = await pastLesson(tx, { teacher: t.id, minutes: 45, status: 'completed', daysAgo: 4 });
      const unpriced = await pastLesson(tx, { teacher: t.id, minutes: 90, status: 'completed', daysAgo: 3 });
      expect(await earningOf(tx, unpriced)).toBeUndefined();
      await tx`update public.teachers set rate_45 = 100, rate_90 = 150 where id = ${t.id}`;
      expect(await earningOf(tx, priced)).toMatchObject({ rate: '70.00' });
      expect(await earningOf(tx, unpriced)).toMatchObject({ rate: '150.00', minutes: 90 });
    });
  });

  test('lengths outside 30/45/60/90 are pro-rated from the nearest rate (20261005000200)', async () => {
    await rolledBack(async (tx) => {
      const t = await teacherWithRates(tx);
      const odd = await pastLesson(tx, { teacher: t.id, minutes: 50, status: 'completed', daysAgo: 3 });
      expect(await earningOf(tx, odd)).toMatchObject({ minutes: 50, amount: '77.78' });
    });
  });
});
