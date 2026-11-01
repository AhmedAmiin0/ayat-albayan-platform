import { createHash } from 'node:crypto';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { stripeApp } from '../testing/stripe-app.fakes';
import { linkRow, stripeDefaults, TOKEN, type StripeMocks } from '../testing/stripe-mocks.fakes';

vi.hoisted(() => {
  process.env.FEATURE_STRIPE = 'test';
  process.env.API_PUBLIC_URL = 'https://api.test.example';
});

// What the family's browser gets from the API itself (no web build): Arabic RTL HTML, no script.
describe('the family pages: GET /pay/:token (HTML), /done and /cancelled', () => {
  let app: NestFastifyApplication;
  let s: StripeMocks;
  const open = (url: string) => app.inject({ method: 'GET', url, headers: { accept: 'text/html,application/xhtml+xml,*/*;q=0.8' } });

  beforeAll(async () => ({ app, s } = await stripeApp()));
  afterAll(() => app.close());
  beforeEach(() => stripeDefaults(s));

  it('an open link: the first name, the package, the amount and one «ادفع الآن» to the checkout', async () => {
    const res = await open(`/pay/${TOKEN}`);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/^text\/html; charset=utf-8/);
    expect(res.body).toContain('<html lang="ar" dir="rtl">');
    expect(res.body).toContain('مرحبًا سهيلة');
    expect(res.body).not.toContain('أحمد');
    expect(res.body).toContain('4 حلقة');
    expect(res.body).toContain('المبلغ: 120 SAR');
    expect(res.body).toContain(`href="/pay/${TOKEN}/checkout">ادفع الآن</a>`);
    expect(res.body).not.toMatch(/<script/i);
    expect(s.limit.check).toHaveBeenCalledWith(expect.any(String), TOKEN);
  });

  it('a strict CSP (no script, the inline style by hash only), never cached, framed or referred', async () => {
    const h = (await open(`/pay/${TOKEN}`)).headers;
    expect(h['content-security-policy']).toMatch(/^default-src 'none'; style-src 'sha256-[A-Za-z0-9+/=]+'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'$/);
    expect(h['content-security-policy']).not.toMatch(/script-src|unsafe/);
    const style = /<style>(.*?)<\/style>/s.exec((await open(`/pay/${TOKEN}`)).body)?.[1] ?? '';
    expect(h['content-security-policy']).toContain(`'sha256-${createHash('sha256').update(style).digest('base64')}'`);
    expect(h.vary).toMatch(/Accept/);
    expect([h['cache-control'], h['x-content-type-options'], h['x-frame-options'], h['referrer-policy']]).toEqual(['no-store', 'nosniff', 'DENY', 'no-referrer']);
  });

  it.each([
    [{ expires_at: '2020-01-01T00:00:00Z' }, 'انتهت صلاحية هذا الرابط'],
    [{ status: 'paid' }, 'تم الدفع، شكرًا لك.'],
    [{ status: 'cancelled' }, 'أُلغي هذا الرابط'],
    [{ processing: true }, 'دفعتك قيد المعالجة'],
  ])('a link that cannot be paid (%o) says why, with no checkout link', async (patch, text) => {
    s.links.byToken.mockResolvedValue(linkRow(patch));
    const res = await open(`/pay/${TOKEN}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain(text);
    expect(res.body).not.toContain('/checkout');
  });

  it('an unknown or malformed token is a 404 page; a malformed one is never looked up', async () => {
    s.links.byToken.mockResolvedValue(null);
    const unknown = await open(`/pay/${TOKEN}`);
    expect([unknown.statusCode, unknown.headers['content-type']]).toEqual([404, 'text/html; charset=utf-8']);
    expect(unknown.body).toContain('هذا الرابط غير صحيح.');
    s.links.byToken.mockClear();
    expect((await open('/pay/short')).statusCode).toBe(404);
    expect(s.links.byToken).not.toHaveBeenCalled();
  });

  it('escapes every value: a name with <script> is text, never markup', async () => {
    s.links.byToken.mockResolvedValue(linkRow({ student: { id: 'x', code: 'AB-0001', name: '<script>alert("x")</script> أحمد' } }));
    const res = await open(`/pay/${TOKEN}`);
    expect(res.body).not.toContain('<script>');
    expect(res.body).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
  });

  it('Stripe comes back to text-only pages; nothing is recorded there (the webhook alone fulfils)', async () => {
    const done = await open(`/pay/${TOKEN}/done`);
    expect([done.statusCode, done.headers['cache-control']]).toEqual([200, 'no-store']);
    expect(done.body).toContain('تم استلام الدفع، شكرًا');
    const cancelled = await open(`/pay/${TOKEN}/cancelled`);
    expect(cancelled.body).toContain('لم يتم الدفع');
    expect(cancelled.body).toContain(`href="/pay/${TOKEN}"`);
    expect(cancelled.headers['content-security-policy']).toMatch(/^default-src 'none'/);
    expect(s.links.markPaid).not.toHaveBeenCalled();
    expect((await open('/pay/short/done')).statusCode).toBe(404);
    s.links.byToken.mockResolvedValue(null);
    expect((await open(`/pay/${TOKEN}/done`)).statusCode).toBe(404);
  });

  it('«الدفع الإلكتروني» off: every family page is 404, nothing looked up', async () => {
    vi.stubEnv('STRIPE_ENABLED', 'false');
    for (const url of [`/pay/${TOKEN}`, `/pay/${TOKEN}/done`, `/pay/${TOKEN}/cancelled`, `/pay/${TOKEN}/checkout`]) {
      expect((await open(url)).statusCode).toBe(404);
    }
    expect(s.links.byToken).not.toHaveBeenCalled();
  });
});
