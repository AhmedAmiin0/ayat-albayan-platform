import type { InvoiceView, ReceivablesView, SignedDownload } from '@ab/shared';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { MONEY_KEY, type Page } from '@/features/subscriptions/api';

// The «المالية» pages (owner, 2026-10-05): receivables, invoices, the yearly P&L (dashboard summary).
export type { InvoiceView, ReceivablesView } from '@ab/shared';

/** GET /receivables: who owes, how much, how long, with one total in the reporting currency. */
export const receivablesQuery = queryOptions({
  queryKey: [...MONEY_KEY, 'receivables'],
  queryFn: () => apiFetch<ReceivablesView>('/receivables'),
  staleTime: 60_000,
});

export const INVOICE_PAGE_SIZE = 25;

/** GET /invoices/recent?from&to&page: every booking invoice, newest first, with its payment if recorded. */
export const invoicesQuery = (q: { page: number; from?: string; to?: string }) =>
  queryOptions({
    queryKey: [...MONEY_KEY, 'invoices', q],
    queryFn: () => {
      const qs = new URLSearchParams({ page: String(q.page), pageSize: String(INVOICE_PAGE_SIZE) });
      if (q.from) qs.set('from', q.from);
      if (q.to) qs.set('to', q.to);
      return apiFetch<Page<InvoiceView>>(`/invoices/recent?${qs}`);
    },
    placeholderData: keepPreviousData,
  });

export const invoiceDownload = (id: string) => apiFetch<SignedDownload>(`/invoices/${id}/download`);

/** «2026» → the dashboard summary range of that year (Riyadh days; this year ends today). */
export function yearRange(year: string, today: string): { from: string; to: string } {
  return { from: `${year}-01-01`, to: today.startsWith(year) ? today : `${year}-12-31` };
}
