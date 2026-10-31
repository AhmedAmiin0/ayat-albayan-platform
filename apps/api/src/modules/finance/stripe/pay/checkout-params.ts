import { paymentLinkUrl, toMinorUnits } from '@ab/shared';
import type Stripe from 'stripe';
import { ar } from '@/common/infra/i18n/server-text';
import { integrationIdentifier } from '../links/link-ids';
import type { LinkRow } from '../links/payment-links.queries';

const MIN = 60_000;
/** Checkout accepts 30 min – 24 h; the session never outlives its link (but always lasts the minimum). */
export function sessionExpiry(linkExpiresAt: string, now: Date): number {
  const latest = Math.min(Date.parse(linkExpiresAt), now.getTime() + 23 * 60 * MIN);
  return Math.floor(Math.max(latest, now.getTime() + 31 * MIN) / 1000);
}

/**
 * One Checkout Session for a link (Stripe best practices): mode payment, the amount inline in minor units in
 * the package currency, NO payment_method_types (dynamic payment methods from the Dashboard), the link and
 * the assistant in metadata (also on the PaymentIntent, so a charge / refund can be traced), the link id as
 * client_reference_id, back to the API's done / cancelled pages (text only: the webhook alone fulfils).
 */
export function checkoutParams(link: LinkRow, ctx: { payOrigin: string; now: Date }): Stripe.Checkout.SessionCreateParams {
  const page = paymentLinkUrl(ctx.payOrigin, link.token);
  const metadata = {
    payment_link_id: link.id,
    subscription_id: link.subscription_id ?? '',
    student_id: link.student_id,
    assistant_id: link.created_by,
  };
  const name = `${ar.paymentLinks.pay.title} — ${ar.paymentLinks.lessons.replace('{count}', String(link.lessons))}`;
  return {
    mode: 'payment',
    line_items: [{ quantity: 1, price_data: { currency: link.currency.toLowerCase(), unit_amount: toMinorUnits(link.amount), product_data: { name } } }],
    client_reference_id: link.id,
    metadata,
    payment_intent_data: { metadata },
    success_url: `${page}/done`,
    cancel_url: `${page}/cancelled`,
    expires_at: sessionExpiry(link.expires_at, ctx.now),
    integration_identifier: integrationIdentifier(),
  };
}
