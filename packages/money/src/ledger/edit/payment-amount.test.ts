import { describe, expect, it } from 'vitest';
import { amountEditProblem, amountFromStripe, paymentAmountSchema } from './payment-amount.js';

const bank = { method: 'bank', kind: 'payment', amount: 300 } as const;

describe('«تعديل المبلغ» (owner 2026-11-02)', () => {
  it('a bank transfer may change in either direction', () => {
    expect(amountEditProblem(bank, { amount: 250, netPaid: 300 })).toBeNull();
    expect(amountEditProblem(bank, { amount: 500, netPaid: 300 })).toBeNull();
  });

  it('a card (Stripe) payment or refund never changes by hand', () => {
    expect(amountFromStripe('card')).toBe(true);
    expect(amountFromStripe('cash')).toBe(false);
    const card = { ...bank, method: 'card' } as const;
    expect(amountEditProblem(card, { amount: 250, netPaid: 300 })).toBe('stripe_amount_locked');
    expect(amountEditProblem({ ...card, kind: 'refund' }, { amount: 1, netPaid: 300 })).toBe(
      'stripe_amount_locked',
    );
  });

  it('may not take the net paid below 0: a payment under its refunds, a refund over the paid', () => {
    // 300 paid, 200 refunded: net 100.
    expect(amountEditProblem(bank, { amount: 150, netPaid: 100 })).toBe('refund_exceeds_paid');
    expect(amountEditProblem(bank, { amount: 200, netPaid: 100 })).toBeNull();
    const refund = { method: 'bank', kind: 'refund', amount: 200 } as const;
    expect(amountEditProblem(refund, { amount: 300, netPaid: 100 })).toBeNull();
    expect(amountEditProblem(refund, { amount: 300.01, netPaid: 100 })).toBe('refund_exceeds_paid');
  });

  it('the body is the amount only: positive, 2 decimals, nothing else', () => {
    expect(paymentAmountSchema.parse({ amount: 120.5 })).toEqual({ amount: 120.5 });
    for (const amount of [0, -1, 1.234]) expect(paymentAmountSchema.safeParse({ amount }).success).toBe(false);
    expect(paymentAmountSchema.safeParse({ amount: 1, method: 'cash' }).success).toBe(false);
  });
});
