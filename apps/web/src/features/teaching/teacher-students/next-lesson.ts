import { dayMonthLabel } from '@/features/teaching/schedule';
import { t } from '@/lib/i18n/i18n';
import type { Clock } from '@/lib/clock';
import { clockOfHhmm, zonedPartsIn } from '@ab/shared';

/**
 * «الحلقة الجاية: 12 أكتوبر 17:00» in `clock.tz` (the viewer's zone, useViewerTz()), 12 or 24 h
 * as chosen, or «مفيش حلقة جاية».
 */
export function nextLessonText(startsAt: string | null, clock: Clock & { tz: string }): string {
  if (!startsAt) return t.teacherStudents.noNextLesson;
  const p = zonedPartsIn(new Date(startsAt), clock.tz);
  return t.teacherStudents.nextLesson.replace('{when}', `${dayMonthLabel(p.date)} ${clockOfHhmm(p.time, clock.cycle, clock.locale)}`);
}
