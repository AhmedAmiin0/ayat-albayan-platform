import type { LessonStatus } from '@ab/catalog';
import type { StatusStyle } from '@ab/money';
import { isCancelledLesson } from '@ab/schedule';
import { t } from '@ab/mobile-kit';
import type { LessonStatusText } from '@/core/ui/feedback/lesson-status';

// Same shape as Today's summary filter, over the day the API returned; pure.

export const SCHEDULE_STATUSES = ['all', 'scheduled', 'confirmed', 'cancelled'] as const;
export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number];

/** Which pill a lesson counts under besides all; held, absent and moved count under none. */
function statusOf(status: LessonStatus): ScheduleStatus | null {
  if (status === 'scheduled' || status === 'confirmed') return status;
  return isCancelledLesson(status) ? 'cancelled' : null;
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

const WORDS = t.sales.academySchedule.status;
/** The pending pill reads "to confirm" only while confirmation is required, else "upcoming". */
const PILL_WORDS: Record<'on' | 'off', Record<ScheduleStatus, string>> = {
  on: WORDS,
  off: { ...WORDS, scheduled: t.lessons.noConfirm.scheduledShort },
};
/** Cancelled takes the academy-cancelled dot. */
const PILL_STATUS: Record<Exclude<ScheduleStatus, 'all'>, LessonStatus> = {
  scheduled: 'scheduled',
  confirmed: 'confirmed',
  cancelled: 'cancelled_by_admin',
};

/** The all pill has no dot. */
export function statusPill(
  value: ScheduleStatus,
  text: Pick<LessonStatusText, 'required' | 'look'>,
): { label: string } & Partial<StatusStyle> {
  const label = PILL_WORDS[text.required ? 'on' : 'off'][value];
  return value === 'all' ? { label } : { label, ...text.look(PILL_STATUS[value]) };
}
