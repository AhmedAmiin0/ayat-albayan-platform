import type { SalesMoneySubscriptionView, SalesQuoteView } from '@ab/shared';
import type { SubscriptionPricing } from '@ab/money';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiSend } from '@ab/mobile-kit';
import { requestId } from '@/core/lib/http/request-id';
import { refreshFamily, withOpenPackage } from '@/sales-subscribe/lib/family';
import { salesKeys } from '@/core/lib/keys';

/** POST /sales/subscriptions/quote: the price she tells the family (no fx details). Keyed by its body. */
export function useSalesQuote(
  studentId: string,
  pricing: SubscriptionPricing,
  bind: { phone?: string } = {},
) {
  return useQuery({
    queryKey: salesKeys.quote(studentId, pricing, bind),
    queryFn: () =>
      apiSend<SalesQuoteView>('POST', '/sales/subscriptions/quote', {
        studentId,
        pricing,
        ...bind,
      }),
    placeholderData: keepPreviousData,
    enabled: studentId !== '',
  });
}

interface SalesSubscribeInput {
  studentId: string;
  pricing: SubscriptionPricing;
  /** Local YYYY-MM-DD, only with subscriptions.set_start_date (else the API's default day). */
  startsOn?: string;
  /** Sent only when on. */
  alreadyStarted?: true;
  /** Only with alreadyStarted and only above 0. */
  lessonsUsedBefore?: number;
  /** Omitted means no teacher yet. */
  teacherId?: string;
  /** The chat's phone for a child not hers (chatBinding, sales.renew_any). */
  phone?: string;
  /** Omitted means the quote's price. */
  customPrice?: number;
}

/** Rule 8: one clientRequestId per screen, so a retry replays the package already made. */
export function useSalesCreateSubscription(phone: string) {
  const client = useQueryClient();
  const [clientRequestId] = useState(requestId);
  return useMutation({
    mutationKey: ['sales', 'subscriptions', 'create'],
    mutationFn: (input: SalesSubscribeInput) =>
      apiSend<SalesMoneySubscriptionView>('POST', '/sales/subscriptions', {
        ...input,
        clientRequestId,
      }),
    onSuccess: (sub) => {
      client.setQueryData(salesKeys.family(phone), (f: Parameters<typeof withOpenPackage>[0]) =>
        withOpenPackage(f, sub),
      );
    },
    onSettled: () => refreshFamily(client, phone),
  });
}
