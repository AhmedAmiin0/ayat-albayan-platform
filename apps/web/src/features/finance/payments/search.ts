import { PAYMENT_KINDS, PAYMENT_METHODS, PAYMENT_SORT_KEYS, type PaymentKind, type PaymentMethod } from '@ab/shared';
import { parsePage } from '@/features/finance/subscriptions/search';
import { parseFilterSearch, parseSortSearch, type SortDir, type SortSearch } from '@/lib/list/list-search';
import type { PaymentFilters } from './api';

// URL state of /admin/payments: the bar's student/range/kind, the table's sort and method filter.
// Defaults (page 1, no filter, newest first) stay out of the URL.

export type PaymentsUrlSearch = {
  page?: number;
  studentId?: string;
  from?: string;
  to?: string;
  kind?: PaymentKind;
  sort?: string;
  dir?: SortDir;
  f_method?: PaymentMethod;
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[0-9a-f-]{36}$/i;
const str = (v: unknown, re: RegExp) => (typeof v === 'string' && re.test(v) ? v : undefined);
const oneOf = <T extends string>(list: readonly T[], v: unknown) => list.find((x) => x === v);

export function parsePaymentsSearch(s: Record<string, unknown>): PaymentsUrlSearch {
  const { method } = parseFilterSearch(s, ['method']);
  return {
    ...parsePage(s),
    studentId: str(s['studentId'], ID),
    from: str(s['from'], DAY),
    to: str(s['to'], DAY),
    kind: oneOf(PAYMENT_KINDS, s['kind']),
    ...parseSortSearch(s, PAYMENT_SORT_KEYS),
    f_method: oneOf(PAYMENT_METHODS, method),
  };
}

/** The API filters (bar + column) and the sort of a parsed URL. */
export function paymentsView(s: PaymentsUrlSearch): { filters: PaymentFilters; sort: SortSearch } {
  const picked = { studentId: s.studentId, from: s.from, to: s.to, method: s.f_method, kind: s.kind };
  const filters = Object.fromEntries(Object.entries(picked).filter(([, v]) => v !== undefined)) as PaymentFilters;
  const sort: SortSearch = s.sort ? { sort: s.sort, ...(s.dir ? { dir: s.dir } : {}) } : {};
  return { filters, sort };
}
