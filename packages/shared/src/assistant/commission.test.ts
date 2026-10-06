import { describe, expect, it } from 'vitest';
import { fromCents, toCents } from '../money/earnings.js';
import { commissionAction, computeCommission } from './commission.js';

const pct = (value: number, base: number, baseCurrency = 'SAR') =>
  computeCommission({ type: 'percent', value, currency: null, base, baseCurrency });

describe('computeCommission: percent of the subscription price, in its own currency', () => {
  it.each([
    [10, 250, 25],
    [10, 80.5, 8.05],
    [12.5, 200, 25],
    [15, 99.99, 15],
    [7.5, 333.33, 25],
    [100, 120, 120],
    [0.5, 100, 0.5],
  ])('%s%% of %s = %s', (value, base, expected) => {
    expect(pct(value, base)).toEqual({ amount: expected, currency: 'SAR' });
  });

  it('takes the subscription currency, whatever it is', () => {
    expect(pct(10, 100, 'USD')).toEqual({ amount: 10, currency: 'USD' });
    expect(pct(10, 1000, 'EGP')?.currency).toBe('EGP');
  });

  it('rounds half up to 2 decimals like SQL round(numeric, 2)', () => {
    expect(pct(10, 0.04)).toBeNull(); // 0.004 rounds to nothing
    expect(pct(10, 0.05)).toEqual({ amount: 0.01, currency: 'SAR' }); // 0.005 rounds up
    expect(pct(10, 0.15)).toEqual({ amount: 0.02, currency: 'SAR' }); // 0.015
    expect(pct(33.33, 100.01)?.amount).toBe(33.33); // 33.3333 -> 33.33
    expect(pct(33.33, 1.5)?.amount).toBe(0.5); // 0.49995 -> 0.50
  });

  it('earns nothing for zero, negative, non-finite or over-100 values and a free package', () => {
    expect(pct(0, 100)).toBeNull();
    expect(pct(-5, 100)).toBeNull();
    expect(pct(Number.NaN, 100)).toBeNull();
    expect(pct(101, 100)).toBeNull();
    expect(pct(10, 0)).toBeNull();
  });
});

describe('computeCommission: fixed amount in its own currency', () => {
  const fixed = (value: number, currency: string | null) =>
    computeCommission({ type: 'fixed', value, currency, base: 500, baseCurrency: 'USD' });

  it('ignores the price and keeps the term currency', () => {
    expect(fixed(30, 'EGP')).toEqual({ amount: 30, currency: 'EGP' });
    expect(fixed(12.34, 'SAR')).toEqual({ amount: 12.34, currency: 'SAR' });
  });

  it('needs a currency and an amount above zero', () => {
    expect(fixed(30, null)).toBeNull();
    expect(fixed(0, 'EGP')).toBeNull();
  });
});

describe('cents helpers', () => {
  it('round-trips two decimals exactly', () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(fromCents(toCents(19.99))).toBe(19.99);
  });
});

describe('commissionAction: the evaluator decision', () => {
  const earned = (stillFullyPaid: boolean) => ({ status: 'earned' as const, voidAuto: null, stillFullyPaid });
  const voided = (voidAuto: boolean) => ({ status: 'voided' as const, voidAuto, stillFullyPaid: false });

  it.each([
    ['no row, eligible', null, true, 'earn'],
    ['no row, not eligible', null, false, 'none'],
    ['earned and still fully paid', earned(true), true, 'keep'],
    ['earned and still fully paid, even if no longer eligible', earned(true), false, 'keep'],
    ['earned, refunded below the price', earned(false), true, 'void'],
    ['earned, payment deleted', earned(false), false, 'void'],
    ['voided by a payment change, paid in full again', voided(true), true, 'reinstate'],
    ['voided by a payment change, still not paid', voided(true), false, 'none'],
    ['voided by an admin stays voided', voided(false), true, 'keep'],
  ] as const)('%s -> %s', (...row) => {
    expect(commissionAction(row[1], row[2])).toBe(row[3]);
  });
});
