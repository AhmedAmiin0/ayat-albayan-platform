import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { STUDENT_ID, SUB_ID } from '../../subscriptions/money/money.fakes';
import { SALES_A } from '../../subscriptions/test-app';
import { stripeApp } from '../testing/stripe-app.fakes';
import { LINK_ID, linkRow, SESSION, stripeDefaults, TOKEN, type StripeMocks } from '../testing/stripe-mocks.fakes';

vi.hoisted(() => {
  process.env.FEATURE_STRIPE = 'test';
  process.env.API_PUBLIC_URL = 'https://api.test.example/';
});

const PAGE = `https://api.test.example/pay/${TOKEN}`;

describe('the public payment page: GET /pay/:token and GET /pay/:token/checkout', () => {
  let app: NestFastifyApplication;
  let s: StripeMocks;
  const get = (url: string) => app.inject({ method: 'GET', url });
  const json = (url: string) => app.inject({ method: 'GET', url, headers: { accept: 'application/json' } });

  beforeAll(async () => ({ app, s } = await stripeApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    stripeDefaults(s);
    s.stripe.checkout.sessions.create.mockResolvedValue({ id: SESSION, url: 'https://checkout.stripe.com/c/pay/cs_test_a1' });
  });

  it('no login; the first name, the amount and the package only; rate-limited per IP and link', async () => {
    const res = await json(`/pay/${TOKEN}`);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'open', first_name: 'سهيلة', amount: 120, currency: 'SAR', package: '4', lessons: 4 });
    expect(s.limit.check).toHaveBeenCalledWith(expect.any(String), TOKEN);
    s.links.byToken.mockResolvedValue(linkRow({ expires_at: '2020-01-01T00:00:00Z' }));
    expect((await json(`/pay/${TOKEN}`)).json().status).toBe('expired');
    s.links.byToken.mockResolvedValue(null);
    expect((await json(`/pay/${TOKEN}`)).json().code).toBe('link_not_found');
  });

  it('checkout: a new session (payment mode, inline SAR minor units, NO payment_method_types), 303 to Stripe', async () => {
    const res = await get(`/pay/${TOKEN}/checkout`);
    expect([res.statusCode, res.headers.location]).toEqual([303, 'https://checkout.stripe.com/c/pay/cs_test_a1']);
    const params = s.stripe.checkout.sessions.create.mock.calls[0]?.[0];
    expect(params).toMatchObject({
      mode: 'payment',
      client_reference_id: LINK_ID,
      metadata: { payment_link_id: LINK_ID, subscription_id: SUB_ID, student_id: STUDENT_ID, assistant_id: SALES_A.id },
      line_items: [{ quantity: 1, price_data: { currency: 'sar', unit_amount: 12000 } }],
      success_url: `${PAGE}/done`,
      cancel_url: `${PAGE}/cancelled`,
    });
    expect(params).not.toHaveProperty('payment_method_types');
    expect(params.integration_identifier).toMatch(/^ayat-sales-link-[a-z]{8}$/);
    expect(s.links.setSession).toHaveBeenCalledWith({ id: LINK_ID, prev: null, session: SESSION });
  });

  it('an open session is reused; a lost race expires its own session and follows the winner', async () => {
    s.links.byToken.mockResolvedValue(linkRow({ stripe_session_id: 'cs_old' }));
    s.stripe.checkout.sessions.retrieve.mockResolvedValue({ id: 'cs_old', status: 'open', url: 'https://checkout.stripe.com/old' });
    expect((await get(`/pay/${TOKEN}/checkout`)).headers.location).toBe('https://checkout.stripe.com/old');
    expect(s.stripe.checkout.sessions.create).not.toHaveBeenCalled();
    s.links.byToken.mockResolvedValue(linkRow());
    s.links.setSession.mockResolvedValue(false);
    s.links.get.mockResolvedValue(linkRow({ stripe_session_id: 'cs_winner' }));
    s.stripe.checkout.sessions.retrieve.mockResolvedValue({ id: 'cs_winner', status: 'open', url: 'https://checkout.stripe.com/winner' });
    expect((await get(`/pay/${TOKEN}/checkout`)).headers.location).toBe('https://checkout.stripe.com/winner');
    expect(s.stripe.checkout.sessions.expire).toHaveBeenCalledWith(SESSION);
  });

  it('a paid, expired, cancelled or processing link goes back to the API’s page, no session made', async () => {
    for (const patch of [{ status: 'paid' }, { expires_at: '2020-01-01T00:00:00Z' }, { status: 'cancelled' }, { processing: true }]) {
      s.links.byToken.mockResolvedValue(linkRow(patch));
      expect((await get(`/pay/${TOKEN}/checkout`)).headers.location).toBe(PAGE);
    }
    expect(s.stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('a live key in Vault is refused, as is a missing key: back to the API’s page, never a session', async () => {
    s.settings.secret.mockResolvedValue('rk_live_abc');
    expect((await get(`/pay/${TOKEN}/checkout`)).headers.location).toBe(PAGE);
    s.settings.secret.mockResolvedValue(null);
    expect((await get(`/pay/${TOKEN}/checkout`)).headers.location).toBe(PAGE);
    expect(s.stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });
});
