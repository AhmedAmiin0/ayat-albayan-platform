import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { stripeApp } from '../testing/stripe-app.fakes';
import { stripeDefaults, TOKEN, type StripeMocks } from '../testing/stripe-mocks.fakes';

vi.hoisted(() => {
  process.env.FEATURE_STRIPE = 'live';
  process.env.API_PUBLIC_URL = 'https://api.test.example';
});

const HTML = 'text/html,application/xhtml+xml,*/*;q=0.8';
const NOTICE = 'صفحة دفع تجريبية';

// Go live (owner 2026-11-01, docs/30): with a live key the family's pages take real cards, so they never say
// «صفحة دفع تجريبية»; a sandbox key under FEATURE_STRIPE=live (a dry run) still does.
describe('the family pages under FEATURE_STRIPE=live', () => {
  let app: NestFastifyApplication;
  let s: StripeMocks;
  const open = (url: string, headers: Record<string, string> = {}) => app.inject({ method: 'GET', url, headers: { accept: HTML, ...headers } });
  const pages = [`/pay/${TOKEN}`, `/pay/${TOKEN}/done`, `/pay/${TOKEN}/cancelled`];

  beforeAll(async () => ({ app, s } = await stripeApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    stripeDefaults(s);
    vi.stubEnv('FEATURE_STRIPE', 'live');
  });

  it('a sandbox key: every page keeps the test notice; the JSON says sandbox', async () => {
    for (const url of pages) expect((await open(url)).body).toContain(NOTICE);
    expect((await open(`/pay/${TOKEN}`, { accept: 'application/json' })).json()).toMatchObject({ status: 'open', sandbox: true });
  });

  it('a live key: no page says it is a test, the 404 page neither; the JSON says not sandbox', async () => {
    vi.stubEnv('STRIPE_API_KEY', 'rk_live_abc123');
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
});
