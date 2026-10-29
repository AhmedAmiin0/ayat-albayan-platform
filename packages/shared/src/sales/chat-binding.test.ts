import { describe, expect, it } from 'vitest';
import { chatBinding, salesChatReceiptsQuerySchema, salesPaymentCreateSchema, salesQuoteSchema } from './money.js';

// sales.renew_any (owner 2026-10-29, docs/16 row 38): the chat's phone rides only on a write about a child not hers.
const ID = '11111111-1111-4111-8111-111111111111';
const PHONE = '+966551110000';
const STUDENTS = [{ id: 'mine', mine: true }, { id: 'theirs', mine: false }, { id: 'old-api' }];

describe('chatBinding', () => {
  it('the phone for a child listed mine: false; nothing for hers, an old API (no flag) or an unknown child', () => {
    expect(chatBinding(STUDENTS, { studentId: 'theirs', phone: PHONE })).toEqual({ phone: PHONE });
    for (const studentId of ['mine', 'old-api', 'nope']) expect(chatBinding(STUDENTS, { studentId, phone: PHONE })).toEqual({});
  });

  it('nothing without a chat phone', () => {
    expect(chatBinding(STUDENTS, { studentId: 'theirs', phone: '' })).toEqual({});
  });
});

describe('the optional chat phone on the sales money bodies', () => {
  it('is accepted when E.164, refused otherwise, and optional (old clients)', () => {
    expect(salesQuoteSchema.safeParse({ studentId: ID, pricing: { tier: 'weekly' }, phone: PHONE }).success).toBe(true);
    expect(salesQuoteSchema.safeParse({ studentId: ID, pricing: { tier: 'weekly' }, phone: '0551110000x' }).success).toBe(false);
    expect(salesChatReceiptsQuerySchema.parse({ studentId: ID })).toEqual({ studentId: ID });
    const pay = { subscriptionId: ID, amount: 290, currency: 'SAR', paidAt: '2026-10-11T09:00:00Z', clientRequestId: ID };
    expect(salesPaymentCreateSchema.parse({ ...pay, phone: PHONE }).phone).toBe(PHONE);
  });
});
