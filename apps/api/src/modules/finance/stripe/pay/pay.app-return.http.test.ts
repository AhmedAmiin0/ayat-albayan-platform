import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { stripeApp } from '../testing/stripe-app.fakes';
import { stripeDefaults, TOKEN, type StripeMocks } from '../testing/stripe-mocks.fakes';

vi.hoisted(() => {
  process.env.FEATURE_STRIPE = 'test';
  process.env.API_PUBLIC_URL = 'https://api.test.example';
});

const COOKIE = `ab_pay_app=1; Path=/pay/${TOKEN}; Max-Age=3600; HttpOnly; Secure; SameSite=Lax`;
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36';
const HTML = 'text/html,application/xhtml+xml,*/*;q=0.8';
const META = /<meta http-equiv="refresh"/;

// A pay link the Stripe test app opened (?from=app) brings the payer back into the app (owner 2026-10-29).
describe('back to the app: GET /pay/:token?from=app, then /done and /cancelled', () => {
  let app: NestFastifyApplication;
  let s: StripeMocks;
  const open = (url: string, headers: Record<string, string> = {}) => app.inject({ method: 'GET', url, headers: { accept: HTML, ...headers } });
  const fromApp = (url: string) => open(url, { cookie: 'ab_pay_app=1', 'user-agent': ANDROID });

  beforeAll(async () => ({ app, s } = await stripeApp()));
  afterAll(() => app.close());
  beforeEach(() => stripeDefaults(s));

  it('?from=app on the HTML page leaves the mark; any other value, JSON or an unknown link leave none', async () => {
    expect([(await open(`/pay/${TOKEN}?from=app`)).headers['set-cookie']].flat()).toEqual([COOKIE]);
    expect((await open(`/pay/${TOKEN}?from=x`)).headers['set-cookie']).toBeUndefined();
    expect((await open(`/pay/${TOKEN}`)).headers['set-cookie']).toBeUndefined();
    expect((await open(`/pay/${TOKEN}?from=app`, { accept: 'application/json' })).headers['set-cookie']).toBeUndefined();
    s.links.byToken.mockResolvedValue(null);
    const unknown = await open(`/pay/${TOKEN}?from=app`);
    expect([unknown.statusCode, unknown.headers['set-cookie']]).toEqual([404, undefined]);
  });

  it('/done with the mark (Android): tried at once and «العودة إلى التطبيق», the intent escaped; no script, same CSP', async () => {
    const plain = await open(`/pay/${TOKEN}/done`);
    const res = await fromApp(`/pay/${TOKEN}/done`);
    expect(res.statusCode).toBe(200);
    const intent = `intent://pay-done?token=${TOKEN}&amp;r=done#Intent;scheme=ayatalbayan;package=com.ayatalbayan.admin.stripetest;`;
    expect(res.body).toContain(`<meta http-equiv="refresh" content="0;url=${intent}`);
    expect(res.body).toContain(`<a class="btn" href="${intent}`);
    expect(res.body).toContain('>العودة إلى التطبيق</a>');
    expect(res.body).toContain('تم استلام الدفع، شكرًا');
    expect(res.body).not.toMatch(/<script/i);
    expect(res.headers['content-security-policy']).toBe(plain.headers['content-security-policy']);
  });

  it('the fallback (?auto=0) and /cancelled: the button only, never an automatic try', async () => {
    const fallback = await fromApp(`/pay/${TOKEN}/done?auto=0`);
    expect(fallback.body).toContain('>العودة إلى التطبيق</a>');
    expect(fallback.body).not.toMatch(META);
    const cancelled = await fromApp(`/pay/${TOKEN}/cancelled`);
    expect(cancelled.body).toContain('لم يتم الدفع');
    expect(cancelled.body).toContain(`href="/pay/${TOKEN}"`);
    expect(cancelled.body).toContain(`r=cancelled#Intent;`);
    expect(cancelled.body).not.toMatch(META);
  });

  it('not Android: the bare scheme', async () => {
    const res = await open(`/pay/${TOKEN}/done`, { cookie: 'ab_pay_app=1', 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' });
    expect(res.body).toContain(`href="ayatalbayan://pay-done?token=${TOKEN}&amp;r=done"`);
  });

  it('without the mark (a link opened from WhatsApp): the pages are exactly as before', async () => {
    for (const kind of ['done', 'cancelled']) {
      const res = await open(`/pay/${TOKEN}/${kind}`, { 'user-agent': ANDROID, cookie: 'other=1' });
      expect(res.statusCode).toBe(200);
      expect(res.body).not.toContain('العودة إلى التطبيق');
      expect(res.body).not.toMatch(META);
      expect(res.body).not.toContain('pay-done');
    }
    s.links.byToken.mockResolvedValue(null);
    expect((await fromApp(`/pay/${TOKEN}/done`)).statusCode).toBe(404);
  });
});
