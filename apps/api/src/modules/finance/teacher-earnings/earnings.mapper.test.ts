import { describe, expect, it } from 'vitest';
import { earning, paymentRow, session } from './earnings.fakes';
import { toEarningView, toPaymentView } from './earnings.mapper';

describe('earnings mapper', () => {
  it('a session lists its student names and what is still outstanding', () => {
    expect(toEarningView(session(1, { paid_amount: 20, status: 'partially_paid' }))).toMatchObject({
      students: ['سهيلة'], amount: 70, paid_amount: 20, outstanding: 50, status: 'partially_paid', currency: 'EGP',
    });
  });

  it('a bare earning row has no students; an overpaid one owes nothing', () => {
    expect(toEarningView(earning(2, { amount: 50, paid_amount: 70, status: 'paid' }))).toMatchObject({ students: [], outstanding: 0 });
  });

  it('a payment exposes whether it has a receipt, never the storage path', () => {
    const v = toPaymentView(paymentRow({ receipt_path: 't/a.png' }));
    expect(v).toMatchObject({ has_receipt: true, sessions: 2, payout_id: null });
    expect(JSON.stringify(v)).not.toContain('t/a.png');
    expect(toPaymentView(paymentRow()).has_receipt).toBe(false);
  });
});
