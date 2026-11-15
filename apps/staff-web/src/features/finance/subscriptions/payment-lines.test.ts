import { describe, expect, it } from 'vitest';
import { partPaidText } from './payment-lines';

// Owner 2026-10-28: 81 SAR (90 − 10%), 80 received → still «غير مدفوعة», 1 left.
describe('partPaidText', () => {
  it('80 of 81 SAR: paid, price, symbol and what is left', () => {
    expect(partPaidText({ paid: 80, price: 81, currency: 'SAR' })).toBe('مدفوعة جزئيًا: 80 من 81 ر.س · الباقي 1');
  });

  it('nothing paid or paid in full: no line', () => {
    expect(partPaidText({ paid: 0, price: 81, currency: 'SAR' })).toBeNull();
    expect(partPaidText({ paid: 81, price: 81, currency: 'SAR' })).toBeNull();
  });
});

describe('partPaidText: a stopped course against its stored owed amount (owedFor)', () => {
  const stopped = { price: 400, currency: 'SAR', cancel_kind: 'stopped' };
  it('owes 150 with 100 paid: 50 left, never 300', () => {
    expect(partPaidText({ ...stopped, stop_owed_amount: 150, paid: 100 })).toBe('مدفوعة جزئيًا: 100 من 150 ر.س · الباقي 50');
  });

  it('after a refund stop (owed = what stays paid): no line', () => {
    expect(partPaidText({ ...stopped, stop_owed_amount: 100, paid: 100 })).toBeNull();
  });
});
