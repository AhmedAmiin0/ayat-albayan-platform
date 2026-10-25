import type { QuoteResponse, SubscriptionPricing, SubscriptionView } from '@ab/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { apiSend } from '@/core/lib/http/api';
import { requestId } from '@/core/lib/http/request-id';

/**
 * POST /subscriptions/quote (R-SUB-01): the price the save would store, from the catalog in the
 * guardian's currency. A POST, so it is keyed by its body. While a new choice loads the last price
 * stays (placeholder), and `isPlaceholderData` keeps «حفظ» off until the shown price is the one.
 */
export function useSubscriptionQuote(studentId: string, pricing: SubscriptionPricing) {
  return useQuery({
    queryKey: ['subscriptions', 'quote', studentId, pricing],
    queryFn: () => apiSend<QuoteResponse>('POST', '/subscriptions/quote', { studentId, pricing }),
    placeholderData: keepPreviousData,
    enabled: studentId !== '',
  });
}

export interface SubscribeInput {
  studentId: string;
  pricing: SubscriptionPricing;
  /** Local YYYY-MM-DD, picked from the day chips. */
  startsOn: string;
}

/**
 * «اعمل الاشتراك» → POST /subscriptions with an idempotency key (rule 8): the same body re-sent (a
 * retry after a 502, a dropped reply, or the screen opened again) carries the same clientRequestId
 * and the API returns the package it already made; a changed child, price or day is a new key. A
 * second tap while a save is in flight joins it (one POST). Afterwards the chat («مشترك»), its
 * list, the leads (the family's lead turns «مشترك», R-LEAD-01) and the balance refetch.
 */
export function useCreateSubscription() {
  const client = useQueryClient();
  const inflight = useRef<Promise<SubscriptionView> | null>(null);
  const request = useRef<{ body: string; id: string } | null>(null);

  function save(input: SubscribeInput): Promise<SubscriptionView> {
    const body = JSON.stringify(input);
    if (request.current?.body !== body) request.current = { body, id: requestId() };
    return apiSend<SubscriptionView>('POST', '/subscriptions', { ...input, notes: null, clientRequestId: request.current.id });
  }

  return useMutation({
    mutationKey: ['subscriptions', 'create'],
    mutationFn: (input: SubscribeInput) =>
      (inflight.current ??= save(input).finally(() => {
        inflight.current = null;
      })),
    onSettled: (_data, _error, input) => {
      for (const key of [['threads'], ['leads'], ['students', input.studentId]]) void client.invalidateQueries({ queryKey: key });
    },
  });
}
