import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type { Db } from '@/common/db/db.module';
import { errorCode } from '@/common/http/errors';
import { migrationPath } from '@/common/db/repo-paths.test-util';
import { PaymentsRepo, type PaymentRow } from './payments.repo';
import { writePayment } from './payment-amount-edit';

// «تعديل المبلغ» atomic (review 2026-11-05): the check and the write in one locked
// transaction.
const sql = readFileSync(migrationPath('20261105001000_payment_amount_set.sql'), 'utf8');
const code = sql.replace(/--.*$/gm, '');

function repoWith(error: { message: string } | null) {
  const single = vi.fn().mockResolvedValue({ data: { id: 'p1', amount: 80 }, error: null });
  const eq = vi.fn(() => ({ single }));
  const db = {
    rpc: vi.fn().mockResolvedValue({ data: error ? null : true, error }),
    from: vi.fn(() => ({ select: vi.fn(() => ({ eq })) })),
  };
  return { repo: new PaymentsRepo(db as unknown as Db), db };
}

const codeOf = (p: Promise<unknown>) => p.then(() => 'ok', (e: unknown) => errorCode(e));

describe('PaymentsRepo.setAmount', () => {
  it('calls payment_amount_set with the amount read, then answers the stored row', async () => {
    const { repo, db } = repoWith(null);
    const row = await repo.setAmount('p1', { amount: 80, expected: 100 });
    expect(row).toEqual({ id: 'p1', amount: 80 });
    const args = { p_payment: 'p1', p_amount: 80, p_expected: 100 };
    expect(db.rpc).toHaveBeenCalledWith('payment_amount_set', args);
  });

  const CODES = ['refund_exceeds_paid', 'payment_amount_changed', 'payment_not_found'];
  it.each(CODES)('%s → refused with that code', async (c) => {
    const { repo } = repoWith({ message: c });
    expect(await codeOf(repo.setAmount('p1', { amount: 1, expected: 100 }))).toBe(c);
  });
});

describe('writePayment', () => {
  it('writes the other fields first, then the amount under the lock', async () => {
    const order: string[] = [];
    const payments = {
      update: vi.fn(async () => (order.push('update'), {} as PaymentRow)),
      setAmount: vi.fn(async () => (order.push('amount'), {} as PaymentRow)),
    };
    const before = { id: 'p1', amount: 100 } as PaymentRow;
    await writePayment(payments, before, { amount: 80, write: { note: 'x' } });
    expect(order).toEqual(['update', 'amount']);
    expect(payments.setAmount).toHaveBeenCalledWith('p1', { amount: 80, expected: 100 });
  });
});

describe('migration 20261105001000 payment_amount_set', () => {
  it('locks the package, then the payment, before the check', () => {
    const lockSub = code.indexOf('from public.subscriptions s where s.id = v_sub for update');
    const lockPay = code.indexOf('where p.id = p_payment for update');
    const check = code.indexOf("raise exception 'refund_exceeds_paid'");
    expect(lockSub).toBeGreaterThan(0);
    expect(lockPay).toBeGreaterThan(lockSub);
    expect(check).toBeGreaterThan(lockPay);
  });

  it('refuses a stale amount and clears the fx fields; service role only', () => {
    expect(code).toMatch(/v_row\.amount is distinct from p_expected/);
    expect(code).toMatch(/original_amount = null, original_currency = null, fx_rate = null/);
    const fn = 'function public.payment_amount_set(uuid, numeric, numeric)';
    expect(code).toContain(`revoke execute on ${fn} from public, anon, authenticated`);
  });
});
