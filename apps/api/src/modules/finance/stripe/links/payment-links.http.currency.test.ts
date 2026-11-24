import type { QuoteResponse } from '@ab/money';
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
const body = (currency: string) => ({
  studentId: STUDENT_ID,
  pricing: PRICING,
  amount: 125,
  currency,
  clientRequestId: REQ,
});

// Unsupported currencies are refused before the package is written (once a 500 for QAR).
describe('POST /sales/payment-links: the package currency', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let s: StripeMocks;
  let call: Awaited<ReturnType<typeof stripeApp>>['call'];

  beforeAll(async () => ({ app, m, s, call } = await stripeApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    stripeDefaults(s);
    m.subs.studentForQuote.mockResolvedValue({ id: STUDENT_ID, country: 'QA' });
    m.subs.insert.mockResolvedValue(subRow({ price: 125, currency: 'QAR' }));
    m.subs.get.mockResolvedValue(subRow({ price: 125, currency: 'QAR' }));
  });

  it('QAR (2 decimals, like SAR): the package and its link in QAR', async () => {
    m.pricing.quote.mockResolvedValue({ ...WEEKLY_SA, currency: 'QAR' });
    const res = await call({ method: 'POST', url: URL, token: 'salesA', body: body('QAR') });
    expect(res.statusCode).toBe(201);
    const link = expect.objectContaining({ currency: 'QAR', amount: 125 });
    expect(s.links.insert).toHaveBeenCalledWith(link);
  });

  it('KWD (Stripe thousandths): the package and its link in KWD', async () => {
    m.pricing.quote.mockResolvedValue({ ...WEEKLY_SA, currency: 'KWD' });
    const res = await call({ method: 'POST', url: URL, token: 'salesA', body: body('KWD') });
    expect(res.statusCode).toBe(201);
    expect(s.links.insert).toHaveBeenCalledWith(expect.objectContaining({ amount: 125 }));
  });

  it('a currency outside the catalog: 400 currency_not_supported, no package, no link', async () => {
    const egp = { ...WEEKLY_SA, currency: 'EGP' } as unknown as QuoteResponse; // never from the catalog
    m.pricing.quote.mockResolvedValue(egp);
    const res = await call({ method: 'POST', url: URL, token: 'salesA', body: body('EGP') });
    const json = res.json();
    expect([res.statusCode, json.code, json.currency]).toEqual([400, 'currency_not_supported', 'EGP']);
    expect(m.subs.insert).not.toHaveBeenCalled();
    expect(s.links.insert).not.toHaveBeenCalled();
    const quote = { studentId: STUDENT_ID, pricing: PRICING };
    const q = await call({ method: 'POST', url: `${URL}/quote`, token: 'salesA', body: quote });
    expect([q.statusCode, q.json().code]).toEqual([400, 'currency_not_supported']);
  });
});
