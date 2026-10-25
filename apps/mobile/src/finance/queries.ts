import type { ExpenseCategoryView, ExpenseView, InvoiceView, PayoutView, TeacherEarningsSummaryView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/core/lib/http/api';
import { listKey, pathKey } from '@/core/lib/query/query-keys';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import type { FinanceSummary } from './summary-types';

// Admin finance reads. Keys are the API path's segments, so invalidating ['payouts'] reaches a month.

export const usePayouts = (month: string) =>
  useQuery({ queryKey: listKey('/payouts', { month }), queryFn: () => apiFetch<PayoutView[]>(`/payouts?month=${month}`) });

export const useExpenses = (month: string) =>
  useQuery({ queryKey: listKey('/expenses', { month }), queryFn: () => apiFetch<ExpenseView[]>(`/expenses?month=${month}`) });

export const useExpenseCategories = () =>
  useQuery({
    queryKey: pathKey('/expense-categories'),
    queryFn: () => apiFetch<ExpenseCategoryView[]>('/expense-categories'),
    staleTime: 10 * 60_000,
  });

/** GET /invoices/recent (the web's list): newest first, each with the payment recorded from it. */
export const useInvoices = () => usePagedList<InvoiceView>({ path: '/invoices/recent' });

export const useFinanceSummary = (range: { from: string; to: string }) =>
  useQuery({
    // 'finance': its own cache entry (other staleTime and projection than the dashboard's useSummary).
    queryKey: [...pathKey('/dashboard/summary'), 'finance', range],
    queryFn: () => apiFetch<FinanceSummary>(`/dashboard/summary?from=${range.from}&to=${range.to}`),
    staleTime: 60_000,
  });

export const useTeacherDues = () =>
  useQuery({
    queryKey: pathKey('/teacher-earnings/summary'),
    queryFn: () => apiFetch<TeacherEarningsSummaryView>('/teacher-earnings/summary'),
    staleTime: 60_000,
  });
