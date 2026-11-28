import {
  mySalesCalls,
  salesAssignCalls,
  salesPaymentCalls,
  salesPortalCalls,
} from '@ab/client-core';
import type { SalesSubscriptionKind } from '@ab/shared';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { myMoneyKeys, salesKeys, salesSubscriptionKeys } from '@/features/sales/keys';

const salesPortal = salesPortalCalls({ apiFetch, apiSend });
const salesAssign = salesAssignCalls({ apiFetch, apiSend });
const salesPayments = salesPaymentCalls({ apiFetch, apiSend });

/** GET /sales/subscriptions?kind= — my pending or my confirmed subscriptions, one list per kind. */
export const salesSubscriptionsQuery = (kind: SalesSubscriptionKind) =>
  queryOptions({
    queryKey: salesSubscriptionKeys.list(kind),
    queryFn: () => salesPortal.subscriptions(kind),
  });

const mine = mySalesCalls({ apiFetch, apiSend });

// The assistant's own pages (R-ASST-06). The API answers only for the caller: students they brought,
// payments they recorded, their commission and statements. Amounts stay per currency.

/** GET /sales/me/students — the students I brought, newest first; no price, only «paid or not». */
export const myStudentsQuery = queryOptions({
  queryKey: myMoneyKeys.students(),
  queryFn: () => mine.students(),
});

/** GET /sales/me/earnings — my terms, this month so far, commissions earned and my statements. */
export const myEarningsQuery = queryOptions({
  queryKey: myMoneyKeys.earnings(),
  queryFn: () => mine.earnings(),
});

/** Both wallet queries sit under this key, so one invalidation refreshes the page. */
export const MY_MONEY_KEY = myMoneyKeys.all;
export const MY_COMMISSIONS_PAGE_SIZE = 20;

/** GET /sales/me/commissions — one page of my commissions, newest first (the previous page stays while the next loads). */
export const myCommissionsQuery = (page: number) =>
  queryOptions({
    queryKey: myMoneyKeys.commissions(page),
    queryFn: () => mine.commissions({ page, pageSize: MY_COMMISSIONS_PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

/** GET /sales/me/payments — only the payments I recorded. */
export const myPaymentsQuery = queryOptions({
  queryKey: myMoneyKeys.payments(),
  queryFn: () => mine.payments(),
});

/** PATCH /sales/payments/:id/amount (subscriptions.edit_terms): a payment, never card. */
export const updateMyPaymentAmount = (id: string, amount: number) =>
  salesPayments.editAmount({ paymentId: id, amount });

/** GET /sales/people (admin):the salespeople with their open-lead counts. */
export const salesPeopleQuery = queryOptions({
  queryKey: salesKeys.people(),
  queryFn: () => salesAssign.people(),
});

/** POST /leads/:id/assign (admin): hand a lead to a salesperson, or null to take it back. */
export const assignLead = salesAssign.assign;

/** POST /leads/assign-unassigned (admin): spread every ownerless lead over the salespeople. */
export const assignUnassigned = () => salesAssign.assignUnassigned();
