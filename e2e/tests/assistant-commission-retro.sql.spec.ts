import { expect, test } from '@playwright/test';
import { assistant, brought, commissionOf, iso, openMonth, one, paidStatement, pay, renewalOf, student, subscription } from '../support/assistant';
import { rolledBack } from '../support/rls';

// Nothing is retroactive, and a re-attributed student's commission (migration 20261006000272) against
// the real database. Each case is rolled back.

const PERCENT = { commission_type: 'percent', commission_value: 10, commission_starts_on: '2000-01-01' } as const;
const FIXED = { commission_type: 'fixed', commission_value: 30, commission_currency: 'EGP', commission_starts_on: '2000-01-01' } as const;

test.describe('assistant commission: nothing retroactive, re-attribution (20261006000272)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('a student who had already paid in full before they were brought earns no first commission; a later package is a renewal', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'retro', PERCENT);
      const kid = await student(tx, { phone: '+966500000301' });
      await pay(tx, await subscription(tx, kid, { price: 100 }), { amount: 100, at: iso(-3) });
      await tx`select public.set_student_brought_by(${kid}, ${a}, null)`; // brought today, paid three days ago
      expect(await commissionOf(tx, kid)).toBeUndefined();
      const second = await subscription(tx, kid, { price: 200 });
      await pay(tx, second, 200); // the first package was paid before: no first; the second is a renewal (owner 2026-10-26)
      expect(await commissionOf(tx, kid)).toBeUndefined();
      expect(await renewalOf(tx, second)).toMatchObject({ amount: '10.00', share_percent: 50 });
    });
  });

  test('a void undone before its reversal reached a statement cancels out, for the same assistant: the line stays', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'same', PERCENT);
      const { student: s, sub } = await brought(tx, { by: a, phone: '+966500000302', price: 200 });
      await pay(tx, sub, 200);
      const stmt = await paidStatement(tx, a, await openMonth(tx, a));
      await pay(tx, sub, { amount: 50, kind: 'refund' });
      expect(await commissionOf(tx, s)).toMatchObject({ status: 'voided', statement_id: stmt });
      expect((await tx`select 1 from public.assistant_adjustments where assistant_id = ${a} and statement_id is null`).length).toBe(1);
      await pay(tx, sub, 50);
      expect(await commissionOf(tx, s)).toMatchObject({ assistant_id: a, status: 'earned', amount: '20.00', statement_id: stmt });
      expect((await tx`select 1 from public.assistant_adjustments where assistant_id = ${a}`).length).toBe(0);
    });
  });

  test('re-attributed after a void: the reinstated commission goes to the current assistant at her terms; the old one still pays the reversal back', async () => {
    await rolledBack(async (tx) => {
      const old = await assistant(tx, 'old', PERCENT);
      const next = await assistant(tx, 'new', FIXED);
      const { student: s, sub } = await brought(tx, { by: old, phone: '+966500000303', price: 200 });
      await pay(tx, sub, 200);
      await paidStatement(tx, old, await openMonth(tx, old));
      await pay(tx, sub, { amount: 50, kind: 'refund' }); // voided; the reversal (-20) waits for her next statement
      await tx`select public.set_student_brought_by(${s}, ${next}, null)`; // allowed: nothing is earned right now
      await pay(tx, sub, 50); // fully paid again, after the new assistant was credited
      expect(await commissionOf(tx, s)).toMatchObject({ assistant_id: next, status: 'earned', amount: '30.00', currency: 'EGP', statement_id: null });
      const reversal = one(await tx<{ amount: string; statement_id: string | null }[]>`select amount::text, statement_id
        from public.assistant_adjustments where assistant_id = ${old} and kind = 'reversal'`);
      expect(reversal).toMatchObject({ amount: '-20.00', statement_id: null });
      expect((await tx`select 1 from public.assistant_adjustments where assistant_id = ${next}`).length).toBe(0);
    });
  });
});
