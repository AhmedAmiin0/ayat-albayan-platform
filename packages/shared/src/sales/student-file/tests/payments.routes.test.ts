import { describe, expect, it } from 'vitest';
import { salesPaymentRoutes as routes } from '../payments.routes';

const SUB = '22222222-2222-4222-8222-222222222222';
const MSG = '44444444-4444-4444-8444-444444444444';
const REQ = '33333333-3333-4333-8333-333333333333';
const PAYMENT = {
  id: 'p-1',
  subscription_id: SUB,
  student: { id: 'k-1', code: 'AB-0201', name: 'ريم', status: 'active' },
  amount: 180,
  currency: 'SAR',
  method: 'bank',
  kind: 'payment',
  paid_at: '2026-10-12T09:00:00.000Z',
  note: null,
  created_at: '2026-10-12T09:00:01.000Z',
};

describe('salesPaymentRoutes', () => {
  it('keeps the paths, the permissions and the tag the api serves today', () => {
    const wire = Object.values(routes).map((r) => [r.method, r.path, r.permissions, r.tags]);
    const own = [['self.sales_money'], ['sales']];
    expect(wire).toEqual([
      ['POST', '/sales/payments', ...own],
      ['POST', '/sales/payments/receipt-upload-url', ...own],
      ['POST', '/sales/payments/receipt-from-chat', ...own],
      ['PATCH', '/sales/payments/:id/amount', ['subscriptions.edit_terms'], ['sales']],
    ]);
  });

  it('takes a transfer with its request id and refuses a method she may not set', () => {
    const body = {
      subscriptionId: SUB,
      amount: 180,
      currency: 'SAR',
      paidAt: '2026-10-12T09:00:00Z',
    };
    const withId = { ...body, clientRequestId: REQ };
    expect(routes.create.body.safeParse(withId).success).toBe(true);
    expect(routes.create.body.safeParse({ ...withId, method: 'cash' }).success).toBe(false);
  });

  it('answers the payment with the student status, and refuses an unknown one', () => {
    expect(routes.create.response.parse(PAYMENT)).toEqual(PAYMENT);
    const unknown = { ...PAYMENT, student: { ...PAYMENT.student, status: 'gone' } };
    expect(routes.editAmount.response.safeParse(unknown).success).toBe(false);
  });

  it('copies a chat file by its message id and answers its receipt path', () => {
    const body = { subscriptionId: SUB, messageId: MSG };
    expect(routes.receiptFromChat.body.parse(body)).toEqual(body);
    expect(routes.receiptFromChat.response.parse({ receipt_path: `${SUB}/c.jpg` })).toEqual({
      receipt_path: `${SUB}/c.jpg`,
    });
  });

  it('edits an amount by a uuid id only', () => {
    expect(routes.editAmount.params.safeParse({ id: 'nope' }).success).toBe(false);
    expect(routes.editAmount.body.safeParse({ amount: 150, note: 'x' }).success).toBe(false);
  });
});
