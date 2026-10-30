import { expect, test } from '@playwright/test';
import { assistant, brought, commissionOf, pay, renewalOf, riyadhDay, subscription } from '../../support/sales/assistant';
import { rolledBack, type Tx } from '../../support/core/rls';

// «If the course already started so dont give commission» (owner 2026-10-28, migration 20261028000942): a
// package whose starts_on is before the Riyadh day of its created_at, or with lessons_used_before > 0, earns
// no assistant commission, 'first' or 'renewal'. Each case is rolled back. Twin: @ab/shared assistant/started.ts.

const PERCENT = { commission_type: 'percent', commission_value: 10, commission_starts_on: '2000-01-01' } as const;
const rows = async (tx: Tx, s: string) =>
  (await tx<{ n: number }[]>`select count(*)::int as n from public.assistant_commissions where student_id = ${s}`)[0]?.n;

test.describe('no commission on a course that already started (20261028000942)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('a first package started yesterday, fully paid: no row; the same package starting today: a row', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'started1', PERCENT);
      const yesterday = await riyadhDay(tx, -1);
      const late = await brought(tx, { by: a, phone: '+966500000951', price: 200, startsOn: yesterday });
      await pay(tx, late.sub, 200);
      expect(await rows(tx, late.student)).toBe(0);
      const on = await brought(tx, { by: a, phone: '+966500000952', price: 200 });
      await pay(tx, on.sub, 200);
      expect(await commissionOf(tx, on.student)).toMatchObject({ amount: '20.00', subscription_id: on.sub, status: 'earned' });
    });
  });

  test('a renewal with lessons used before: no row; a renewal starting later: a row', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'started2', PERCENT);
      const { student: s, sub } = await brought(tx, { by: a, phone: '+966500000953', price: 200 });
      await pay(tx, sub, 200);
      const used = await subscription(tx, s, { price: 300, usedBefore: 1 });
      await pay(tx, used, 300);
      expect(await renewalOf(tx, used)).toBeUndefined();
      const future = await subscription(tx, s, { price: 300, startsOn: await riyadhDay(tx, 3) });
      await pay(tx, future, 300);
      expect(await renewalOf(tx, future)).toMatchObject({ amount: '15.00', share_percent: 50, status: 'earned' });
      expect(await commissionOf(tx, s)).toMatchObject({ amount: '20.00', subscription_id: sub });
    });
  });

  test('a started first still counts by order: the next package earns a renewal, never a first', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'started3', PERCENT);
      const { student: s, sub } = await brought(tx, { by: a, phone: '+966500000954', price: 200, startsOn: await riyadhDay(tx, -10) });
      await pay(tx, sub, 200);
      const next = await subscription(tx, s, { price: 200 });
      await pay(tx, next, 200);
      expect(await commissionOf(tx, s)).toBeUndefined();
      expect(await renewalOf(tx, next)).toMatchObject({ amount: '10.00', status: 'earned' });
    });
  });

  test('an earned row is never voided by the rule: a later edit to the start keeps it while fully paid', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'started4', PERCENT);
      const { student: s, sub } = await brought(tx, { by: a, phone: '+966500000955', price: 200 });
      await pay(tx, sub, 200);
      await tx`update public.subscriptions set starts_on = ${await riyadhDay(tx, -5)}, lessons_used_before = 1 where id = ${sub}`;
      await pay(tx, sub, 5); // any later payment re-runs the rule
      expect(await commissionOf(tx, s)).toMatchObject({ amount: '20.00', status: 'earned' });
    });
  });
});
