import { localDateIn, type LessonStatus } from '@ab/shared';
import type { TodayLesson } from './today-lesson';

// «اليوم» (R-MOB-02, docs/29): which lessons show and the summary card's counts, each column also
// its filter. Pure, so the screen only lays it out.

export const TODAY_FILTERS = ['all', 'scheduled', 'completed'] as const;
export type TodayFilter = (typeof TODAY_FILTERS)[number];

/**
 * Closed rows the contract hides unless «إظهار الملغية…» is on (docs/10 §5.1). Mobile has no such
 * toggle yet, so a cancelled lesson leaves the timeline the moment it is cancelled.
 */
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

export function applyFilter<L extends TodayLesson>(lessons: readonly L[], filter: TodayFilter): L[] {
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
