import type { PaymentLinkCreate, PublicPaymentLink } from '@ab/shared';
import { paymentLinkCalls, stripeFeatureCall } from '@ab/client-core';
import type { SubscriptionPricing } from '@ab/money';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend, env } from '@ab/web-kit';
import { paymentLinkKeys, publicLinkKeys, stripeKeys } from '@/features/sales/keys';

// Payment links (docs/30) need FEATURE_STRIPE; reads go behind stripeBuild(); 404 means no Stripe.

const links = paymentLinkCalls({ apiFetch, apiSend });

/** Her links and their quotes. */
export const PAYMENT_LINKS_KEY = paymentLinkKeys.all;

/** GET /stripe/feature (public): never retried, a 404 is an answer (OFF). */
export const stripeFeatureQuery = queryOptions({
  queryKey: stripeKeys.feature(),
  queryFn: stripeFeatureCall({ apiFetch, apiSend }),
  retry: false,
  staleTime: 5 * 60_000,
});

/** GET /sales/payment-links: hers, newest first. */
export const paymentLinksQuery = queryOptions({
  queryKey: paymentLinkKeys.list(),
  queryFn: () => links.list(),
});

export const quotePaymentLink = (body: { studentId: string; pricing: SubscriptionPricing }) =>
  links.quote(body);

export const createPaymentLink = (body: PaymentLinkCreate) => links.create(body);

export const cancelPaymentLink = (id: string) => links.cancel(id);

/** GET /pay/:token (public, no login) as JSON: without the Accept header the API answers its own HTML page. */
export const publicLinkQuery = (token: string) =>
  queryOptions({
    queryKey: publicLinkKeys.link(token),
    queryFn: () =>
      apiFetch<PublicPaymentLink>(`/pay/${encodeURIComponent(token)}`, {
        headers: { Accept: 'application/json' },
      }),
    retry: false,
  });

/** Pay now is a browser navigation (303 to Stripe Checkout or back), never a fetch. */
export const checkoutUrl = (token: string): string =>
  `${env.apiUrl}/pay/${encodeURIComponent(token)}/checkout`;
