import { expect, test } from '@playwright/test';
import { rolledBack } from '../../support/core/rls';
import { assistant, code, commissionOf, pay, subscription } from '../../support/sales/assistant';
import { importedCourse, moneyOf, stop } from '../../support/teaching/course-stop';

// «إلغاء الاشتراك» keeps the money (PR #464 review B1, migration 991): a STOPPED package (status
// cancelled, cancel_kind stopped) stays in every money reader, so nothing the money says changes.
// Rolled back.

const PERCENT = {
  commission_type: 'percent',
  commission_value: 10,
  commission_starts_on: '2000-01-01',
} as const;

test.describe('a stopped package keeps its money (991)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('commission, balance, kind and full-paid are the same after the stop and a re-evaluation', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'stop-money', PERCENT);
      const c = await importedCourse(tx, { phone: '+966500000911', broughtBy: a });
      await pay(tx, c.sub, 200);
      const commission = await commissionOf(tx, c.student);
      const before = { commission, money: await moneyOf(tx, c.sub) };
      expect(before.commission).toMatchObject({ status: 'earned', amount: '20.00', subscription_id: c.sub });
      expect(before.money).toMatchObject({ balance: '(3,5,t)', kind: 'first' });
      await stop(tx, { ...c, actor: a });
      await tx`select public.evaluate_assistant_commission(${c.sub})`;
      expect(await commissionOf(tx, c.student)).toEqual(before.commission);
      expect(await moneyOf(tx, c.sub)).toEqual(before.money);
    });
  });

  test("the 'first' commission never moves to the next package; the next one stays a renewal", async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'stop-first', PERCENT);
      const c = await importedCourse(tx, { phone: '+966500000912', broughtBy: a });
      await pay(tx, c.sub, 200);
      await stop(tx, { ...c, actor: a });
      const next = await subscription(tx, c.student, { price: 300 });
      await pay(tx, next, 300);
      expect(await commissionOf(tx, c.student)).toMatchObject({ status: 'earned', subscription_id: c.sub });
      expect((await moneyOf(tx, next)).kind).toBe('renewal');
    });
  });

  test('held lessons stay on the stopped package: the next package starts unused', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'stop-bal', PERCENT);
      const c = await importedCourse(tx, { phone: '+966500000913' });
      await stop(tx, { ...c, actor: a });
      const next = await subscription(tx, c.student, { price: 300 });
      expect((await moneyOf(tx, c.sub)).balance).toBe('(3,5,f)');
      expect((await moneyOf(tx, next)).balance).toBe('(0,8,t)');
    });
  });

  test('its payments stay writable (the family settles what it owes); an unused cancel stays frozen', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'stop-pay', PERCENT);
      const c = await importedCourse(tx, { phone: '+966500000914' });
      await pay(tx, c.sub, 50);
      await stop(tx, { ...c, actor: a });
      expect(await code(tx, () => pay(tx, c.sub, 150))).toBe('ok');
      const unused = await subscription(tx, c.student, { price: 100 });
      await tx`update public.subscriptions set status = 'cancelled', cancel_kind = 'unused' where id = ${unused}`;
      expect(await code(tx, () => pay(tx, unused, 10))).toBe('23514');
    });
  });
});
