import { SUBSCRIPTION_STATUSES, type SubscriptionStatus } from '@ab/shared';

// URL search of the money pages; defaults (no filter, page 1, this month) stay out of the URL.

export type PagedUrlSearch = { page?: number };
export type SubscriptionsUrlSearch = PagedUrlSearch & { status?: SubscriptionStatus };
export type MonthUrlSearch = { month?: string };

export function parsePage(s: Record<string, unknown>): PagedUrlSearch {
  return { page: Number(s['page']) > 1 ? Math.floor(Number(s['page'])) : undefined };
}

export function parseSubscriptionsSearch(s: Record<string, unknown>): SubscriptionsUrlSearch {
  const status = SUBSCRIPTION_STATUSES.find((x) => x === s['status']);
  return { ...parsePage(s), status };
}

export function parseMonthSearch(s: Record<string, unknown>): MonthUrlSearch {
  const m = s['month'];
  return { month: typeof m === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : undefined };
}
