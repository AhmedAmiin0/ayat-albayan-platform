import { balanceOf, OLD_SUB_ID, SUB_ID, subscription } from '@/payments/fixtures';
import { partPaidLine } from '@/core/lib/money/format';
import { payablePackages } from './payment-form';

// Owner 2026-11-06: a stopped course owes its stored decision (owedFor), never price − paid.
const stopped = (owed: number, paid: number) =>
  subscription({
    id: OLD_SUB_ID,
    starts_on: '2026-08-27',
    status: 'cancelled',
    cancel_kind: 'stopped',
    stop_owed_amount: owed,
    paid,
  });
const current = subscription();

test('a stopped course settled by its stop (refund or «nothing») is not payable any more', () => {
  expect(payablePackages(balanceOf(stopped(50, 50), current)).map((p) => p.id)).toEqual([SUB_ID]);
  expect(payablePackages(balanceOf(stopped(0, 0), current)).map((p) => p.id)).toEqual([SUB_ID]);
});

test('a stopped course that still owes its chosen amount stays payable', () => {
  const ids = payablePackages(balanceOf(stopped(100, 50), current)).map((p) => p.id);
  expect(ids).toEqual([OLD_SUB_ID, SUB_ID]);
});

test('the part-paid line counts against the owed amount', () => {
  expect(partPaidLine({ ...stopped(100, 50), currency: 'SAR' })).toContain('100');
  expect(partPaidLine({ ...stopped(50, 50), currency: 'SAR' })).toBeNull();
});
