import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { REQUEST_ID, STUDENT_ID, SUB_ID, subRow } from '@/modules/finance/subscriptions/money/money.fakes';
import { moneyApp, resetMocks, type Mocks } from '@/modules/finance/subscriptions/test-app';
import { CREATE, salesDefaults } from './sales-money.fakes';

// Any custom amount above 0 for the assistant too, like the admin's; the weekly SA quote is 145.
const post = (customPrice: number) => ({
  method: 'POST' as const,
  url: '/sales/subscriptions',
  token: 'salesA' as const,
  body: { ...CREATE, customPrice },
});

describe('the custom price has no sales floor', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    salesDefaults(m);
  });

  it('the assistant, far under the deepest pill’s price (123): created at her price', async () => {
    for (const price of [1, 100]) {
      m.subs.insert.mockResolvedValue(subRow({ price }));
      expect((await call(post(price))).statusCode).toBe(201);
      expect(m.subs.insert).toHaveBeenLastCalledWith(expect.objectContaining({ price }));
    }
  });

  it('the admin (POST /subscriptions): created at any amount too', async () => {
    const pricing = { tier: 'weekly' };
    const sent = { studentId: STUDENT_ID, startsOn: '2026-10-01', pricing, clientRequestId: REQUEST_ID };
    const body = { ...sent, customPrice: 1 };
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
