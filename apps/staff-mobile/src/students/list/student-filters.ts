import { STUDENT_FILTER_KEYS, STUDENT_STATUSES, type StudentSortKey, type StudentStatus } from '@ab/shared';

/** «الترتيب» choices: the server's default (newest) or one column, ascending (GET /students ?sort=&dir=). */
export const SORT_CHOICES = ['newest', 'name', 'code', 'remaining'] as const;
export type SortChoice = (typeof SORT_CHOICES)[number];
const SORT_KEY: Record<Exclude<SortChoice, 'newest'>, StudentSortKey> = { name: 'name', code: 'code', remaining: 'remaining' };

export type FilterKey = (typeof STUDENT_FILTER_KEYS)[number];

/** The list's filters as the web's StudentFilters: '' = «الكل». Same names as the API query (R-STU-01). */
export type StudentFilters = Record<FilterKey, string> & { sort: SortChoice };

export const NO_FILTERS: StudentFilters = { status: '', teacher: '', program: '', package: '', weekly: '', tz: '', sort: 'newest' };

/** Query params of GET /students/status-counts: the filters except `status` (the counts are per status). */
export function countParams(f: StudentFilters): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const k of STUDENT_FILTER_KEYS) if (k !== 'status') out[k] = f[k] || undefined;
  return out;
}

/** Query params of GET /students: every set filter, and the sort. */
export function listParams(f: StudentFilters): Record<string, string | undefined> {
  const sorted = f.sort === 'newest' ? {} : { sort: SORT_KEY[f.sort], dir: 'asc' };
  return { ...countParams(f), status: f.status || undefined, ...sorted };
}

/** How many filters are set (the sort is not a filter). */
export const activeCount = (f: StudentFilters): number => STUDENT_FILTER_KEYS.filter((k) => f[k] !== '').length;

/** The API's count for a status; undefined unless the answer really is a number (never shown as «NaN»). */
export function countOf(counts: unknown, status: StudentStatus): number | undefined {
  const n: unknown = typeof counts === 'object' && counts !== null ? Reflect.get(counts, status) : undefined;
  return typeof n === 'number' ? n : undefined;
}

/** «الكل»: the sum of the per-status counts, undefined until every one is known. */
export function totalOf(counts: unknown): number | undefined {
  const all = STUDENT_STATUSES.map((s) => countOf(counts, s));
  return all.every((n): n is number => n !== undefined) ? all.reduce((a, b) => a + b, 0) : undefined;
}
