import { describe, expect, it } from 'vitest';
import {
  effectiveLinkStatus,
  fromMinorUnits,
  isStripeLiveKey,
  isStripeTestKey,
  isWebhookSecret,
  linkAmountProblem,
  maskSecret,
  minLinkAmount,
  paymentLinkUrl,
  toMinorUnits,
} from './rules.js';

describe('payment link rules (docs/30)', () => {
  it('minor units: 2 decimals, no float drift', () => {
    expect(toMinorUnits(290.5)).toBe(29050);
    expect(toMinorUnits(0.1 + 0.2)).toBe(30);
    expect(fromMinorUnits(29050)).toBe(290.5);
  });

  it('the cap: null = no limit; 10 % of 290 → at least 261', () => {
    expect(minLinkAmount(290, null)).toBeNull();
    expect(minLinkAmount(290, 10)).toBe(261);
    expect(minLinkAmount(290.5, 10)).toBe(261.45);
    expect(linkAmountProblem({ amount: 1, reference: 290, maxDiscountPct: null })).toBeNull();
    expect(linkAmountProblem({ amount: 261, reference: 290, maxDiscountPct: 10 })).toBeNull();
    expect(linkAmountProblem({ amount: 260.99, reference: 290, maxDiscountPct: 10 })).toBe('discount_too_large');
    expect(linkAmountProblem({ amount: 400, reference: 290, maxDiscountPct: 0 })).toBeNull();
  });

  it('only sandbox keys pass; a live key is recognised', () => {
    expect(isStripeTestKey('rk_test_51Abc')).toBe(true);
    expect(isStripeTestKey('sk_test_51Abc')).toBe(true);
    expect(isStripeTestKey('rk_live_51Abc')).toBe(false);
    expect(isStripeTestKey('pk_test_51Abc')).toBe(false);
    expect(isStripeLiveKey('sk_live_x')).toBe(true);
    expect(isStripeLiveKey('rk_test_x')).toBe(false);
    expect(isWebhookSecret('whsec_abc123')).toBe(true);
    expect(isWebhookSecret('abc')).toBe(false);
  });

  it('masking keeps the prefix and the last 4 only', () => {
    expect(maskSecret('rk_test_51AbcdefghijWXYZ')).toBe('rk_test_••••WXYZ');
    expect(maskSecret('whsec_0123456789abcd')).toBe('whsec_••••abcd');
    expect(maskSecret('rk_test_abc')).toBe('rk_test_••••');
  });

  it('an open link past expires_at reads expired; other statuses stay', () => {
    const now = new Date('2026-10-28T10:00:00Z');
    expect(effectiveLinkStatus({ status: 'open', expires_at: '2026-10-28T09:59:59Z' }, now)).toBe('expired');
    expect(effectiveLinkStatus({ status: 'open', expires_at: '2026-10-29T00:00:00Z' }, now)).toBe('open');
    expect(effectiveLinkStatus({ status: 'paid', expires_at: '2026-10-01T00:00:00Z' }, now)).toBe('paid');
  });

  it('the platform link uses the first web origin', () => {
    expect(paymentLinkUrl('https://app.example.com/, https://old.example.com', 'tok')).toBe('https://app.example.com/pay/tok');
  });
});
