import { describe, expect, it } from 'vitest';
import { chargeShare, refundAmountProblem, splitRefund } from './stop-refund.js';

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

describe('chargeShare (a card payment converted on record)', () => {
  it('the whole card: what the charge can still refund', () => {
    expect(chargeShare({ take: 100, refundable: 100, chargeRefundable: 26.67 })).toBe(26.67);
  });

  it('a part: proportional, rounded to the cent', () => {
    expect(chargeShare({ take: 50, refundable: 100, chargeRefundable: 26.8 })).toBe(13.4);
  });

  it('same currency: the same amount', () => {
    expect(chargeShare({ take: 40, refundable: 100, chargeRefundable: 100 })).toBe(40);
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
