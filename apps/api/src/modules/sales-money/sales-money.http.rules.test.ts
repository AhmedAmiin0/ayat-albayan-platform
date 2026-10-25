import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { STUDENT_ID } from '../subscriptions/money/money.fakes';
import { moneyApp, resetMocks, type Mocks } from '../subscriptions/test-app';
import { CREATE, PAY, salesDefaults } from './sales-money.fakes';

const QUOTE = '/sales/subscriptions/quote';
const quoteBody = (discount: number) => ({ studentId: STUDENT_ID, pricing: { tier: 'weekly', discount } });
const createBody = (discount: number) => ({ ...CREATE, pricing: { tier: 'weekly', discount } });

describe('owner 2026-10-12: the salesperson’s pills only, and the transfer in the package currency', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    salesDefaults(m);
  });

  it.each([20, 12.5, 99.5, 100])('discount %s → 403 discount_not_allowed on quote and create, nothing priced or inserted', async (d) => {
    const quote = await call({ method: 'POST', url: QUOTE, token: 'salesA', body: quoteBody(d) });
    const create = await call({ method: 'POST', url: '/sales/subscriptions', token: 'salesA', body: createBody(d) });
    expect([quote.statusCode, quote.json().code]).toEqual([403, 'discount_not_allowed']);
    expect([create.statusCode, create.json().code]).toEqual([403, 'discount_not_allowed']);
    expect(m.pricing.quote).not.toHaveBeenCalled();
    expect(m.subs.insert).not.toHaveBeenCalled();
  });

  it.each([0, 5, 10, 15])('the pill %s passes on quote and create', async (d) => {
    expect((await call({ method: 'POST', url: QUOTE, token: 'salesA', body: quoteBody(d) })).statusCode).toBe(200);
    expect((await call({ method: 'POST', url: '/sales/subscriptions', token: 'salesA', body: createBody(d) })).statusCode).toBe(201);
    expect(m.subs.insert).toHaveBeenCalledTimes(1);
  });

  it('ownership is checked first: another salesperson gets 403 not_your_student, even with a bad discount', async () => {
    const res = await call({ method: 'POST', url: QUOTE, token: 'salesB', body: quoteBody(20) });
    expect([res.statusCode, res.json().code]).toEqual([403, 'not_your_student']);
  });

  it('the admin keeps the free 0–100 field', async () => {
    m.subs.studentForQuote.mockResolvedValue({ id: STUDENT_ID, country: 'SA' });
    const res = await call({ method: 'POST', url: '/subscriptions/quote', body: quoteBody(20) });
    expect(res.statusCode).not.toBe(403);
  });

  it('USD on a SAR package → 400 currency_mismatch {currency: SAR}: no insert, no fx call', async () => {
    const res = await call({ method: 'POST', url: '/sales/payments', token: 'salesA', body: { ...PAY, currency: 'USD' } });
    expect([res.statusCode, res.json().code, res.json().currency]).toEqual([400, 'currency_mismatch', 'SAR']);
    expect(m.payments.insert).not.toHaveBeenCalled();
    expect(m.fx.rateSarAt).not.toHaveBeenCalled();
  });

  it('the package currency is recorded as sent, without fx', async () => {
    expect((await call({ method: 'POST', url: '/sales/payments', token: 'salesA', body: PAY })).statusCode).toBe(201);
    expect(m.payments.insert).toHaveBeenCalledWith(expect.objectContaining({ currency: 'SAR', fx_rate: null }));
    expect(m.fx.rateSarAt).not.toHaveBeenCalled();
  });
});
