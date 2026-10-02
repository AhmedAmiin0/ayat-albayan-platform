import type {
  QuoteResponse,
  StudentBalanceView,
  SubscriptionPricing,
  SubscriptionView,
} from '@ab/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { apiFetch, apiSend } from '@/lib/api';
import { isOffline } from '@/payments/payment-errors';
import { balanceKey } from '@/payments/queries';

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

/** The student's newest package id right before a POST, to recognise ours after a lost reply. */
type Attempt = { studentId: string; before: string | null };

/**
 * «حفظ» → POST /subscriptions. The API takes no idempotency key here, so the hook keeps the rule-8
 * promise itself: a second tap while a save is in flight joins it (one POST); and after a try that
 * got no answer (offline), the next one first reads the balance and, if a newer package is there,
 * returns it instead of saving twice. Afterwards the chat («مشترك»), its list and the balance refetch.
 */
export function useCreateSubscription() {
  const client = useQueryClient();
  const inflight = useRef<Promise<SubscriptionView> | null>(null);
  const attempt = useRef<Attempt | null>(null);
  const lost = useRef(false);
  // Always a fresh read: a cached balance may predate a package added since (e.g. on the web).
  const newest = async (studentId: string) => {
    const balance = await client.fetchQuery({
      queryKey: balanceKey(studentId),
      queryFn: () => apiFetch<StudentBalanceView>(`/students/${studentId}/balance`),
      staleTime: 0,
    });
    return balance.current;
  };

  async function save(input: SubscribeInput): Promise<SubscriptionView> {
    const retry = lost.current && attempt.current?.studentId === input.studentId;
    if (retry) {
      const latest = await newest(input.studentId);
      if (latest && latest.id !== attempt.current?.before) return latest;
    } else {
      const before = (await newest(input.studentId))?.id ?? null;
      attempt.current = { studentId: input.studentId, before };
    }
    return apiSend<SubscriptionView>('POST', '/subscriptions', { ...input, notes: null });
  }

  return useMutation({
    mutationKey: ['subscriptions', 'create'],
    mutationFn: (input: SubscribeInput) =>
      (inflight.current ??= save(input).finally(() => {
        inflight.current = null;
      })),
    onSuccess: () => {
      lost.current = false;
      attempt.current = null;
    },
    onError: (error) => {
      lost.current = isOffline(error);
    },
    onSettled: (_data, _error, input) => {
      void client.invalidateQueries({ queryKey: ['threads'] });
      void client.invalidateQueries({ queryKey: ['students', input.studentId] });
    },
  });
}
