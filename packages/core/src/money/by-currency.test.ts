import { describe, expect, it } from 'vitest';
import { sumByCurrency } from './by-currency.js';

describe('sumByCurrency (never one number across currencies)', () => {
  it('sums each currency on its own, in exact cents', () => {
    const rows = [
      { amount: 0.1, currency: 'SAR' },
      { amount: 0.2, currency: 'SAR' },
      { amount: 700, currency: 'EGP' },
    ];
    expect(sumByCurrency(rows)).toEqual({ SAR: 0.3, EGP: 700 });
  });

  it('leaves out rows the filter rejects, and a currency with none disappears', () => {
    const rows = [
      { amount: 50, currency: 'SAR', ok: true },
      { amount: 20, currency: 'USD', ok: false },
    ];
    expect(sumByCurrency(rows, (r) => r.ok)).toEqual({ SAR: 50 });
    expect(sumByCurrency([])).toEqual({});
  });

  it('rounds each row to cents before adding', () => {
    const rows = [
      { amount: 0.125, currency: 'SAR' },
      { amount: 0.125, currency: 'SAR' },
    ];
    expect(sumByCurrency(rows)).toEqual({ SAR: 0.26 });
  });
});
