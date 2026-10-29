import { describe, expect, it } from 'vitest';
import { appCookie, appReturnUrl, fromApp } from './pay-return';

const T = 'a'.repeat(32);
const ORIGIN = 'https://api.test.example';

describe('back into the test app after Stripe (pay-return)', () => {
  it('Android: an intent naming the test app, falling back to the same page with no automatic try', () => {
    const fallback = encodeURIComponent(`${ORIGIN}/pay/${T}/done?auto=0`);
    expect(appReturnUrl({ token: T, kind: 'done', payOrigin: ORIGIN, android: true })).toBe(
      `intent://pay-done?token=${T}&r=done#Intent;scheme=ayatalbayan;package=com.ayatalbayan.admin.stripetest;S.browser_fallback_url=${fallback};end`,
    );
    expect(fallback).toBe(`https%3A%2F%2Fapi.test.example%2Fpay%2F${T}%2Fdone%3Fauto%3D0`);
  });

  it('iOS and others: the bare scheme, the kind carried', () => {
    expect(appReturnUrl({ token: T, kind: 'cancelled', payOrigin: ORIGIN, android: false })).toBe(`ayatalbayan://pay-done?token=${T}&r=cancelled`);
  });

  it('the cookie: this link’s pages only, an hour, HttpOnly, Secure, SameSite=Lax', () => {
    expect(appCookie(T)).toBe(`ab_pay_app=1; Path=/pay/${T}; Max-Age=3600; HttpOnly; Secure; SameSite=Lax`);
  });

  it.each([
    ['ab_pay_app=1', true],
    ['a=1; ab_pay_app=1', true],
    ['ab_pay_app=1;b=2', true],
    ['ab_pay_app=10', false],
    ['xab_pay_app=1', false],
    ['ab_pay_app=0', false],
    ['', false],
    [undefined, false],
  ])('fromApp(%o) is %s', (cookie, expected) => {
    expect(fromApp(cookie)).toBe(expected);
  });
});
