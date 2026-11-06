import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { rolledBack, type Tx } from '../../support/core/rls';
import { assistant, code, commissionOf, pay } from '../../support/sales/assistant';
import { importedCourse, stop } from '../../support/teaching/course-stop';

// The stop sheet's money choice (owner 2026-11-06, migrations 20261106000100 / 101): the stop
// stores what the course is still owed for; a stop's refund never touches the assistant's
// commission, while a refund on a running package voids it as before. Rolled back.

const PERCENT = {
  commission_type: 'percent',
  commission_value: 10,
  commission_starts_on: '2000-01-01',
} as const;

const owedOf = async (tx: Tx, sub: string) =>
  (
    await tx<
      { amount: string | null; choice: string | null }[]
    >`select stop_owed_amount::text as amount,
    stop_owed_choice as choice from public.subscriptions where id = ${sub}`
  )[0];

test.describe('stop owed amount and commission (20261106000100 / 101)', () => {
  test.beforeEach(() =>
    test.skip(test.info().project.name !== 'desktop', 'database only: one run'),
  );

  test('the stop stores the chosen owed amount; an old caller stores nothing (backfill)', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'owed-store', PERCENT);
      const c = await importedCourse(tx, { phone: '+966500000921' });
      await stop(tx, { ...c, actor: a, owed: { amount: 75, choice: 'attended' } });
      expect(await owedOf(tx, c.sub)).toEqual({ amount: '75.00', choice: 'attended' });
      const old = await importedCourse(tx, { phone: '+966500000922', price: 300 });
      await stop(tx, { ...old, actor: a });
      // The old API during the deploy: nothing stored, owedFor falls back to the price.
      expect(await owedOf(tx, old.sub)).toEqual({ amount: null, choice: null });
    });
  });

  test('a retry of the same stop with another decision is refused; the same one replays', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'owed-replay', PERCENT);
      const c = await importedCourse(tx, { phone: '+966500000925' });
      const first = { ...c, actor: a, requestId: randomUUID() };
      await stop(tx, { ...first, owed: { amount: 75, choice: 'attended' } });
      const same = await stop(tx, { ...first, owed: { amount: 75, choice: 'attended' } });
      expect(same.replayed).toBe(true);
      const other = () => stop(tx, { ...first, owed: { amount: 0, choice: 'nothing' } });
      expect(await code(tx, other)).toBe('stop_mismatch');
    });
  });

  test('a stop refund leaves the earned commission untouched', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'owed-keep', PERCENT);
      const c = await importedCourse(tx, { phone: '+966500000923', broughtBy: a });
      await pay(tx, c.sub, 200);
      const before = await commissionOf(tx, c.student);
      expect(before).toMatchObject({ status: 'earned', amount: '20.00' });
      await stop(tx, { ...c, actor: a, owed: { amount: 50, choice: 'refund_unattended' } });
      await pay(tx, c.sub, { amount: 150, kind: 'refund' });
      await tx`select public.evaluate_assistant_commission(${c.sub})`;
      expect(await commissionOf(tx, c.student)).toEqual(before);
    });
  });

  test('a refund on a running package voids its commission as before', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'owed-void', PERCENT);
      const c = await importedCourse(tx, { phone: '+966500000924', broughtBy: a });
      await pay(tx, c.sub, 200);
      await pay(tx, c.sub, { amount: 50, kind: 'refund' });
      expect((await commissionOf(tx, c.student))?.status).toBe('voided');
    });
  });
});
