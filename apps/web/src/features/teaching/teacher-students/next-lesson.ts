import { dayMonthLabel, RIYADH_TZ, zonedParts } from '@/features/teaching/schedule/tz';
import { t } from '@/lib/i18n/i18n';
import type { Clock } from '@/lib/clock';
import { clockOfHhmm } from '@ab/shared';

/** «الحلقة الجاية: 12 أكتوبر 17:00» on the academy's Riyadh clock (12 or 24 h as chosen), or «مفيش حلقة جاية». */
export function nextLessonText(startsAt: string | null, clock: Clock): string {
  if (!startsAt) return t.teacherStudents.noNextLesson;
  const p = zonedParts(new Date(startsAt), RIYADH_TZ);
  return t.teacherStudents.nextLesson.replace('{when}', `${dayMonthLabel(p.date)} ${clockOfHhmm(p.time, clock.cycle, clock.locale)}`);
}
