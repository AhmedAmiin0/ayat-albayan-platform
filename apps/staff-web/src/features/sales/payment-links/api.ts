import type {
  PaymentLinkCreate,
  PaymentLinkQuoteView,
  PaymentLinkView,
  PublicPaymentLink,
  StripeFeature,
} from '@ab/shared';
import type { SubscriptionPricing } from '@ab/money';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend, env } from '@ab/web-kit';
import { paymentLinkKeys, publicLinkKeys, stripeKeys } from '@/features/sales/keys';

// Payment links (docs/30) need FEATURE_STRIPE; reads go behind stripeBuild(); 404 means no Stripe.

/** Her links and their quotes. */
export const PAYMENT_LINKS_KEY = paymentLinkKeys.all;

/** GET /stripe/feature (public): never retried, a 404 is an answer (OFF). */
export const stripeFeatureQuery = queryOptions({
  queryKey: stripeKeys.feature(),
  queryFn: () => apiFetch<StripeFeature>('/stripe/feature'),
  retry: false,
  staleTime: 5 * 60_000,
});

/** GET /sales/payment-links: hers, newest first. */
export const paymentLinksQuery = queryOptions({
  queryKey: paymentLinkKeys.list(),
  queryFn: () => apiFetch<PaymentLinkView[]>('/sales/payment-links'),
});

export const quotePaymentLink = (body: { studentId: string; pricing: SubscriptionPricing }) =>
  apiSend<PaymentLinkQuoteView>('POST', '/sales/payment-links/quote', body);

export const createPaymentLink = (body: PaymentLinkCreate) => apiSend<PaymentLinkView>('POST', '/sales/payment-links', body);

export const cancelPaymentLink = (id: string) => apiSend<PaymentLinkView>('POST', `/sales/payment-links/${id}/cancel`);

/** GET /pay/:token (public, no login) as JSON: without the Accept header the API answers its own HTML page. */
export const publicLinkQuery = (token: string) =>
  queryOptions({
    queryKey: publicLinkKeys.link(token),
    queryFn: () => apiFetch<PublicPaymentLink>(`/pay/${encodeURIComponent(token)}`, { headers: { Accept: 'application/json' } }),
    retry: false,
  });

/** Pay now is a browser navigation (303 to Stripe Checkout or back), never a fetch. */
export const checkoutUrl = (token: string): string => `${env.apiUrl}/pay/${encodeURIComponent(token)}/checkout`;
