import { paymentLinkUrl, STRIPE_TEST_APP_PACKAGE } from '@ab/shared';

// Back into the Stripe test app after Checkout (owner 2026-10-29, docs/30). The app opens a pay link with
// ?from=app; GET /pay/:token then leaves this cookie on the link's pages, and Stripe's redirect to /done or
// /cancelled carries it back (a top-level GET: SameSite=Lax is sent). A link opened from WhatsApp has no
// cookie, so its pages stay as they were. The app reads the payment from our API, never from Stripe.

const COOKIE = 'ab_pay_app';

/** An hour, this link's pages only, never readable by a script. */
export const appCookie = (token: string): string => `${COOKIE}=1; Path=/pay/${token}; Max-Age=3600; HttpOnly; Secure; SameSite=Lax`;

/** The Cookie header holds the mark above (the browser came from the app). */
export const fromApp = (cookie: string | undefined): boolean => /(?:^|;\s*)ab_pay_app=1(?:;|$)/.test(cookie ?? '');

/**
 * The app's /pay-done screen for this link. Android: an intent: URL naming the test app (both apps share the
 * «ayatalbayan» scheme, so a bare scheme link could ask which one), whose fallback is this same page WITHOUT
 * the automatic try (?auto=0): a blocked or missing app never loops. iOS and others: the bare scheme.
 */
export function appReturnUrl(r: { token: string; kind: 'done' | 'cancelled'; payOrigin: string; android: boolean }): string {
  const path = `pay-done?token=${r.token}&r=${r.kind}`;
  if (!r.android) return `ayatalbayan://${path}`;
  const fallback = encodeURIComponent(`${paymentLinkUrl(r.payOrigin, r.token)}/${r.kind}?auto=0`);
  // ponytail: always the test app's package (the pay routes mount only with FEATURE_STRIPE=test); app.json's
  // package once Stripe reaches the normal app.
  return `intent://${path}#Intent;scheme=ayatalbayan;package=${STRIPE_TEST_APP_PACKAGE};S.browser_fallback_url=${fallback};end`;
}
