import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { STUDENT_ID, SUB_ID, subRow } from '@/modules/finance/subscriptions/money/money.fakes';
import { moneyApp, resetMocks, type Mocks } from '@/modules/finance/subscriptions/test-app';
import { CREATE, salesDefaults } from './sales-money.fakes';
import { salesPriceFloor } from './sales-money.scope';

// «مبلغ مخصص» (owner 2026-11-05 review): the assistant's custom price has the pills' floor
// (the weekly SA quote is 145: at least round(145 × 0.85) = 123); the admin's POST /subscriptions
// has none.
const post = (customPrice: number) => ({
  method: 'POST' as const,
  url: '/sales/subscriptions',
  token: 'salesA' as const,
  body: { ...CREATE, customPrice },
});

describe('the custom price floor', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    salesDefaults(m);
  });

  it('is the deepest pill’s price (15 %, rounded like the quote)', () => {
    expect([145, 1000, 0].map(salesPriceFloor)).toEqual([123, 850, 0]);
  });

  it('the assistant below it: 403 discount_not_allowed, the lowest price, nothing stored', async () => {
    for (const amount of [1, 122.99]) {
      const res = await call(post(amount));
      expect(res.statusCode).toBe(403);
      expect(res.json()).toMatchObject({ code: 'discount_not_allowed', min: 123, currency: 'SAR' });
    }
    expect(m.subs.insert).not.toHaveBeenCalled();
  });

  it('the assistant at the floor: created at her price', async () => {
    m.subs.insert.mockResolvedValue(subRow({ price: 123 }));
    expect((await call(post(123))).statusCode).toBe(201);
    expect(m.subs.insert).toHaveBeenCalledWith(expect.objectContaining({ price: 123 }));
  });

  it('the admin below it (POST /subscriptions): created, no floor', async () => {
    const pricing = { tier: 'weekly' };
    const body = { studentId: STUDENT_ID, startsOn: '2026-10-01', pricing, customPrice: 1 };
    expect((await call({ method: 'POST', url: '/subscriptions', body })).statusCode).toBe(201);
    expect(m.subs.insert).toHaveBeenCalledWith(expect.objectContaining({ price: 1 }));
  });

  it('a replay (same clientRequestId) returns the stored package before any re-quote', async () => {
    m.subs.byRequest.mockResolvedValue({ id: SUB_ID });
    m.pricing.quote.mockRejectedValue(new Error('the replay must not re-quote'));
    const res = await call(post(130));
    expect(res.statusCode).toBe(201);
    expect(m.pricing.quote).not.toHaveBeenCalled();
    expect(m.subs.insert).not.toHaveBeenCalled();
  });
});
