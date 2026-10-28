import type {
  AdminTaskView,
  QuoteResponse,
  StudentBalanceView,
  SubscriptionPricing,
  SubscriptionStatus,
  SubscriptionView,
} from '@ab/shared';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/http/api';
import { sortFilterParams, type FilterSearch, type SortSearch } from '@/lib/list/list-search';

// apps/api/src/modules/subscriptions (docs/11 §6). The client never prices: the price shown and
// stored both come from the API's catalog quote.
export type { AdminTaskView, QuoteResponse, StudentBalanceView, SubscriptionView } from '@ab/shared';
export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

/** Every money write invalidates this (subscriptions, balances, payments, tasks). */
export const MONEY_KEY = ['money'] as const;
export const PAGE_SIZE = 20;

type SubscriptionsListQuery = { status?: SubscriptionStatus | 'partial' | undefined; page: number; sort?: SortSearch; filters?: FilterSearch };

/** GET /subscriptions: one page, filtered and (R-NFR-08) sorted server-side; default newest first. */
export const subscriptionsQuery = (q: SubscriptionsListQuery) =>
  queryOptions({
    queryKey: [...MONEY_KEY, 'subscriptions', q],
    queryFn: () => {
      const qs = new URLSearchParams(sortFilterParams(q.sort ?? {}, q.filters));
      qs.set('page', String(q.page));
      qs.set('pageSize', String(PAGE_SIZE));
      if (q.status === 'partial') qs.set('paid', 'partial');
      else if (q.status) qs.set('status', q.status);
      return apiFetch<Page<SubscriptionView>>(`/subscriptions?${qs}`);
    },
    placeholderData: keepPreviousData,
  });

/** One student's packages (every status; the picker hides the ended ones). */
export const studentSubscriptionsQuery = (studentId: string) =>
  queryOptions({
    queryKey: [...MONEY_KEY, 'subscriptions', 'student', studentId],
    queryFn: () => apiFetch<Page<SubscriptionView>>(`/subscriptions?studentId=${studentId}&pageSize=100`),
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
  /** «حلقات مستخدمة من الباقة» (owner 2026-10-28): only with a start before today, when > 0. */
  lessonsUsedBefore?: number;
  /** Rule 8: the same body re-sent (a retry) carries the same id, so the API replays the first package. */
  clientRequestId?: string;
};

export const quoteSubscription = (body: Pick<CreateSubscriptionBody, 'studentId' | 'pricing'>) =>
  apiSend<QuoteResponse>('POST', '/subscriptions/quote', body);

export const createSubscription = (body: CreateSubscriptionBody) =>
  apiSend<SubscriptionView>('POST', '/subscriptions', body);

/** «إلغاء الباقة» (owner 2026-10-28): 409 has_payments / has_lessons / already_cancelled. */
export const cancelSubscription = (id: string, body: { reason?: string }) =>
  apiSend<SubscriptionView>('POST', `/subscriptions/${id}/cancel`, body);

export const completeTask = (id: string) => apiSend<AdminTaskView>('POST', `/admin-tasks/${id}/done`);
