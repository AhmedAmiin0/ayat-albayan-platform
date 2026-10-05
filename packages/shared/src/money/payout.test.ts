import { describe, expect, it } from 'vitest';
import { canTransitionPayout, payoutStatuses, PAYOUT_CORRECTIONS, PAYOUT_TRANSITIONS } from './payout.js';

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

describe('payout corrections (one step back)', () => {
  it('approved reopens to draft, paid un-pays to approved, a draft has nothing to undo', () => {
    expect(PAYOUT_CORRECTIONS).toEqual({ approved: 'draft', paid: 'approved' });
    expect(PAYOUT_CORRECTIONS.draft).toBeUndefined();
  });
  it('the forward flow never goes back by itself', () => {
    expect(canTransitionPayout('paid', 'approved')).toBe(false);
    expect(canTransitionPayout('approved', 'draft')).toBe(false);
  });
});
