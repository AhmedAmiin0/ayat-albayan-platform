import type { LessonStatus } from '@ab/catalog';
import { localDateIn } from '@ab/time';
import type { TodayLesson } from './today-lesson';

// Which lessons show and the summary counts (R-MOB-02, docs/29); pure.

export const TODAY_FILTERS = ['all', 'scheduled', 'completed'] as const;
export type TodayFilter = (typeof TODAY_FILTERS)[number];

/** Mobile has no show-cancelled toggle (docs/10 §5.1), so a cancelled lesson leaves at once. */
const CLOSED: readonly LessonStatus[] = [
  'rescheduled',
  'cancelled_by_teacher',
  'cancelled_by_admin',
  'excused',
];

/** The day's open and held lessons, earliest first (ISO UTC strings sort as instants). */
export function visibleLessons<L extends TodayLesson>(lessons: readonly L[]): L[] {
  return lessons
    .filter((l) => !CLOSED.includes(l.status))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

export function applyFilter<L extends TodayLesson>(
  lessons: readonly L[],
  filter: TodayFilter,
): L[] {
  return filter === 'all' ? [...lessons] : lessons.filter((l) => l.status === filter);
}

/** The summary counts, from the day the API returned (it is the whole day, not a page). */
export function filterCounts(lessons: readonly TodayLesson[]): Record<TodayFilter, number> {
  const counts: Record<TodayFilter, number> = { all: lessons.length, scheduled: 0, completed: 0 };
  for (const l of lessons) {
    if (l.status === 'scheduled' || l.status === 'completed') counts[l.status] += 1;
  }
  return counts;
}

/** The local calendar day in `tz` as YYYY-MM-DD, for GET /lessons/day?date (a key, not display). */
export function localDate(now: Date, tz: string): string {
  return localDateIn(now, tz);
}
