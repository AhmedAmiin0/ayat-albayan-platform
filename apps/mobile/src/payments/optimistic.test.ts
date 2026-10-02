import { balanceOf, OLD_SUB_ID, page, payment, STUDENT, SUB_ID, subscription } from './fixtures';
import { isPending, pendingPayment, withPaid, withPayment, type PaymentInput } from './optimistic';

const input: PaymentInput = {
  subscriptionId: SUB_ID,
  student: STUDENT,
  amount: 72.5,
  currency: 'SAR',
  method: 'wallet',
  paidAt: '2026-10-01T10:00:00.000Z',
  receipt: null,
};

test('the pending row carries the input and is marked pending', () => {
  const row = pendingPayment(input);
  expect(row).toMatchObject({ subscription_id: SUB_ID, amount: 72.5, method: 'wallet', paid_at: input.paidAt });
  expect(row.recorded_by).toBeNull();
  expect(isPending(row)).toBe(true);
  expect(isPending(payment())).toBe(false);
});

test('withPayment: first in the page, total + 1; no cached page stays none', () => {
  const row = pendingPayment(input);
  const next = withPayment(page([payment()]), row);
  expect(next?.items.map((p) => p.id)).toEqual([row.id, 'p1']);
  expect(next?.total).toBe(2);
  expect(withPayment(undefined, row)).toBeUndefined();
});

test('withPaid: only that package, in current and in the list, to the cent', () => {
  const old = subscription({ id: OLD_SUB_ID, paid: 145 });
  const current = subscription({ paid: 0.1 });
  const next = withPaid(balanceOf(old, current), { subscriptionId: SUB_ID, amount: 0.2 });
  expect(next?.current?.paid).toBe(0.3);
  expect(next?.packages.map((p) => p.paid)).toEqual([145, 0.3]);
  expect(withPaid(undefined, input)).toBeUndefined();
  expect(withPaid(balanceOf(), input)?.current).toBeNull();
});
