import type { SubscriptionStatus } from '@ab/catalog';
import type { Page } from '@ab/core';
import type {
  QuoteResponse,
  StudentBalanceView,
  SubscriptionPricing,
  SubscriptionView,
} from '@ab/money';
import { adminTaskCalls, startDateEditCall } from '@ab/client-core';
import { usedBeforeEditResultSchema, usedBeforeStateSchema } from '@ab/shared';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { moneyKeys } from '@/features/finance/keys';
import { sortFilterParams, type FilterSearch, type SortSearch } from '@/lib/list/list-search';

// apps/api/src/modules/subscriptions (docs/11 §6). The client never prices: the price shown and
// stored both come from the API's catalog quote.
export type { AdminTaskView, QuoteResponse, StudentBalanceView, SubscriptionView } from '@ab/money';

/** Every money write invalidates this (subscriptions, balances, payments, tasks). */
export const MONEY_KEY = moneyKeys.all;
export const PAGE_SIZE = 20;

interface SubscriptionsListQuery {
  status?: SubscriptionStatus | 'partial' | undefined;
  page: number;
  sort?: SortSearch;
  filters?: FilterSearch;
}

/** GET /subscriptions: one page, filtered and (R-NFR-08) sorted server-side; default newest first. */
export const subscriptionsQuery = (q: SubscriptionsListQuery) =>
  queryOptions({
    queryKey: moneyKeys.subscriptions(q),
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
    queryKey: moneyKeys.studentSubscriptions(studentId),
    queryFn: () =>
      apiFetch<Page<SubscriptionView>>(`/subscriptions?studentId=${studentId}&pageSize=100`),
  });

export const studentBalanceQuery = (studentId: string) =>
  queryOptions({
    queryKey: moneyKeys.balance(studentId),
    queryFn: () => apiFetch<StudentBalanceView>(`/students/${studentId}/balance`),
  });

const taskCalls = adminTaskCalls({ apiFetch, apiSend });

export const openTasksQuery = queryOptions({
  queryKey: moneyKeys.tasks(),
  queryFn: () => taskCalls.list({ open: 'true', pageSize: 50 }),
});

export interface CreateSubscriptionBody {
  studentId: string;
  pricing: SubscriptionPricing;
  startsOn: string;
  notes?: string | null;
  /** Only with a start before today, and only when > 0. */
  lessonsUsedBefore?: number;
  /** Absent means the quote's price. */
  customPrice?: number;
  /** Rule 8: the same body re-sent (a retry) carries the same id, so the API replays the first package. */
  clientRequestId?: string;
}

export const quoteSubscription = (body: Pick<CreateSubscriptionBody, 'studentId' | 'pricing'>) =>
  apiSend<QuoteResponse>('POST', '/subscriptions/quote', body);

export const createSubscription = (body: CreateSubscriptionBody) =>
  apiSend<SubscriptionView>('POST', '/subscriptions', body);

/** 409 has_payments, has_lessons or already_cancelled. */
export const cancelSubscription = (id: string, body: { reason?: string }) =>
  apiSend<SubscriptionView>('POST', `/subscriptions/${id}/cancel`, body);

/** Admins and assistants; 409 once a course is booked. */
export const editUsedBefore = (id: string, lessonsUsedBefore: number) =>
  apiSend('PATCH', `/subscriptions/${id}/lessons-used-before`, { lessonsUsedBefore }).then(
    (raw: unknown) => usedBeforeEditResultSchema.parse(raw),
  );

/** Needs subscriptions.edit_terms; changes starts_on only. */
export const editStartDate = startDateEditCall({ apiFetch, apiSend });

/** GET /subscriptions/:id/lessons-used-before: the stored number, the max, a refusal. */
export const usedBeforeStateQuery = (id: string) =>
  queryOptions({
    queryKey: moneyKeys.usedBefore(id),
    queryFn: () =>
      apiFetch(`/subscriptions/${id}/lessons-used-before`).then((raw: unknown) =>
        usedBeforeStateSchema.parse(raw),
      ),
  });

export const completeTask = taskCalls.done;
