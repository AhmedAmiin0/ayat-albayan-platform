import { describe, expect, it } from 'vitest';
import { quoteCustom } from '../../index.js';

/** Standard SA: 180 ر.س, the sales floor round(180 × 0.85) = 153. */
const quote = { total: 180, afterDiscount: 180, currency: 'SAR' };
const labels = { min: 'min {amount} {currency}', invalid: 'invalid', currency: () => 'ر.س' };
const run = (on: boolean, text: string, admin = false) =>
  quoteCustom({ quote, typed: { on, text }, admin, labels });

describe('quoteCustom («مبلغ مخصص» on the chat quote)', () => {
  it('off: no total, valid, no error, whatever was typed', () => {
    expect(run(false, 'abc')).toEqual({ total: undefined, valid: true, error: null });
  });

  it('on: the typed amount is the total', () => {
    expect(run(true, '170')).toEqual({ total: 170, valid: true, error: null });
  });

  it('sales: the floor itself is allowed, under it says the minimum', () => {
    expect(run(true, '153').total).toBe(153);
    expect(run(true, '152')).toEqual({ total: undefined, valid: false, error: 'min 153 ر.س' });
  });

  it('not an amount is invalid', () => {
    expect(run(true, '')).toEqual({ total: undefined, valid: false, error: 'invalid' });
  });

  it('the admin has no floor', () => {
    expect(run(true, '1', true)).toEqual({ total: 1, valid: true, error: null });
  });

  it('no quote yet: no floor to apply', () => {
    const r = quoteCustom({ quote: undefined, typed: { on: true, text: '5' }, admin: false, labels });
    expect(r.total).toBe(5);
  });
});
