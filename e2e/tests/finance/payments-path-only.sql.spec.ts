import { expect, test } from '@playwright/test';
import { rolledBack, type Tx } from '../../support/core/rls';
import { assistant, commissionOf, one, pay, student, subscription } from '../../support/sales/assistant';

// Migration 20261107000100: a payments update re-runs the assistant commission only when a column
// the evaluation reads changes (subscription_id, amount, kind, paid_at, created_at, id). A receipt
// path (storage-move's «minio:» rewrite, docs/45 §6) or a note never moves money. Rolled back.

const PERCENT = {
  commission_type: 'percent',
  commission_value: 10,
  commission_starts_on: '2000-01-01',
} as const;

/** Replaces the evaluator by a recorder (rolled back with the rest). */
async function captureEvaluations(tx: Tx): Promise<() => Promise<number>> {
  await tx.unsafe(`create temp table evaluated (id serial, sub uuid) on commit drop;
    create or replace function public.evaluate_assistant_commission(p_subscription uuid) returns uuid
      language sql set search_path = '' as $$
      insert into pg_temp.evaluated (sub) values (p_subscription) returning null::uuid $$;`);
  return async () => one(await tx<{ n: number }[]>`select count(*)::int as n from pg_temp.evaluated`).n;
}

const setReceipt = (tx: Tx, id: string, path: string) =>
  tx`update public.payments set receipt_path = ${path} where id = ${id}`;

test.describe('payments: a path-only update moves no money (20261107000100)', () => {
  test.beforeEach(() =>
    test.skip(test.info().project.name !== 'desktop', 'database only: one run'),
  );

  test('receipt, its move to MinIO and a note evaluate nothing; each money column still does', async () => {
    await rolledBack(async (tx) => {
      const st = await student(tx, { phone: '+966500001071' });
      const sub = await subscription(tx, st, { price: 200 });
      const other = await subscription(tx, st, { price: 100 });
      const evaluated = await captureEvaluations(tx);
      const id = (await pay(tx, sub, 200)) ?? '';
      expect(await evaluated()).toBe(1); // INSERT as before
      await setReceipt(tx, id, `${sub}/r.jpg`);
      await setReceipt(tx, id, `minio:${sub}/r.jpg`);
      await tx`update public.payments set note = 'ملاحظة', method = 'cash' where id = ${id}`;
      await tx`update public.payments set amount = amount where id = ${id}`;
      expect(await evaluated()).toBe(1);
      await tx`update public.payments set amount = 150 where id = ${id}`;
      await tx`update public.payments set paid_at = paid_at - interval '1 hour' where id = ${id}`;
      await tx`update public.payments set kind = 'refund' where id = ${id}`;
      await tx`update public.payments set created_at = created_at - interval '1 minute' where id = ${id}`;
      expect(await evaluated()).toBe(5);
      await tx`update public.payments set subscription_id = ${other} where id = ${id}`;
      expect(await evaluated()).toBe(7); // the old package and the new one, as before
      await tx`delete from public.payments where id = ${id}`;
      expect(await evaluated()).toBe(8); // DELETE as before
    });
  });

  test('a receipt moved after the student was credited earns nothing; an amount fix still does', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'path-only', PERCENT);
      const st = await student(tx, { phone: '+966500001072' });
      const sub = await subscription(tx, st, { price: 200 });
      const id = (await pay(tx, sub, 200)) ?? '';
      await setReceipt(tx, id, `${sub}/r.jpg`);
      // Today's rules now differ from the ones the payment was evaluated under.
      await tx`update public.students set brought_by = ${a} where id = ${st}`;
      await setReceipt(tx, id, `minio:${sub}/r.jpg`);
      expect(await commissionOf(tx, st)).toBeUndefined();
      await tx`update public.payments set amount = 210 where id = ${id}`;
      expect(await commissionOf(tx, st)).toMatchObject({ status: 'earned', amount: '20.00' });
    });
  });
});
