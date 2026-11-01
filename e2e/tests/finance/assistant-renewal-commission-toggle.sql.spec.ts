import { expect, test } from '@playwright/test';
import { assistant, brought, commissionOf, generate, iso, one, openMonth, pay, renewalOf, subscription } from '../../support/sales/assistant';
import { rolledBack, type Tx } from '../../support/core/rls';

// «عمولة التجديد» on / off (owner 2026-11-01, migration 20261101000996): off = no NEW renewal
// commission on any earn path; an existing one settles as before (a payment correction never takes
// it away); a renewal fully paid since the switch-off never earns, even once it is on again; one
// paid before it still can; the first commission is unchanged. Each case is rolled back.
// settings.updated_at is now() (the transaction start): a payment of `iso(-1)` is before
// the switch-off.

const PERCENT = { commission_type: 'percent', commission_value: 10, commission_starts_on: '2000-01-01' } as const;
const setOn = (tx: Tx, on: boolean) => tx`insert into public.settings (key, value)
  values ('renewal_commission_enabled', ${tx.json(on)}) on conflict (key) do update set value = excluded.value`;
const reason = async (tx: Tx, sub: string) =>
  (await tx<{ reason: string }[]>`select reason from public.assistant_commission_exclusions where subscription_id = ${sub}`)[0]?.reason;
const now = async (tx: Tx) =>
  one(await tx<{ enabled: boolean; share: number }[]>`select public.renewal_commission_enabled() as enabled,
    public.renewal_commission_share()::int as share`);
const pendingReversals = async (tx: Tx, sub: string) =>
  one(await tx<{ n: number }[]>`select count(*)::int n from public.assistant_adjustments a join public.assistant_commissions c
    on c.id = a.commission_id where c.subscription_id = ${sub} and a.kind = 'reversal' and a.statement_id is null`).n;

test.describe('renewal commission switch (20261101000996)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('the switch: missing or JSON null is on; off keeps the share (an existing renewal settles at it)', async () => {
    await rolledBack(async (tx) => {
      await tx`delete from public.settings where key = 'renewal_commission_enabled'`;
      expect(await now(tx)).toEqual({ enabled: true, share: 50 });
      await tx`insert into public.settings (key, value) values ('renewal_commission_enabled', 'null'::jsonb)`;
      expect(await now(tx)).toEqual({ enabled: true, share: 50 });
      await tx`insert into public.settings (key, value) values ('renewal_commission_percent', '80'::jsonb)
        on conflict (key) do update set value = excluded.value`;
      await setOn(tx, false);
      expect(await now(tx)).toEqual({ enabled: false, share: 80 });
      await setOn(tx, true);
      expect(await now(tx)).toEqual({ enabled: true, share: 80 });
    });
  });

  test('off: the first earns in full, a renewal earns nothing; on again: no backfill, the next renewal earns', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'renoff1', PERCENT);
      await setOn(tx, false);
      const { student: s, sub } = await brought(tx, { by: a, phone: '+966500000971', price: 200 });
      await pay(tx, sub, 200);
      expect(await commissionOf(tx, s)).toMatchObject({ amount: '20.00', subscription_id: sub, status: 'earned' });
      const renewal = await subscription(tx, s, { price: 300 });
      const payment = await pay(tx, renewal, 300);
      expect(await renewalOf(tx, renewal)).toBeUndefined();
      expect([await reason(tx, sub), await reason(tx, renewal)]).toEqual([undefined, 'renewal_off']);
      const partial = await subscription(tx, s, { price: 300 });
      await pay(tx, partial, 100); // not fully paid while off: not excluded
      expect(await reason(tx, partial)).toBeUndefined();

      await setOn(tx, true);
      await tx`update public.payments set method = 'cash' where id = ${payment ?? ''}`; // a later touch re-runs the rule
      await tx`select public.evaluate_assistant_commission(${renewal})`; // as the API does after new terms
      expect(await renewalOf(tx, renewal)).toBeUndefined();
      await pay(tx, partial, 200); // fully paid while on: earns at the share
      expect(await renewalOf(tx, partial)).toMatchObject({ amount: '15.00', share_percent: 50, status: 'earned' });
      expect(await commissionOf(tx, s)).toMatchObject({ amount: '20.00', status: 'earned' });
    });
  });

  test('a renewal paid before the switch-off with no row yet is not excluded: it earns once the switch is on', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'renoff3'); // no terms yet: nothing is earned while on
      const { student: s, sub } = await brought(tx, { by: a, phone: '+966500000973', price: 100, broughtAt: iso(-3) });
      await pay(tx, sub, { amount: 100, at: iso(-2) });
      const renewal = await subscription(tx, s, { price: 300 });
      await pay(tx, renewal, { amount: 300, at: iso(-1) }); // fully paid while on
      await setOn(tx, false);
      await tx`insert into public.assistant_terms (assistant_id, commission_type, commission_value, commission_starts_on)
        values (${a}, 'percent', 10, '2000-01-01')`;
      await tx`select public.evaluate_assistant_commission(${renewal})`; // as the API does after new terms
      expect(await reason(tx, renewal)).toBeUndefined();
      expect(await renewalOf(tx, renewal)).toBeUndefined();
      expect(await commissionOf(tx, s)).toMatchObject({ amount: '10.00', status: 'earned' }); // the first is unchanged

      await setOn(tx, true);
      await tx`select public.evaluate_assistant_commission(${renewal})`;
      expect(await renewalOf(tx, renewal)).toMatchObject({ amount: '15.00', share_percent: 50, status: 'earned' });
    });
  });

  test('off keeps an earned renewal; a refund voids it; paid in full again while off, it is earned again', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'renoff2', PERCENT);
      const { student: s, sub } = await brought(tx, { by: a, phone: '+966500000972', price: 100 });
      await pay(tx, sub, 100);
      const second = await subscription(tx, s, { price: 300 });
      await pay(tx, second, 300);
      const earned = await renewalOf(tx, second);
      expect(earned).toMatchObject({ amount: '15.00', share_percent: 50, status: 'earned' });

      await setOn(tx, false);
      await pay(tx, second, 5); // re-runs the rule: still fully paid, kept as earned, untouched
      expect(await renewalOf(tx, second)).toEqual(earned);
      await pay(tx, second, { amount: 50, kind: 'refund' });
      expect(await renewalOf(tx, second)).toMatchObject({ status: 'voided' });
      await pay(tx, second, 50); // fully paid again while off: no clawback
      expect(await renewalOf(tx, second)).toMatchObject({ status: 'earned', amount: '15.00', share_percent: 50 });
      expect(await reason(tx, second)).toBeUndefined(); // it has a row: never excluded

      // In an approved statement: the refund writes a reversal, the repay cancels it out.
      const { statement_id: stmt } = await generate(tx, a, await openMonth(tx, a));
      await tx`select public.approve_assistant_statement(${stmt}, null)`;
      await pay(tx, second, { amount: 50, kind: 'refund' });
      expect(await renewalOf(tx, second)).toMatchObject({ status: 'voided', statement_id: stmt });
      expect(await pendingReversals(tx, second)).toBe(1); // -15 waits for next month's statement
      await pay(tx, second, 50);
      expect(await renewalOf(tx, second)).toMatchObject({ status: 'earned', amount: '15.00', statement_id: stmt });
      expect(await pendingReversals(tx, second)).toBe(0);
      expect(await commissionOf(tx, s)).toMatchObject({ amount: '10.00', status: 'earned' });
    });
  });
});
