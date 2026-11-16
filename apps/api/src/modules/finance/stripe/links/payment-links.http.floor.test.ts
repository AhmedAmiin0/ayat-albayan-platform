import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { STUDENT_ID, subRow, WEEKLY_SA } from '@/modules/finance/subscriptions/money/money.fakes';
import { resetMocks, type Mocks } from '@/modules/finance/subscriptions/test-app';
import { stripeApp } from '@/modules/finance/stripe/testing/stripe-app.fakes';
import {
  REQ,
  stripeDefaults,
  type StripeMocks,
} from '@/modules/finance/stripe/testing/stripe-mocks.fakes';

vi.hoisted(() => {
  process.env.FEATURE_STRIPE = 'test';
  process.env.API_PUBLIC_URL = 'https://api.test.example';
});

const URL = '/sales/payment-links';
const PRICING = { tier: 'weekly' };
const QUOTE = { studentId: STUDENT_ID, pricing: PRICING };
const TEN = { ...QUOTE, amount: 10, currency: 'SAR', clientRequestId: REQ };

// 2026-11-16: 10 SAR on a 180 SAR package answered «خصم الحاسبة…» with no amount. The quote now
// carries the lowest amount create() takes (catalog 145: the pills' floor is 123).
describe('payment links: the lowest agreed amount', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let s: StripeMocks;
  let call: Awaited<ReturnType<typeof stripeApp>>['call'];
  const min = async (token: 'salesA') =>
    (await call({ method: 'POST', url: `${URL}/quote`, token, body: QUOTE })).json().min_amount;

  beforeAll(async () => ({ app, m, s, call } = await stripeApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    stripeDefaults(s);
    m.subs.studentForQuote.mockResolvedValue({ id: STUDENT_ID, country: 'SA' });
    m.pricing.quote.mockResolvedValue(WEEKLY_SA);
    m.subs.insert.mockResolvedValue(subRow({ price: 10 }));
    m.subs.get.mockResolvedValue(subRow({ price: 10 }));
  });

  it('sales: the quote says the floor; 10 is refused with it, nothing written', async () => {
    expect(await min('salesA')).toBe(123);
    const res = await call({ method: 'POST', url: URL, token: 'salesA', body: TEN });
    const json = res.json();
    expect([res.statusCode, json.code, json.min, json.currency]).toEqual([
      403,
      'discount_not_allowed',
      123,
      'SAR',
    ]);
    expect(m.subs.insert).not.toHaveBeenCalled();
  });

  it('sales under the admin cap: the quote says the higher of the two', async () => {
    vi.stubEnv('STRIPE_MAX_DISCOUNT_PCT', '10');
    expect(await min('salesA')).toBe(130.5);
    vi.stubEnv('STRIPE_MAX_DISCOUNT_PCT', '40');
    expect(await min('salesA')).toBe(123);
  });
});
