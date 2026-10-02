import { describe, expect, it } from 'vitest';
import {
  dateRangeQuery,
  expenseCreateSchema,
  monthParam,
  monthStart,
  paymentCreateSchema,
  payoutPaySchema,
  receiptUploadSchema,
  subscriptionCreateSchema,
  subscriptionUpdateSchema,
} from './schemas.js';

const SUB = '00000000-0000-4000-8000-000000000001';
const payment = { subscriptionId: SUB, amount: 120, currency: 'SAR', method: 'bank', paidAt: '2026-10-01T09:00:00Z' };

describe('subscriptionCreateSchema (R-SUB-01: priced from the catalog, never typed)', () => {
  const base = { studentId: SUB, startsOn: '2026-10-01' };
  it('a package: duration defaults to 45, discount to 0', () => {
    const r = subscriptionCreateSchema.parse({ ...base, pricing: { tier: 'starter', country: 'sa' } });
    expect(r.pricing).toEqual({ tier: 'starter', country: 'SA', duration: 45, discount: 0 });
  });

  it('a custom count 1–60', () => {
    expect(subscriptionCreateSchema.safeParse({ ...base, pricing: { count: 10 } }).success).toBe(true);
    expect(subscriptionCreateSchema.safeParse({ ...base, pricing: { count: 61 } }).success).toBe(false);
  });

  it.each([
    ['both tier and count', { tier: 'starter', count: 8 }],
    ['neither', {}],
    ['a 90-minute duration (only weekly is 90, fixed)', { tier: 'starter', duration: 90 }],
    ['a discount over 100', { tier: 'starter', discount: 101 }],
    ['an unknown tier', { tier: 'gold' }],
  ])('rejects %s', (_name, pricing) => {
    expect(subscriptionCreateSchema.safeParse({ ...base, pricing }).success).toBe(false);
  });

  it('has no price field to type: an extra price is dropped', () => {
    const r = subscriptionCreateSchema.parse({ ...base, pricing: { tier: 'bulk' }, price: 1 });
    expect(r).not.toHaveProperty('price');
  });

  it('update: pause flag and dates only', () => {
    expect(subscriptionUpdateSchema.parse({ paused: true })).toEqual({ paused: true });
    expect(subscriptionUpdateSchema.parse({ renewsOn: null })).toEqual({ renewsOn: null });
  });
});

describe('paymentCreateSchema (R-PAY-01)', () => {
  it('accepts a bank transfer with 2 decimals', () => {
    expect(paymentCreateSchema.safeParse({ ...payment, amount: 99.95 }).success).toBe(true);
  });

  it.each([
    ['zero', { amount: 0 }],
    ['negative', { amount: -5 }],
    ['3 decimals', { amount: 1.005 }],
    ['lower-case currency', { currency: 'sar' }],
    ['an unknown method', { method: 'card' }],
    ['a date without offset', { paidAt: '2026-10-01T09:00:00' }],
    ['a future date', { paidAt: '2099-01-01T00:00:00Z' }],
  ])('rejects %s', (_name, patch) => {
    expect(paymentCreateSchema.safeParse({ ...payment, ...patch }).success).toBe(false);
  });

  it('a future date says paid_at_future', () => {
    const r = paymentCreateSchema.safeParse({ ...payment, paidAt: '2099-01-01T00:00:00Z' });
    expect(r.error?.issues[0]?.message).toBe('paid_at_future');
  });

  it('receipt upload: image or PDF up to 10 MB', () => {
    expect(receiptUploadSchema.safeParse({ subscriptionId: SUB, mime: 'image/jpeg', size: 2048 }).success).toBe(true);
    const r = receiptUploadSchema.safeParse({ subscriptionId: SUB, mime: 'audio/mpeg', size: 10 });
    expect(r.error?.issues[0]?.message).toBe('receipt_type');
    const big = receiptUploadSchema.safeParse({ subscriptionId: SUB, mime: 'image/png', size: 10 * 1024 * 1024 + 1 });
    expect(big.error?.issues[0]?.message).toBe('receipt_too_large');
  });
});

describe('expenses, payouts, months, ranges (R-RPT-02, R-PAY-02)', () => {
  it('expense: currency defaults to EGP (the owner tracker)', () => {
    const r = expenseCreateSchema.parse({ month: '2026-08', category: 'ads', amount: 8000 });
    expect(r.currency).toBe('EGP');
  });

  it.each(['2026-13', '2026-1', '26-01', '2026-00'])('month %s is invalid', (m) => {
    expect(monthParam.safeParse(m).success).toBe(false);
  });

  it('monthStart is the first day', () => {
    expect(monthStart('2026-09')).toBe('2026-09-01');
  });

  it('payout pay: optional past paidAt', () => {
    expect(payoutPaySchema.safeParse({}).success).toBe(true);
    expect(payoutPaySchema.safeParse({ paidAt: '2099-01-01T00:00:00Z' }).success).toBe(false);
  });

  it.each([
    [{ from: '2026-09-01', to: '2026-09-30' }, true],
    [{ from: '2026-09-30', to: '2026-09-01' }, false],
    [{ from: '2025-01-01', to: '2026-06-01' }, false],
  ])('date range %j → %s', (q, ok) => {
    expect(dateRangeQuery.safeParse(q).success).toBe(ok);
  });
});
