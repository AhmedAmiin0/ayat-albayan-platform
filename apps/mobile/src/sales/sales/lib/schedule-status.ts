import { isCancelledLesson, type LessonStatus, type StatusStyle } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import type { LessonStatusText } from '@/core/ui/feedback/lesson-status';

// «جدول الحلقات» status pills (UX review 2026-10-29 #6): the same shape as Today's summary filter
// (today/lib/timeline.ts), over the day the API returned. Pure, so the screen only lays it out.

export const SCHEDULE_STATUSES = ['all', 'scheduled', 'confirmed', 'cancelled'] as const;
export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number];

/** Which pill a lesson counts under besides «الكل» (held, absent, moved: none). */
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
/** The pill words: «للتأكيد» only while one is required, else «قادمة» (owner 2026-11-02). */
const PILL_WORDS: Record<'on' | 'off', Record<ScheduleStatus, string>> = {
  on: WORDS,
  off: { ...WORDS, scheduled: t.lessons.noConfirm.scheduledShort },
};
/** The status a pill takes its dot from («ملغاة»: the academy's). */
const PILL_STATUS: Record<Exclude<ScheduleStatus, 'all'>, LessonStatus> = {
  scheduled: 'scheduled',
  confirmed: 'confirmed',
  cancelled: 'cancelled_by_admin',
};

/** A status pill's word and dot; «الكل» has no dot. */
export function statusPill(
  value: ScheduleStatus,
  text: Pick<LessonStatusText, 'required' | 'look'>,
): { label: string } & Partial<StatusStyle> {
  const label = PILL_WORDS[text.required ? 'on' : 'off'][value];
  return value === 'all' ? { label } : { label, ...text.look(PILL_STATUS[value]) };
}
