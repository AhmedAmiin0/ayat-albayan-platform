import { describe, expect, it } from 'vitest';
import { refundAmountProblem, splitRefund } from './stop-refund.js';

// «إلغاء مع استرداد» (owner 2026-11-02): card first, the rest manual; the cap.
describe('splitRefund: card first, the rest manual', () => {
  const cards = [
    { id: 'a', refundable: 100 },
    { id: 'b', refundable: 50 },
  ];

  it('within the first card', () => {
    expect(splitRefund({ amount: 80, cards, currency: 'SAR' })).toEqual({
      cards: [{ id: 'a', amount: 80 }],
      manual: 0,
    });
  });

  it('across both cards, then manual', () => {
    expect(splitRefund({ amount: 200.5, cards, currency: 'SAR' })).toEqual({
      cards: [
        { id: 'a', amount: 100 },
        { id: 'b', amount: 50 },
      ],
      manual: 50.5,
    });
  });

  it('no card: all manual; a card with nothing left is skipped', () => {
    expect(splitRefund({ amount: 30, cards: [], currency: 'SAR' })).toEqual({
      cards: [],
      manual: 30,
    });
    const spent = [
      { id: 'a', refundable: 0 },
      { id: 'b', refundable: -3 },
    ];
    expect(splitRefund({ amount: 30, cards: spent, currency: 'SAR' })).toEqual({
      cards: [],
      manual: 30,
    });
  });
});

describe('refundAmountProblem', () => {
  it('up to the computed refund is fine; above it, or 0, is refused', () => {
    expect(refundAmountProblem(250, 250, 'SAR')).toBeNull();
    expect(refundAmountProblem(100, 250, 'SAR')).toBeNull();
    expect(refundAmountProblem(250.01, 250, 'SAR')).toBe('refund_exceeds_allowed');
    expect(refundAmountProblem(0, 250, 'SAR')).toBe('refund_exceeds_allowed');
  });
});
