import { expect, test } from '@playwright/test';
import { rolledBack, type Tx } from '../../support/core/rls';
import { code, pay, student, subscription } from '../../support/sales/assistant';

// Migration 20261107000100: a cancelled package's payments stay frozen (migrations 934 / 991); the
// one update let through is storage-move's (docs/45 §6): the receipt relocated to the same key in
// MinIO («minio:» + the old path) with every other column equal. Rolled back.

/** A payment on a package cancelled without a stop (an old row: the guards refuse it today). */
async function frozenPayment(tx: Tx, phone: string): Promise<{ id: string; sub: string }> {
  const st = await student(tx, { phone });
  const sub = await subscription(tx, st, { price: 200 });
  await tx`update public.subscriptions set status = 'cancelled', cancel_kind = 'unused' where id = ${sub}`;
  await tx`alter table public.payments disable trigger payments_refuse_cancelled`;
  await tx`alter table public.payments disable trigger payments_frozen_when_cancelled`;
  const id = (await pay(tx, sub, 200)) ?? '';
  await tx`update public.payments set receipt_path = ${`${sub}/r.jpg`} where id = ${id}`;
  await tx`alter table public.payments enable trigger payments_refuse_cancelled`;
  await tx`alter table public.payments enable trigger payments_frozen_when_cancelled`;
  return { id, sub };
}

const update = (tx: Tx, id: string, set: string) => () =>
  tx.unsafe(`update public.payments set ${set} where id = $1`, [id]);

test.describe('payments of a cancelled package: frozen except a receipt move (20261107000100)', () => {
  test.beforeEach(() =>
    test.skip(test.info().project.name !== 'desktop', 'database only: one run'),
  );

  test('every money column, another receipt, a move back and a delete are still refused', async () => {
    await rolledBack(async (tx) => {
      const { id, sub } = await frozenPayment(tx, '+966500001073');
      const refused = [
        'amount = 150',
        "kind = 'refund'",
        "paid_at = paid_at - interval '1 day'",
        "method = 'cash'",
        "note = 'x'",
        `receipt_path = '${sub}/other.jpg'`,
        `receipt_path = 'minio:${sub}/other.jpg'`,
        `receipt_path = 'minio:${sub}/r.jpg', amount = 150`,
        'receipt_path = null',
      ];
      for (const set of refused) expect(await code(tx, update(tx, id, set)), set).toBe('23514');
      const del = () => tx`delete from public.payments where id = ${id}`;
      expect(await code(tx, del)).toBe('23514');
    });
  });

  test('the receipt relocated to MinIO under the same key goes through, once', async () => {
    await rolledBack(async (tx) => {
      const { id, sub } = await frozenPayment(tx, '+966500001074');
      expect(await code(tx, update(tx, id, `receipt_path = 'minio:${sub}/r.jpg'`))).toBe('ok');
      const back = update(tx, id, `receipt_path = '${sub}/r.jpg'`);
      expect(await code(tx, back)).toBe('23514');
      const twice = update(tx, id, `receipt_path = 'minio:minio:${sub}/r.jpg'`);
      expect(await code(tx, twice)).toBe('23514');
    });
  });
});
