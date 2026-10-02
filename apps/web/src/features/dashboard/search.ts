import { dateRangeQuery, RIYADH_TZ } from '@ab/shared';
import { addDays, weekStart, zonedParts } from '@/features/schedule/tz';
import type { DayRange } from './types';

/** The admin's queue under the KPI strip. */
export const WORK_TABS = ['reports', 'unpaid', 'tasks'] as const;
export type WorkTab = (typeof WORK_TABS)[number];

/** /admin URL state; defaults (the last 6 months, the reports queue) stay out of the URL. */
export type DashboardSearch = { from?: string; to?: string; work?: WorkTab };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const day = (v: unknown) => (typeof v === 'string' && DATE.test(v) && !Number.isNaN(Date.parse(v)) ? v : undefined);

/** Route `validateSearch`: a bad day or tab is dropped. */
export function parseDashboardSearch(s: Record<string, unknown>): DashboardSearch {
  const out: DashboardSearch = { from: day(s['from']), to: day(s['to']), work: WORK_TABS.find((w) => w === s['work']) };
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined));
}

/** Today in Riyadh, "YYYY-MM-DD" (ranges are Riyadh days, docs/11 §3). */
export function riyadhToday(now: Date = new Date()): string {
  return zonedParts(now, RIYADH_TZ).date;
}

/** Default period: the 1st of the month five months back → today (six bars in «by month»). */
export function defaultPeriod(today: string): DayRange {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7)) - 5;
  const first = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
  return { from: first, to: today };
}

export function periodOf(search: DashboardSearch, today: string): DayRange {
  const d = defaultPeriod(today);
  return { from: search.from ?? d.from, to: search.to ?? d.to };
}

/** The Riyadh week (Saturday → Friday) holding today, like /admin/schedule. */
export function thisWeek(today: string): DayRange {
  const from = weekStart(today);
  return { from, to: addDays(from, 6) };
}

/** null, or the ar.json dashboard.error key for a range the API would refuse. */
export function rangeError(r: DayRange): 'invalid_range' | 'range_too_large' | null {
  const parsed = dateRangeQuery.safeParse(r);
  if (parsed.success) return null;
  return parsed.error.issues.some((i) => i.message === 'range_too_large') ? 'range_too_large' : 'invalid_range';
}
