import { paymentLinkCalls } from '@ab/client-core';
import type { PaymentLinkCreate, PaymentLinkView } from '@ab/shared';
import type { SubscriptionPricing } from '@ab/money';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { apiFetch, apiSend } from '@ab/mobile-kit';
import { requestId } from '@/core/lib/http/request-id';
import { salesKeys } from '@/core/lib/keys';

// docs/30: requires FEATURE_STRIPE (test or live).

const links = paymentLinkCalls({ apiFetch, apiSend });

/** POST /sales/payment-links/quote: the reference price and the admin's cap. Keyed by its body. */
export function useLinkQuote(studentId: string, pricing: SubscriptionPricing) {
  return useQuery({
    queryKey: salesKeys.linkQuote(studentId, pricing),
    queryFn: () => links.quote({ studentId, pricing }),
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
      links.create({ ...body, clientRequestId }),
    onSettled: () => client.invalidateQueries({ queryKey: salesKeys.linkList() }),
  });
}

/** GET /sales/payment-links: hers, newest first. */
export function useLinks() {
  return useQuery({
    queryKey: salesKeys.linkList(),
    queryFn: () => links.list(),
  });
}

const byToken = (rows: PaymentLinkView[] | undefined, token: string) =>
  token ? rows?.find((link) => link.url.endsWith(`/pay/${token}`)) : undefined;

const WAIT_MS = 60_000;

/**
 * Back from Stripe (/pay-done): the link of `token` among hers (GET /sales/payment-links: only the links she
 * made, all for an admin), from our API, never from Stripe. While `wait` and the link is still open (the
 * webhook may land after Stripe's redirect) it asks again every 2 s, for a minute at most; then `timedOut`
 * (the screen says so) until `retry` asks at once and waits another minute.
 */
export function useLinkByToken(token: string, wait: boolean) {
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!wait || timedOut) return undefined;
    const timer = setTimeout(() => setTimedOut(true), WAIT_MS);
    return () => clearTimeout(timer);
  }, [wait, timedOut]);
  const query = useQuery({
    queryKey: salesKeys.linkList(),
    queryFn: () => links.list(),
    refetchInterval: (q) =>
      wait && !timedOut && byToken(q.state.data, token)?.status === 'open' ? 2000 : false,
  });
  const retry = () => {
    setTimedOut(false);
    void query.refetch();
  };
  return { ...query, link: byToken(query.data, token), timedOut, retry };
}

/** POST /sales/payment-links/:id/cancel (409 link_not_open). */
export function useCancelLink() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      links.cancel(id),
    onSettled: () => client.invalidateQueries({ queryKey: salesKeys.linkList() }),
  });
}
