import type {
  AdminTaskView,
  QuoteResponse,
  StudentBalanceView,
  SubscriptionPricing,
  SubscriptionStatus,
  SubscriptionView,
} from '@ab/shared';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/api';

// apps/api/src/modules/subscriptions (docs/11 §6). The client never prices: the price shown and
// stored both come from the API's catalog quote.
export type { AdminTaskView, QuoteResponse, StudentBalanceView, SubscriptionView } from '@ab/shared';
export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

/** Every money write invalidates this (subscriptions, balances, payments, tasks). */
export const MONEY_KEY = ['money'] as const;
export const PAGE_SIZE = 20;

export const subscriptionsQuery = (q: { status?: SubscriptionStatus; page: number }) =>
  queryOptions({
    queryKey: [...MONEY_KEY, 'subscriptions', q],
    queryFn: () => {
      const qs = new URLSearchParams({ page: String(q.page), pageSize: String(PAGE_SIZE) });
      if (q.status) qs.set('status', q.status);
      return apiFetch<Page<SubscriptionView>>(`/subscriptions?${qs}`);
    },
    placeholderData: keepPreviousData,
  });

/** Packages waiting for money, for the record-payment picker. */
export const unpaidSubscriptionsQuery = queryOptions({
  queryKey: [...MONEY_KEY, 'subscriptions', 'unpaid-picker'],
  queryFn: () => apiFetch<Page<SubscriptionView>>('/subscriptions?status=unpaid&pageSize=100'),
});

export const studentBalanceQuery = (studentId: string) =>
  queryOptions({
    queryKey: [...MONEY_KEY, 'balance', studentId],
    queryFn: () => apiFetch<StudentBalanceView>(`/students/${studentId}/balance`),
  });

export const openTasksQuery = queryOptions({
  queryKey: [...MONEY_KEY, 'tasks'],
  queryFn: () => apiFetch<Page<AdminTaskView>>('/admin-tasks?open=true&pageSize=50'),
});

export type CreateSubscriptionBody = {
  studentId: string;
  pricing: SubscriptionPricing;
  startsOn: string;
  notes?: string | null;
  /** Rule 8: the same body re-sent (a retry) carries the same id, so the API replays the first package. */
  clientRequestId?: string;
};

export const quoteSubscription = (body: Pick<CreateSubscriptionBody, 'studentId' | 'pricing'>) =>
  apiSend<QuoteResponse>('POST', '/subscriptions/quote', body);

export const createSubscription = (body: CreateSubscriptionBody) =>
  apiSend<SubscriptionView>('POST', '/subscriptions', body);

export const setPaused = ({ id, paused }: { id: string; paused: boolean }) =>
  apiSend<SubscriptionView>('PATCH', `/subscriptions/${id}`, { paused });

export const completeTask = (id: string) => apiSend<AdminTaskView>('POST', `/admin-tasks/${id}/done`);
