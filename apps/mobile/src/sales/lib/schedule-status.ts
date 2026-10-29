import type { LessonStatus } from '@ab/shared';

// «جدول الحلقات» status pills (UX review 2026-10-29 #6): the same shape as Today's summary filter
// (today/lib/timeline.ts), over the day the API returned. Pure, so the screen only lays it out.

export const SCHEDULE_STATUSES = ['all', 'scheduled', 'confirmed', 'cancelled'] as const;
export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number];

const CANCELLED: readonly LessonStatus[] = ['cancelled_by_teacher', 'cancelled_by_admin'];

/** Which pill a lesson counts under besides «الكل» (held, absent, moved: none). */
function statusOf(status: LessonStatus): ScheduleStatus | null {
  if (status === 'scheduled' || status === 'confirmed') return status;
  return CANCELLED.includes(status) ? 'cancelled' : null;
}

export function byScheduleStatus<L extends { status: LessonStatus }>(lessons: readonly L[], filter: ScheduleStatus): L[] {
  return filter === 'all' ? [...lessons] : lessons.filter((l) => statusOf(l.status) === filter);
}

/** Every pill's count, from the whole day (not a page). */
export function scheduleStatusCounts(lessons: readonly { status: LessonStatus }[]): Record<ScheduleStatus, number> {
  const counts: Record<ScheduleStatus, number> = { all: lessons.length, scheduled: 0, confirmed: 0, cancelled: 0 };
  for (const l of lessons) {
    const s = statusOf(l.status);
    if (s) counts[s] += 1;
  }
  return counts;
}
