import { describe, expect, it } from 'vitest';
import { salesPriceFloor } from './catalog.js';
import { customTotal } from './custom-total.js';

describe('salesPriceFloor (the deepest pill, owner 2026-11-05)', () => {
  it('is round(total × 0.85)', () => {
    expect([145, 1000, 0, 180].map(salesPriceFloor)).toEqual([123, 850, 0, 153]);
  });
});

describe('customTotal (the quote\'s «مبلغ مخصص»)', () => {
  it('reads the typed amount, Arabic digits too', () => {
    expect(customTotal('160', 153)).toEqual({ ok: true, amount: 160 });
    expect(customTotal('١٥٣٫٥', 153)).toEqual({ ok: true, amount: 153.5 });
  });

  it('the floor itself is allowed, one below is not', () => {
    expect(customTotal('153', 153)).toEqual({ ok: true, amount: 153 });
    expect(customTotal('152', 153)).toEqual({ ok: false, reason: 'below', min: 153 });
  });

  it('no floor (the admin): any positive amount', () => {
    expect(customTotal('1', null)).toEqual({ ok: true, amount: 1 });
  });

  it.each(['', '0', 'abc', '12.345', '-5'])('%j is not an amount', (text) => {
    expect(customTotal(text, null)).toEqual({ ok: false, reason: 'invalid' });
  });
});
