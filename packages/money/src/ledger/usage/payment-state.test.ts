import { describe, expect, it } from 'vitest';
import { convertPayment, netPaid, netPaidIn, paymentState } from './payment-state';

describe('paymentState («مدفوع جزئيًا» is derived)', () => {
  it('none / partial / full by cents', () => {
    expect(paymentState({ paid: 0, price: 450 })).toBe('none');
    expect(paymentState({ paid: 0.01, price: 450 })).toBe('partial');
    expect(paymentState({ paid: 449.99, price: 450 })).toBe('partial');
    expect(paymentState({ paid: 450, price: 450 })).toBe('full');
    expect(paymentState({ paid: 500, price: 450 })).toBe('full');
  });

  it('a free package is full; a refund below zero is none', () => {
    expect(paymentState({ paid: 0, price: 0 })).toBe('full');
    expect(paymentState({ paid: -50, price: 450 })).toBe('none');
  });
});

describe('netPaid (a refund counts against what was paid)', () => {
  it('payments minus refunds, in cents', () => {
    expect(netPaid([{ amount: 300.1, kind: 'payment' }, { amount: 150.2, kind: 'payment' }, { amount: 50.05, kind: 'refund' }])).toBe(400.25);
    expect(netPaid([])).toBe(0);
  });
});

describe('netPaidIn (only rows in the package currency count)', () => {
  const rows = [
    { amount: 300, kind: 'payment', currency: 'SAR' },
    { amount: 50.1, kind: 'refund', currency: 'SAR' },
    { amount: 999, kind: 'payment', currency: 'USD' },
  ] as const;

  it('skips a legacy row in another currency', () => {
    expect(netPaidIn(rows, 'SAR')).toBe(249.9);
    expect(netPaidIn(rows, 'USD')).toBe(999);
  });

  it('no row in that currency is 0', () => {
    expect(netPaidIn(rows, 'EGP')).toBe(0);
    expect(netPaidIn([], 'SAR')).toBe(0);
  });
});

describe('convertPayment (another currency → the package currency)', () => {
  it('cross rate through SAR, rounded to cents', () => {
    // 1 SAR = 13 EGP, 1 SAR = 0.2667 USD: 100 USD → 4874.39 EGP
    const r = convertPayment({ amount: 100, sarToSent: 0.2667, sarToPackage: 13 });
    expect(r.amount).toBe(4874.39);
    expect(r.rate).toBeCloseTo(48.74390701, 6);
  });

  it('the same currency converts 1:1', () => {
    expect(convertPayment({ amount: 145, sarToSent: 1, sarToPackage: 1 })).toEqual({ amount: 145, rate: 1 });
  });
});
