import type { LessonStatus, LessonView } from '@ab/shared';

// «النهارده» timeline (R-MOB-02, docs/07 §12): which lessons show, the pill counts, and where the
// «دلوقتي» line falls. Pure, so the screen only lays it out.

export const TODAY_FILTERS = ['all', 'scheduled', 'confirmed', 'completed'] as const;
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
export function visibleLessons(lessons: readonly LessonView[]): LessonView[] {
  return lessons
    .filter((l) => !CLOSED.includes(l.status))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

export function applyFilter(lessons: readonly LessonView[], filter: TodayFilter): LessonView[] {
  return filter === 'all' ? [...lessons] : lessons.filter((l) => l.status === filter);
}

/** Pill counts, counted from the day the API returned (it is the whole day, not a page). */
export function filterCounts(lessons: readonly LessonView[]): Record<TodayFilter, number> {
  const counts: Record<TodayFilter, number> = { all: lessons.length, scheduled: 0, confirmed: 0, completed: 0 };
  for (const l of lessons) {
    if (l.status === 'scheduled' || l.status === 'confirmed' || l.status === 'completed') {
      counts[l.status] += 1;
    }
  }
  return counts;
}

export type TimelineItem =
  | { kind: 'past'; lesson: LessonView }
  | { kind: 'now' }
  | { kind: 'lesson'; lesson: LessonView };

/**
 * Finished lessons (ended by `now`) collapse into compact rows above the «دلوقتي» line; a lesson
 * under way stays a full card so its actions are still there. No lessons → [] (the empty state).
 */
export function timeline(lessons: readonly LessonView[], now: Date): TimelineItem[] {
  if (lessons.length === 0) return [];
  const at = now.getTime();
  const past: TimelineItem[] = [];
  const rest: TimelineItem[] = [];
  for (const lesson of lessons) {
    if (Date.parse(lesson.ends_at) <= at) past.push({ kind: 'past', lesson });
    else rest.push({ kind: 'lesson', lesson });
  }
  return [...past, { kind: 'now' }, ...rest];
}

export function timelineKey(item: TimelineItem): string {
  return item.kind === 'now' ? 'now' : item.lesson.id;
}

/** The local calendar day in `tz` as YYYY-MM-DD, for GET /lessons/day?date (a key, not display). */
export function localDate(now: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
