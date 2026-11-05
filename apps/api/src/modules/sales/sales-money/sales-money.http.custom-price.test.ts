import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { STUDENT_ID, subRow, WEEKLY_SA } from '@/modules/finance/subscriptions/money/money.fakes';
import { moneyApp, resetMocks, type Mocks } from '@/modules/finance/subscriptions/test-app';
import { CREATE, salesDefaults } from './sales-money.fakes';

const CUSTOM = { ...WEEKLY_SA, source: 'custom', quoted: WEEKLY_SA.afterDiscount };

// «مبلغ مخصص» on the bank-transfer package (owner 2026-11-02): the assistant's and the admin's.
describe('custom subscription price', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    salesDefaults(m);
  });
  afterEach(() => vi.unstubAllEnvs());

  it('off: the quoted price, the quote as price_source (unchanged)', async () => {
    await call({ method: 'POST', url: '/sales/subscriptions', token: 'salesA', body: CREATE });
    expect(m.subs.insert).toHaveBeenCalledWith(
      expect.objectContaining({ price: WEEKLY_SA.afterDiscount, price_source: WEEKLY_SA }),
    );
  });

  it('on: her amount is the price (the commission runs on it); the quote kept, marked custom', async () => {
    m.subs.insert.mockResolvedValue(subRow({ price: 99 }));
    m.subs.get.mockResolvedValue(subRow({ price: 99 }));
    const body = { ...CREATE, customPrice: 99 };
    const res = await call({ method: 'POST', url: '/sales/subscriptions', token: 'salesA', body });
    expect(res.statusCode).toBe(201);
    const stored = expect.objectContaining({ price: 99, price_source: CUSTOM });
    expect(m.subs.insert).toHaveBeenCalledWith(stored);
    expect(res.json()).toMatchObject({ price: 99, due: 99 });
  });

  it('a renewal (a student with a package) takes the custom price the same way', async () => {
    m.subs.forStudent.mockResolvedValue([subRow({ id: 'old' })]);
    const body = { ...CREATE, customPrice: 120.5 };
    await call({ method: 'POST', url: '/sales/subscriptions', token: 'salesA', body });
    expect(m.subs.insert).toHaveBeenCalledWith(expect.objectContaining({ price: 120.5 }));
  });

  it('the payment link’s cap (STRIPE_MAX_DISCOUNT_PCT) holds for her: 400 discount_too_large', async () => {
    vi.stubEnv('STRIPE_MAX_DISCOUNT_PCT', '10'); // 145 → at least 130.50
    const low = { ...CREATE, customPrice: 130 };
    const res = await call({ method: 'POST', url: '/sales/subscriptions', token: 'salesA', body: low });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'discount_too_large', min: 130.5, currency: 'SAR' });
    expect(m.subs.insert).not.toHaveBeenCalled();
    const ok = { ...CREATE, customPrice: 130.5 };
    expect((await call({ method: 'POST', url: '/sales/subscriptions', token: 'salesA', body: ok })).statusCode).toBe(201);
  });

  it('refuses 0, a negative or a 3-decimal amount (400)', async () => {
    for (const customPrice of [0, -1, 9.999]) {
      const body = { ...CREATE, customPrice };
      const res = await call({ method: 'POST', url: '/sales/subscriptions', token: 'salesA', body });
      expect(res.statusCode).toBe(400);
    }
  });

  it('the admin’s POST /subscriptions: the custom price, no cap', async () => {
    vi.stubEnv('STRIPE_MAX_DISCOUNT_PCT', '10');
    const body = { studentId: STUDENT_ID, startsOn: '2026-10-01', pricing: { tier: 'weekly' }, customPrice: 50 };
    expect((await call({ method: 'POST', url: '/subscriptions', body })).statusCode).toBe(201);
    const stored = expect.objectContaining({ price: 50, price_source: CUSTOM });
    expect(m.subs.insert).toHaveBeenCalledWith(stored);
  });
});
