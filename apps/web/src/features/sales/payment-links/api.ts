import type {
  PaymentLinkCreate,
  PaymentLinkQuoteView,
  PaymentLinkView,
  PublicPaymentLink,
  StripeAdminSettings,
  StripeFeature,
  StripeSettingsPatch,
  SubscriptionPricing,
} from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/http/api';
import { env } from '@/lib/http/env';

// «رابط دفع» (docs/30, TEST BUILD ONLY): /stripe/feature, /sales/payment-links, /pay/:token and
// /admin/stripe/settings. Each read is asked only behind stripeBuild(); a 404 means the server has no Stripe.

/** Her links and their quotes. */
export const PAYMENT_LINKS_KEY = ['sales', 'payment-links'] as const;

/** GET /stripe/feature (public): never retried, a 404 is an answer (OFF). */
export const stripeFeatureQuery = queryOptions({
  queryKey: ['stripe', 'feature'],
  queryFn: () => apiFetch<StripeFeature>('/stripe/feature'),
  retry: false,
  staleTime: 5 * 60_000,
});

/** GET /sales/payment-links: hers, newest first. */
export const paymentLinksQuery = queryOptions({
  queryKey: [...PAYMENT_LINKS_KEY, 'list'],
  queryFn: () => apiFetch<PaymentLinkView[]>('/sales/payment-links'),
});

export const quotePaymentLink = (body: { studentId: string; pricing: SubscriptionPricing }) =>
  apiSend<PaymentLinkQuoteView>('POST', '/sales/payment-links/quote', body);

export const createPaymentLink = (body: PaymentLinkCreate) => apiSend<PaymentLinkView>('POST', '/sales/payment-links', body);

export const cancelPaymentLink = (id: string) => apiSend<PaymentLinkView>('POST', `/sales/payment-links/${id}/cancel`);

/** GET /pay/:token (public, no login) as JSON: without the Accept header the API answers its own HTML page. */
export const publicLinkQuery = (token: string) =>
  queryOptions({
    queryKey: ['pay', token],
    queryFn: () => apiFetch<PublicPaymentLink>(`/pay/${encodeURIComponent(token)}`, { headers: { Accept: 'application/json' } }),
    retry: false,
  });

/** «ادفع الآن» is a browser navigation (303 to Stripe Checkout, or back to the page), never a fetch. */
export const checkoutUrl = (token: string): string => `${env.apiUrl}/pay/${encodeURIComponent(token)}/checkout`;

/** GET /admin/stripe/settings: 200 whenever the server has the feature env, 404 otherwise. */
export const stripeSettingsQuery = queryOptions({
  queryKey: ['admin', 'stripe', 'settings'],
  queryFn: () => apiFetch<StripeAdminSettings>('/admin/stripe/settings'),
  retry: false,
});

export const patchStripeSettings = (body: StripeSettingsPatch) => apiSend<StripeAdminSettings>('PATCH', '/admin/stripe/settings', body);
