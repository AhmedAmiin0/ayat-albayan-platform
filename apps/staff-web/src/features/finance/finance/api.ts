import { invoiceCalls, receivablesCall } from '@ab/client-core';
import type { Page } from '@ab/core';
import type { InvoiceView } from '@ab/schedule';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { sortFilterParams, type FilterSearch, type SortSearch } from '@/lib/list/list-search';
import { moneyKeys } from '@/features/finance/keys';

export type { ReceivablesView } from '@ab/money';
export type { InvoiceView } from '@ab/schedule';

/** GET /receivables: who owes, how much, how long, with one total in the reporting currency. */
export const receivablesQuery = queryOptions({
  queryKey: moneyKeys.receivables(),
  queryFn: receivablesCall({ apiFetch, apiSend }),
  staleTime: 60_000,
});

export const INVOICE_PAGE_SIZE = 25;

interface InvoicesList {
  page: number;
  from?: string;
  to?: string;
  sort?: SortSearch;
  filters?: FilterSearch;
}

/** GET /invoices/recent: booking invoices with their payment, newest first unless sorted. */
export const invoicesQuery = (q: InvoicesList) =>
  queryOptions({
    queryKey: moneyKeys.invoices(q),
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

export const invoiceDownload = invoiceCalls({ apiFetch, apiSend }).download;

/** «2026» → the dashboard summary range of that year (Riyadh days; this year ends today). */
export function yearRange(year: string, today: string): { from: string; to: string } {
  return { from: `${year}-01-01`, to: today.startsWith(year) ? today : `${year}-12-31` };
}
