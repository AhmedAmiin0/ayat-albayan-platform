import { describe, expect, it } from 'vitest';
import { appCookie, appPlatform, appReturnUrl, fromApp } from './pay-return';

const T = 'a'.repeat(32);
const ORIGIN = 'https://api.test.example';

describe('back into the app after Stripe (pay-return)', () => {
  it.each([
    [false, 'com.ayatalbayan.admin.stripetest'],
    [true, 'com.ayatalbayan.admin'],
  ])('Android (live %o): an intent naming %s, falling back to the same page with no automatic try', (live, pkg) => {
    const fallback = encodeURIComponent(`${ORIGIN}/pay/${T}/done?auto=0`);
    expect(appReturnUrl({ token: T, kind: 'done', payOrigin: ORIGIN, android: true, live })).toBe(
      `intent://pay-done?token=${T}&r=done#Intent;scheme=ayatalbayan;package=${pkg};S.browser_fallback_url=${fallback};end`,
    );
    expect(fallback).toBe(`https%3A%2F%2Fapi.test.example%2Fpay%2F${T}%2Fdone%3Fauto%3D0`);
  });

  it.each([false, true])('iOS (live %o): the bare scheme, the kind carried', (live) => {
    expect(appReturnUrl({ token: T, kind: 'cancelled', payOrigin: ORIGIN, android: false, live })).toBe(`ayatalbayan://pay-done?token=${T}&r=cancelled`);
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
