import type { InvoiceView, ReceivablesView, SignedDownload } from '@ab/shared';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch } from '@/lib/http/api';
import { sortFilterParams, type FilterSearch, type SortSearch } from '@/lib/list/list-search';
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

type InvoicesList = { page: number; from?: string; to?: string; sort?: SortSearch; filters?: FilterSearch };

/** GET /invoices/recent?from&to&kind&student&sort&dir&page: booking invoices (newest first unless sorted), with their payment. */
export const invoicesQuery = (q: InvoicesList) =>
  queryOptions({
    queryKey: [...MONEY_KEY, 'invoices', q],
    queryFn: () => {
      const qs = new URLSearchParams(sortFilterParams(q.sort ?? {}, q.filters));
      qs.set('page', String(q.page));
      qs.set('pageSize', String(INVOICE_PAGE_SIZE));
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
