import { describe, expect, it } from 'vitest';
import { paymentLinkCreateSchema, stripeSettingsPatchSchema } from './schemas.js';

const ID = '11111111-1111-4111-8111-111111111111';
const BODY = { studentId: ID, kind: 'new', pricing: { tier: 'weekly' }, amount: 250, currency: 'SAR', clientRequestId: ID };

describe('payment link commands', () => {
  it('a link: the package as the subscribe flow takes it plus a positive agreed amount', () => {
    expect(paymentLinkCreateSchema.safeParse(BODY).success).toBe(true);
    expect(paymentLinkCreateSchema.safeParse({ ...BODY, kind: 'renewal', startsOn: '2026-11-01' }).success).toBe(true);
    expect(paymentLinkCreateSchema.safeParse({ ...BODY, amount: 0 }).success).toBe(false);
    expect(paymentLinkCreateSchema.safeParse({ ...BODY, kind: 'gift' }).success).toBe(false);
    expect(paymentLinkCreateSchema.safeParse({ ...BODY, kind: undefined }).success).toBe(true); // the API derives it
    expect(paymentLinkCreateSchema.safeParse({ ...BODY, price: 1 }).success).toBe(false);
  });

  it('the subscribe step’s fields too: a teacher (uuid) and the lessons used before', () => {
    expect(paymentLinkCreateSchema.safeParse({ ...BODY, teacherId: ID, alreadyStarted: true, lessonsUsedBefore: 3 }).success).toBe(true);
    expect(paymentLinkCreateSchema.safeParse({ ...BODY, teacherId: 'x' }).success).toBe(false);
    expect(paymentLinkCreateSchema.safeParse({ ...BODY, lessonsUsedBefore: -1 }).success).toBe(false);
    expect(paymentLinkCreateSchema.safeParse({ ...BODY, phone: '+966501112223' }).success).toBe(false);
  });

  it('settings: keys are strings or null (clear); the cap 0–100 or null', () => {
    expect(stripeSettingsPatchSchema.safeParse({ enabled: true, maxDiscountPct: null, apiKey: null }).success).toBe(true);
    expect(stripeSettingsPatchSchema.safeParse({ maxDiscountPct: 101 }).success).toBe(false);
    expect(stripeSettingsPatchSchema.safeParse({ apiKey: '' }).success).toBe(false);
    expect(stripeSettingsPatchSchema.safeParse({ other: 1 }).success).toBe(false);
  });
});
