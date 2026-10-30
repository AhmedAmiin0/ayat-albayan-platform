import { expect, test } from '@playwright/test';
import { assistant, brought, code, commissionOf, openMonth, paidStatement, pay, renewalOf, subscription } from '../../support/sales/assistant';
import { rolledBack, type Tx } from '../../support/rls';

// Renewal commission (migrations 20261027000750-751, owner 2026-10-26): «half of the value» = half of her
// NORMAL commission on each renewal (settings.renewal_commission_percent, default 50), kind decided by
// subscription order, never by payment order. Each case is rolled back. Twin: @ab/shared assistant/renewal.ts.

const PERCENT = { commission_type: 'percent', commission_value: 10, commission_starts_on: '2000-01-01' } as const;
const FIXED = { commission_type: 'fixed', commission_value: 30, commission_currency: 'EGP', commission_starts_on: '2000-01-01' } as const;
const setShare = (tx: Tx, n: number) => tx`insert into public.settings (key, value) values ('renewal_commission_percent', ${tx.json(n)})
  on conflict (key) do update set value = excluded.value`;
const rows = (tx: Tx, s: string) => tx<{ kind: string; amount: string }[]>`select kind, amount::text from public.assistant_commissions
  where student_id = ${s} order by earned_at, kind`;

test.describe('renewal commission (20261027000750-751)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('first + renewal on one student: the first in full, each renewal at half; fixed terms halve the fixed amount', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'ren', PERCENT);
      const { student: s, sub } = await brought(tx, { by: a, phone: '+966500000401', price: 200 });
      await pay(tx, sub, 200);
      const second = await subscription(tx, s, { price: 300 });
      await pay(tx, second, 300);
      expect(await commissionOf(tx, s)).toMatchObject({ amount: '20.00', subscription_id: sub });
      expect(await renewalOf(tx, second)).toMatchObject({ amount: '15.00', currency: 'SAR', share_percent: 50, status: 'earned' });
      const view = await tx`select commission_amount::text, renewal_commission_count from public.v_assistant_students where student_id = ${s}`;
      expect(view).toEqual([{ commission_amount: '20.00', renewal_commission_count: 1 }]); // one row per student
      const f = await assistant(tx, 'renfix', FIXED);
      const b = await brought(tx, { by: f, phone: '+966500000402', price: 100, currency: 'USD' });
      await pay(tx, b.sub, 100);
      const renewal = await subscription(tx, b.student, { price: 100, currency: 'USD' });
      await pay(tx, renewal, 100);
      expect(await renewalOf(tx, renewal)).toMatchObject({ amount: '15.00', currency: 'EGP' });
    });
  });

  test('a renewal fully paid before the cutoff (2026-10-27 00:00 Riyadh) earns nothing, and editing its payment mints none', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'cut', PERCENT);
      const { student: s, sub } = await brought(tx, { by: a, phone: '+966500000403', price: 100, broughtAt: '2026-10-01T09:00:00Z' });
      await pay(tx, sub, { amount: 100, at: '2026-10-05T09:00:00Z' });
      const before = await subscription(tx, s, { price: 100 });
      const payment = await pay(tx, before, { amount: 100, at: '2026-10-26T20:59:59Z' }); // 23:59:59 in Riyadh
      expect(await renewalOf(tx, before)).toBeUndefined();
      await tx`update public.payments set amount = 120 where id = ${payment ?? ''}`;
      await tx`update public.payments set paid_at = '2026-10-28T09:00:00Z' where id = ${payment ?? ''}`; // moved past the cutoff
      expect(await renewalOf(tx, before)).toBeUndefined();
      await pay(tx, before, { amount: 120, kind: 'refund', at: '2026-10-29T09:00:00Z' });
      await pay(tx, before, { amount: 120, at: '2026-10-30T09:00:00Z' }); // refund + repay after it: still nothing
      expect(await renewalOf(tx, before)).toBeUndefined();
      const at = await subscription(tx, s, { price: 100 });
      await pay(tx, at, { amount: 100, at: '2026-10-26T21:00:00Z' }); // exactly the cutoff
      expect(await renewalOf(tx, at)).toMatchObject({ amount: '5.00' });
    });
  });

  test('order decides the kind: a late payment on the older package earns its first and never changes the renewal row', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'late', PERCENT);
      const { student: s, sub: older } = await brought(tx, { by: a, phone: '+966500000404', price: 200 });
      const newer = await subscription(tx, s, { price: 400 });
      await pay(tx, newer, 400); // paid first, but created second: a renewal
      expect(await commissionOf(tx, s)).toBeUndefined();
      const renewal = await renewalOf(tx, newer);
      expect(renewal).toMatchObject({ amount: '20.00', share_percent: 50 });
      await pay(tx, older, 200);
      expect(await commissionOf(tx, s)).toMatchObject({ amount: '20.00', subscription_id: older });
      expect(await renewalOf(tx, newer)).toEqual(renewal);
      expect((await rows(tx, s)).map((r) => r.kind)).toEqual(['renewal', 'first']);
    });
  });

  test('the share is copied when earned: changing the setting only affects later renewals', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'share', PERCENT);
      const { student: s, sub } = await brought(tx, { by: a, phone: '+966500000405', price: 100 });
      await pay(tx, sub, 100);
      const second = await subscription(tx, s, { price: 200 });
      await pay(tx, second, 200);
      await setShare(tx, 80);
      await pay(tx, second, 5); // a later payment on it re-runs the rule: still fully paid, kept as earned
      expect(await renewalOf(tx, second)).toMatchObject({ amount: '10.00', share_percent: 50 });
      const third = await subscription(tx, s, { price: 200 });
      await pay(tx, third, 200);
      expect(await renewalOf(tx, third)).toMatchObject({ amount: '16.00', share_percent: 80 });
      await setShare(tx, 0);
      const fourth = await subscription(tx, s, { price: 200 });
      await pay(tx, fourth, 200);
      expect(await renewalOf(tx, fourth)).toBeUndefined(); // 0 % earns nothing
    });
  });

  test('a renewal row voids by itself: a refund drops it from a draft, an admin void after payment is a reversal', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'void', PERCENT);
      const { student: s, sub } = await brought(tx, { by: a, phone: '+966500000406', price: 100 });
      await pay(tx, sub, 100);
      const second = await subscription(tx, s, { price: 300 });
      await pay(tx, second, 300);
      await pay(tx, second, { amount: 50, kind: 'refund' });
      expect(await renewalOf(tx, second)).toMatchObject({ status: 'voided' });
      expect(await commissionOf(tx, s)).toMatchObject({ status: 'earned' }); // the first is untouched
      await pay(tx, second, 50); // paid in full again: the same row is earned again
      expect(await renewalOf(tx, second)).toMatchObject({ status: 'earned', amount: '15.00' });
      const stmt = await paidStatement(tx, a, await openMonth(tx, a));
      const [row] = await tx<{ id: string }[]>`select id from public.assistant_commissions where subscription_id = ${second}`;
      expect(await code(tx, () => tx`select public.void_assistant_commission(${row?.id ?? ''}, null, 'wrong deal')`)).toBe('ok');
      const adj = await tx`select amount::text, statement_id from public.assistant_adjustments where commission_id = ${row?.id ?? ''}`;
      expect(adj).toEqual([{ amount: '-15.00', statement_id: null }]);
      expect(await renewalOf(tx, second)).toMatchObject({ status: 'voided', statement_id: stmt });
    });
  });

  test('a merge that drops a first row never lets its subscription earn again as a renewal', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'merge', PERCENT);
      const kept = await brought(tx, { by: a, phone: '+966500000408', price: 400 });
      await pay(tx, kept.sub, 400);
      const merged = await brought(tx, { by: a, phone: '+966500000409', price: 400 });
      const payment = await pay(tx, merged.sub, 400); // its own first: 40, dropped by the merge below
      await tx`select public.merge_students(${kept.student}, ${merged.student}, null)`;
      await tx`update public.payments set method = 'cash' where id = ${payment ?? ''}`; // any later touch re-runs the rule
      expect(await renewalOf(tx, merged.sub)).toBeUndefined();
      expect(await rows(tx, kept.student)).toEqual([{ kind: 'first', amount: '40.00' }]);
    });
  });

  test('a trial (price 0) never counts: the first priced package is the first', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'trial', PERCENT);
      const { student: s, sub: trial } = await brought(tx, { by: a, phone: '+966500000407', price: 0 });
      await pay(tx, trial, 1);
      const paid = await subscription(tx, s, { price: 200 });
      await pay(tx, paid, 200);
      expect(await commissionOf(tx, s)).toMatchObject({ amount: '20.00', subscription_id: paid });
      expect(await renewalOf(tx, paid)).toBeUndefined();
      expect(await rows(tx, s)).toHaveLength(1);
    });
  });
});
