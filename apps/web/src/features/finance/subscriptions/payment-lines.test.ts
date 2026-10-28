import { describe, expect, it } from 'vitest';
import { partPaidText, shortfallText } from './payment-lines';

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

describe('shortfallText', () => {
  it('80 against 81 due: 1 short, in the package currency', () => {
    expect(shortfallText({ amount: 80, due: 81, currency: 'SAR' })).toBe(
      'المبلغ أقل من المستحق بـ 1 ر.س، ستبقى الباقة غير مدفوعة حتى يكتمل المبلغ',
    );
  });

  it('an amount that covers what is due: no note', () => {
    expect(shortfallText({ amount: 81, due: 81, currency: 'SAR' })).toBeNull();
    expect(shortfallText({ amount: 100, due: 81, currency: 'SAR' })).toBeNull();
  });
});
