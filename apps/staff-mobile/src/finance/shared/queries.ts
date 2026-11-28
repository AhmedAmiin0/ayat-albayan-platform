import {
  expenseCalls,
  expenseCategoryCalls,
  payoutCalls,
  teacherEarningCalls,
} from '@ab/client-core';
import type { DashboardResponse } from '@ab/money';
import type { InvoiceView } from '@ab/schedule';
import { routePath } from '@ab/core';
import { payoutRoutes, teacherEarningRoutes } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, apiSend, listKey, pathKey } from '@ab/mobile-kit';
import { usePagedList } from '@/core/lib/query/use-paged-list';

// Admin finance reads. Keys are the API path's segments, so invalidating ['payouts'] reaches a month.

const payouts = payoutCalls({ apiFetch, apiSend });

export const usePayouts = (month: string) =>
  useQuery({
    queryKey: listKey(routePath(payoutRoutes.month), { month }),
    queryFn: () => payouts.month(month),
  });

const calls = expenseCalls({ apiFetch, apiSend });
const earnings = teacherEarningCalls({ apiFetch, apiSend });

export const useExpenses = (month: string) =>
  useQuery({
    queryKey: listKey('/expenses', { month }),
    queryFn: () => calls.list({ month }),
  });

const categoryCalls = expenseCategoryCalls({ apiFetch, apiSend });

export const useExpenseCategories = () =>
  useQuery({
    queryKey: pathKey('/expense-categories'),
    queryFn: categoryCalls.list,
    staleTime: 10 * 60_000,
  });

/** GET /invoices/recent (the web's list): newest first, each with the payment recorded from it. */
export const useInvoices = () => usePagedList<InvoiceView>({ path: '/invoices/recent' });

export const useFinanceSummary = (range: { from: string; to: string }) =>
  useQuery({
    // 'finance': its own cache entry (other staleTime and projection than the dashboard's useSummary).
    queryKey: [...pathKey('/dashboard/summary'), 'finance', range],
    queryFn: () =>
      apiFetch<DashboardResponse>(`/dashboard/summary?from=${range.from}&to=${range.to}`),
    staleTime: 60_000,
  });

export const useTeacherDues = () =>
  useQuery({
    queryKey: pathKey(routePath(teacherEarningRoutes.summary)),
    queryFn: earnings.summary,
    staleTime: 60_000,
  });
