import { describe, expect, it } from 'vitest';
import {
  earningsListQuery,
  teacherPaymentCreateSchema,
  teacherPaymentListQuery,
  teacherReceiptUploadSchema,
} from './earnings-schemas.js';

const ID = '5a000000-0000-4000-8000-000000000001';
const base = { amount: 100, method: 'bank', paidAt: '2026-10-01T09:00:00Z' };

describe('teacherPaymentCreateSchema', () => {
  it('accepts a payment with and without chosen sessions', () => {
    expect(teacherPaymentCreateSchema.safeParse(base).success).toBe(true);
    expect(teacherPaymentCreateSchema.safeParse({ ...base, earningIds: [ID], clientRequestId: ID }).success).toBe(true);
  });

  it('refuses zero, negative, three decimals, a future date, an empty selection, a bad method', () => {
    for (const bad of [{ amount: 0 }, { amount: -1 }, { amount: 1.005 }, { paidAt: '2999-01-01T00:00:00Z' }, { earningIds: [] }, { method: 'barter' }, { earningIds: ['x'] }]) {
      expect(teacherPaymentCreateSchema.safeParse({ ...base, ...bad }).success).toBe(false);
    }
  });
});

describe('receipt and list queries', () => {
  it('receipt: image or pdf up to 10 MB', () => {
    expect(teacherReceiptUploadSchema.safeParse({ mime: 'application/pdf', size: 100 }).success).toBe(true);
    expect(teacherReceiptUploadSchema.safeParse({ mime: 'text/html', size: 100 }).success).toBe(false);
    expect(teacherReceiptUploadSchema.safeParse({ mime: 'image/png', size: 11 * 1024 * 1024 }).success).toBe(false);
  });

  it('list: defaults, the unpaid alias, a bad status', () => {
    expect(earningsListQuery.parse({})).toEqual({ page: 1, pageSize: 25 });
    expect(earningsListQuery.parse({ status: 'unpaid', page: '2' })).toMatchObject({ status: 'unpaid', page: 2 });
    expect(earningsListQuery.safeParse({ status: 'x' }).success).toBe(false);
  });

  it('sessions: an allowlisted sort key and dir (R-NFR-08)', () => {
    expect(earningsListQuery.parse({ sort: 'amount', dir: 'desc' })).toMatchObject({ sort: 'amount', dir: 'desc' });
    expect(earningsListQuery.safeParse({ sort: 'outstanding' }).success).toBe(false);
  });

  it('payments: method, voided and sort filters; bad values rejected', () => {
    expect(teacherPaymentListQuery.parse({})).toEqual({ page: 1, pageSize: 25 });
    expect(teacherPaymentListQuery.parse({ method: 'cash', voided: 'false', sort: 'amount' })).toMatchObject({
      method: 'cash',
      voided: 'false',
      sort: 'amount',
    });
    expect(teacherPaymentListQuery.safeParse({ voided: 'yes' }).success).toBe(false);
    expect(teacherPaymentListQuery.safeParse({ sort: 'sessions' }).success).toBe(false);
  });
});
