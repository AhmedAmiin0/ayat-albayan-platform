import { expect, test } from '@playwright/test';
import { rolledBack } from '../../support/core/rls';
import { withSql } from '../../support/core/schedule';
import { pastLesson, teacherWithRates } from '../../support/finance/earnings';
import {
  cardRows,
  expense,
  paidPackage,
  payAt,
  studentOf,
} from '../../support/finance/finance-card';

// finance_card_totals (migration 20261125000100): the dashboard finance card's facts, grouped in
// SQL. The rows are the ones the API mapper turns into the card's totals (finance.mapper.test.ts).
// The window is one hour of a day long past, so no other seeded data falls in it.

const DAYS_AGO = 800;
const EXPENSE_MONTH = '2001-03-01';
const SIGNATURE = 'public.finance_card_totals(timestamptz, timestamptz, date, date)';

test.describe('finance card totals in one read (20261125000100)', () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== 'desktop', 'database only: one run');
  });

  test('groups payments, lesson cost shares, expenses and unrated lessons', async () => {
    await rolledBack(async (tx) => {
      const t = await teacherWithRates(tx);
      const costed = await pastLesson(tx, {
        teacher: t.id,
        minutes: 30,
        status: 'completed',
        daysAgo: DAYS_AGO,
      });
      await pastLesson(tx, { teacher: t.id, minutes: 90, status: 'completed', daysAgo: DAYS_AGO });
      const [l] = await tx<
        { starts_at: Date }[]
      >`select starts_at from public.lessons where id = ${costed}`;
      const start = l?.starts_at.getTime() ?? 0;
      const at = new Date(start + 10 * 60_000).toISOString();
      const referral = await studentOf(tx, {
        phone: '+966511100201',
        source: 'referral',
        lesson: costed,
      });
      const unknown = await studentOf(tx, { phone: '+966511100202', source: null, lesson: costed });
      const sar = await paidPackage(tx, { student: referral, currency: 'SAR', fxRate: null });
      const usd = await paidPackage(tx, { student: unknown, currency: 'USD', fxRate: 0.25 });
      await payAt(tx, sar, { amount: 145, at });
      await payAt(tx, sar, { amount: 45, at, refund: true });
      await payAt(tx, usd, { amount: 40, at });
      await expense(tx, { month: EXPENSE_MONTH, amount: 1300 });
      await expense(tx, { month: EXPENSE_MONTH, amount: 200 });
      await expense(tx, { month: EXPENSE_MONTH, amount: 999, draft: true });
      const month = new Date(start + 3 * 3_600_000).toISOString().slice(0, 7);
      const rows = await cardRows(tx, {
        from: new Date(start).toISOString(),
        to: new Date(start + 3_600_000).toISOString(),
        month: EXPENSE_MONTH,
      });
      expect(rows).toEqual([
        { kind: 'cost', month, currency: 'EGP', key: 'referral', amount: 25, n: 1 },
        { kind: 'cost', month, currency: 'EGP', key: 'unknown', amount: 25, n: 1 },
        { kind: 'expense', month: '2001-03', currency: 'EGP', key: 'ads', amount: 1500, n: 2 },
        { kind: 'payment', month, currency: 'SAR', key: 'referral', amount: 100, n: 2 },
        { kind: 'payment', month, currency: 'SAR', key: 'unknown', amount: 160, n: 1 },
        { kind: 'unrated', month: '', currency: '', key: '', amount: 0, n: 1 },
      ]);
    });
  });

  test('only the service role may call it', async () => {
    const rows = await withSql(
      (sql) => sql<{ role: string; allowed: boolean }[]>`
      select r as role, has_function_privilege(r, ${SIGNATURE}, 'execute') as allowed
      from unnest(array['anon', 'authenticated', 'service_role']) r order by r`,
    );
    expect(rows).toEqual([
      { role: 'anon', allowed: false },
      { role: 'authenticated', allowed: false },
      { role: 'service_role', allowed: true },
    ]);
  });
});
