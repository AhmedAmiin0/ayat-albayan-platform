import { describe, expect, it } from 'vitest';
import { appCookie, appPlatform, appReturnUrl, fromApp } from './pay-return';

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

  it('iOS: the bare scheme, the kind carried', () => {
    expect(appReturnUrl({ token: T, kind: 'cancelled', payOrigin: ORIGIN, android: false })).toBe(`ayatalbayan://pay-done?token=${T}&r=cancelled`);
  });

  it('the cookie: the platform, this link’s pages only, a day (a session lasts 23 h at most), HttpOnly, Secure, SameSite=Lax', () => {
    expect(appCookie(T, 'android')).toBe(`ab_pay_app=android; Path=/pay/${T}; Max-Age=86400; HttpOnly; Secure; SameSite=Lax`);
    expect(appCookie(T, 'ios')).toBe(`ab_pay_app=ios; Path=/pay/${T}; Max-Age=86400; HttpOnly; Secure; SameSite=Lax`);
  });

  it.each([
    ['android', 'android'],
    ['ios', 'ios'],
    ['app', null],
    ['web', null],
    ['Android', null],
    [['android'], null],
    [undefined, null],
  ])('appPlatform(%o) is %o', (from, expected) => {
    expect(appPlatform(from)).toBe(expected);
  });

  it.each([
    ['ab_pay_app=android', 'android'],
    ['a=1; ab_pay_app=ios', 'ios'],
    ['ab_pay_app=ios;b=2', 'ios'],
    ['ab_pay_app=1', null],
    ['ab_pay_app=androidx', null],
    ['xab_pay_app=android', null],
    ['ab_pay_app=web', null],
    ['', null],
    [undefined, null],
  ])('fromApp(%o) is %o', (cookie, expected) => {
    expect(fromApp(cookie)).toBe(expected);
  });
});
