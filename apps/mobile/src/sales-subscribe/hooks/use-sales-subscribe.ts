import type { SalesMoneySubscriptionView, SalesQuoteView, SubscriptionPricing } from '@ab/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiSend } from '@/core/lib/http/api';
import { requestId } from '@/core/lib/http/request-id';
import { familyKey, refreshFamily, withOpenPackage } from '../lib/family';

/** POST /sales/subscriptions/quote: the price she tells the family (no fx details). Keyed by its body. */
export function useSalesQuote(studentId: string, pricing: SubscriptionPricing) {
  return useQuery({
    queryKey: ['sales', 'subscriptions', 'quote', studentId, pricing],
    queryFn: () => apiSend<SalesQuoteView>('POST', '/sales/subscriptions/quote', { studentId, pricing }),
    placeholderData: keepPreviousData,
    enabled: studentId !== '',
  });
}

export interface SalesSubscribeInput {
  studentId: string;
  pricing: SubscriptionPricing;
  /** Local YYYY-MM-DD, only with subscriptions.set_start_date (else the API's default day). */
  startsOn?: string;
  /** «بدأ الاشتراك سابقًا»: sent only when on. */
  alreadyStarted?: true;
}

/**
 * «احفظ الاشتراك» → POST /sales/subscriptions with ONE clientRequestId for the open screen (rule 8):
 * a retry after a lost reply replays the package the API already made. The new package joins the
 * family's open packages at once (the transfer screen lists it), and the chat refetches.
 */
export function useSalesCreateSubscription(phone: string) {
  const client = useQueryClient();
  const [clientRequestId] = useState(requestId);
  return useMutation({
    mutationKey: ['sales', 'subscriptions', 'create'],
    mutationFn: (input: SalesSubscribeInput) =>
      apiSend<SalesMoneySubscriptionView>('POST', '/sales/subscriptions', { ...input, clientRequestId }),
    onSuccess: (sub) => {
      client.setQueryData(familyKey(phone), (f: Parameters<typeof withOpenPackage>[0]) => withOpenPackage(f, sub));
    },
    onSettled: () => refreshFamily(client, phone),
  });
}
