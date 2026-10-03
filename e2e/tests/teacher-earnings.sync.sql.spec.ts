import { expect, test } from '@playwright/test';
import { rolledBack } from '../support/rls';
import { earningOf, lesson, teacher } from '../support/earnings';

// Migrations 176–179 (per-session teacher earnings) against the real database, in a transaction
// that is rolled back. NOT run in the cloud session that wrote it: the owner runs it locally after
// `supabase db reset`. Each case mirrors a branch of packages/shared/src/money/earnings.plan.ts.

test.describe('teacher earnings ledger sync (migrations 176–179)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('a lesson that becomes completed earns once, at the teacher rate for its length', async () => {
    await rolledBack(async (tx) => {
      const t = await teacher(tx);
      const l = await lesson(tx, { teacher: t, days: 1, minutes: 45 });
      expect(await earningOf(tx, l)).toBeUndefined();
      await tx`update public.lessons set status = 'completed' where id = ${l}`;
      await tx`update public.lessons set status = 'completed' where id = ${l}`;
      expect(await earningOf(tx, l)).toMatchObject({ minutes: 45, rate: '70.00', amount: '70.00', status: 'earned' });
      const rows = await tx`select 1 from public.teacher_session_earnings where lesson_id = ${l}`;
      expect(rows).toHaveLength(1);
    });
  });

  test('late / no_show earn only when the settings say so; leaving completed removes an unpaid earning', async () => {
    await rolledBack(async (tx) => {
      const t = await teacher(tx);
      const l = await lesson(tx, { teacher: t, days: 2, minutes: 60 });
      await tx`update public.lessons set status = 'late' where id = ${l}`;
      expect(await earningOf(tx, l)).toBeUndefined();
      await tx`update public.settings set value = 'true'::jsonb where key = 'payout_count_late'`;
      await tx`update public.lessons set status = 'completed' where id = ${l}`;
      await tx`update public.lessons set status = 'late' where id = ${l}`;
      expect(await earningOf(tx, l)).toMatchObject({ amount: '90.00' });
      await tx`update public.lessons set status = 'scheduled' where id = ${l}`;
      expect(await earningOf(tx, l)).toBeUndefined();
    });
  });

  test('a corrected length re-prices an unpaid earning; a length without a rate earns nothing', async () => {
    await rolledBack(async (tx) => {
      const t = await teacher(tx);
      const l = await lesson(tx, { teacher: t, days: 3, minutes: 45, status: 'completed' });
      await tx`update public.lessons set ends_at = starts_at + interval '60 minutes' where id = ${l}`;
      expect(await earningOf(tx, l)).toMatchObject({ minutes: 60, rate: '90.00', amount: '90.00' });
      await tx`update public.lessons set ends_at = starts_at + interval '50 minutes' where id = ${l}`;
      expect(await earningOf(tx, l)).toBeUndefined();
    });
  });
});
