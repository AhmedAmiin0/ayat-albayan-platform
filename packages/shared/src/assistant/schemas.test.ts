import { describe, expect, it } from 'vitest';
import {
  assistantAdjustmentSchema,
  assistantStatementGenerateSchema,
  assistantTermsSchema,
  broughtBySchema,
} from './schemas.js';

const ID = '7b8f5d1e-3c2a-4e5f-9a6b-1c2d3e4f5a6b';

describe('assistantTermsSchema', () => {
  const percent = { type: 'percent', value: 10, startsOn: '2026-10-01' };
  const salary = { amount: 3000, currency: 'EGP', startsOn: '2026-10-01' };

  it('accepts a percent, a fixed amount with its currency, a salary, or none of them', () => {
    expect(assistantTermsSchema.safeParse({ commission: percent, salary }).success).toBe(true);
    expect(assistantTermsSchema.safeParse({ commission: { type: 'fixed', value: 30, currency: 'EGP', startsOn: '2026-10-01' }, salary: null }).success).toBe(true);
    expect(assistantTermsSchema.safeParse({ commission: null, salary: null }).success).toBe(true);
  });

  it.each([
    ['fixed without a currency', { type: 'fixed', value: 30, startsOn: '2026-10-01' }, 'currency_fixed_only'],
    ['percent with a currency', { ...percent, currency: 'SAR' }, 'currency_fixed_only'],
    ['percent over 100', { ...percent, value: 101 }, 'percent_max_100'],
    ['three decimals', { ...percent, value: 10.123 }, 'too_many_decimals'],
    ['zero', { ...percent, value: 0 }, undefined],
    ['no start date', { type: 'percent', value: 10 }, undefined],
  ])('refuses %s', (_name, commission, message) => {
    const r = assistantTermsSchema.safeParse({ commission, salary: null });
    expect(r.success).toBe(false);
    if (message && !r.success) expect(r.error.issues.map((i) => i.message)).toContain(message);
  });

  it('refuses a salary without a currency or a start', () => {
    expect(assistantTermsSchema.safeParse({ commission: null, salary: { amount: 5 } }).success).toBe(false);
  });
});

describe('broughtBySchema', () => {
  it('takes one or many students and null to clear', () => {
    expect(broughtBySchema.safeParse({ studentIds: [ID], assistantId: ID }).success).toBe(true);
    expect(broughtBySchema.safeParse({ studentIds: [ID], assistantId: null, broughtAt: '2026-09-01T10:00:00Z' }).success).toBe(true);
  });
  it('refuses an empty list or a bad id', () => {
    expect(broughtBySchema.safeParse({ studentIds: [], assistantId: ID }).success).toBe(false);
    expect(broughtBySchema.safeParse({ studentIds: ['x'], assistantId: ID }).success).toBe(false);
  });
});

describe('statement and adjustment commands', () => {
  it('generate needs an assistant and a YYYY-MM month', () => {
    expect(assistantStatementGenerateSchema.safeParse({ assistantId: ID, month: '2026-10' }).success).toBe(true);
    expect(assistantStatementGenerateSchema.safeParse({ assistantId: ID, month: '2026-13' }).success).toBe(false);
  });

  it('an adjustment is signed, non-zero, two decimals, with a reason', () => {
    const ok = { assistantId: ID, amount: -50, currency: 'SAR', reason: 'خصم' };
    expect(assistantAdjustmentSchema.safeParse(ok).success).toBe(true);
    expect(assistantAdjustmentSchema.safeParse({ ...ok, amount: 25.5 }).success).toBe(true);
    expect(assistantAdjustmentSchema.safeParse({ ...ok, amount: 0 }).success).toBe(false);
    expect(assistantAdjustmentSchema.safeParse({ ...ok, amount: 1.234 }).success).toBe(false);
    expect(assistantAdjustmentSchema.safeParse({ ...ok, reason: ' ' }).success).toBe(false);
  });

  it('carries an optional request key, which must be a uuid', () => {
    const ok = { assistantId: ID, amount: -50, currency: 'SAR', reason: 'خصم' };
    expect(assistantAdjustmentSchema.parse({ ...ok, requestId: ID }).requestId).toBe(ID);
    expect(assistantAdjustmentSchema.parse(ok).requestId).toBeUndefined();
    expect(assistantAdjustmentSchema.safeParse({ ...ok, requestId: 'not-a-uuid' }).success).toBe(false);
  });
});
