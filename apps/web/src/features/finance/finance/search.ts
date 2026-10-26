import { INVOICE_SORT_KEYS } from '@ab/shared';
import { parsePage } from '@/features/finance/subscriptions/search';
import { parseFilterSearch, parseSortSearch, type FilterSearch, type SortDir, type SortSearch } from '@/lib/list/list-search';

// URL state of /admin/invoices: the page, the created-day range, the table's sort and filters.
// Defaults (page 1, no range, newest first) stay out of the URL.

export type InvoiceKindFilter = 'package' | 'makeup';
export type InvoicesUrlSearch = {
  page?: number;
  from?: string;
  to?: string;
  sort?: string;
  dir?: SortDir;
  f_student?: string;
  f_kind?: InvoiceKindFilter;
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const day = (v: unknown) => (typeof v === 'string' && DAY.test(v) ? v : undefined);

export function parseInvoicesSearch(s: Record<string, unknown>): InvoicesUrlSearch {
  const f = parseFilterSearch(s, ['student', 'kind']);
  const kind = (['package', 'makeup'] as const).find((k) => k === f['kind']);
  return { ...parsePage(s), from: day(s['from']), to: day(s['to']), ...parseSortSearch(s, INVOICE_SORT_KEYS), f_student: f['student'], f_kind: kind };
}

/** The list query of a parsed URL: range, sort and the column filters under their API keys. */
export function invoicesList(s: InvoicesUrlSearch): { page: number; from?: string; to?: string; sort: SortSearch; filters: FilterSearch } {
  const filters: FilterSearch = {};
  if (s.f_student) filters['student'] = s.f_student;
  if (s.f_kind) filters['kind'] = s.f_kind;
  const sort: SortSearch = s.sort ? { sort: s.sort, ...(s.dir ? { dir: s.dir } : {}) } : {};
  return { page: s.page ?? 1, ...(s.from ? { from: s.from } : {}), ...(s.to ? { to: s.to } : {}), sort, filters };
}
