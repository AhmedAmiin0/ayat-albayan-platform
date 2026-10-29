import type { MyCommissionRow, MyEarnings, MyPaymentRow, MyStudentRow } from '@ab/shared';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import type { Page } from '@/features/finance/subscriptions';
import { apiFetch, apiSend } from '@/lib/http/api';

export type SubscriptionKind = 'pending' | 'confirmed';

/** One of my subscriptions. Never carries a price or a payment (the salesperson sees no money). */
export interface SalesSubscription {
  id: string;
  student: { id: string; code: string; name: string };
  package: string;
  status: string;
  starts_on: string | null;
  lessons_total: number;
}

export interface SalesPerson {
  id: string;
  name: string;
  open_leads: number;
}

/** GET /sales/subscriptions?kind= — my pending or my confirmed subscriptions, one list per kind. */
export const salesSubscriptionsQuery = (kind: SubscriptionKind) =>
  queryOptions({
    queryKey: ['sales', 'subscriptions', kind],
    queryFn: () => apiFetch<SalesSubscription[]>(`/sales/subscriptions?kind=${kind}`),
  });

// The assistant's own pages (R-ASST-06). The API answers only for the caller: students they brought,
// payments they recorded, their commission and statements. Amounts stay per currency.

/** GET /sales/me/students — the students I brought, newest first; no price, only «paid or not». */
export const myStudentsQuery = queryOptions({
  queryKey: ['sales', 'me', 'students'],
  queryFn: () => apiFetch<MyStudentRow[]>('/sales/me/students'),
});

/** GET /sales/me/earnings — my terms, this month so far, commissions earned and my statements. */
export const myEarningsQuery = queryOptions({
  queryKey: ['sales', 'me', 'earnings'],
  queryFn: () => apiFetch<MyEarnings>('/sales/me/earnings'),
});

/** «محفظتي»: both of its queries sit under this key, so one invalidation refreshes the page. */
export const MY_MONEY_KEY = ['sales', 'me'] as const;
export const MY_COMMISSIONS_PAGE_SIZE = 20;

/** GET /sales/me/commissions — one page of my commissions, newest first (the previous page stays while the next loads). */
export const myCommissionsQuery = (page: number) =>
  queryOptions({
    queryKey: [...MY_MONEY_KEY, 'commissions', page],
    queryFn: () => apiFetch<Page<MyCommissionRow>>(`/sales/me/commissions?page=${page}&pageSize=${MY_COMMISSIONS_PAGE_SIZE}`),
    placeholderData: keepPreviousData,
  });

/** GET /sales/me/payments — only the payments I recorded. */
export const myPaymentsQuery = queryOptions({
  queryKey: ['sales', 'me', 'payments'],
  queryFn: () => apiFetch<MyPaymentRow[]>('/sales/me/payments'),
});

/** GET /sales/people (admin):the salespeople with their open-lead counts. */
export const salesPeopleQuery = queryOptions({
  queryKey: ['sales', 'people'],
  queryFn: () => apiFetch<SalesPerson[]>('/sales/people'),
});

/** POST /leads/:id/assign (admin): hand a lead to a salesperson, or null to take it back. */
export const assignLead = ({ leadId, profileId }: { leadId: string; profileId: string | null }) =>
  apiSend<unknown>('POST', `/leads/${leadId}/assign`, { profileId });

/** POST /leads/assign-unassigned (admin): spread every ownerless lead over the salespeople. */
export const assignUnassigned = () => apiSend<{ assigned: number }>('POST', '/leads/assign-unassigned');
