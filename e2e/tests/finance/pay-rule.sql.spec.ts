import { expect, test } from '@playwright/test';
import { earningId, earningOf, pastLesson, pay, teacherWithRates } from '../../support/finance/earnings';
import { countableIds, payableIds, ruleLesson, setSettingTx, studentOn } from '../../support/finance/pay-rule';
import { rolledBack } from '../../support/rls';
import { resetAbrar } from '../../support/core/schedule';

// The ONE teacher-pay rule (migration 20261005000200) against the real database: the ledger,
// v_teacher_payable_lessons (monthly payout, dashboard) and v_teacher_countable_earnings (ledger
// reads, settlement) agree. Each case is rolled back. Twin: lessonCountsForPay / teacherRateFor.

test.describe('one rule for teacher pay (20261005000200)', () => {
  test.beforeEach(async () => {
    test.skip(test.info().project.name !== 'desktop', 'database only: one run');
    // Start from a teacher with no lessons: the CI shard plan may run a spec that leaves one first.
    await resetAbrar();
  });

  test('a trial lesson is not paid by default; payout_count_trials + resync pays it everywhere', async () => {
    await rolledBack(async (tx) => {
      const t = await teacherWithRates(tx);
      const trial = await ruleLesson(tx, { teacher: t.id, pkg: 'trial', daysAgo: 3 });
      const sub = await ruleLesson(tx, { teacher: t.id, pkg: '4', daysAgo: 2 });
      expect(await earningOf(tx, trial)).toBeUndefined();
      expect(await payableIds(tx, t.id)).toEqual([sub]);
      expect(await countableIds(tx, t.id)).toEqual([sub]);
      await setSettingTx(tx, 'payout_count_trials', true);
      await tx`select public.resync_teacher_earnings(${t.id})`;
      expect(await earningOf(tx, trial)).toMatchObject({ amount: '70.00' });
      expect(await payableIds(tx, t.id)).toEqual([trial, sub]);
      expect(await countableIds(tx, t.id)).toEqual([trial, sub]);
    });
  });

  test('history does not shrink: a churned or paused student’s completed lesson stays owed', async () => {
    await rolledBack(async (tx) => {
      const t = await teacherWithRates(tx);
      const a = await ruleLesson(tx, { teacher: t.id, pkg: '4', daysAgo: 3 });
      const b = await ruleLesson(tx, { teacher: t.id, pkg: '4', daysAgo: 2 });
      const s = await studentOn(tx, { lesson: a, status: 'active' });
      await studentOn(tx, { lesson: b, status: 'paused' });
      await tx`update public.students set status = 'churned' where id = ${s}`;
      expect(await countableIds(tx, t.id)).toEqual([a, b]);
      expect(await payableIds(tx, t.id)).toEqual([a, b]);
    });
  });

  test('a length outside 30/45/60/90 is pro-rated from the nearest rate', async () => {
    await rolledBack(async (tx) => {
      const t = await teacherWithRates(tx); // 50 / 70 / 90 / none
      const odd = await pastLesson(tx, { teacher: t.id, minutes: 50, status: 'completed', daysAgo: 3 });
      const long = await pastLesson(tx, { teacher: t.id, minutes: 120, status: 'completed', daysAgo: 2 });
      expect(await earningOf(tx, odd)).toMatchObject({ minutes: 50, amount: '77.78' });
      expect(await earningOf(tx, long)).toMatchObject({ minutes: 120, amount: '180.00' });
      const [r] = await tx<{ v: string }[]>`select public.teacher_rate_for(75, null, null, 90, 120)::text as v`;
      expect(r?.v).toBe('100.00');
    });
  });

  test('a standard length without a rate stays unpriced and shows as unrated (amount null)', async () => {
    await rolledBack(async (tx) => {
      const t = await teacherWithRates(tx); // rate_90 = null
      const l = await pastLesson(tx, { teacher: t.id, minutes: 90, status: 'completed', daysAgo: 2 });
      expect(await earningOf(tx, l)).toBeUndefined();
      const [row] = await tx<{ amount: string | null }[]>`select amount from public.v_teacher_payable_lessons where lesson_id = ${l}`;
      expect(row).toEqual({ amount: null });
    });
  });

  test('a session with money paid always counts, even when its lesson stopped counting', async () => {
    await rolledBack(async (tx) => {
      const t = await teacherWithRates(tx);
      const l = await ruleLesson(tx, { teacher: t.id, pkg: '4', daysAgo: 3 });
      await pay(tx, { teacher: t.id, amount: 30, items: [{ earning_id: await earningId(tx, l), amount: 30 }] });
      await tx`update public.schedule_rules set package = 'trial' where id = (select rule_id from public.lessons where id = ${l})`;
      await tx`select public.resync_teacher_earnings(${t.id})`;
      expect(await earningOf(tx, l)).toMatchObject({ amount: '30.00', paid_amount: '30.00', status: 'paid' });
      expect(await countableIds(tx, t.id)).toEqual([l]);
      expect(await payableIds(tx, t.id)).toEqual([l]);
    });
  });
});
