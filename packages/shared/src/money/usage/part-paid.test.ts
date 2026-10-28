import { describe, expect, it } from 'vitest';
import { partPaid, receiptShortfall } from './payment-state.js';

// Owner 2026-10-28 («Why is this unpaid»): 81 SAR (90 − 10%), 80 received → part-paid, 1 left.
describe('partPaid', () => {
  it('80 of 81 → 1 left', () => {
    expect(partPaid({ paid: 80, price: 81 })).toEqual({ paid: 80, price: 81, due: 1 });
  });

  it('cents stay exact', () => {
    expect(partPaid({ paid: 0.1, price: 0.3 })?.due).toBe(0.2);
  });

  it.each([
    [0, 81],
    [81, 81],
    [90, 81],
    [-5, 81],
    [0, 0],
  ])('paid %s of %s → null (not part-paid)', (paid, price) => {
    expect(partPaid({ paid, price })).toBeNull();
  });
});

describe('receiptShortfall', () => {
  it('80 against 81 due → 1 short', () => {
    expect(receiptShortfall({ amount: 80, due: 81 })).toBe(1);
  });

  it('covering or more → 0', () => {
    expect(receiptShortfall({ amount: 81, due: 81 })).toBe(0);
    expect(receiptShortfall({ amount: 100, due: 81 })).toBe(0);
    expect(receiptShortfall({ amount: 10, due: 0 })).toBe(0);
  });

  it('cents stay exact', () => {
    expect(receiptShortfall({ amount: 80.7, due: 81 })).toBe(0.3);
  });
});
