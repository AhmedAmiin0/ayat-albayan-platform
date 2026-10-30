import { expect, test } from '@playwright/test';
import { assistant, brought, code, generate, iso, lastMonth, one, openMonth, pay, subscription } from '../../support/sales/assistant';
import { rolledBack, type Tx } from '../../support/core/rls';

// Reopening an approved statement (migration 20261006000273): the guard and the clean-up follow the
// statement's own LINES, so a commission that was voided and earned again cannot make it under-pay.
// Statements are of LAST month (payments made 35 days ago); a month that has not begun cannot be built.

const TERMS = { commission_type: 'percent', commission_value: 10, commission_starts_on: '2000-01-01' } as const;
const approve = (tx: Tx, id: string) => tx`select public.approve_assistant_statement(${id}, null)`;

test.describe('assistant statements: reopen (20261006000273)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('refused while a reversal of a commission on its lines sits in a later statement, even after the commission was earned again', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'guard', TERMS);
      const { sub } = await brought(tx, { by: a, phone: '+966500000331', price: 200, broughtAt: iso(-40) });
      await pay(tx, sub, { amount: 200, at: iso(-35) });
      const last = await lastMonth(tx);
      const { statement_id: s1 } = await generate(tx, a, last);
      await approve(tx, s1);
      await pay(tx, sub, { amount: 100, kind: 'refund' }); // voided: a reversal (-20) is due this month
      const { statement_id: s2 } = await generate(tx, a, await openMonth(tx, a)); // ... and goes into this month's statement
      expect(one(await tx<{ n: number }[]>`select count(*)::int n from public.assistant_statement_lines
        where statement_id = ${s2} and kind = 'adjustment'`).n).toBe(1);
      await pay(tx, sub, 100); // earned again as a new earning: it no longer points at the first statement
      expect(one(await tx<{ statement_id: string | null }[]>`select statement_id from public.assistant_commissions
        where assistant_id = ${a}`).statement_id).toBeNull();
      expect(await code(tx, () => tx`select public.reopen_assistant_statement(${s1}, null)`)).toBe('reversal_in_later_statement');
    });
  });

  test('a reversal still waiting is dropped on reopen: the voided first stays out, the second package earns its renewal share once', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'clean', TERMS);
      const { student: s, sub } = await brought(tx, { by: a, phone: '+966500000332', price: 200, broughtAt: iso(-40) });
      await pay(tx, sub, { amount: 200, at: iso(-35) });
      const last = await lastMonth(tx);
      const { statement_id: s1 } = await generate(tx, a, last);
      await approve(tx, s1);
      await pay(tx, sub, { amount: 100, kind: 'refund' }); // voided: the reversal (-20) waits for a statement
      // The second package is a renewal by order (owner 2026-10-26): 10 % x 50 % of 300 = 15, never the first's 30.
      await pay(tx, await subscription(tx, s, { price: 300 }), 300);
      await tx`select public.reopen_assistant_statement(${s1}, null)`; // takes its own line and the waiting reversal away
      expect((await tx`select 1 from public.assistant_adjustments where assistant_id = ${a}`).length).toBe(0);
      expect((await generate(tx, a, last)).totals).toEqual({}); // last month holds nothing now: it was earned this month
      expect((await generate(tx, a, await openMonth(tx, a))).totals).toEqual({ SAR: { salary: 0, commissions: 15, adjustments: 0, total: 15 } });
    });
  });
});
