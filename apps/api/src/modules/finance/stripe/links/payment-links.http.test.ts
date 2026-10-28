import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { STUDENT_ID, SUB_ID, subRow, WEEKLY_SA } from '../../subscriptions/money/money.fakes';
import { resetMocks, SALES_A, type Mocks } from '../../subscriptions/test-app';
import { stripeApp } from '../testing/stripe-app.fakes';
import { linkRow, REQ, stripeDefaults, type StripeMocks } from '../testing/stripe-mocks.fakes';

vi.hoisted(() => {
  process.env.FEATURE_STRIPE = 'test';
});

const BODY = { studentId: STUDENT_ID, kind: 'new', pricing: { tier: 'weekly' }, amount: 120, currency: 'SAR', clientRequestId: REQ };

describe('POST /sales/payment-links: the package as «اشتراك جديد» makes it, priced at the agreed amount', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let s: StripeMocks;
  let call: Awaited<ReturnType<typeof stripeApp>>['call'];

  beforeAll(async () => ({ app, m, s, call } = await stripeApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    stripeDefaults(s);
    m.subs.studentForQuote.mockResolvedValue({ id: STUDENT_ID, country: 'SA' });
    m.pricing.quote.mockResolvedValue(WEEKLY_SA);
    m.subs.insert.mockResolvedValue(subRow({ price: 120 }));
    m.subs.get.mockResolvedValue(subRow({ price: 120 }));
  });

  it('any student (not only hers): an unpaid package at 120 (catalog 145), the link with the reference, audited', async () => {
    const res = await call({ method: 'POST', url: '/sales/payment-links', token: 'salesA', body: BODY });
    expect(res.statusCode).toBe(201);
    expect(m.subs.insert).toHaveBeenCalledWith(expect.objectContaining({ student_id: STUDENT_ID, price: 120, status: 'unpaid', created_by: SALES_A.id, client_request_id: REQ }));
    expect(s.links.insert).toHaveBeenCalledWith(expect.objectContaining({ subscription_id: SUB_ID, amount: 120, reference_price: 145, currency: 'SAR', created_by: SALES_A.id, kind: 'new' }));
    expect(s.links.insert.mock.calls[0]?.[0].token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(m.audit.record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'payment_links', action: 'create' }));
    expect(res.json()).toMatchObject({ url: `http://localhost:5173/pay/${linkRow().token}`, amount: 120, reference_price: 145, status: 'open' });
    expect(JSON.stringify(res.json())).not.toContain('client_request_id');
  });

  it('the admin cap: 10 % → below 130.5 is 400 discount_too_large, nothing created', async () => {
    s.settings.read.mockResolvedValue({ stripe_enabled: true, max_discount_pct: 10 });
    const res = await call({ method: 'POST', url: '/sales/payment-links', token: 'salesA', body: { ...BODY, amount: 130 } });
    expect([res.statusCode, res.json().code, res.json().min]).toEqual([400, 'discount_too_large', 130.5]);
    expect(m.subs.insert).not.toHaveBeenCalled();
  });

  it('a renewal needs an earlier priced package; the currency must be the package currency; pills only', async () => {
    const renewal = await call({ method: 'POST', url: '/sales/payment-links', token: 'salesA', body: { ...BODY, kind: 'renewal' } });
    expect(renewal.json().code).toBe('not_a_renewal');
    const usd = await call({ method: 'POST', url: '/sales/payment-links', token: 'salesA', body: { ...BODY, currency: 'USD' } });
    expect([usd.statusCode, usd.json().code]).toEqual([400, 'currency_mismatch']);
    const pill = await call({ method: 'POST', url: '/sales/payment-links', token: 'salesA', body: { ...BODY, pricing: { tier: 'weekly', discount: 7 } } });
    expect(pill.json().code).toBe('discount_not_allowed');
    expect(s.links.insert).not.toHaveBeenCalled();
  });

  it('a retry of the same form returns the link already made; another assistant’s form id is 409', async () => {
    s.links.byRequest.mockResolvedValue(linkRow());
    expect((await call({ method: 'POST', url: '/sales/payment-links', token: 'salesA', body: BODY })).statusCode).toBe(201);
    expect((await call({ method: 'POST', url: '/sales/payment-links', token: 'salesB', body: BODY })).statusCode).toBe(409);
    expect(m.subs.insert).not.toHaveBeenCalled();
  });

  it('quote: the calculator price and the cap’s minimum', async () => {
    s.settings.read.mockResolvedValue({ stripe_enabled: true, max_discount_pct: 20 });
    const res = await call({ method: 'POST', url: '/sales/payment-links/quote', token: 'salesA', body: { studentId: STUDENT_ID, pricing: { tier: 'weekly' } } });
    expect(res.json()).toMatchObject({ quote: { afterDiscount: 145, currency: 'SAR' }, max_discount_pct: 20, min_amount: 116 });
  });

  it('list: hers only, by the status it reads as now; cancel: an open link, its package cancelled', async () => {
    s.links.list.mockResolvedValue([linkRow(), linkRow({ id: '7a000000-0000-4000-8000-000000000002', expires_at: '2020-01-01T00:00:00Z' })]);
    const res = await call({ method: 'GET', url: '/sales/payment-links?status=expired', token: 'salesA' });
    expect(s.links.list).toHaveBeenCalledWith({ createdBy: SALES_A.id });
    expect(res.json().map((l: { status: string }) => l.status)).toEqual(['expired']);
    m.subs.get.mockResolvedValue(subRow({ price: 120 }));
    const cancel = await call({ method: 'POST', url: `/sales/payment-links/${linkRow().id}/cancel`, token: 'salesA' });
    expect([cancel.statusCode, cancel.json().status]).toEqual([200, 'cancelled']);
    expect(m.cancels.cancel).toHaveBeenCalled();
    s.links.cancel.mockResolvedValue(null);
    expect((await call({ method: 'POST', url: `/sales/payment-links/${linkRow().id}/cancel`, token: 'salesA' })).json().code).toBe('link_not_open');
    expect((await call({ method: 'POST', url: `/sales/payment-links/${linkRow().id}/cancel`, token: 'salesB' })).statusCode).toBe(404);
  });
});
