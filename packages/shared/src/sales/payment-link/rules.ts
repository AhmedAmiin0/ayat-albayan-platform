import { toCents } from '@ab/core';
import type { PaymentLinkStatus } from './schemas';

// Pure rules of the payment links (docs/30-stripe-test.md), shared by the API, the web and the mobile app.

/** The platform's own cents (every stored amount has 2 decimals): 290.5 → 29050. */
export const toMinorUnits = toCents;
export const fromMinorUnits = (minor: number): number => Math.round(minor) / 100;

/** Stripe's three-decimal currencies; every other link currency counts in 1/100. */
const STRIPE_THREE_DECIMALS = new Set(['KWD', 'OMR', 'BHD', 'JOD', 'TND']);
/** Stripe's minor units per platform cent: 10 for KWD / OMR, else 1. */
const centScale = (currency: string): number =>
  STRIPE_THREE_DECIMALS.has(currency.toUpperCase()) ? 10 : 1;

/**
 * An amount as Stripe counts it in `currency`: 290.5 SAR → 29050, 12.5 KWD → 12500. Built from
 * the 2-decimal cents, so a KWD / OMR amount always ends in 0 (Stripe refuses any other).
 */
export const toStripeAmount = (amount: number, currency: string): number =>
  toCents(amount) * centScale(currency);

/** Stripe's minor units back to a stored amount (2 decimals): 12500 KWD → 12.5. */
export const fromStripeAmount = (minor: number, currency: string): number =>
  Math.round(minor / centScale(currency)) / 100;

/** The lowest amount the admin's cap allows (null = no cap: anything above 0). */
export function minLinkAmount(reference: number, maxDiscountPct: number | null): number | null {
  if (maxDiscountPct === null) return null;
  return Math.ceil((toMinorUnits(reference) * (100 - maxDiscountPct)) / 100 - 1e-9) / 100;
}

/** 'discount_too_large' when the agreed amount is below the cap's minimum. */
export function linkAmountProblem(input: {
  amount: number;
  reference: number;
  maxDiscountPct: number | null;
}): 'discount_too_large' | null {
  const min = minLinkAmount(input.reference, input.maxDiscountPct);
  return min !== null && input.amount + 1e-9 < min ? 'discount_too_large' : null;
}

/** What a stored status means now: an open link past its expiry is expired. */
export function effectiveLinkStatus(
  link: { status: PaymentLinkStatus; expires_at: string },
  now: Date,
): PaymentLinkStatus {
  return link.status === 'open' && Date.parse(link.expires_at) <= now.getTime()
    ? 'expired'
    : link.status;
}

/**
 * The Stripe test app's Android package (apps/staff-mobile app.config.ts: app.json's package + '.stripetest'; its
 * app-config.stripe.test.ts pins this): the pay page names it to bring the payer back into that app.
 */
export const STRIPE_TEST_APP_PACKAGE = 'com.ayatalbayan.admin.stripetest';
/** The normal app's Android package (app.json; app-config.stripe.test.ts pins it): live mode. */
export const STRIPE_APP_PACKAGE = 'com.ayatalbayan.admin';

/** The platform link the assistant sends: https://<web>/pay/<token> (WEB_ORIGIN's first origin). */
export function paymentLinkUrl(webOrigin: string, token: string): string {
  const base = (webOrigin.split(',')[0] ?? '').trim().replace(/\/+$/, '');
  return `${base}/pay/${token}`;
}
