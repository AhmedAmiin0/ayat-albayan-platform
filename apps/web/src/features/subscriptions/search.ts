import { PACKAGE_SIZES, SUBSCRIPTION_SORT_KEYS, SUBSCRIPTION_STATUSES, type PackageSize, type SubscriptionStatus } from '@ab/shared';
import { parseFilterSearch, parseSortSearch, type FilterSearch, type SortDir, type SortSearch } from '@/lib/list-search';

// URL search of the money pages; defaults (no filter, page 1, this month) stay out of the URL.

export type PagedUrlSearch = { page?: number };
/** `partial` is the derived «مدفوع جزئيًا» filter, not a stored status. */
export type SubscriptionFilter = SubscriptionStatus | 'partial';
/** `sort`/`dir` and the column filters `f_student` (name contains) and `f_package` (R-NFR-08). */
export type SubscriptionsUrlSearch = PagedUrlSearch & {
  status?: SubscriptionFilter;
  sort?: string;
  dir?: SortDir;
  f_student?: string;
  f_package?: PackageSize;
};
export type MonthUrlSearch = { month?: string };

export function parsePage(s: Record<string, unknown>): PagedUrlSearch {
  return { page: Number(s['page']) > 1 ? Math.floor(Number(s['page'])) : undefined };
}

export function parseSubscriptionsSearch(s: Record<string, unknown>): SubscriptionsUrlSearch {
  const status = [...SUBSCRIPTION_STATUSES, 'partial' as const].find((x) => x === s['status']);
  const f = parseFilterSearch(s, ['student', 'package']);
  const pkg = PACKAGE_SIZES.find((x) => x === f['package']);
  return { ...parsePage(s), status, ...parseSortSearch(s, SUBSCRIPTION_SORT_KEYS), f_student: f['student'], f_package: pkg };
}

/** The table's server sort and column filters (API keys) of a parsed URL. */
export function subscriptionsTable(s: SubscriptionsUrlSearch): { sort: SortSearch; filters: FilterSearch } {
  const sort: SortSearch = s.sort ? { sort: s.sort, ...(s.dir ? { dir: s.dir } : {}) } : {};
  const filters: FilterSearch = {};
  if (s.f_student) filters['student'] = s.f_student;
  if (s.f_package) filters['package'] = s.f_package;
  return { sort, filters };
}

export function parseMonthSearch(s: Record<string, unknown>): MonthUrlSearch {
  const m = s['month'];
  return { month: typeof m === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : undefined };
}
