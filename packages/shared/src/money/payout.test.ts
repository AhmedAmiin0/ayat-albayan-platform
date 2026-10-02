import { describe, expect, it } from 'vitest';
import { canTransitionPayout, payoutFor, payoutStatuses, PAYOUT_TRANSITIONS } from './payout.js';

const RATES = { 30: 50, 45: 70, 60: 90, 90: 130 } as const;

describe('payoutFor (R-PAY-02, R-TCH-04: counted lessons × rate, EGP)', () => {
  it('sums each duration line', () => {
    const calc = payoutFor({ lessons: { 45: 10, 30: 3 }, rates: RATES });
    expect(calc).toEqual({
      lessonsCount: 13,
      amount: 3 * 50 + 10 * 70,
      lines: [
        { duration: 30, lessons: 3, rate: 50, amount: 150 },
        { duration: 45, lessons: 10, rate: 70, amount: 700 },
      ],
      missingRates: [],
    });
  });

  it('no lessons → zero and no lines', () => {
    expect(payoutFor({ lessons: {}, rates: RATES })).toEqual({
      lessonsCount: 0,
      amount: 0,
      lines: [],
      missingRates: [],
    });
  });

  it('a duration taught without a rate is surfaced, not silently paid 0', () => {
    const calc = payoutFor({ lessons: { 60: 2, 45: 1 }, rates: { ...RATES, 60: null } });
    expect(calc.missingRates).toEqual([60]);
    expect(calc.amount).toBe(70);
    expect(calc.lessonsCount).toBe(3);
  });

  it('a missing rate for a duration not taught is fine', () => {
    expect(payoutFor({ lessons: { 45: 1 }, rates: { ...RATES, 90: null } }).missingRates).toEqual([]);
  });
});

describe('payoutStatuses (R-PAY-02 `completed`; late / no-show are owner settings, OFF)', () => {
  it.each([
    [false, false, ['completed']],
    [true, false, ['completed', 'late']],
    [false, true, ['completed', 'no_show']],
    [true, true, ['completed', 'late', 'no_show']],
  ])('countLate=%s countNoShow=%s → %j', (countLate, countNoShow, expected) => {
    expect(payoutStatuses({ countLate, countNoShow })).toEqual(expected);
  });
});

describe('payout status flow: draft → approved → paid (issue E3)', () => {
  it.each([
    ['draft', 'approved', true],
    ['approved', 'paid', true],
    ['draft', 'paid', false],
    ['approved', 'draft', false],
    ['paid', 'draft', false],
    ['paid', 'approved', false],
  ] as const)('%s → %s: %s', (from, to, ok) => {
    expect(canTransitionPayout(from, to)).toBe(ok);
  });

  it('paid is terminal', () => {
    expect(PAYOUT_TRANSITIONS.paid).toEqual([]);
  });
});
