import { describe, expect, it } from 'vitest';
import { courseStopSchema } from './course-stop.js';
import {
  owedAfterRefund,
  owedAmountProblem,
  owedByChoice,
  refundByChoice,
  STOP_REFUND_CHOICES,
} from './stop-choices.js';
import { refundAmountProblem, stopRefund } from './stop-refund.js';

// Owner 2026-11-06: the person stopping chooses the money outcome. 8 lessons for 400, 3 attended
// at 100 % (charge 150).
const pkg = { price: 400, lessonsTotal: 8, attended: 3, ratePercent: 100, currency: 'SAR' };
const full = stopRefund({ ...pkg, paid: 400 });
const part = stopRefund({ ...pkg, paid: 200 });

describe('refundByChoice × paid in full / partly paid', () => {
  it.each([
    ['unattended', full, 250],
    ['paid', full, 400],
    ['unattended', part, 50],
    ['paid', part, 200],
  ] as const)('%s → %d; after it nothing more is owed (owed = net paid after)', (choice, calc, n) => {
    const refund = refundByChoice(choice, calc);
    expect(refund).toBe(n);
    expect(owedAfterRefund(calc, refund, 'SAR')).toBe(calc.paid - n);
    expect(refundAmountProblem(refund, calc.paid, 'SAR')).toBeNull();
  });

  it('custom is the amount typed, 0 .. net paid (the allowed maximum)', () => {
    expect(refundByChoice('custom', part, 120)).toBe(120);
    expect(refundAmountProblem(0, part.paid, 'SAR')).toBeNull();
    expect(refundAmountProblem(200, part.paid, 'SAR')).toBeNull();
    expect(refundAmountProblem(200.01, part.paid, 'SAR')).toBe('refund_exceeds_allowed');
  });

  it('every computed choice stays within the allowed maximum (the charge is capped at the price)', () => {
    const steep = stopRefund({ ...pkg, paid: 400, ratePercent: 300 });
    expect(steep.charged).toBe(400);
    for (const choice of STOP_REFUND_CHOICES)
      expect(refundByChoice(choice, steep) <= steep.paid).toBe(true);
  });
});

describe('owedByChoice (a plain stop)', () => {
  const owe = { charged: 150, price: 400 };
  it.each([
    ['attended', 150],
    ['price', 400],
    ['nothing', 0],
  ] as const)('%s → %d', (choice, n) => {
    expect(owedByChoice(choice, owe)).toBe(n);
  });

  it('custom: the amount typed, 0 .. the price', () => {
    expect(owedByChoice('custom', owe, 275.5)).toBe(275.5);
    expect(owedAmountProblem(0, 400, 'SAR')).toBeNull();
    expect(owedAmountProblem(400, 400, 'SAR')).toBeNull();
    expect(owedAmountProblem(400.01, 400, 'SAR')).toBe('owed_exceeds_price');
    expect(owedAmountProblem(-1, 400, 'SAR')).toBe('owed_exceeds_price');
  });
});

describe('courseStopSchema money choices', () => {
  const base = {
    subscriptionId: '7b0a3a4e-4f7f-4c43-9a4c-6b6f3c7f0a11',
    reason: 'سافر',
    clientRequestId: '0f4b7c1e-2d3a-4e5f-8a9b-1c2d3e4f5a6b',
  };
  it('an old client’s { amount } is a custom refund', () => {
    const body = courseStopSchema.parse({ ...base, refund: { amount: 50 } });
    expect(body.refund).toEqual({ choice: 'custom', amount: 50 });
  });

  it('custom needs an amount; a computed choice does not', () => {
    expect(courseStopSchema.safeParse({ ...base, refund: { choice: 'custom' } }).success).toBe(false);
    expect(courseStopSchema.safeParse({ ...base, refund: { choice: 'paid' } }).success).toBe(true);
    expect(courseStopSchema.safeParse({ ...base, owe: { choice: 'custom' } }).success).toBe(false);
    expect(courseStopSchema.safeParse({ ...base, owe: { choice: 'custom', amount: 0 } }).success).toBe(true);
  });

  it('refund and owe are never both sent; negative amounts are refused', () => {
    const both = { ...base, refund: { choice: 'paid' }, owe: { choice: 'nothing' } };
    expect(courseStopSchema.safeParse(both).success).toBe(false);
    const negative = { ...base, owe: { choice: 'custom', amount: -5 } };
    expect(courseStopSchema.safeParse(negative).success).toBe(false);
  });
});
