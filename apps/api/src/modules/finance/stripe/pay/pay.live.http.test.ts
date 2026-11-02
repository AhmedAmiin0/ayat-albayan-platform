import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { subRow } from '@/modules/finance/subscriptions/money/money.fakes';
import { resetMocks, type Mocks } from '@/modules/finance/subscriptions/test-app';
import { stripeApp } from '@/modules/finance/stripe/testing/stripe-app.fakes';
import { LINK_ID, linkRow, stripeDefaults, TOKEN, type StripeMocks } from '@/modules/finance/stripe/testing/stripe-mocks.fakes';

vi.hoisted(() => {
  process.env.FEATURE_STRIPE = 'live';
  process.env.API_PUBLIC_URL = 'https://api.test.example';
});

const HTML = 'text/html,application/xhtml+xml,*/*;q=0.8';
const NOTICE = 'صفحة دفع تجريبية';
const LIVE_URL = 'https://checkout.stripe.com/c/pay/cs_live_new';

// Go live (owner 2026-11-01, docs/30): under FEATURE_STRIPE=live only a live key loads, so the
// family's pages take real cards and never say «صفحة دفع تجريبية».
describe('the family pages under FEATURE_STRIPE=live', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let s: StripeMocks;
  const open = (url: string, headers: Record<string, string> = {}) => app.inject({ method: 'GET', url, headers: { accept: HTML, ...headers } });
  const pages = [`/pay/${TOKEN}`, `/pay/${TOKEN}/done`, `/pay/${TOKEN}/cancelled`];

  beforeAll(async () => ({ app, m, s } = await stripeApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    stripeDefaults(s);
    vi.stubEnv('FEATURE_STRIPE', 'live');
    vi.stubEnv('STRIPE_API_KEY', 'rk_live_abc123');
    m.subs.get.mockResolvedValue(subRow({ price: 120 })); // the link's package: unpaid
  });

  it('a live key: no page says it is a test, the 404 page neither; the JSON says not sandbox', async () => {
    for (const url of pages) {
      const res = await open(url);
      expect([res.statusCode, res.body.includes(NOTICE)]).toEqual([200, false]);
    }
    expect((await open(`/pay/${TOKEN}`, { accept: 'application/json' })).json()).toMatchObject({ status: 'open', sandbox: false });
    s.links.byToken.mockResolvedValue(null);
    const unknown = await open(`/pay/${TOKEN}`);
    expect([unknown.statusCode, unknown.body.includes(NOTICE)]).toEqual([404, false]);
  });

  it('back to the app on Android names the normal app (it has the pay-link buttons under live)', async () => {
    const res = await open(`/pay/${TOKEN}/done`, { cookie: 'ab_pay_app=android' });
    expect(res.body).toContain(`r=done#Intent;scheme=ayatalbayan;package=com.ayatalbayan.admin;`);
    expect(res.body).not.toContain('stripetest');
  });

  it('a link sent before go live (a cs_test_ session): «ادفع الآن» makes a live session, never a 5xx', async () => {
    s.links.byToken.mockResolvedValue(linkRow({ stripe_session_id: 'cs_test_old' }));
    s.stripe.checkout.sessions.create.mockResolvedValue({ id: 'cs_live_new', url: LIVE_URL });
    const res = await app.inject({ method: 'GET', url: `/pay/${TOKEN}/checkout` });
    expect([res.statusCode, res.headers.location]).toEqual([303, LIVE_URL]);
    expect(s.stripe.checkout.sessions.retrieve).not.toHaveBeenCalled();
    expect(s.links.setSession).toHaveBeenCalledWith({ id: LINK_ID, prev: 'cs_test_old', session: 'cs_live_new' });
  });
});
