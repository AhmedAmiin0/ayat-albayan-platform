import type { PaymentLinkCreate, PaymentLinkQuoteView, PaymentLinkView, SubscriptionPricing } from '@ab/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiFetch, apiSend } from '@/core/lib/http/api';
import { requestId } from '@/core/lib/http/request-id';

// «رابط دفع» (docs/30, test build only): the calculator price, the link, her links and their cancel.

const LINKS = ['sales', 'payment-links'] as const;

/** POST /sales/payment-links/quote: the reference price and the admin's cap. Keyed by its body. */
export function useLinkQuote(studentId: string, pricing: SubscriptionPricing) {
  return useQuery({
    queryKey: [...LINKS, 'quote', studentId, pricing],
    queryFn: () => apiSend<PaymentLinkQuoteView>('POST', '/sales/payment-links/quote', { studentId, pricing }),
    placeholderData: keepPreviousData,
    enabled: studentId !== '',
  });
}

/** POST /sales/payment-links with ONE clientRequestId per open form (rule 8): a retry replays the same link. */
export function useCreateLink() {
  const client = useQueryClient();
  const [clientRequestId] = useState(requestId);
  return useMutation({
    mutationFn: (body: Omit<PaymentLinkCreate, 'clientRequestId'>) =>
      apiSend<PaymentLinkView>('POST', '/sales/payment-links', { ...body, clientRequestId }),
    onSettled: () => client.invalidateQueries({ queryKey: [...LINKS, 'list'] }),
  });
}

/** GET /sales/payment-links: hers, newest first. */
export function useLinks() {
  return useQuery({
    queryKey: [...LINKS, 'list'],
    queryFn: () => apiFetch<PaymentLinkView[]>('/sales/payment-links'),
  });
}

const byToken = (rows: PaymentLinkView[] | undefined, token: string) =>
  token ? rows?.find((link) => link.url.endsWith(`/pay/${token}`)) : undefined;

/**
 * Back from Stripe (/pay-done): the link of `token` among hers (GET /sales/payment-links: only the links she
 * made, all for an admin), from our API, never from Stripe. While `wait` and the link is still open (the
 * webhook may land after Stripe's redirect) it asks again every 2 s, for a minute at most.
 */
export function useLinkByToken(token: string, wait: boolean) {
  const [since] = useState(Date.now);
  const query = useQuery({
    queryKey: [...LINKS, 'list'],
    queryFn: () => apiFetch<PaymentLinkView[]>('/sales/payment-links'),
    refetchInterval: (q) =>
      wait && Date.now() - since < 60_000 && byToken(q.state.data, token)?.status === 'open' ? 2000 : false,
  });
  return { ...query, link: byToken(query.data, token) };
}

/** POST /sales/payment-links/:id/cancel (409 link_not_open). */
export function useCancelLink() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiSend<PaymentLinkView>('POST', `/sales/payment-links/${encodeURIComponent(id)}/cancel`),
    onSettled: () => client.invalidateQueries({ queryKey: [...LINKS, 'list'] }),
  });
}
